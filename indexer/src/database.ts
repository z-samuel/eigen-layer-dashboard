import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { PodDeployedEvent, StakedEthEvent } from '@eigen-layer-dashboard/lib';

export class DatabaseService {
  private db: sqlite3.Database;
  private run: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  private get: (sql: string, params?: any[]) => Promise<any>;
  private all: (sql: string, params?: any[]) => Promise<any[]>;

  constructor(dbPath: string = './indexer.db') {
    this.db = new sqlite3.Database(dbPath);
    
    // Promisify database methods
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));
  }

  async initialize(): Promise<void> {
    await this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS pod_deployed_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eigenPod TEXT NOT NULL,
        podOwner TEXT NOT NULL,
        blockNumber INTEGER NOT NULL,
        transactionHash TEXT NOT NULL,
        logIndex INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(transactionHash, logIndex)
      )
    `;

    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_block_number ON pod_deployed_events(blockNumber);
    `;

    const createIndexSQL2 = `
      CREATE INDEX IF NOT EXISTS idx_eigen_pod ON pod_deployed_events(eigenPod);
    `;

    const createIndexSQL3 = `
      CREATE INDEX IF NOT EXISTS idx_pod_owner ON pod_deployed_events(podOwner);
    `;

    await this.run(createTableSQL);
    await this.run(createIndexSQL);
    await this.run(createIndexSQL2);
    await this.run(createIndexSQL3);

    // Create staked ETH table
    const createStakedEthTableSQL = `
      CREATE TABLE IF NOT EXISTS staked_eth_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pubkey TEXT NOT NULL,
        withdrawalCredentials TEXT NOT NULL,
        amount TEXT NOT NULL,
        signature TEXT NOT NULL,
        depositIndex TEXT NOT NULL,
        blockNumber INTEGER NOT NULL,
        blockTimestamp INTEGER NOT NULL,
        transactionHash TEXT NOT NULL,
        logIndex INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(transactionHash, logIndex)
      )
    `;

    const createStakedEthIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_staked_eth_block_number ON staked_eth_events(blockNumber);
    `;

    const createStakedEthIndexSQL2 = `
      CREATE INDEX IF NOT EXISTS idx_staked_eth_pubkey ON staked_eth_events(pubkey);
    `;

    const createStakedEthIndexSQL3 = `
      CREATE INDEX IF NOT EXISTS idx_staked_eth_withdrawal_credentials ON staked_eth_events(withdrawalCredentials);
    `;

    const createStakedEthIndexSQL4 = `
      CREATE INDEX IF NOT EXISTS idx_staked_eth_deposit_index ON staked_eth_events(depositIndex);
    `;

    const createStakedEthIndexSQL5 = `
      CREATE INDEX IF NOT EXISTS idx_staked_eth_block_timestamp ON staked_eth_events(blockTimestamp);
    `;

    await this.run(createStakedEthTableSQL);
    await this.run(createStakedEthIndexSQL);
    await this.run(createStakedEthIndexSQL2);
    await this.run(createStakedEthIndexSQL3);
    await this.run(createStakedEthIndexSQL4);
    await this.run(createStakedEthIndexSQL5);

    // Add blockTimestamp column if it doesn't exist (migration)
    try {
      await this.run('ALTER TABLE staked_eth_events ADD COLUMN blockTimestamp INTEGER DEFAULT 0');
      console.log('Added blockTimestamp column to staked_eth_events table');
    } catch (error: any) {
      // Column already exists, ignore error
      if (!error.message.includes('duplicate column name')) {
        console.warn('Error adding blockTimestamp column:', error.message);
      }
    }

    // Migrate snake_case columns to camelCase
    await this.migrateToCamelCase();
    
    console.log('Database initialized successfully');
  }

  private async migrateToCamelCase(): Promise<void> {
    try {
      // Check if old snake_case columns exist
      const tableInfo = await this.all("PRAGMA table_info(staked_eth_events)");
      const hasOldColumns = tableInfo.some((col: any) => 
        col.name === 'withdrawal_credentials' || col.name === 'deposit_index'
      );
      const hasNewColumns = tableInfo.some((col: any) => 
        col.name === 'withdrawalCredentials' || col.name === 'depositIndex'
      );

      if (hasOldColumns && !hasNewColumns) {
        console.log('Migrating snake_case columns to camelCase...');
        
        // Add new camelCase columns
        await this.run('ALTER TABLE staked_eth_events ADD COLUMN withdrawalCredentials TEXT');
        await this.run('ALTER TABLE staked_eth_events ADD COLUMN depositIndex TEXT');
        
        // Copy data from old columns to new columns
        await this.run(`
          UPDATE staked_eth_events 
          SET withdrawalCredentials = withdrawal_credentials,
              depositIndex = deposit_index
        `);
        
        // Drop old columns (SQLite doesn't support DROP COLUMN, so we need to recreate the table)
        await this.run('BEGIN TRANSACTION');
        
        // Create new table with camelCase columns
        await this.run(`
          CREATE TABLE staked_eth_events_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pubkey TEXT NOT NULL,
            withdrawalCredentials TEXT NOT NULL,
            amount TEXT NOT NULL,
            signature TEXT NOT NULL,
            depositIndex TEXT NOT NULL,
            blockNumber INTEGER NOT NULL,
            blockTimestamp INTEGER NOT NULL,
            transactionHash TEXT NOT NULL,
            logIndex INTEGER NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(transactionHash, logIndex)
          )
        `);
        
        // Copy data to new table
        await this.run(`
          INSERT INTO staked_eth_events_new 
          (id, pubkey, withdrawalCredentials, amount, signature, depositIndex, 
           blockNumber, blockTimestamp, transactionHash, logIndex, createdAt)
          SELECT id, pubkey, withdrawalCredentials, amount, signature, depositIndex,
                 blockNumber, blockTimestamp, transactionHash, logIndex, createdAt
          FROM staked_eth_events
        `);
        
        // Drop old table and rename new table
        await this.run('DROP TABLE staked_eth_events');
        await this.run('ALTER TABLE staked_eth_events_new RENAME TO staked_eth_events');
        
        // Recreate indexes
        await this.run('CREATE INDEX IF NOT EXISTS idx_staked_eth_block_number ON staked_eth_events(blockNumber)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_staked_eth_pubkey ON staked_eth_events(pubkey)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_staked_eth_withdrawal_credentials ON staked_eth_events(withdrawalCredentials)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_staked_eth_deposit_index ON staked_eth_events(depositIndex)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_staked_eth_block_timestamp ON staked_eth_events(blockTimestamp)');
        
        await this.run('COMMIT');
        console.log('Successfully migrated columns to camelCase');
      }
    } catch (error: any) {
      console.warn('Error during camelCase migration:', error.message);
      try {
        await this.run('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors
      }
    }
  }

  async insertPodDeployedEvent(
    eigenPod: string,
    podOwner: string,
    blockNumber: number,
    transactionHash: string,
    logIndex: number
  ): Promise<void> {
    const sql = `
      INSERT OR IGNORE INTO pod_deployed_events 
      (eigenPod, podOwner, blockNumber, transactionHash, logIndex)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await this.run(sql, [eigenPod, podOwner, blockNumber, transactionHash, logIndex]);
  }

  async getLastIndexedBlock(): Promise<number> {
    const sql = 'SELECT MAX(blockNumber) as maxBlock FROM pod_deployed_events';
    const result = await this.get(sql);
    return result?.maxBlock || 0;
  }

  async getEventsByBlockRange(startBlock: number, endBlock: number): Promise<PodDeployedEvent[]> {
    const sql = `
      SELECT * FROM pod_deployed_events 
      WHERE blockNumber >= ? AND blockNumber <= ?
      ORDER BY blockNumber ASC, logIndex ASC
    `;
    
    return await this.all(sql, [startBlock, endBlock]);
  }

  async getEventsByEigenPod(eigenPod: string): Promise<PodDeployedEvent[]> {
    const sql = `
      SELECT * FROM pod_deployed_events 
      WHERE eigenPod = ?
      ORDER BY blockNumber DESC
    `;
    
    return await this.all(sql, [eigenPod]);
  }

  async getEventsByPodOwner(podOwner: string): Promise<PodDeployedEvent[]> {
    const sql = `
      SELECT * FROM pod_deployed_events 
      WHERE podOwner = ?
      ORDER BY blockNumber DESC
    `;
    
    return await this.all(sql, [podOwner]);
  }

  async getTotalEventCount(): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM pod_deployed_events';
    const result = await this.get(sql);
    return result?.count || 0;
  }

  async insertStakedEthEvent(
    pubkey: string,
    withdrawalCredentials: string,
    amount: string,
    signature: string,
    depositIndex: string,
    blockNumber: number,
    blockTimestamp: number,
    transactionHash: string,
    logIndex: number
  ): Promise<void> {
    const sql = `
      INSERT OR IGNORE INTO staked_eth_events 
      (pubkey, withdrawalCredentials, amount, signature, depositIndex, blockNumber, blockTimestamp, transactionHash, logIndex)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.run(sql, [pubkey, withdrawalCredentials, amount, signature, depositIndex, blockNumber, blockTimestamp, transactionHash, logIndex]);
  }

  async getLastStakedEthBlock(): Promise<number> {
    const sql = 'SELECT MAX(blockNumber) as maxBlock FROM staked_eth_events';
    const result = await this.get(sql);
    return result?.maxBlock || 0;
  }

  async getStakedEthEventsByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthEvent[]> {
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
      amount: event.amount,
      signature: event.signature,
      depositIndex: event.depositIndex,
      blockNumber: event.blockNumber,
      blockTimestamp: event.blockTimestamp,
      transactionHash: event.transactionHash,
      logIndex: event.logIndex,
      createdAt: event.createdAt
    }));
  }

  async getStakedEthEventsByPubkey(pubkey: string): Promise<StakedEthEvent[]> {
    const sql = `
      SELECT * FROM staked_eth_events 
      WHERE pubkey = ?
      ORDER BY blockNumber DESC
    `;
    
    const events = await this.all(sql, [pubkey]);
    return events.map(event => ({
      id: event.id,
      pubkey: event.pubkey,
      withdrawalCredentials: event.withdrawalCredentials,
      amount: event.amount,
      signature: event.signature,
      depositIndex: event.depositIndex,
      blockNumber: event.blockNumber,
      blockTimestamp: event.blockTimestamp,
      transactionHash: event.transactionHash,
      logIndex: event.logIndex,
      createdAt: event.createdAt
    }));
  }

  async getStakedEthEventsByWithdrawalCredentials(withdrawalCredentials: string): Promise<StakedEthEvent[]> {
    const sql = `
      SELECT * FROM staked_eth_events 
      WHERE withdrawalCredentials = ?
      ORDER BY blockNumber DESC
    `;
    
    const events = await this.all(sql, [withdrawalCredentials]);
    return events.map(event => ({
      id: event.id,
      pubkey: event.pubkey,
      withdrawalCredentials: event.withdrawalCredentials,
      amount: event.amount,
      signature: event.signature,
      depositIndex: event.depositIndex,
      blockNumber: event.blockNumber,
      blockTimestamp: event.blockTimestamp,
      transactionHash: event.transactionHash,
      logIndex: event.logIndex,
      createdAt: event.createdAt
    }));
  }

  async getTotalStakedEthCount(): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM staked_eth_events';
    const result = await this.get(sql);
    return result?.count || 0;
  }

  async getStakedEthByBlock(blockNumber: number): Promise<StakedEthEvent[]> {
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
      amount: event.amount,
      signature: event.signature,
      depositIndex: event.depositIndex,
      blockNumber: event.blockNumber,
      blockTimestamp: event.blockTimestamp,
      transactionHash: event.transactionHash,
      logIndex: event.logIndex,
      createdAt: event.createdAt
    }));
  }

  async getStakedEthStats(): Promise<{ totalEvents: number; totalAmount: string; lastBlock: number; }> {
    const totalEvents = await this.getTotalStakedEthCount();
    const lastBlock = await this.getLastStakedEthBlock();
    
    const amountSql = 'SELECT SUM(CAST(amount AS INTEGER)) as totalAmount FROM staked_eth_events';
    const amountResult = await this.get(amountSql);
    const totalAmount = amountResult?.totalAmount?.toString() || '0';
    
    return {
      totalEvents,
      totalAmount,
      lastBlock
    };
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
