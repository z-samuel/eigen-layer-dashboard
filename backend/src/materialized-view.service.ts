import { Injectable, Logger } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MaterializedViewService {
  private readonly logger = new Logger(MaterializedViewService.name);
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
    try {
      await this.createMaterializedView();
      await this.refreshMaterializedView();
      this.logger.log('Materialized view service initialized and refreshed');
    } catch (error) {
      this.logger.error('Failed to initialize materialized view service:', error);
      throw error;
    }
  }

  private async createMaterializedView(): Promise<void> {
    try {
      // Drop the materialized view if it exists
      await this.run('DROP VIEW IF EXISTS staked_eth_analytics_mv');
      
      // Create the materialized view with pre-aggregated data
      // Note: We'll handle BigInt aggregation in JavaScript to avoid SQLite integer overflow
      const createViewSQL = `
        CREATE VIEW staked_eth_analytics_mv AS
        SELECT 
          blockNumber,
          blockTimestamp,
          COUNT(*) as eventCount,
          GROUP_CONCAT(amount, ',') as amounts,
          MIN(blockTimestamp) as firstEventTimestamp,
          MAX(blockTimestamp) as lastEventTimestamp
        FROM staked_eth_events 
        GROUP BY blockNumber, blockTimestamp
        ORDER BY blockNumber ASC
      `;
      
      await this.run(createViewSQL);
      this.logger.log('Materialized view created successfully');
    } catch (error) {
      this.logger.error('Failed to create materialized view:', error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async refreshMaterializedView(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Drop and recreate the view to refresh data
      await this.createMaterializedView();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.logger.log(`Materialized view refreshed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Failed to refresh materialized view:', error);
    }
  }

  async getStakedEthAnalyticsByBlockRange(
    startBlock: number, 
    endBlock: number
  ): Promise<any[]> {
    try {
      const sql = `
        SELECT 
          blockNumber,
          blockTimestamp,
          eventCount,
          amounts,
          firstEventTimestamp,
          lastEventTimestamp
        FROM staked_eth_analytics_mv 
        WHERE blockNumber >= ? AND blockNumber <= ?
        ORDER BY blockNumber ASC
      `;
      
      const results = await this.all(sql, [startBlock, endBlock]);
      
      // Process results and calculate totalDeposited from amounts
      return results.map(row => {
        let totalDeposited = BigInt(0);
        
        if (row.amounts) {
          // Split the concatenated amounts and sum them
          const amounts = row.amounts.split(',').filter(amount => amount && amount !== '');
          for (const amount of amounts) {
            try {
              totalDeposited += BigInt(amount);
            } catch (e) {
              // Skip invalid amounts
              console.warn(`Invalid amount in materialized view: ${amount}`);
            }
          }
        }
        
        return {
          blockNumber: row.blockNumber,
          blockTimestamp: row.blockTimestamp,
          eventCount: row.eventCount,
          totalDeposited: totalDeposited.toString(),
          firstEventTimestamp: row.firstEventTimestamp,
          lastEventTimestamp: row.lastEventTimestamp
        };
      });
    } catch (error) {
      this.logger.error('Failed to query materialized view:', error);
      throw error;
    }
  }

  async getStakedEthAnalyticsByBlock(blockNumber: number): Promise<any | null> {
    try {
      const sql = `
        SELECT 
          blockNumber,
          blockTimestamp,
          eventCount,
          amounts,
          firstEventTimestamp,
          lastEventTimestamp
        FROM staked_eth_analytics_mv 
        WHERE blockNumber = ?
      `;
      
      const result = await this.get(sql, [blockNumber]);
      
      if (!result) {
        return null;
      }
      
      let totalDeposited = BigInt(0);
      
      if (result.amounts) {
        // Split the concatenated amounts and sum them
        const amounts = result.amounts.split(',').filter(amount => amount && amount !== '');
        for (const amount of amounts) {
          try {
            totalDeposited += BigInt(amount);
          } catch (e) {
            // Skip invalid amounts
            console.warn(`Invalid amount in materialized view: ${amount}`);
          }
        }
      }
      
      return {
        blockNumber: result.blockNumber,
        blockTimestamp: result.blockTimestamp,
        eventCount: result.eventCount,
        totalDeposited: totalDeposited.toString(),
        firstEventTimestamp: result.firstEventTimestamp,
        lastEventTimestamp: result.lastEventTimestamp
      };
    } catch (error) {
      this.logger.error('Failed to query materialized view for single block:', error);
      throw error;
    }
  }

  async getMaterializedViewStats(): Promise<{
    totalBlocks: number;
    lastRefresh: string;
    viewSize: number;
  }> {
    try {
      const statsSQL = 'SELECT COUNT(*) as totalBlocks FROM staked_eth_analytics_mv';
      const stats = await this.get(statsSQL);
      
      return {
        totalBlocks: stats?.totalBlocks || 0,
        lastRefresh: new Date().toISOString(),
        viewSize: 0 // SQLite doesn't provide view size easily
      };
    } catch (error) {
      this.logger.error('Failed to get materialized view stats:', error);
      throw error;
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
