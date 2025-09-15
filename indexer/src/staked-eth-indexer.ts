import { ethers } from 'ethers';
import { IndexerDatabaseService } from './database';
import { 
  StakedEthEvent, 
  getContractDeploymentBlock, 
  ContractDeploymentConfig,
  getCodeWithRetry,
  getBlockNumberWithRetry,
  getBlockWithRetry,
  getTransactionWithRetry,
  queryEventsWithRetry
} from '@eigen-layer-dashboard/lib';

const DEPOSIT_EVENT_ABI = [
  "event DepositEvent(bytes pubkey, bytes withdrawal_credentials, bytes amount, bytes signature, bytes index)"
];

export class StakedEthIndexer {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private database: IndexerDatabaseService;
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
    this.database = IndexerDatabaseService.getInstance();
    this.maxRetries = maxRetries;
    this.retryDelayBase = retryDelayBase;
  }

  async initialize(): Promise<void> {
    await this.database.initialize();
  }

  private async getContractDeploymentBlock(): Promise<number> {
    const config: ContractDeploymentConfig = {
      knownDeploymentBlock: 11052984, // Ethereum 2.0 Deposit Contract deployment block
      contractName: 'Ethereum 2.0 Deposit Contract',
      fallbackBlockOffset: 1000000 // Use 1M blocks back as fallback if known block fails
    };
    
    return getContractDeploymentBlock(
      this.provider,
      this.contractAddress,
      config
    );
  }

  private async getCodeWithRetry(address: string, blockTag?: number | string): Promise<string> {
    return getCodeWithRetry(this.provider, address, blockTag);
  }

  private async getBlockNumberWithRetry(): Promise<number> {
    return getBlockNumberWithRetry(this.provider);
  }

  private async getBlockWithRetry(blockNumber: number): Promise<any> {
    return getBlockWithRetry(this.provider, blockNumber);
  }

  private async getTransactionWithRetry(transactionHash: string): Promise<any> {
    return getTransactionWithRetry(this.provider, transactionHash);
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
            
            await this.database.insertStakedEthEvent({
              pubkey,
              withdrawalCredentials,
              amount: txValue,
              signature,
              depositIndex,
              blockNumber: event.blockNumber,
              blockTimestamp,
              transactionHash: event.transactionHash,
              logIndex: event.index,
              createdAt: new Date(),
            });
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
    const allBlocks = await this.database.getStakedEthByBlock();
    return allBlocks.find(block => block.blockNumber === blockNumber);
  }

  async getStakedEthStats(): Promise<{ totalEvents: number; totalAmount: string; lastBlock: number; }> {
    return await this.database.getStakedEthStats();
  }
}
