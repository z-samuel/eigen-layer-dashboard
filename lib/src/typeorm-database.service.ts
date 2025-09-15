import { Repository, DataSource } from 'typeorm';
import { PodDeployedEvent } from './entities/PodDeployedEvent.entity';
import { StakedEthEvent } from './entities/StakedEthEvent.entity';
import { AppDataSource } from './typeorm.config';

export class TypeOrmDatabaseService {
  private podDeployedRepository: Repository<PodDeployedEvent>;
  private stakedEthRepository: Repository<StakedEthEvent>;
  private dataSource: DataSource;

  constructor() {
    this.dataSource = AppDataSource;
    this.podDeployedRepository = this.dataSource.getRepository(PodDeployedEvent);
    this.stakedEthRepository = this.dataSource.getRepository(StakedEthEvent);
  }

  async initialize(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
  }

  async insertPodDeployedEvent(event: Partial<PodDeployedEvent>): Promise<void> {
    const newEvent = this.podDeployedRepository.create(event);
    await this.podDeployedRepository.save(newEvent);
  }

  async insertStakedEthEvent(event: Partial<StakedEthEvent>): Promise<void> {
    const newEvent = this.stakedEthRepository.create(event);
    await this.stakedEthRepository.save(newEvent);
  }

  async getPodDeployedEvents(limit: number = 100, offset: number = 0): Promise<PodDeployedEvent[]> {
    return await this.podDeployedRepository.find({
      order: { blockNumber: 'DESC', logIndex: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getStakedEthEvents(limit: number = 100, offset: number = 0): Promise<StakedEthEvent[]> {
    return await this.stakedEthRepository.find({
      order: { blockNumber: 'DESC', logIndex: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getPodDeployedEventsByOwner(owner: string): Promise<PodDeployedEvent[]> {
    return await this.podDeployedRepository.find({
      where: { podOwner: owner },
      order: { blockNumber: 'DESC', logIndex: 'DESC' },
    });
  }

  async getPodDeployedEventsByBlockRange(startBlock: number, endBlock: number): Promise<PodDeployedEvent[]> {
    return await this.podDeployedRepository
      .createQueryBuilder('event')
      .where('event.blockNumber >= :startBlock AND event.blockNumber <= :endBlock', {
        startBlock,
        endBlock,
      })
      .orderBy('event.blockNumber', 'DESC')
      .addOrderBy('event.logIndex', 'DESC')
      .getMany();
  }

  async getStakedEthEventsByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthEvent[]> {
    return await this.stakedEthRepository
      .createQueryBuilder('event')
      .where('event.blockNumber >= :startBlock AND event.blockNumber <= :endBlock', {
        startBlock,
        endBlock,
      })
      .orderBy('event.blockNumber', 'DESC')
      .addOrderBy('event.logIndex', 'DESC')
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
    return await this.stakedEthRepository
      .createQueryBuilder('event')
      .select('event.blockNumber', 'blockNumber')
      .addSelect('event.blockTimestamp', 'blockTimestamp')
      .addSelect('SUM(CAST(event.amount AS DECIMAL))', 'totalDeposited')
      .addSelect('COUNT(*)', 'eventCount')
      .groupBy('event.blockNumber')
      .addGroupBy('event.blockTimestamp')
      .orderBy('event.blockNumber', 'DESC')
      .getRawMany();
  }

  async close(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}
