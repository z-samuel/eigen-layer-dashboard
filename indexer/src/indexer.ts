import { ethers } from 'ethers';
import { DatabaseService } from './database';

// PodDeployed event ABI
const POD_DEPLOYED_ABI = [
  "event PodDeployed(address indexed eigenPod, address indexed podOwner)"
];

export class EventIndexer {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private database: DatabaseService;
  private isRunning: boolean = false;
  private maxRetries: number;
  private retryDelayBase: number;

  constructor(rpcUrl: string, contractAddress: string, maxRetries: number = 10, retryDelayBase: number = 2) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, POD_DEPLOYED_ABI, this.provider);
    this.database = new DatabaseService();
    this.maxRetries = maxRetries;
    this.retryDelayBase = retryDelayBase;
  }

  async initialize(): Promise<void> {
    await this.database.initialize();
  }

  private async getContractDeploymentBlock(): Promise<number> {
    try {
      console.log('Detecting contract deployment block...');
      
      // Get the contract code to verify it exists
      const code = await this.getCodeWithRetry(this.contract.target as string);
      if (code === '0x') {
        throw new Error('Contract not found at the specified address');
      }

      // Binary search to find the deployment block
      const currentBlock = await this.getBlockNumberWithRetry();
      let low = 0;
      let high = currentBlock;
      let deploymentBlock = currentBlock;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        
        try {
          const blockCode = await this.getCodeWithRetry(this.contract.target as string, mid);
          if (blockCode !== '0x') {
            // Contract exists at this block, search earlier
            deploymentBlock = mid;
            high = mid - 1;
          } else {
            // Contract doesn't exist at this block, search later
            low = mid + 1;
          }
        } catch (error) {
          // If we can't get the code at this block, search later
          low = mid + 1;
        }
      }

      console.log(`Contract deployment block detected: ${deploymentBlock}`);
      return deploymentBlock;
    } catch (error) {
      console.error('Error detecting contract deployment block:', error);
      // Fallback to a reasonable starting block (e.g., 6 months ago)
      try {
        const currentBlock = await this.getBlockNumberWithRetry();
        const fallbackBlock = Math.max(0, currentBlock - 2000000); // ~6 months of blocks
        console.log(`Using fallback deployment block: ${fallbackBlock}`);
        return fallbackBlock;
      } catch (fallbackError) {
        console.error('Error getting fallback block:', fallbackError);
        return 0; // Ultimate fallback
      }
    }
  }

  private async getCodeWithRetry(address: string, blockTag?: number | string): Promise<string> {
    let retryCount = 0;
    
    while (retryCount < this.maxRetries) {
      try {
        const code = await this.provider.getCode(address, blockTag);
        return code;
      } catch (error: any) {
        retryCount++;
        
        const isRateLimitError = error.message?.includes('Too Many Requests') || 
                                error.code === -32005 || 
                                error.message?.includes('rate limit') ||
                                error.message?.includes('429');
        
        if (isRateLimitError && retryCount < this.maxRetries) {
          const sleepTime = this.retryDelayBase * retryCount;
          console.log(`Rate limit hit during code check. Retrying in ${sleepTime} seconds... (attempt ${retryCount}/${this.maxRetries})`);
          await this.sleep(sleepTime * 1000);
          continue;
        }
        
        if (retryCount >= this.maxRetries) {
          console.error(`Failed to get code after ${this.maxRetries} retries. Last error:`, error.message);
          throw new Error(`Get code failed after ${this.maxRetries} retries: ${error.message}`);
        }
        
        throw error;
      }
    }
    
    throw new Error(`Get code failed after ${this.maxRetries} retries`);
  }

  private async getBlockNumberWithRetry(): Promise<number> {
    let retryCount = 0;
    
    while (retryCount < this.maxRetries) {
      try {
        const blockNumber = await this.provider.getBlockNumber();
        return blockNumber;
      } catch (error: any) {
        retryCount++;
        
        const isRateLimitError = error.message?.includes('Too Many Requests') || 
                                error.code === -32005 || 
                                error.message?.includes('rate limit') ||
                                error.message?.includes('429');
        
        if (isRateLimitError && retryCount < this.maxRetries) {
          const sleepTime = this.retryDelayBase * retryCount;
          console.log(`Rate limit hit during block number check. Retrying in ${sleepTime} seconds... (attempt ${retryCount}/${this.maxRetries})`);
          await this.sleep(sleepTime * 1000);
          continue;
        }
        
        if (retryCount >= this.maxRetries) {
          console.error(`Failed to get block number after ${this.maxRetries} retries. Last error:`, error.message);
          throw new Error(`Get block number failed after ${this.maxRetries} retries: ${error.message}`);
        }
        
        throw error;
      }
    }
    
    throw new Error(`Get block number failed after ${this.maxRetries} retries`);
  }

  async startIndexing(): Promise<void> {
    if (this.isRunning) {
      console.log('Indexer is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting event indexer...');

    try {
      // Get the last indexed block
      const lastIndexedBlock = await this.database.getLastIndexedBlock();
      console.log(`Last indexed block: ${lastIndexedBlock}`);

      // Get current block number
      const currentBlock = await this.getBlockNumberWithRetry();
      console.log(`Current block: ${currentBlock}`);

      if (lastIndexedBlock >= currentBlock) {
        console.log('No new blocks to index');
        return;
      }

      // If this is the first run (lastIndexedBlock is 0), start from contract deployment
      let startBlock = lastIndexedBlock + 1;
      if (lastIndexedBlock === 0) {
        const deploymentBlock = await this.getContractDeploymentBlock();
        startBlock = deploymentBlock;
        console.log(`First run detected, starting from contract deployment block: ${deploymentBlock}`);
      }

      // Index events from startBlock to currentBlock
      await this.indexEventsInRange(startBlock, currentBlock);
      
      console.log(`Successfully indexed events up to block ${currentBlock}`);
    } catch (error) {
      console.error('Error during indexing:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async backfillHistoricalEvents(startBlock: number, endBlock: number): Promise<void> {
    // If startBlock is 0, use contract deployment block
    let actualStartBlock = startBlock;
    if (startBlock === 0) {
      actualStartBlock = await this.getContractDeploymentBlock();
      console.log(`Start block 0 specified, using contract deployment block: ${actualStartBlock}`);
    }
    
    console.log(`Starting backfill from block ${actualStartBlock} to ${endBlock}`);
    
    const batchSize = 1000; // Process 1000 blocks at a time
    let currentStart = actualStartBlock;
    
    while (currentStart <= endBlock) {
      const currentEnd = Math.min(currentStart + batchSize - 1, endBlock);
      
      try {
        console.log(`Backfilling blocks ${currentStart} to ${currentEnd}`);
        await this.indexEventsInRange(currentStart, currentEnd);
        currentStart = currentEnd + 1;
      } catch (error) {
        console.error(`Error backfilling blocks ${currentStart} to ${currentEnd}:`, error);
        throw error;
      }
    }
    
    console.log(`Backfill completed from block ${actualStartBlock} to ${endBlock}`);
  }

  private async indexEventsInRange(startBlock: number, endBlock: number): Promise<void> {
    try {
      // Get PodDeployed events in the block range
      const filter = this.contract.filters.PodDeployed();
      
      // Query events in batches to avoid RPC limits
      const batchSize = 2000; // Process 2000 blocks at a time
      let currentStart = startBlock;
      
      while (currentStart <= endBlock) {
        const currentEnd = Math.min(currentStart + batchSize - 1, endBlock);
        
        console.log(`Querying events from block ${currentStart} to ${currentEnd}`);
        
        const events = await this.queryEventsWithRetry(filter, currentStart, currentEnd);
        
        console.log(`Found ${events.length} PodDeployed events`);
        
        // Process each event
        for (const event of events) {
          if ('args' in event && event.args && event.args.length >= 2) {
            const eigenPod = event.args[0];
            const podOwner = event.args[1];
            await this.database.insertPodDeployedEvent(
              eigenPod,
              podOwner,
              event.blockNumber,
              event.transactionHash,
              event.index
            );
          }
        }
        
        currentStart = currentEnd + 1;
      }
    } catch (error) {
      console.error(`Error indexing events in range ${startBlock}-${endBlock}:`, error);
      throw error;
    }
  }

  private async queryEventsWithRetry(filter: any, fromBlock: number, toBlock: number): Promise<any[]> {
    let retryCount = 0;
    
    while (retryCount < this.maxRetries) {
      try {
        const events = await this.contract.queryFilter(filter, fromBlock, toBlock);
        return events;
      } catch (error: any) {
        retryCount++;
        
        // Check if it's a rate limit error
        const isRateLimitError = error.message?.includes('Too Many Requests') || 
                                error.code === -32005 || 
                                error.message?.includes('rate limit') ||
                                error.message?.includes('429');
        
        if (isRateLimitError && retryCount < this.maxRetries) {
          const sleepTime = this.retryDelayBase * retryCount; // Configurable exponential backoff
          console.log(`Rate limit hit. Retrying in ${sleepTime} seconds... (attempt ${retryCount}/${this.maxRetries})`);
          await this.sleep(sleepTime * 1000);
          continue;
        }
        
        // If it's not a rate limit error or we've exhausted retries, throw the error
        if (retryCount >= this.maxRetries) {
          console.error(`Failed after ${this.maxRetries} retries. Last error:`, error.message);
          throw new Error(`Query failed after ${this.maxRetries} retries: ${error.message}`);
        }
        
        throw error;
      }
    }
    
    throw new Error(`Query failed after ${this.maxRetries} retries`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getIndexingStatus(): Promise<{
    lastIndexedBlock: number;
    currentBlock: number;
    totalEvents: number;
    isRunning: boolean;
  }> {
    const lastIndexedBlock = await this.database.getLastIndexedBlock();
    const currentBlock = await this.getBlockNumberWithRetry();
    const totalEvents = await this.database.getTotalEventCount();
    
    return {
      lastIndexedBlock,
      currentBlock,
      totalEvents,
      isRunning: this.isRunning
    };
  }

  async getDeploymentBlock(): Promise<number> {
    return await this.getContractDeploymentBlock();
  }

  async stopIndexing(): Promise<void> {
    this.isRunning = false;
    console.log('Indexer stopped');
  }

  async close(): Promise<void> {
    await this.database.close();
  }

  // Query methods
  async getEventsByEigenPod(eigenPod: string): Promise<any[]> {
    return await this.database.getEventsByEigenPod(eigenPod);
  }

  async getEventsByPodOwner(podOwner: string): Promise<any[]> {
    return await this.database.getEventsByPodOwner(podOwner);
  }

  async getEventsByBlockRange(startBlock: number, endBlock: number): Promise<any[]> {
    return await this.database.getEventsByBlockRange(startBlock, endBlock);
  }
}
