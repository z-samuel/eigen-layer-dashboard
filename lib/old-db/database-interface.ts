import { PodDeployedEvent, StakedEthEvent } from './entities';

export interface DatabaseResult {
  lastID?: number;
  changes?: number;
  rows?: any[];
}

export interface DatabaseClient {
  run(sql: string, params?: any[]): Promise<DatabaseResult>;
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  close(): Promise<void>;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql';
  connectionString?: string;
  filePath?: string;
}

export interface DatabaseService {
  initialize(): Promise<void>;
  insertPodDeployedEvent(event: PodDeployedEvent): Promise<void>;
  insertStakedEthEvent(event: StakedEthEvent): Promise<void>;
  getPodDeployedEvents(limit?: number, offset?: number): Promise<PodDeployedEvent[]>;
  getStakedEthEvents(limit?: number, offset?: number): Promise<StakedEthEvent[]>;
  getPodDeployedEventsByOwner(owner: string): Promise<PodDeployedEvent[]>;
  getPodDeployedEventsByBlockRange(startBlock: number, endBlock: number): Promise<PodDeployedEvent[]>;
  getStakedEthEventsByBlockRange(startBlock: number, endBlock: number): Promise<StakedEthEvent[]>;
  getTotalStakedEth(): Promise<string>;
  getStakedEthByBlock(): Promise<StakedEthByBlock[]>;
  run(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  get(sql: string, params?: any[]): Promise<any>;
  close(): Promise<void>;
}


export interface StakedEthByBlock {
  blockNumber: number;
  blockTimestamp: number;
  totalDeposited: string;
  eventCount: number;
}
