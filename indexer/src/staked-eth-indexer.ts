import { ethers } from 'ethers';
import { DatabaseService } from './database';
import { StakedEthEvent } from '@eigen-layer-dashboard/lib';

const DEPOSIT_EVENT_ABI = [
  "event DepositEvent(bytes pubkey, bytes withdrawal_credentials, bytes amount, bytes signature, bytes index)"
];

export class StakedEthIndexer {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private database: DatabaseService;
  private isRunning: boolean = false;
  private maxRetries: number;
  private retryDelayBase: number;
  private contractAddress: string;

  constructor(rpcUrl: string, contractAddress: string, maxRetries: number = 10, retryDelayBase: number = 2) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contractAddress = contractAddress;
    this.contract = new ethers.Contract(
      contractAddress,
      DEPOSIT_EVENT_ABI,
      this.provider
    );
    this.database = new DatabaseService();
    this.maxRetries = maxRetries;
    this.retryDelayBase = retryDelayBase;
  }

  async initialize(): Promise<void> {
    await this.database.initialize();
  }

  private async getContractDeploymentBlock(): Promise<number> {
    console.log('Finding Ethereum 2.0 Deposit Contract deployment block...');
    
    // The Ethereum 2.0 Deposit Contract was deployed at block 11052984
    // This is a known constant, but we can also detect it dynamically
    const knownDeploymentBlock = 11052984;
    
    try {
      // Verify the contract exists at the known block
      const code = await this.getCodeWithRetry(this.contractAddress, knownDeploymentBlock);
      if (code && code !== '0x') {
        console.log(`Ethereum 2.0 Deposit Contract found at block ${knownDeploymentBlock}`);
        return knownDeploymentBlock;
      }
    } catch (error) {
      console.warn('Could not verify known deployment block, using fallback method');
    }

    // Fallback: binary search to find deployment block
    const currentBlock = await this.getBlockNumberWithRetry();
    let low = 0;
    let high = currentBlock;
    let deploymentBlock = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      try {
        const code = await this.getCodeWithRetry(this.contractAddress, mid);
        if (code && code !== '0x') {
          deploymentBlock = mid;
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      } catch (error) {
        console.warn(`Error checking block ${mid}:`, error);
        low = mid + 1;
      }
    }

    if (deploymentBlock === 0) {
      throw new Error('Could not find Ethereum 2.0 Deposit Contract deployment block');
    }

    console.log(`Ethereum 2.0 Deposit Contract deployment block: ${deploymentBlock}`);
    return deploymentBlock;
  }

  private async getCodeWithRetry(address: string, blockTag?: number | string): Promise<string> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.provider.getCode(address, blockTag);
      } catch (error: any) {
        const isRateLimit = error.message?.includes('Too Many Requests') || 
                           error.code === -32005 || 
                           error.message?.toLowerCase().includes('rate limit') ||
                           error.message?.includes('429') ||
                           (error.value && Array.isArray(error.value) && 
                            error.value.some((err: any) => err.code === -32005 || err.message?.includes('Too Many Requests')));
        
        if (isRateLimit && attempt < this.maxRetries) {
          const delay = this.retryDelayBase * Math.pow(2, attempt - 1);
          console.log(`Rate limited, retrying in ${delay}s (attempt ${attempt}/${this.maxRetries})`);
          await this.sleep(delay * 1000);
          continue;
        }
        
        throw error;
      }
    }
    throw new Error('Exceeded maximum retry limit');
  }

  private async getBlockNumberWithRetry(): Promise<number> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.provider.getBlockNumber();
      } catch (error: any) {
        const isRateLimit = error.message?.includes('Too Many Requests') || 
                           error.code === -32005 || 
                           error.message?.toLowerCase().includes('rate limit') ||
                           error.message?.includes('429') ||
                           (error.value && Array.isArray(error.value) && 
                            error.value.some((err: any) => err.code === -32005 || err.message?.includes('Too Many Requests')));
        
        if (isRateLimit && attempt < this.maxRetries) {
          const delay = this.retryDelayBase * Math.pow(2, attempt - 1);
          console.log(`Rate limited, retrying in ${delay}s (attempt ${attempt}/${this.maxRetries})`);
          await this.sleep(delay * 1000);
          continue;
        }
        
        throw error;
      }
    }
    throw new Error('Exceeded maximum retry limit');
  }

  private async getBlockWithRetry(blockNumber: number): Promise<any> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.provider.getBlock(blockNumber);
      } catch (error: any) {
        const isRateLimit = error.message?.includes('Too Many Requests') || 
                           error.code === -32005 || 
                           error.message?.toLowerCase().includes('rate limit') ||
                           error.message?.includes('429') ||
                           (error.value && Array.isArray(error.value) && 
                            error.value.some((err: any) => err.code === -32005 || err.message?.includes('Too Many Requests')));
        
        if (isRateLimit && attempt < this.maxRetries) {
          const delay = this.retryDelayBase * Math.pow(2, attempt - 1);
          console.log(`Rate limited, retrying in ${delay}s (attempt ${attempt}/${this.maxRetries})`);
          await this.sleep(delay * 1000);
          continue;
        }
        
        throw error;
      }
    }
    throw new Error('Exceeded maximum retry limit');
  }

  private async getTransactionWithRetry(transactionHash: string): Promise<any> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.provider.getTransaction(transactionHash);
      } catch (error: any) {
        const isRateLimit = error.message?.includes('Too Many Requests') || 
                           error.code === -32005 || 
                           error.message?.toLowerCase().includes('rate limit') ||
                           error.message?.includes('429') ||
                           (error.value && Array.isArray(error.value) && 
                            error.value.some((err: any) => err.code === -32005 || err.message?.includes('Too Many Requests')));
        
        if (isRateLimit && attempt < this.maxRetries) {
          const delay = this.retryDelayBase * Math.pow(2, attempt - 1);
          console.log(`Rate limited, retrying in ${delay}s (attempt ${attempt}/${this.maxRetries})`);
          await this.sleep(delay * 1000);
          continue;
        }
        
        throw error;
      }
    }
    throw new Error('Exceeded maximum retry limit');
  }

  async startIndexing(): Promise<void> {
    if (this.isRunning) {
      console.log('Staked ETH indexer is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting staked ETH indexing...');

    try {
      const deploymentBlock = await this.getContractDeploymentBlock();
      const lastIndexedBlock = await this.database.getLastStakedEthBlock();
      const startBlock = lastIndexedBlock > 0 ? lastIndexedBlock + 1 : deploymentBlock;
      const currentBlock = await this.getBlockNumberWithRetry();

      console.log(`Indexing staked ETH events from block ${startBlock} to ${currentBlock}`);

      if (startBlock <= currentBlock) {
        await this.indexEventsInRange(startBlock, currentBlock);
      } else {
        console.log('No new blocks to index');
      }

      console.log('Staked ETH indexing completed');
    } catch (error) {
      console.error('Error during staked ETH indexing:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async backfillHistoricalEvents(startBlock: number, endBlock: number): Promise<void> {
    console.log(`Backfilling staked ETH events from block ${startBlock} to ${endBlock}`);
    
    try {
      const deploymentBlock = await this.getContractDeploymentBlock();
      const actualStartBlock = startBlock === 0 ? deploymentBlock : startBlock;
      
      console.log(`Actual backfill range: ${actualStartBlock} to ${endBlock}`);
      await this.indexEventsInRange(actualStartBlock, endBlock);
      console.log('Staked ETH backfill completed');
    } catch (error) {
      console.error('Error during staked ETH backfill:', error);
      throw error;
    }
  }

  private async indexEventsInRange(startBlock: number, endBlock: number): Promise<void> {
    const batchSize = 1000; // Process in batches to avoid memory issues
    let currentStart = startBlock;

    while (currentStart <= endBlock) {
      const currentEnd = Math.min(currentStart + batchSize - 1, endBlock);
      
      console.log(`Indexing staked ETH events in blocks ${currentStart} to ${currentEnd}`);
      
      try {
        const events = await this.queryEventsWithRetry(
          this.contract.filters.DepositEvent(),
          currentStart,
          currentEnd
        );

        console.log(`Found ${events.length} staked ETH events`);

        for (const event of events) {
          if ('args' in event && event.args && event.args.length >= 5) {
            const [pubkey, withdrawalCredentials, amount, signature, depositIndex] = event.args;
            
            // Get the transaction to check the actual value sent
            const tx = await this.getTransactionWithRetry(event.transactionHash);
            const txValue = tx?.value?.toString() || '0';
            
            // Get block timestamp
            const block = await this.getBlockWithRetry(event.blockNumber);
            const blockTimestamp = block.timestamp;
            
            await this.database.insertStakedEthEvent(
              pubkey,
              withdrawalCredentials,
              txValue,
              signature,
              depositIndex,
              event.blockNumber,
              blockTimestamp,
              event.transactionHash,
              event.index
            );
          }
        }

        currentStart = currentEnd + 1;
      } catch (error) {
        console.error(`Error indexing blocks ${currentStart}-${currentEnd}:`, error);
        throw error;
      }
    }
  }

  private async queryEventsWithRetry(filter: any, fromBlock: number, toBlock: number): Promise<any[]> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.contract.queryFilter(filter, fromBlock, toBlock);
      } catch (error: any) {
        const isRateLimit = error.message?.includes('Too Many Requests') || 
                           error.code === -32005 || 
                           error.message?.toLowerCase().includes('rate limit') ||
                           error.message?.includes('429') ||
                           (error.value && Array.isArray(error.value) && 
                            error.value.some((err: any) => err.code === -32005 || err.message?.includes('Too Many Requests')));
        
        if (isRateLimit && attempt < this.maxRetries) {
          const delay = this.retryDelayBase * Math.pow(2, attempt - 1);
          console.log(`Rate limited, retrying in ${delay}s (attempt ${attempt}/${this.maxRetries})`);
          await this.sleep(delay * 1000);
          continue;
        }
        
        throw error;
      }
    }
    throw new Error('Exceeded maximum retry limit');
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
    const lastIndexedBlock = await this.database.getLastStakedEthBlock();
    const currentBlock = await this.getBlockNumberWithRetry();
    const totalEvents = await this.database.getTotalStakedEthCount();
    
    return {
      lastIndexedBlock,
      currentBlock,
      totalEvents,
      isRunning: this.isRunning
    };
  }

  async getDeploymentBlock(): Promise<number> {
    return this.getContractDeploymentBlock();
  }

  async stopIndexing(): Promise<void> {
    this.isRunning = false;
    console.log('Staked ETH indexing stopped');
  }

  async close(): Promise<void> {
    await this.database.close();
  }

  // Query methods
  async getStakedEthEventsByPubkey(pubkey: string): Promise<StakedEthEvent[]> {
    return await this.database.getStakedEthEventsByPubkey(pubkey);
  }

  async getStakedEthEventsByWithdrawalCredentials(withdrawalCredentials: string): Promise<StakedEthEvent[]> {
    return await this.database.getStakedEthEventsByWithdrawalCredentials(withdrawalCredentials);
  }

  async getStakedEthEventsByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthEvent[]> {
    return await this.database.getStakedEthEventsByBlockRange(startBlock, endBlock);
  }

  async getStakedEthByBlock(blockNumber: number): Promise<any> {
    return await this.database.getStakedEthByBlock(blockNumber);
  }

  async getStakedEthStats(): Promise<{ totalEvents: number; totalAmount: string; lastBlock: number; }> {
    return await this.database.getStakedEthStats();
  }
}
