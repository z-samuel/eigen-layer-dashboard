import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { ethers } from 'ethers';
import axios from 'axios';
import { PodDeployedEvent as EigenPodEvent } from '@eigen-layer-dashboard/lib';

export interface EigenPodResponse {
  eigenPod: string;
  podOwner: string;
  blockNumber?: number;
  source: 'database' | 'contract';
}

export interface ValidatorData {
  activationeligibilityepoch: number;
  activationepoch: number;
  balance: number;
  effectivebalance: number;
  exitepoch: number;
  lastattestationslot: number;
  name: string;
  pubkey: string;
  slashed: boolean;
  status: string;
  validatorindex: number;
  withdrawableepoch: number;
  withdrawalcredentials: string;
  total_withdrawals: number;
}

export interface BeaconchaResponse {
  status: string;
  data: ValidatorData;
}

@Injectable()
export class EigenPodService {
  private db: sqlite3.Database;
  private run: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  private get: (sql: string, params?: any[]) => Promise<any>;
  private all: (sql: string, params?: any[]) => Promise<any[]>;
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  // EigenPodManager ABI - only the getPod function
  private readonly EIGENPOD_MANAGER_ABI = [
    "function getPod(address podOwner) external view returns (address)"
  ];

  constructor() {
    // Connect to the indexer's SQLite database
    const dbPath = process.env.INDEXER_DB_PATH || '../indexer/indexer.db';
    this.db = new sqlite3.Database(dbPath);
    
    // Promisify database methods
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));

    // Initialize Ethereum provider and contract
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
    const contractAddress = process.env.EIGENPOD_MANAGER_ADDRESS || '0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338';
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, this.EIGENPOD_MANAGER_ABI, this.provider);
  }

  async getEigenPodsByOwner(ownerAddress: string): Promise<EigenPodResponse[]> {
    try {
      // First, try to get from database
      const sql = `
        SELECT * FROM pod_deployed_events 
        WHERE LOWER(podOwner) = LOWER(?)
        ORDER BY blockNumber DESC
      `;
      
      const events = await this.all(sql, [ownerAddress]);
      
      if (events.length > 0) {
        // Return database results
        return events.map(event => ({
          eigenPod: event.eigenPod,
          podOwner: event.podOwner,
          blockNumber: event.blockNumber,
          source: 'database' as const
        }));
      }

      // If no results in database, try to get from contract
      try {
        const eigenPodAddress = await this.contract.getPod(ownerAddress);
        
        // Check if the returned address is not zero address
        if (eigenPodAddress && eigenPodAddress !== '0x0000000000000000000000000000000000000000') {
          return [{
            eigenPod: eigenPodAddress,
            podOwner: ownerAddress,
            source: 'contract' as const
          }];
        }
      } catch (contractError) {
        console.warn('Error calling contract getPod:', contractError);
        // Continue to return empty array if contract call fails
      }

      // Return empty array if no results found
      return [];
    } catch (error) {
      console.error('Error querying EigenPods by owner:', error);
      throw new HttpException(
        'Failed to query EigenPods from database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getEigenPodByAddress(eigenPodAddress: string): Promise<EigenPodEvent | null> {
    try {
      // Use LOWER() function for case-insensitive search
      const sql = `
        SELECT * FROM pod_deployed_events 
        WHERE LOWER(eigenPod) = LOWER(?)
        ORDER BY blockNumber DESC
        LIMIT 1
      `;
      
      const event = await this.get(sql, [eigenPodAddress]);
      
      if (!event) {
        return null;
      }
      
      return {
        id: event.id,
        eigenPod: event.eigenPod,
        podOwner: event.podOwner,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        createdAt: event.createdAt
      };
    } catch (error) {
      console.error('Error querying EigenPod by address:', error);
      throw new HttpException(
        'Failed to query EigenPod from database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllEigenPods(skip: number = 0, limit: number = 100): Promise<{
    eigenPods: EigenPodEvent[];
    total: number;
  }> {
    try {
      // Get total count
      const countSql = 'SELECT COUNT(*) as count FROM pod_deployed_events';
      const countResult = await this.get(countSql);
      const total = countResult?.count || 0;

      // Get paginated results
      const sql = `
        SELECT * FROM pod_deployed_events 
        ORDER BY blockNumber DESC
        LIMIT ? OFFSET ?
      `;
      
      const events = await this.all(sql, [limit, skip]);
      
      const eigenPods = events.map(event => ({
        id: event.id,
        eigenPod: event.eigenPod,
        podOwner: event.podOwner,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        createdAt: event.createdAt
      }));

      return { eigenPods, total };
    } catch (error) {
      console.error('Error querying all EigenPods:', error);
      throw new HttpException(
        'Failed to query EigenPods from database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getEigenPodsByBlockRange(startBlock: number, endBlock: number): Promise<EigenPodEvent[]> {
    try {
      const sql = `
        SELECT * FROM pod_deployed_events 
        WHERE blockNumber >= ? AND blockNumber <= ?
        ORDER BY blockNumber DESC
      `;
      
      const events = await this.all(sql, [startBlock, endBlock]);
      
      return events.map(event => ({
        id: event.id,
        eigenPod: event.eigenPod,
        podOwner: event.podOwner,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        createdAt: event.createdAt
      }));
    } catch (error) {
      console.error('Error querying EigenPods by block range:', error);
      throw new HttpException(
        'Failed to query EigenPods from database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDatabaseStatus(): Promise<{
    totalEvents: number;
    lastIndexedBlock: number;
    isConnected: boolean;
  }> {
    try {
      // Check if database is connected and table exists
      const tableExistsSql = `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='pod_deployed_events'
      `;
      const tableExists = await this.get(tableExistsSql);
      
      if (!tableExists) {
        return {
          totalEvents: 0,
          lastIndexedBlock: 0,
          isConnected: false
        };
      }

      // Get total events count
      const countSql = 'SELECT COUNT(*) as count FROM pod_deployed_events';
      const countResult = await this.get(countSql);
      const totalEvents = countResult?.count || 0;

      // Get last indexed block
      const lastBlockSql = 'SELECT MAX(blockNumber) as maxBlock FROM pod_deployed_events';
      const lastBlockResult = await this.get(lastBlockSql);
      const lastIndexedBlock = lastBlockResult?.maxBlock || 0;

      return {
        totalEvents,
        lastIndexedBlock,
        isConnected: true
      };
    } catch (error) {
      console.error('Error checking database status:', error);
      return {
        totalEvents: 0,
        lastIndexedBlock: 0,
        isConnected: false
      };
    }
  }

  async getEigenPodByValidatorPublicKey(publicKey: string): Promise<EigenPodEvent[]> {
    // Note: getting EigenPod by validator usually returns empty result
    // because not all validator has Eigen Pod as its withdrawal destination.
    try {
      // Validate public key format (should be 0x + 96 hex characters)
      if (!publicKey || !publicKey.match(/^0x[a-fA-F0-9]{96}$/)) {
        throw new HttpException('Invalid validator public key format', HttpStatus.BAD_REQUEST);
      }

      // Call Beaconcha.in API to get validator data
      const beaconchaUrl = `https://beaconcha.in/api/v1/validator/${publicKey}`;
      
      let validatorData: ValidatorData;
      try {
        const response = await axios.get<BeaconchaResponse>(beaconchaUrl, {
          timeout: 10000, // 10 second timeout
          headers: {
            'User-Agent': 'EigenLayer-Dashboard/1.0'
          }
        });

        if (response.data.status !== 'OK' || !response.data.data) {
          throw new HttpException('Validator not found or invalid response from Beaconcha.in', HttpStatus.NOT_FOUND);
        }

        validatorData = response.data.data;
      } catch (apiError) {
        console.error('Error calling Beaconcha.in API:', apiError);
        if (axios.isAxiosError(apiError) && apiError.response?.status === 404) {
          throw new HttpException('Validator not found', HttpStatus.NOT_FOUND);
        }
        throw new HttpException('Failed to fetch validator data from Beaconcha.in', HttpStatus.SERVICE_UNAVAILABLE);
      }

      // Extract withdrawal destination from withdrawal credentials
      const withdrawalCredentials = validatorData.withdrawalcredentials;
      
      // Check if withdrawal credentials start with 0x01 (ETH1_ADDRESS_WITHDRAWAL_PREFIX)
      if (!withdrawalCredentials.startsWith('0x01')) {
        // Not an ETH1 address withdrawal, return empty array
        return [];
      }

      // Extract the withdrawal destination address (last 40 characters after 0x01)
      const withdrawalDestination = '0x' + withdrawalCredentials.slice(4); // Remove '0x01' prefix

      // Check if this address exists as an EigenPod in our database
      const sql = `
        SELECT * FROM pod_deployed_events 
        WHERE LOWER(eigenPod) = LOWER(?)
        ORDER BY blockNumber DESC
      `;
      
      const events = await this.all(sql, [withdrawalDestination]);
      
      return events.map(event => ({
        id: event.id,
        eigenPod: event.eigenPod,
        podOwner: event.podOwner,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        createdAt: event.createdAt
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error getting EigenPod by validator public key:', error);
      throw new HttpException(
        'Failed to get EigenPod by validator public key',
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
