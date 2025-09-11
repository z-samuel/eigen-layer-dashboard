import * as cron from 'node-cron';
import { EventIndexer } from './indexer';

export class IndexerScheduler {
  private indexer: EventIndexer;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor(rpcUrl: string, contractAddress: string, maxRetries: number = 10, retryDelayBase: number = 2) {
    this.indexer = new EventIndexer(rpcUrl, contractAddress, maxRetries, retryDelayBase);
  }

  async initialize(): Promise<void> {
    await this.indexer.initialize();
  }

  start(cronExpression: string = '*/5 * * * *'): void {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log(`Starting scheduler with cron expression: ${cronExpression}`);
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      try {
        console.log('Running scheduled indexing...');
        await this.indexer.startIndexing();
      } catch (error) {
        console.error('Error during scheduled indexing:', error);
      }
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.isRunning = true;
    
    console.log('Scheduler started successfully');
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('Scheduler stopped');
  }

  async runOnce(): Promise<void> {
    try {
      console.log('Running indexer once...');
      await this.indexer.startIndexing();
    } catch (error) {
      console.error('Error during manual indexing:', error);
      throw error;
    }
  }

  async backfill(startBlock: number, endBlock: number): Promise<void> {
    try {
      console.log(`Starting backfill from block ${startBlock} to ${endBlock}`);
      await this.indexer.backfillHistoricalEvents(startBlock, endBlock);
    } catch (error) {
      console.error('Error during backfill:', error);
      throw error;
    }
  }

  async getStatus(): Promise<any> {
    return await this.indexer.getIndexingStatus();
  }

  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  async getDeploymentBlock(): Promise<number> {
    return await this.indexer.getDeploymentBlock();
  }

  async close(): Promise<void> {
    this.stop();
    await this.indexer.close();
  }

  // Query methods
  async getEventsByEigenPod(eigenPod: string): Promise<any[]> {
    return await this.indexer.getEventsByEigenPod(eigenPod);
  }

  async getEventsByPodOwner(podOwner: string): Promise<any[]> {
    return await this.indexer.getEventsByPodOwner(podOwner);
  }

  async getEventsByBlockRange(startBlock: number, endBlock: number): Promise<any[]> {
    return await this.indexer.getEventsByBlockRange(startBlock, endBlock);
  }
}
