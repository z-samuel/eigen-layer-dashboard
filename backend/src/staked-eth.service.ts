import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StakedEthEvent } from '@eigen-layer-dashboard/lib';

export interface StakedEthStats {
  totalEvents: number;
  totalStaked: string;
  uniqueValidators: number;
  averageStake: string;
}

export interface StakedEthByBlock {
  blockNumber: number;
  blockTimestamp: number;
  totalDeposited: string;
  eventCount: number;
}

@Injectable()
export class StakedEthService {
  constructor(
    @InjectRepository(StakedEthEvent)
    private stakedEthRepository: Repository<StakedEthEvent>,
  ) {}

  async initialize(): Promise<void> {
    // Database is already initialized by the indexer
    console.log('StakedEthService initialized');
  }

  async getStakedEthEvents(limit: number = 100, offset: number = 0): Promise<StakedEthEvent[]> {
    try {
      return await this.stakedEthRepository.find({
        order: { blockNumber: 'DESC', logIndex: 'DESC' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error('Error fetching staked ETH events:', error);
      throw new HttpException(
        'Failed to fetch staked ETH events',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getStakedEthEventsByPubkey(pubkey: string): Promise<StakedEthEvent[]> {
    try {
      return await this.stakedEthRepository.find({
        where: { pubkey },
        order: { blockNumber: 'DESC', logIndex: 'DESC' },
      });
    } catch (error) {
      console.error('Error querying staked ETH events by pubkey:', error);
      throw new HttpException(
        'Failed to query staked ETH events from database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStakedEthEventsByWithdrawalCredentials(withdrawalCredentials: string): Promise<StakedEthEvent[]> {
    try {
      // This method needs to be implemented in the database interface
      // For now, we'll return empty array
      return [];
    } catch (error) {
      console.error('Error querying staked ETH events by withdrawal credentials:', error);
      throw new HttpException(
        'Failed to query staked ETH events from database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStakedEthEventsByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthEvent[]> {
    try {
      return await this.stakedEthRepository
        .createQueryBuilder('event')
        .where('event.blockNumber >= :startBlock AND event.blockNumber <= :endBlock', {
          startBlock,
          endBlock,
        })
        .orderBy('event.blockNumber', 'DESC')
        .addOrderBy('event.logIndex', 'DESC')
        .getMany();
    } catch (error) {
      console.error('Error querying staked ETH events by block range:', error);
      throw new HttpException(
        'Failed to query staked ETH events from database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStakedEthStats(): Promise<StakedEthStats> {
    try {
      const totalStakedResult = await this.stakedEthRepository
        .createQueryBuilder('event')
        .select('SUM(CAST(event.amount AS DECIMAL))', 'total')
        .getRawOne();
      
      const totalStaked = totalStakedResult?.total || '0';
      const events = await this.stakedEthRepository.find({ take: 1000 });
      
      const uniqueValidators = new Set(events.map(event => event.pubkey)).size;
      const totalEvents = events.length;
      const averageStake = totalEvents > 0 ? (BigInt(totalStaked) / BigInt(totalEvents)).toString() : '0';

      return {
        totalEvents,
        totalStaked,
        uniqueValidators,
        averageStake
      };
    } catch (error) {
      console.error('Error calculating staked ETH stats:', error);
      throw new HttpException(
        'Failed to calculate staked ETH statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStakedEthByBlock(): Promise<StakedEthByBlock[]> {
    try {
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
    } catch (error) {
      console.error('Error fetching staked ETH by block:', error);
      throw new HttpException(
        'Failed to fetch staked ETH by block data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTotalStakedEth(): Promise<string> {
    try {
      const result = await this.stakedEthRepository
        .createQueryBuilder('event')
        .select('SUM(CAST(event.amount AS DECIMAL))', 'total')
        .getRawOne();
      
      return result?.total || '0';
    } catch (error) {
      console.error('Error fetching total staked ETH:', error);
      throw new HttpException(
        'Failed to fetch total staked ETH',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  async getStakedEthEventsByBlock(blockNumber: number): Promise<StakedEthEvent[]> {
    try {
      return await this.stakedEthRepository
        .createQueryBuilder('event')
        .where('event.blockNumber = :blockNumber', { blockNumber })
        .orderBy('event.logIndex', 'DESC')
        .getMany();
    } catch (error) {
      console.error('Error in getStakedEthEventsByBlock:', error);
      throw new HttpException(
        'Failed to fetch staked ETH events by block',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getAllStakedEthEvents(skip: number, limit: number): Promise<StakedEthEvent[]> {
    try {
      return await this.stakedEthRepository.find({
        order: { blockNumber: 'DESC', logIndex: 'DESC' },
        take: limit,
        skip: skip,
      });
    } catch (error) {
      console.error('Error in getAllStakedEthEvents:', error);
      throw new HttpException(
        'Failed to fetch all staked ETH events',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  async getStakedEthSummaryByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthByBlock[]> {
    try {
      const events = await this.stakedEthRepository
        .createQueryBuilder('event')
        .where('event.blockNumber >= :startBlock AND event.blockNumber <= :endBlock', {
          startBlock,
          endBlock,
        })
        .orderBy('event.blockNumber', 'DESC')
        .addOrderBy('event.logIndex', 'DESC')
        .getMany();
      // Group by block and calculate summary
      const blockMap = new Map<number, StakedEthByBlock>();
      
      events.forEach(event => {
        const blockNumber = event.blockNumber;
        if (!blockMap.has(blockNumber)) {
          blockMap.set(blockNumber, {
            blockNumber,
            blockTimestamp: event.blockTimestamp,
            totalDeposited: '0',
            eventCount: 0
          });
        }
        
        const blockData = blockMap.get(blockNumber)!;
        blockData.totalDeposited = (BigInt(blockData.totalDeposited) + BigInt(event.amount)).toString();
        blockData.eventCount++;
      });
      
      return Array.from(blockMap.values());
    } catch (error) {
      console.error('Error in getStakedEthSummaryByBlockRange:', error);
      throw new HttpException(
        'Failed to fetch staked ETH summary by block range',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getStakedEthByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthByBlock[]> {
    try {
      return await this.getStakedEthSummaryByBlockRange(startBlock, endBlock);
    } catch (error) {
      console.error('Error in getStakedEthByBlockRange:', error);
      throw new HttpException(
        'Failed to fetch staked ETH by block range',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}