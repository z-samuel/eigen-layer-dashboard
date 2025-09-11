import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { StakedEthEvent } from '@eigen-layer-dashboard/lib';

export interface StakedEthStats {
  totalEvents: number;
  totalAmount: string;
  lastBlock: number;
}

export interface StakedEthByBlock {
  blockNumber: number;
  blockTimestamp: number;
  totalDeposited: string;
  eventCount: number;
}

@Injectable()
export class StakedEthService {
  private db: sqlite3.Database;
  private run: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  private get: (sql: string, params?: any[]) => Promise<any>;
  private all: (sql: string, params?: any[]) => Promise<any[]>;

  constructor() {
    // Connect to the indexer's SQLite database
    const dbPath = process.env.INDEXER_DB_PATH || '../indexer/indexer.db';
    this.db = new sqlite3.Database(dbPath);
    
    // Promisify database methods
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));
  }

  async initialize(): Promise<void> {
    // Database is already initialized by the indexer
    console.log('StakedEthService initialized');
  }

  async getStakedEthEventsByPubkey(pubkey: string): Promise<StakedEthEvent[]> {
    try {
      const sql = `
        SELECT * FROM staked_eth_events 
        WHERE LOWER(pubkey) = LOWER(?)
        ORDER BY blockNumber DESC
      `;
      
      const events = await this.all(sql, [pubkey]);
      
      return events.map(event => ({
        id: event.id,
        pubkey: event.pubkey,
        withdrawalCredentials: event.withdrawalCredentials,
        amount: event.amount ? BigInt(event.amount).toString() : '0',
        signature: event.signature,
        depositIndex: event.depositIndex,
        blockNumber: event.blockNumber,
        blockTimestamp: event.blockTimestamp,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        createdAt: event.createdAt
      }));
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
      const sql = `
        SELECT * FROM staked_eth_events 
        WHERE LOWER(withdrawalCredentials) = LOWER(?)
        ORDER BY blockNumber DESC
      `;
      
      const events = await this.all(sql, [withdrawalCredentials]);
      
      return events.map(event => ({
        id: event.id,
        pubkey: event.pubkey,
        withdrawalCredentials: event.withdrawalCredentials,
        amount: event.amount ? BigInt(event.amount).toString() : '0',
        signature: event.signature,
        depositIndex: event.depositIndex,
        blockNumber: event.blockNumber,
        blockTimestamp: event.blockTimestamp,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        createdAt: event.createdAt
      }));
    } catch (error) {
      console.error('Error querying staked ETH events by withdrawal credentials:', error);
      throw new HttpException(
        'Failed to query staked ETH events from database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllStakedEthEvents(skip: number = 0, limit: number = 100): Promise<{ events: StakedEthEvent[]; total: number; }> {
    try {
      const countSql = 'SELECT COUNT(*) as count FROM staked_eth_events';
      const countResult = await this.get(countSql);
      const total = countResult?.count || 0;

      const sql = `
        SELECT * FROM staked_eth_events 
        ORDER BY blockNumber DESC, logIndex DESC
        LIMIT ? OFFSET ?
      `;
      
      const events = await this.all(sql, [limit, skip]);
      
      return {
        events: events.map(event => (
          {
            id: event.id,
            pubkey: event.pubkey,
            withdrawalCredentials: event.withdrawalCredentials || null,
            amount: event.amount ? BigInt(event.amount).toString() : '0',
            signature: event.signature,
            depositIndex: event.depositIndex || null,
            blockNumber: event.blockNumber,
            blockTimestamp: event.blockTimestamp,
            transactionHash: event.transactionHash,
            logIndex: event.logIndex,
            createdAt: event.createdAt
          })),
        total
      };
    } catch (error) {
      console.error('Error querying all staked ETH events:', error);
      throw new HttpException(
        'Failed to query staked ETH events from database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStakedEthEventsByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthEvent[]> {
    try {
      const sql = `
        SELECT * FROM staked_eth_events 
        WHERE blockNumber >= ? AND blockNumber <= ?
        ORDER BY blockNumber ASC, logIndex ASC
      `;
      
      const events = await this.all(sql, [startBlock, endBlock]);
      
      return events.map(event => ({
        id: event.id,
        pubkey: event.pubkey,
        withdrawalCredentials: event.withdrawalCredentials,
        amount: event.amount ? BigInt(event.amount).toString() : '0',
        signature: event.signature,
        depositIndex: event.depositIndex,
        blockNumber: event.blockNumber,
        blockTimestamp: event.blockTimestamp,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        createdAt: event.createdAt
      }));
    } catch (error) {
      console.error('Error querying staked ETH events by block range:', error);
      throw new HttpException(
        'Failed to query staked ETH events from database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStakedEthEventsByBlock(blockNumber: number): Promise<StakedEthEvent[]> {
    try {
      const sql = `
        SELECT * FROM staked_eth_events 
        WHERE blockNumber = ?
        ORDER BY logIndex ASC
      `;
      
      const events = await this.all(sql, [blockNumber]);
      
      return events.map(event => ({
        id: event.id,
        pubkey: event.pubkey,
        withdrawalCredentials: event.withdrawalCredentials,
        amount: event.amount ? BigInt(event.amount).toString() : '0',
        signature: event.signature,
        depositIndex: event.depositIndex,
        blockNumber: event.blockNumber,
        blockTimestamp: event.blockTimestamp,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        createdAt: event.createdAt
      }));
    } catch (error) {
      console.error('Error querying staked ETH events by block:', error);
      throw new HttpException(
        'Failed to query staked ETH events from database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStakedEthStats(): Promise<StakedEthStats> {
    try {
      const totalEvents = await this.getTotalStakedEthCount();
      const lastBlock = await this.getLastStakedEthBlock();
      
      // Get all amounts and sum them in JavaScript to avoid SQLite integer overflow
      const amountsSql = 'SELECT amount FROM staked_eth_events';
      const amounts = await this.all(amountsSql);
      
      let totalAmount = BigInt(0);
      for (const row of amounts) {
        totalAmount += BigInt(row.amount);
      }
      
      return {
        totalEvents,
        totalAmount: totalAmount.toString(),
        lastBlock
      };
    } catch (error) {
      console.error('Error getting staked ETH stats:', error);
      throw new HttpException(
        'Failed to get staked ETH statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getTotalStakedEthCount(): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM staked_eth_events';
    const result = await this.get(sql);
    return result?.count || 0;
  }

  private async getLastStakedEthBlock(): Promise<number> {
    const sql = 'SELECT MAX(blockNumber) as maxBlock FROM staked_eth_events';
    const result = await this.get(sql);
    return result?.maxBlock || 0;
  }

  async getStakedEthByBlock(blockNumber: number): Promise<StakedEthByBlock | null> {
    try {
      // Get all events up to and including the specified block
      const sql = `
        SELECT 
          blockNumber,
          blockTimestamp,
          amount
        FROM staked_eth_events 
        WHERE blockNumber <= ?
        ORDER BY blockNumber ASC, logIndex ASC
      `;
      
      const events = await this.all(sql, [blockNumber]);
      
      if (events.length === 0) {
        return null;
      }

      // Calculate block-specific data
      let blockDeposited = BigInt(0);
      let eventCount = 0;
      let blockTimestamp = 0;

      for (const event of events) {
        if (event.blockNumber === blockNumber) {
          // Convert hex string to BigInt
          const amount = event.amount ? BigInt(event.amount) : BigInt(0);
          blockDeposited += amount;
          eventCount++;
          blockTimestamp = event.blockTimestamp;
        }
      }

      // Only return data if there are actual events
      if (eventCount === 0) {
        return null;
      }

      return {
        blockNumber,
        blockTimestamp,
        totalDeposited: blockDeposited.toString(),
        eventCount
      };
    } catch (error) {
      console.error('Error getting staked ETH by block:', error);
      throw new HttpException(
        'Failed to get staked ETH by block',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStakedEthByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthByBlock[]> {
    try {
      const results: StakedEthByBlock[] = [];
      
      for (let blockNumber = endBlock; blockNumber >= startBlock; blockNumber--) {
        const blockData = await this.getStakedEthByBlock(blockNumber);
        if (blockData) {
          results.push(blockData);
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting staked ETH by block range:', error);
      throw new HttpException(
        'Failed to get staked ETH by block range',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStakedEthSummaryByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthByBlock[]> {
    try {
      // Get aggregated data by block for the range
      const sql = `
        SELECT 
          blockNumber,
          blockTimestamp,
          COUNT(*) as eventCount,
          amount
        FROM staked_eth_events 
        WHERE blockNumber >= ? AND blockNumber <= ?
        ORDER BY blockNumber DESC, logIndex DESC
      `;
      
      const events = await this.all(sql, [startBlock, endBlock]);
      
      // Group events by block and calculate totals
      const blockMap = new Map<number, { blockTimestamp: number; totalDeposited: bigint; eventCount: number }>();
      
      for (const event of events) {
        const blockNum = event.blockNumber;
        const amount = event.amount ? BigInt(event.amount) : BigInt(0);
        
        if (!blockMap.has(blockNum)) {
          blockMap.set(blockNum, {
            blockTimestamp: event.blockTimestamp,
            totalDeposited: 0n,
            eventCount: 0
          });
        }
        
        const blockData = blockMap.get(blockNum)!;
        blockData.totalDeposited += amount;
        blockData.eventCount++;
      }
      
      // Build results array
      const results: StakedEthByBlock[] = [];

      for (const [blockNumber, blockData] of blockMap) {
        results.push({
          blockNumber,
          blockTimestamp: blockData.blockTimestamp,
          totalDeposited: blockData.totalDeposited.toString(),
          eventCount: blockData.eventCount
        });
      }

      // Sort by block number in descending order (most recent first)
      return results.sort((a, b) => b.blockNumber - a.blockNumber);
    } catch (error) {
      console.error('Error getting staked ETH summary by block range:', error);
      throw new HttpException(
        'Failed to get staked ETH summary by block range',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
