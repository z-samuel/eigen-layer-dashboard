import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import { PodDeployedEvent } from '@eigen-layer-dashboard/lib';
import axios from 'axios';

export interface EigenPodResponse {
  eigenPod: string;
  podOwner: string;
  blockNumber?: number;
  transactionHash?: string;
  logIndex?: number;
  createdAt?: Date;
  source?: 'database' | 'contract';
}

export interface ValidatorData {
  pubkey: string;
  withdrawal_credentials: string;
  amount: string;
  signature: string;
  deposit_index: number;
}

export interface BeaconchaResponse {
  status: string;
  data: ValidatorData;
}

@Injectable()
export class EigenPodService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  // EigenPodManager ABI - only the getPod function
  private readonly EIGENPOD_MANAGER_ABI = [
    "function getPod(address podOwner) external view returns (address)"
  ];

  constructor(
    @InjectRepository(PodDeployedEvent)
    private podDeployedRepository: Repository<PodDeployedEvent>,
  ) {
    // Initialize Ethereum provider and contract
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
    const contractAddress = process.env.EIGENPOD_MANAGER_ADDRESS || '0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338';
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, this.EIGENPOD_MANAGER_ABI, this.provider);
  }

  async getEigenPodsByOwner(ownerAddress: string): Promise<EigenPodResponse[]> {
    try {
      // First, try to get from database using case-insensitive search
      const rawEvents = await this.podDeployedRepository.query(
        'SELECT * FROM pod_deployed_events WHERE LOWER(podowner) = LOWER($1) ORDER BY blocknumber DESC, logindex DESC',
        [ownerAddress]
      );
      
      if (rawEvents.length > 0) {
        // Return database results
        return rawEvents.map(event => ({
          eigenPod: event.eigenpod,
          podOwner: event.podowner,
          blockNumber: event.blocknumber,
          transactionHash: event.transactionhash,
          logIndex: event.logindex,
          createdAt: event.createdat,
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
        console.warn('Error querying contract:', contractError);
      }

      return [];
    } catch (error) {
      console.error('Error in getEigenPodsByOwner:', error);
      throw new HttpException(
        'Failed to fetch EigenPod data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getEigenPodByAddress(eigenPodAddress: string): Promise<EigenPodResponse | null> {
    try {
      // Query database for the specific EigenPod
      const events = await this.podDeployedRepository.find({
        where: { podOwner: eigenPodAddress.toLowerCase() },
        order: { blockNumber: 'DESC', logIndex: 'DESC' },
      });
      
      if (events.length > 0) {
        const event = events[0];
        return {
          eigenPod: event.eigenPod,
          podOwner: event.podOwner,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
          createdAt: event.createdAt,
          source: 'database' as const
        };
      }

      return null;
    } catch (error) {
      console.error('Error in getEigenPodByAddress:', error);
      throw new HttpException(
        'Failed to fetch EigenPod data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getAllEigenPods(limit: number = 100, offset: number = 0): Promise<EigenPodResponse[]> {
    try {
      const events = await this.podDeployedRepository.find({
        order: { blockNumber: 'DESC', logIndex: 'DESC' },
        take: limit,
        skip: offset,
      });
      
      return events.map(event => ({
        eigenPod: event.eigenPod,
        podOwner: event.podOwner,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        createdAt: event.createdAt,
        source: 'database' as const
      }));
    } catch (error) {
      console.error('Error in getAllEigenPods:', error);
      throw new HttpException(
        'Failed to fetch EigenPod data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getValidatorData(pubkey: string): Promise<ValidatorData | null> {
    try {
      const response = await axios.get(`https://beaconcha.in/api/v1/validator/${pubkey}`);
      const data: BeaconchaResponse = response.data;
      
      if (data.status === 'OK' && data.data) {
        return data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching validator data:', error);
      return null;
    }
  }


  async getEigenPodByValidatorPublicKey(validatorPublicKey: string): Promise<EigenPodResponse[]> {
    try {
      // This would need to be implemented based on your business logic
      // For now, returning empty array
      return [];
    } catch (error) {
      console.error('Error in getEigenPodByValidatorPublicKey:', error);
      throw new HttpException(
        'Failed to fetch EigenPod by validator public key',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getEigenPodsByBlockRange(startBlock: number, endBlock: number): Promise<EigenPodResponse[]> {
    try {
      const events = await this.podDeployedRepository
        .createQueryBuilder('event')
        .where('event.blockNumber >= :startBlock AND event.blockNumber <= :endBlock', {
          startBlock,
          endBlock,
        })
        .orderBy('event.blockNumber', 'DESC')
        .addOrderBy('event.logIndex', 'DESC')
        .getMany();
      
      return events.map(event => ({
        eigenPod: event.eigenPod,
        podOwner: event.podOwner,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        createdAt: event.createdAt,
        source: 'database' as const
      }));
    } catch (error) {
      console.error('Error in getEigenPodsByBlockRange:', error);
      throw new HttpException(
        'Failed to fetch EigenPods by block range',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getDatabaseStatus(): Promise<any> {
    try {
      // This would need to be implemented based on your business logic
      // For now, returning a simple status
      return {
        status: 'connected',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in getDatabaseStatus:', error);
      throw new HttpException(
        'Failed to get database status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}