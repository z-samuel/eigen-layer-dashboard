import axios from 'axios';
import { 
  StakedEthAnalyticsResponse, 
  StakedEthAnalyticsInput, 
  StakedEthStatsResponse,
  HealthResponse,
  EigenPodResponse,
  EigenPodWhereInput,
  StrategyResponse
} from '@eigen-layer-dashboard/lib';

const GRAPHQL_ENDPOINT = process.env.NODE_ENV === 'production' 
  ? 'http://localhost:4000/graphql' 
  : '/graphql';

export class GraphQLClient {
  private static async query<T>(query: string, variables?: any): Promise<T> {
    try {
      console.log('GraphQL query:', { endpoint: GRAPHQL_ENDPOINT, query, variables });
      
      const response = await axios.post(GRAPHQL_ENDPOINT, {
        query,
        variables
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      });
      
      console.log('GraphQL response:', response.data);
      
      if (response.data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('GraphQL query error:', error);
      
      if (error.response) {
        // Server responded with error status
        throw new Error(`GraphQL server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error(`GraphQL network error: Unable to connect to backend server. Make sure the backend is running on port 4000.`);
      } else {
        // Something else happened
        throw new Error(`GraphQL error: ${error.message}`);
      }
    }
  }

  static async getStakedEthAnalytics(input: StakedEthAnalyticsInput): Promise<StakedEthAnalyticsResponse> {
    const query = `
      query GetStakedEthAnalytics($input: StakedEthAnalyticsInput!) {
        stakedEthAnalytics(input: $input) {
          blockNumber
          blockTimestamp
          totalDeposited
          eventCount
        }
      }
    `;
    
    return GraphQLClient.query<StakedEthAnalyticsResponse>(query, { input });
  }

  static async getStakedEthStats(): Promise<StakedEthStatsResponse> {
    const query = `
      query GetStakedEthStats {
        stakedEthStats {
          totalEvents
          totalAmount
          lastBlock
        }
      }
    `;
    
    return GraphQLClient.query<StakedEthStatsResponse>(query);
  }

  static async getHealth(): Promise<HealthResponse> {
    const query = `
      query GetHealth {
        health {
          status
          timestamp
          service
        }
      }
    `;
    
    return GraphQLClient.query<HealthResponse>(query);
  }

  static async getEigenPods(skip: number = 0, limit: number = 5000, where?: EigenPodWhereInput): Promise<EigenPodResponse> {
    const query = `
      query GetEigenPods($skip: Int!, $limit: Int!, $where: EigenPodWhereInput) {
        eigenPods(skip: $skip, limit: $limit, where: $where) {
          pods {
            id
            eigenPod
            podOwner
            blockNumber
            transactionHash
            logIndex
            createdAt
          }
          total
        }
      }
    `;
    
    return GraphQLClient.query<{ eigenPods: EigenPodResponse }>(query, { skip, limit, where }).then(result => result.eigenPods);
  }

  static async getStrategies(skip: number = 0, limit: number = 100): Promise<StrategyResponse> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';
    
    const query = `
      query GetStrategies($skip: Int!, $first: Int!) {
        strategies(
          skip: $skip, 
          first: $first, 
          orderBy: lastUpdateBlockTimestamp, 
          orderDirection: desc
        ) {
          id
          address
          token {
            id
            address
            name
            symbol
          }
          totalShares
          exchangeRate
          operatorSetCount
          operatorCount
          stakerCount
          avsCount
          emitsExchangeRate
          isInDepositWhitelist
          withdrawalDelayBlocks
          thirdPartyTransfersForbidden
          whitelistBlockNumber
          whitelistBlockTimestamp
          whitelistTransactionHash
          createdAtBlockNumber
          lastUpdateBlockNumber
          lastUpdateBlockTimestamp
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query, variables: { skip, first: limit } });
      
      const response = await axios.post(subgraphUrl, {
        query,
        variables: { skip, first: limit }
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      });
      
      console.log('Subgraph response:', response.data);
      
      if (response.data.errors) {
        throw new Error(`Subgraph errors: ${JSON.stringify(response.data.errors)}`);
      }
      
      const strategies = response.data.data?.strategies || [];
      
      return {
        strategies: strategies.map((strategy: any) => ({
          id: strategy.id,
          address: strategy.address,
          token: strategy.token ? {
            id: strategy.token.id,
            address: strategy.token.address,
            name: strategy.token.name,
            symbol: strategy.token.symbol,
          } : {
            id: 'unknown',
            address: 'unknown',
            name: 'Unknown Token',
            symbol: 'UNKNOWN',
          },
          totalShares: strategy.totalShares,
          exchangeRate: strategy.exchangeRate,
          operatorSetCount: parseInt(strategy.operatorSetCount) || 0,
          operatorCount: parseInt(strategy.operatorCount) || 0,
          stakerCount: parseInt(strategy.stakerCount) || 0,
          avsCount: parseInt(strategy.avsCount) || 0,
          emitsExchangeRate: strategy.emitsExchangeRate,
          isInDepositWhitelist: strategy.isInDepositWhitelist,
          withdrawalDelayBlocks: parseInt(strategy.withdrawalDelayBlocks) || 0,
          thirdPartyTransfersForbidden: strategy.thirdPartyTransfersForbidden,
          whitelistBlockNumber: parseInt(strategy.whitelistBlockNumber) || 0,
          whitelistBlockTimestamp: parseInt(strategy.whitelistBlockTimestamp) || 0,
          whitelistTransactionHash: strategy.whitelistTransactionHash,
          createdAtBlockNumber: parseInt(strategy.createdAtBlockNumber) || 0,
          lastUpdateBlockNumber: parseInt(strategy.lastUpdateBlockNumber) || 0,
          lastUpdateBlockTimestamp: parseInt(strategy.lastUpdateBlockTimestamp) || 0,
        })),
        total: strategies.length, // Note: Subgraph doesn't provide total count, using current page length
      };
    } catch (error: any) {
      console.error('Error fetching strategies from subgraph:', error);
      
      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`Strategy service error: ${error.message}`);
      }
    }
  }
}

// Convenience exports
export const queryStakedEthAnalytics = GraphQLClient.getStakedEthAnalytics;
export const queryStakedEthStats = GraphQLClient.getStakedEthStats;
export const queryHealth = GraphQLClient.getHealth;
export const queryEigenPods = GraphQLClient.getEigenPods;
export const queryStrategies = GraphQLClient.getStrategies;
