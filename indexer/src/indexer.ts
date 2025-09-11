import { ethers } from 'ethers';
import { DatabaseService } from './database';
import { 
  getContractDeploymentBlock, 
  ContractDeploymentConfig,
  getCodeWithRetry,
  getBlockNumberWithRetry,
  queryEventsWithRetry
} from '@eigen-layer-dashboard/lib';

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
    const config: ContractDeploymentConfig = {
      contractName: 'EigenPodManager',
      fallbackBlockOffset: 2000000 // ~6 months of blocks
    };
    
    return getContractDeploymentBlock(
      this.provider,
      this.contract.target as string,
      config
    );
  }

  private async getCodeWithRetry(address: string, blockTag?: number | string): Promise<string> {
    return getCodeWithRetry(this.provider, address, blockTag);
  }

  private async getBlockNumberWithRetry(): Promise<number> {
    return getBlockNumberWithRetry(this.provider);
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
    return queryEventsWithRetry(this.contract, filter, fromBlock, toBlock);
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
