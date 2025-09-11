import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { EigenPodService } from './eigenpod.service';
import { StakedEthService } from './staked-eth.service';
import {
  HealthStatus,
  EigenPodResponse,
  EigenPod,
  EigenPodStatus,
  EigenPodWhereInput,
  StakedEthConnection,
  StakedEthEvent,
  StakedEthStats,
  StakedEthByBlock,
  StakedEthWhereInput,
  StakedEthAnalyticsInput
} from './graphql.types';

@Resolver()
export class GraphQLResolver {
  constructor(
    private readonly eigenPodService: EigenPodService,
    private readonly stakedEthService: StakedEthService,
  ) {}

  // Health check
  @Query(() => HealthStatus)
  async health(): Promise<HealthStatus> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'eigen-layer-graphql'
    };
  }

  // Unified EigenPod query
  @Query(() => EigenPodResponse)
  async eigenPods(
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number,
    @Args('limit', { type: () => Int, defaultValue: 100 }) limit: number,
    @Args('where', { type: () => EigenPodWhereInput, nullable: true }) where?: EigenPodWhereInput,
  ): Promise<EigenPodResponse> {
    // Handle different filtering scenarios based on where clause
    if (where?.ownerAddress) {
      const result = await this.eigenPodService.getEigenPodsByOwner(where.ownerAddress);
      const pods = result.map(item => ({
        id: 0, // Not available in response
        eigenPod: item.eigenPod,
        podOwner: item.podOwner,
        blockNumber: item.blockNumber || 0,
        transactionHash: '', // Not available in response
        logIndex: 0, // Not available in response
        createdAt: new Date().toISOString()
      }));
      return { pods, total: pods.length };
    }
    
    if (where?.eigenPodAddress) {
      const result = await this.eigenPodService.getEigenPodByAddress(where.eigenPodAddress);
      const pods = result ? [{
        id: 0, // Not available in response
        eigenPod: result.eigenPod,
        podOwner: result.podOwner,
        blockNumber: result.blockNumber || 0,
        transactionHash: '', // Not available in response
        logIndex: 0, // Not available in response
        createdAt: new Date().toISOString()
      }] : [];
      return { pods, total: pods.length };
    }
    
    if (where?.validatorPublicKey) {
      const result = await this.eigenPodService.getEigenPodByValidatorPublicKey(where.validatorPublicKey);
      const pods = result.map(item => ({
        id: 0, // Not available in response
        eigenPod: item.eigenPod,
        podOwner: item.podOwner,
        blockNumber: item.blockNumber || 0,
        transactionHash: '', // Not available in response
        logIndex: 0, // Not available in response
        createdAt: new Date().toISOString()
      }));
      return { pods, total: pods.length };
    }
    
    if (where?.startBlock && where?.endBlock) {
      const result = await this.eigenPodService.getEigenPodsByBlockRange(where.startBlock, where.endBlock);
      const pods = result.map(item => ({
        id: item.id,
        eigenPod: item.eigenPod,
        podOwner: item.podOwner,
        blockNumber: item.blockNumber,
        transactionHash: item.transactionHash,
        logIndex: item.logIndex,
        createdAt: item.createdAt
      }));
      return { pods, total: pods.length };
    }
    
    // Default: get all EigenPods with pagination
    const result = await this.eigenPodService.getAllEigenPods(skip, limit);
    return {
      pods: result.eigenPods,
      total: result.total
    };
  }

  @Query(() => EigenPodStatus)
  async eigenPodStatus(): Promise<EigenPodStatus> {
    return await this.eigenPodService.getDatabaseStatus();
  }

  // Unified Staked ETH query
  @Query(() => StakedEthConnection)
  async stakedEth(
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number,
    @Args('limit', { type: () => Int, defaultValue: 100 }) limit: number,
    @Args('where', { type: () => StakedEthWhereInput, nullable: true }) where?: StakedEthWhereInput,
  ): Promise<StakedEthConnection> {
    // Handle different filtering scenarios based on where clause
    if (where?.pubkey) {
      const events = await this.stakedEthService.getStakedEthEventsByPubkey(where.pubkey);
      return { events, total: events.length };
    }
    
    if (where?.withdrawalCredentials) {
      const events = await this.stakedEthService.getStakedEthEventsByWithdrawalCredentials(where.withdrawalCredentials);
      return { events, total: events.length };
    }
    
    if (where?.blockNumber) {
      const events = await this.stakedEthService.getStakedEthEventsByBlock(where.blockNumber);
      return { events, total: events.length };
    }
    
    if (where?.startBlock && where?.endBlock) {
      const events = await this.stakedEthService.getStakedEthEventsByBlockRange(where.startBlock, where.endBlock);
      return { events, total: events.length };
    }
    
    // Default: get all staked ETH events with pagination
    const result = await this.stakedEthService.getAllStakedEthEvents(skip, limit);
    return {
      events: result.events,
      total: result.total
    };
  }

  @Query(() => StakedEthStats)
  async stakedEthStats(): Promise<StakedEthStats> {
    return await this.stakedEthService.getStakedEthStats();
  }

  // Staking analytics
  @Query(() => [StakedEthByBlock])
  async stakedEthAnalytics(
    @Args('input', { type: () => StakedEthAnalyticsInput }) input: StakedEthAnalyticsInput,
  ): Promise<StakedEthByBlock[]> {
    // Single block analytics
    if (input.blockNumber) {
      const result = await this.stakedEthService.getStakedEthByBlock(input.blockNumber);
      return result ? [result] : [];
    }
    
    // Block range analytics
    if (input.startBlock && input.endBlock) {
      if (input.summary) {
        // Summary analytics (cumulative totals)
        return await this.stakedEthService.getStakedEthSummaryByBlockRange(input.startBlock, input.endBlock);
      } else {
        // Detailed analytics
        return await this.stakedEthService.getStakedEthByBlockRange(
          input.startBlock, 
          input.endBlock
        );
      }
    }
    
    // Default: return empty array if no valid input
    return [];
  }
}
