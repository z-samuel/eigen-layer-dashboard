import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';
import { PodDeployedEvent, StakedEthEvent } from '@eigen-layer-dashboard/lib';
import { getIndexerDataSource } from './typeorm.config';

export class IndexerDatabaseService {
  private static instance: IndexerDatabaseService;
  private dataSource: DataSource;
  private podDeployedRepository!: Repository<PodDeployedEvent>;
  private stakedEthRepository!: Repository<StakedEthEvent>;
  private initialized: boolean = false;

  private constructor() {
    this.dataSource = getIndexerDataSource();
  }

  public static getInstance(): IndexerDatabaseService {
    if (!IndexerDatabaseService.instance) {
      IndexerDatabaseService.instance = new IndexerDatabaseService();
    }
    return IndexerDatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
    
    this.podDeployedRepository = this.dataSource.getRepository(PodDeployedEvent);
    this.stakedEthRepository = this.dataSource.getRepository(StakedEthEvent);
    this.initialized = true;
  }

  async insertPodDeployedEvent(event: Omit<PodDeployedEvent, 'id'>): Promise<void> {
    await this.podDeployedRepository.upsert(event, ['transactionHash', 'logIndex']);
  }

  async insertStakedEthEvent(event: Omit<StakedEthEvent, 'id'>): Promise<void> {
    await this.stakedEthRepository.upsert(event, ['transactionHash', 'logIndex']);
  }

  async getPodDeployedEvents(limit: number = 100, offset: number = 0): Promise<PodDeployedEvent[]> {
    return this.podDeployedRepository.find({
      order: { blockNumber: 'DESC', logIndex: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getStakedEthEvents(limit: number = 100, offset: number = 0): Promise<StakedEthEvent[]> {
    return this.stakedEthRepository.find({
      order: { blockNumber: 'DESC', logIndex: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getPodDeployedEventsByOwner(owner: string): Promise<PodDeployedEvent[]> {
    return this.podDeployedRepository.find({
      where: { podOwner: owner },
      order: { blockNumber: 'DESC', logIndex: 'DESC' },
    });
  }

  async getPodDeployedEventsByBlockRange(startBlock: number, endBlock: number): Promise<PodDeployedEvent[]> {
    return this.podDeployedRepository
      .createQueryBuilder('event')
      .where('event.blockNumber >= :startBlock AND event.blockNumber <= :endBlock', {
        startBlock,
        endBlock,
      })
      .orderBy('event.blockNumber', 'ASC')
      .addOrderBy('event.logIndex', 'ASC')
      .getMany();
  }

  async getStakedEthEventsByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthEvent[]> {
    return this.stakedEthRepository
      .createQueryBuilder('event')
      .where('event.blockNumber >= :startBlock AND event.blockNumber <= :endBlock', {
        startBlock,
        endBlock,
      })
      .orderBy('event.blockNumber', 'ASC')
      .addOrderBy('event.logIndex', 'ASC')
      .getMany();
  }

  async getTotalStakedEth(): Promise<string> {
    const result = await this.stakedEthRepository
      .createQueryBuilder('event')
      .select('SUM(CAST(event.amount AS DECIMAL))', 'total')
      .getRawOne();
    
    return result?.total || '0';
  }

  async getStakedEthByBlock(): Promise<any[]> {
    return this.stakedEthRepository
      .createQueryBuilder('event')
      .select('event.blockNumber', 'blockNumber')
      .addSelect('event.blockTimestamp', 'blockTimestamp')
      .addSelect('SUM(CAST(event.amount AS DECIMAL))', 'totalDeposited')
      .addSelect('COUNT(*)', 'eventCount')
      .groupBy('event.blockNumber')
      .addGroupBy('event.blockTimestamp')
      .orderBy('event.blockNumber', 'ASC')
      .getRawMany();
  }

  async getLastIndexedBlock(): Promise<number> {
    const podBlock = await this.getLastPodDeployedBlock();
    const stakedBlock = await this.getLastStakedEthBlock();
    return Math.max(podBlock, stakedBlock);
  }

  async getLastPodDeployedBlock(): Promise<number> {
    // Ensure DataSource is initialized before querying
    if (!this.dataSource.isInitialized) {
      console.log('IndexerDatabaseService: DataSource not initialized, reinitializing...');
      await this.dataSource.initialize();
      this.podDeployedRepository = this.dataSource.getRepository(PodDeployedEvent);
      this.stakedEthRepository = this.dataSource.getRepository(StakedEthEvent);
    }
    
    const result = await this.podDeployedRepository
      .createQueryBuilder('event')
      .select('MAX(event.blockNumber)', 'maxBlock')
      .getRawOne();
    
    return result?.maxBlock || 0;
  }

  async getLastStakedEthBlock(): Promise<number> {
    // Ensure DataSource is initialized before querying
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
      this.podDeployedRepository = this.dataSource.getRepository(PodDeployedEvent);
      this.stakedEthRepository = this.dataSource.getRepository(StakedEthEvent);
    }
    
    const result = await this.stakedEthRepository
      .createQueryBuilder('event')
      .select('MAX(event.blockNumber)', 'maxBlock')
      .getRawOne();
    
    return result?.maxBlock || 0;
  }

  async getTotalStakedEthCount(): Promise<number> {
    return this.stakedEthRepository.count();
  }

  async getStakedEthStats(): Promise<any> {
    const count = await this.getTotalStakedEthCount();
    const total = await this.getTotalStakedEth();
    const lastBlock = await this.getLastStakedEthBlock();
    
    return {
      totalEvents: count,
      totalStaked: total,
      lastBlock: lastBlock,
    };
  }

  async getTotalEvents(): Promise<number> {
    const podCount = await this.podDeployedRepository.count();
    const stakedCount = await this.stakedEthRepository.count();
    return podCount + stakedCount;
  }

  async getEventsByEigenPod(eigenPod: string): Promise<PodDeployedEvent[]> {
    return this.podDeployedRepository.find({
      where: { eigenPod },
      order: { blockNumber: 'DESC', logIndex: 'DESC' },
    });
  }

  async getEventsByPodOwner(podOwner: string): Promise<PodDeployedEvent[]> {
    return this.getPodDeployedEventsByOwner(podOwner);
  }

  async getEventsByBlockRange(startBlock: number, endBlock: number): Promise<PodDeployedEvent[]> {
    return this.getPodDeployedEventsByBlockRange(startBlock, endBlock);
  }

  async getStakedEthEventsByPubkey(pubkey: string): Promise<StakedEthEvent[]> {
    return this.stakedEthRepository.find({
      where: { pubkey },
      order: { blockNumber: 'DESC', logIndex: 'DESC' },
    });
  }

  async getStakedEthEventsByWithdrawalCredentials(withdrawalCredentials: string): Promise<StakedEthEvent[]> {
    return this.stakedEthRepository.find({
      where: { withdrawalCredentials },
      order: { blockNumber: 'DESC', logIndex: 'DESC' },
    });
  }

  async close(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}