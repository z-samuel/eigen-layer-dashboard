import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { EigenPodService } from './eigenpod.service';
import { StakedEthService } from './staked-eth.service';
import { MaterializedViewService } from './materialized-view.service';
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
    private readonly materializedViewService: MaterializedViewService,
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
      const pods = result.map((item, index) => ({
        id: index + 1,
        eigenPod: item.eigenPod,
        podOwner: item.podOwner,
        blockNumber: item.blockNumber,
        transactionHash: item.transactionHash,
        logIndex: item.logIndex,
        createdAt: item.createdAt?.toISOString() || new Date().toISOString()
      }));
      return { pods, total: pods.length };
    }
    
    if (where?.eigenPodAddress) {
      const result = await this.eigenPodService.getEigenPodByAddress(where.eigenPodAddress);
      const pods = result ? [{
        id: 1,
        eigenPod: result.eigenPod,
        podOwner: result.podOwner,
        blockNumber: result.blockNumber,
        transactionHash: result.transactionHash,
        logIndex: result.logIndex,
        createdAt: result.createdAt?.toISOString() || new Date().toISOString()
      }] : [];
      return { pods, total: pods.length };
    }
    
    if (where?.validatorPublicKey) {
      const result = await this.eigenPodService.getEigenPodByValidatorPublicKey(where.validatorPublicKey);
      const pods = result.map((item, index) => ({
        id: index + 1,
        eigenPod: item.eigenPod,
        podOwner: item.podOwner,
        blockNumber: item.blockNumber,
        transactionHash: item.transactionHash,
        logIndex: item.logIndex,
        createdAt: item.createdAt?.toISOString() || new Date().toISOString()
      }));
      return { pods, total: pods.length };
    }
    
    if (where?.startBlock && where?.endBlock) {
      const result = await this.eigenPodService.getEigenPodsByBlockRange(where.startBlock, where.endBlock);
      const pods = result.map((item, index) => ({
        id: index + 1, // Use index as id since EigenPodResponse doesn't have id
        eigenPod: item.eigenPod,
        podOwner: item.podOwner,
        blockNumber: item.blockNumber,
        transactionHash: item.transactionHash,
        logIndex: item.logIndex,
        createdAt: item.createdAt?.toISOString() || new Date().toISOString()
      }));
      return { pods, total: pods.length };
    }
    
    // Default: get all EigenPods with pagination
    const result = await this.eigenPodService.getAllEigenPods(limit, skip);
    const pods = result.map((item, index) => ({
      id: index + 1,
      eigenPod: item.eigenPod,
      podOwner: item.podOwner,
      blockNumber: item.blockNumber,
      transactionHash: item.transactionHash,
      logIndex: item.logIndex,
      createdAt: item.createdAt?.toISOString() || new Date().toISOString()
    }));
    return { pods, total: pods.length };
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
      const formattedEvents = events.map(event => ({
        ...event,
        createdAt: event.createdAt?.toISOString() || new Date().toISOString()
      }));
      return { events: formattedEvents, total: formattedEvents.length };
    }
    
    if (where?.withdrawalCredentials) {
      const events = await this.stakedEthService.getStakedEthEventsByWithdrawalCredentials(where.withdrawalCredentials);
      const formattedEvents = events.map(event => ({
        ...event,
        createdAt: event.createdAt?.toISOString() || new Date().toISOString()
      }));
      return { events: formattedEvents, total: formattedEvents.length };
    }
    
    if (where?.blockNumber) {
      const events = await this.stakedEthService.getStakedEthEventsByBlock(where.blockNumber);
      const formattedEvents = events.map(event => ({
        ...event,
        createdAt: event.createdAt?.toISOString() || new Date().toISOString()
      }));
      return { events: formattedEvents, total: formattedEvents.length };
    }
    
    if (where?.startBlock && where?.endBlock) {
      const events = await this.stakedEthService.getStakedEthEventsByBlockRange(where.startBlock, where.endBlock);
      const formattedEvents = events.map(event => ({
        ...event,
        createdAt: event.createdAt?.toISOString() || new Date().toISOString()
      }));
      return { events: formattedEvents, total: formattedEvents.length };
    }
    
    // Default: get all staked ETH events with pagination
    const events = await this.stakedEthService.getAllStakedEthEvents(skip, limit);
    const formattedEvents = events.map(event => ({
      ...event,
      createdAt: event.createdAt?.toISOString() || new Date().toISOString()
    }));
    return { events: formattedEvents, total: formattedEvents.length };
  }

  @Query(() => StakedEthStats)
  async stakedEthStats(): Promise<StakedEthStats> {
    const stats = await this.stakedEthService.getStakedEthStats();
    // Get the last block from the events
    const events = await this.stakedEthService.getStakedEthEvents(1, 0);
    const lastBlock = events.length > 0 ? events[0].blockNumber : 0;
    
    return {
      totalEvents: stats.totalEvents,
      totalAmount: stats.totalStaked,
      lastBlock: lastBlock
    };
  }

  // Staking analytics - now using materialized view for better performance
  @Query(() => [StakedEthByBlock])
  async stakedEthAnalytics(
    @Args('input', { type: () => StakedEthAnalyticsInput }) input: StakedEthAnalyticsInput,
  ): Promise<StakedEthByBlock[]> {
    try {
      // Single block analytics - use materialized view
      if (input.blockNumber) {
        const result = await this.stakedEthService.getStakedEthEventsByBlock(input.blockNumber);
        // Convert to StakedEthByBlock format
        const blockData = {
          blockNumber: input.blockNumber,
          blockTimestamp: result[0]?.blockTimestamp || 0,
          totalDeposited: result.reduce((sum, event) => (BigInt(sum) + BigInt(event.amount)).toString(), '0'),
          eventCount: result.length
        };
        return [blockData];
      }
      
      // Block range analytics - use materialized view
      if (input.startBlock && input.endBlock) {
        const results = await this.stakedEthService.getStakedEthSummaryByBlockRange(
          input.startBlock, 
          input.endBlock
        );
        return results;
      }
      
      // Default: return empty array if no valid input
      return [];
    } catch (error) {
      console.error('Error in stakedEthAnalytics:', error);
      // Fallback to original service if materialized view fails
      if (input.blockNumber) {
        const events = await this.stakedEthService.getStakedEthEventsByBlock(input.blockNumber);
        const blockData = {
          blockNumber: input.blockNumber,
          blockTimestamp: events[0]?.blockTimestamp || 0,
          totalDeposited: events.reduce((sum, event) => (BigInt(sum) + BigInt(event.amount)).toString(), '0'),
          eventCount: events.length
        };
        return [blockData];
      }
      
      if (input.startBlock && input.endBlock) {
        if (input.summary) {
          return await this.stakedEthService.getStakedEthSummaryByBlockRange(input.startBlock, input.endBlock);
        } else {
          return await this.stakedEthService.getStakedEthByBlockRange(
            input.startBlock, 
            input.endBlock
          );
        }
      }
      
      return [];
    }
  }

}
