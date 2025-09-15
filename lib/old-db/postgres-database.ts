import { Pool, PoolClient } from 'pg';
import { 
  DatabaseClient, 
  DatabaseResult, 
  DatabaseService, 
  StakedEthByBlock 
} from './database-interface';
import { PodDeployedEvent, StakedEthEvent } from './entities';

export class PostgresClient implements DatabaseClient {
  private client?: PoolClient;
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async connect(): Promise<void> {
    this.client = await this.pool.connect();
  }

  async run(sql: string, params?: any[]): Promise<DatabaseResult> {
    if (!this.client) {
      await this.connect();
    }
    
    if (!this.client) {
      throw new Error('Failed to connect to database');
    }
    
    const result = await this.client.query(sql, params);
    return {
      lastID: result.rows[0]?.id,
      changes: result.rowCount || 0,
      rows: result.rows
    };
  }

  async get(sql: string, params?: any[]): Promise<any> {
    if (!this.client) {
      await this.connect();
    }
    
    if (!this.client) {
      throw new Error('Failed to connect to database');
    }
    
    const result = await this.client.query(sql, params);
    return result.rows[0] || null;
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    if (!this.client) {
      await this.connect();
    }
    
    if (!this.client) {
      throw new Error('Failed to connect to database');
    }
    
    const result = await this.client.query(sql, params);
    return result.rows;
  }

  async close(): Promise<void> {
    if (this.client) {
      this.client.release();
    }
    await this.pool.end();
  }
}

export class PostgresDatabaseService implements DatabaseService {
  private client: PostgresClient;

  constructor(connectionString: string) {
    this.client = new PostgresClient(connectionString);
  }

  async initialize(): Promise<void> {
    await this.client.connect();
    await this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    // Create pod_deployed_events table
    const createPodTableSQL = `
      CREATE TABLE IF NOT EXISTS pod_deployed_events (
        id SERIAL PRIMARY KEY,
        eigenPod TEXT NOT NULL,
        podOwner TEXT NOT NULL,
        blockNumber INTEGER NOT NULL,
        transactionHash TEXT NOT NULL,
        logIndex INTEGER NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(transactionHash, logIndex)
      )
    `;

    const createPodIndexesSQL = [
      'CREATE INDEX IF NOT EXISTS idx_pod_block_number ON pod_deployed_events(blockNumber)',
      'CREATE INDEX IF NOT EXISTS idx_pod_eigen_pod ON pod_deployed_events(eigenPod)',
      'CREATE INDEX IF NOT EXISTS idx_pod_owner ON pod_deployed_events(podOwner)'
    ];

    await this.client.run(createPodTableSQL);
    for (const indexSQL of createPodIndexesSQL) {
      await this.client.run(indexSQL);
    }

    // Create staked_eth_events table
    const createStakedEthTableSQL = `
      CREATE TABLE IF NOT EXISTS staked_eth_events (
        id SERIAL PRIMARY KEY,
        pubkey TEXT NOT NULL,
        withdrawalCredentials TEXT NOT NULL,
        amount TEXT NOT NULL,
        signature TEXT NOT NULL,
        depositIndex TEXT NOT NULL,
        blockNumber INTEGER NOT NULL,
        blockTimestamp INTEGER NOT NULL,
        transactionHash TEXT NOT NULL,
        logIndex INTEGER NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(transactionHash, logIndex)
      )
    `;

    const createStakedEthIndexesSQL = [
      'CREATE INDEX IF NOT EXISTS idx_staked_eth_block_number ON staked_eth_events(blockNumber)',
      'CREATE INDEX IF NOT EXISTS idx_staked_eth_pubkey ON staked_eth_events(pubkey)',
      'CREATE INDEX IF NOT EXISTS idx_staked_eth_withdrawal_credentials ON staked_eth_events(withdrawalCredentials)',
      'CREATE INDEX IF NOT EXISTS idx_staked_eth_deposit_index ON staked_eth_events(depositIndex)',
      'CREATE INDEX IF NOT EXISTS idx_staked_eth_block_timestamp ON staked_eth_events(blockTimestamp)'
    ];

    await this.client.run(createStakedEthTableSQL);
    for (const indexSQL of createStakedEthIndexesSQL) {
      await this.client.run(indexSQL);
    }
  }

  async insertPodDeployedEvent(event: PodDeployedEvent): Promise<void> {
    const sql = `
      INSERT INTO pod_deployed_events (eigenPod, podOwner, blockNumber, transactionHash, logIndex)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (transactionHash, logIndex) DO NOTHING
    `;
    
    await this.client.run(sql, [
      event.eigenPod,
      event.podOwner,
      event.blockNumber,
      event.transactionHash,
      event.logIndex
    ]);
  }

  async insertStakedEthEvent(event: StakedEthEvent): Promise<void> {
    const sql = `
      INSERT INTO staked_eth_events (pubkey, withdrawalCredentials, amount, signature, depositIndex, blockNumber, blockTimestamp, transactionHash, logIndex)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (transactionHash, logIndex) DO NOTHING
    `;
    
    await this.client.run(sql, [
      event.pubkey,
      event.withdrawalCredentials,
      event.amount,
      event.signature,
      event.depositIndex,
      event.blockNumber,
      event.blockTimestamp,
      event.transactionHash,
      event.logIndex
    ]);
  }

