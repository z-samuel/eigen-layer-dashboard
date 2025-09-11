import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { EigenPodService } from './eigenpod.service';
import { StakedEthService } from './staked-eth.service';
import { MaterializedViewService } from './materialized-view.service';
import { GraphQLResolver } from './graphql.resolver';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: {
        settings: {
          'editor.theme': 'light',
          'editor.fontSize': 16,
          'editor.fontFamily': 'monospace',
          'editor.reuseHeaders': true,
          'tracing.hideTracingResponse': true,
          'editor.cursorShape': 'line',
        },
        tabs: [
          {
            name: "Get EigenPods",
            endpoint: '/graphql',
            query: `# Welcome to EigenLayer GraphQL API
# Try these example queries:

# Get EigenPods
{
  eigenPods(skip: 0, limit: 5) {
    pods {
      id
      eigenPod
      podOwner
      blockNumber
    }
    total
  }
}`,
          },
          {
            name: "Staked ETH Events",
            endpoint: '/graphql',
            query: `# Staked ETH Events
# Get recent staking deposit events

{
  stakedEth(skip: 0, limit: 5) {
    events {
      id
      pubkey
      withdrawalCredentials
      depositIndex
      amount
      blockNumber
      blockTimestamp
    }
    total
  }
}`,
          },
          {
            name: "Staked ETH by Validator",
            endpoint: '/graphql',
            query: `# Staked ETH by Validator
# Get staking events for a specific validator

{
  stakedEth(where: { 
    pubkey: "0x800000c8a5364c1d1e3c4cdb65a28fd21daff4e1fb426c0fb09808105467e4a490d8b3507e7efffbd71024129f1a6b8d" 
  }) {
    events {
      id
      pubkey
      withdrawalCredentials
      depositIndex
      amount
      blockNumber
      blockTimestamp
    }
    total
  }
}`,
          },
          {
            name: "Staked ETH by Block Range",
            endpoint: '/graphql',
            query: `# Staked ETH by Block Range
# Get staking events in a specific block range

{
  stakedEth(where: { 
    startBlock: 18000000, 
    endBlock: 18001000 
  }) {
    events {
      id
      pubkey
      withdrawalCredentials
      depositIndex
      amount
      blockNumber
      blockTimestamp
    }
    total
  }
}`,
          },
          {
            name: "Analytics - Single Block",
            endpoint: '/graphql',
            query: `# Staked ETH Analytics - Single Block
# Get analytics for a specific block

{
  stakedEthAnalytics(input: { 
    blockNumber: 18001984 
  }) {
    blockNumber
    blockTimestamp
    totalDeposited
    eventCount
  }
}`,
          },
          {
            name: "Analytics - Block Range",
            endpoint: '/graphql',
            query: `# Staked ETH Analytics - Block Range
# Get analytics for a block range

{
  stakedEthAnalytics(input: { 
    startBlock: 18001980, 
    endBlock: 18001990
  }) {
    blockNumber
    blockTimestamp
    totalDeposited
    eventCount
  }
}`,
          },
          {
            name: "Analytics - Summary",
            endpoint: '/graphql',
            query: `# Staked ETH Analytics - Summary
# Get summary analytics for a block range

{
  stakedEthAnalytics(input: { 
    startBlock: 18001980, 
    endBlock: 18001990, 
    summary: true 
  }) {
    blockNumber
    blockTimestamp
    totalDeposited
    eventCount
  }
}`,
          },
          {
            name: "Staked ETH Statistics",
            endpoint: '/graphql',
            query: `# Staked ETH Statistics
# Get overall staking statistics

{
  stakedEthStats {
    totalEvents
    totalAmount
    lastBlock
  }
}`,
          },
        ],
      },
      introspection: true,
    }),
  ],
  controllers: [],
  providers: [EigenPodService, StakedEthService, MaterializedViewService, GraphQLResolver],
})
export class AppModule {}