  async getPodDeployedEvents(limit: number = 100, offset: number = 0): Promise<PodDeployedEvent[]> {
    const sql = `
      SELECT 
        id,
        eigenPod,
        podOwner,
        blocknumber,
        transactionHash,
        logIndex,
        createdAt
      FROM pod_deployed_events 
      ORDER BY blocknumber DESC, logIndex DESC 
      LIMIT $1 OFFSET $2
    `;
    
    const rows = await this.client.all(sql, [limit, offset]);
    return rows.map(row => ({
      id: row.id,
      eigenPod: row.eigenpod,
      podOwner: row.podowner,
      blockNumber: row.blocknumber,
      transactionHash: row.transactionhash,
      logIndex: row.logindex,
      createdAt: row.createdat
    }));
  }

  async getStakedEthEvents(limit: number = 100, offset: number = 0): Promise<StakedEthEvent[]> {
    const sql = `
      SELECT 
        id,
        pubkey,
        withdrawalCredentials,
        amount,
        signature,
        depositIndex,
        blocknumber,
        blocktimestamp,
        transactionHash,
        logIndex,
        createdAt
      FROM staked_eth_events 
      ORDER BY blocknumber DESC, logIndex DESC 
      LIMIT $1 OFFSET $2
    `;
    
    const rows = await this.client.all(sql, [limit, offset]);
    return rows.map(row => ({
      id: row.id,
      pubkey: row.pubkey,
      withdrawalCredentials: row.withdrawalcredentials,
      amount: row.amount,
      signature: row.signature,
      depositIndex: row.depositindex,
      blockNumber: row.blocknumber,
      blockTimestamp: row.blocktimestamp,
      transactionHash: row.transactionhash,
      logIndex: row.logindex,
      createdAt: row.createdat
    }));
  }

  async getPodDeployedEventsByOwner(owner: string): Promise<PodDeployedEvent[]> {
    const sql = `
      SELECT * FROM pod_deployed_events 
      WHERE podOwner = $1 
      ORDER BY blocknumber DESC, logIndex DESC
    `;
    
    return await this.client.all(sql, [owner]);
  }

  async getStakedEthEventsByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthEvent[]> {
    const sql = `
      SELECT * FROM staked_eth_events 
      WHERE blockNumber >= $1 AND blockNumber <= $2 
      ORDER BY blocknumber DESC, logIndex DESC
    `;
    
    return await this.client.all(sql, [startBlock, endBlock]);
  }

  async getTotalStakedEth(): Promise<string> {
    const sql = `
      SELECT SUM(CAST(amount AS NUMERIC)) as total 
      FROM staked_eth_events
    `;
    
    const result = await this.client.get(sql);
    return result?.total?.toString() || '0';
  }

  async getStakedEthByBlock(): Promise<StakedEthByBlock[]> {
    const sql = `
      SELECT 
        blockNumber,
        blockTimestamp,
        SUM(CAST(amount AS NUMERIC)) as totalDeposited,
        COUNT(*) as eventCount
      FROM staked_eth_events 
      GROUP BY blockNumber, blockTimestamp 
      ORDER BY blockNumber DESC
    `;
    
    return await this.client.all(sql);
  }

  async getPodDeployedEventsByBlockRange(startBlock: number, endBlock: number): Promise<PodDeployedEvent[]> {
    const sql = `
      SELECT 
        id,
        eigenPod,
        podOwner,
        blocknumber,
        transactionHash,
        logIndex,
        createdAt
      FROM pod_deployed_events 
      WHERE blocknumber >= $1 AND blocknumber <= $2 
      ORDER BY blocknumber DESC, logIndex DESC
    `;
    
    const rows = await this.client.all(sql, [startBlock, endBlock]);
    return rows.map(row => ({
      id: row.id,
      eigenPod: row.eigenpod,
      podOwner: row.podowner,
      blockNumber: row.blocknumber,
      transactionHash: row.transactionhash,
      logIndex: row.logindex,
      createdAt: row.createdat
    }));
  }

  async run(sql: string, params?: any[]): Promise<any> {
    if (!this.client) {
      await this.connect();
    }
    
    if (!this.client) {
      throw new Error('Failed to connect to database');
    }
    
    const result = await this.client.query(sql, params);
    return {
      lastID: result.rows[0]?.id,
      changes: result.rowCount || 0,
    };
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    if (!this.client) {
      await this.connect();
    }
    
    if (!this.client) {
      throw new Error('Failed to connect to database');
    }
    
    const result = await this.client.query(sql, params);
    return result.rows;
  }

  async get(sql: string, params?: any[]): Promise<any> {
    if (!this.client) {
      await this.connect();
    }
    
    if (!this.client) {
      throw new Error('Failed to connect to database');
    }
    
    const result = await this.client.query(sql, params);
    return result.rows[0] || null;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
