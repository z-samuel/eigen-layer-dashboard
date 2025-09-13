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

  static async getDeposits(
    skip: number = 0, 
    limit: number = 100, 
    staker?: string, 
    tokenAddress?: string, 
    minShares?: string, 
    maxShares?: string, 
    startTime?: number, 
    endTime?: number
  ): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';
    
    // Convert ETH to wei for shares filtering
    const ethToWei = (ethValue: string): string => {
      return (parseFloat(ethValue) * 1e18).toString();
    };
    
    // Build where clause
    const whereConditions: string[] = [];
    if (staker) whereConditions.push(`staker: "${staker}"`);
    if (tokenAddress) whereConditions.push(`token: "${tokenAddress}"`);
    if (minShares) whereConditions.push(`shares_gte: "${ethToWei(minShares)}"`);
    if (maxShares) whereConditions.push(`shares_lte: "${ethToWei(maxShares)}"`);
    if (startTime) whereConditions.push(`blockTimestamp_gte: ${startTime}`);
    if (endTime) whereConditions.push(`blockTimestamp_lte: ${endTime}`);
    
    const whereClause = whereConditions.length > 0 ? `where: { ${whereConditions.join(', ')} }` : '';
    
    const query = `
      query GetDeposits($skip: Int!, $first: Int!) {
        deposits(
          skip: $skip, 
          first: $first, 
          orderBy: blockTimestamp, 
          orderDirection: desc
          ${whereClause ? `, ${whereClause}` : ''}
        ) {
          id
          token {
            name
            symbol
            address
          }
          staker {
            address
          }
          shares
          strategy {
            id
          }
          blockNumber
          blockTimestamp
          transactionHash
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
      
      const deposits = response.data.data?.deposits || [];
      
      return {
        deposits: deposits.map((deposit: any) => ({
          id: deposit.id,
          token: deposit.token ? {
            name: deposit.token.name,
            symbol: deposit.token.symbol,
            address: deposit.token.address,
          } : {
            name: 'Unknown Token',
            symbol: 'UNKNOWN',
            address: 'unknown',
          },
          staker: deposit.staker ? {
            address: deposit.staker.address,
          } : {
            address: 'unknown',
          },
          shares: deposit.shares,
          strategy: deposit.strategy ? {
            id: deposit.strategy.id,
          } : {
            id: 'unknown',
          },
          blockNumber: parseInt(deposit.blockNumber) || 0,
          blockTimestamp: parseInt(deposit.blockTimestamp) || 0,
          transactionHash: deposit.transactionHash,
        })),
        total: deposits.length, // Note: Subgraph doesn't provide total count, using current page length
      };
    } catch (error: any) {
      console.error('Error fetching deposits from subgraph:', error);
      
      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`Deposits service error: ${error.message}`);
      }
    }
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

  static async getTokens(): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';
    
    const query = `
      query GetTokens {
        tokens {
          address
          name
          symbol
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query });
      
      const response = await axios.post(subgraphUrl, {
        query
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
      
      const tokens = response.data.data?.tokens || [];
      
      return {
        tokens: tokens.map((token: any) => ({
          address: token.address,
          name: token.name || 'Unknown',
          symbol: token.symbol || 'UNKNOWN',
        }))
      };
    } catch (error: any) {
      console.error('Error fetching tokens from subgraph:', error);
      
      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`Tokens service error: ${error.message}`);
      }
    }
  }

  static async getWithdrawals(
    skip: number = 0,
    limit: number = 100, 
    staker?: string, 
    operator?: string, 
    withdrawer?: string,
    strategy?: string, 
    minShares?: string, 
    maxShares?: string, 
    startTime?: number, 
    endTime?: number,
    status?: string,
    completed?: boolean
  ): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';
    
    // Convert ETH to wei for shares filtering
    const ethToWei = (ethValue: string): string => {
      return (parseFloat(ethValue) * 1e18).toString();
    };
    
    // Build where clause
    const whereConditions: string[] = [];
    if (staker) whereConditions.push(`staker: "${staker}"`);
    if (operator) whereConditions.push(`operator: "${operator}"`);
    if (withdrawer) whereConditions.push(`withdrawer: "${withdrawer}"`);
    if (strategy) whereConditions.push(`strategies_contains: ["${strategy}"]`);
    if (minShares) whereConditions.push(`shares_gte: "${ethToWei(minShares)}"`);
    if (maxShares) whereConditions.push(`shares_lte: "${ethToWei(maxShares)}"`);
    if (startTime) whereConditions.push(`start_blockTimestamp_gte: ${startTime}`);
    if (endTime) whereConditions.push(`start_blockTimestamp_lte: ${endTime}`);
    if (status) whereConditions.push(`status: "${status}"`);
    if (completed !== undefined) whereConditions.push(`completed: ${completed}`);
    
    const whereClause = whereConditions.length > 0 ? `where: { ${whereConditions.join(', ')} }` : '';
    
    const query = `
      query GetWithdrawals($skip: Int!, $first: Int!) {
        withdrawals(
          skip: $skip, 
          first: $first, 
          orderBy: start_blockTimestamp, 
          orderDirection: desc
          ${whereClause ? `, ${whereClause}` : ''}
        ) {
          id
          staker {
            id
          }
          operator {
            id
          }
          strategies {
            id
          }
          shares
          scaledShares
          depositShares
          receiveAsTokens
          isUndelegationQueue
          status {
            id
          }
          completed
          nonce
          root
          withdrawer
          start_blockNumber
          start_blockTimestamp
          start_transactionHash
          shares_withdrawn
          completable_blockNumber
          completable_maxMagnitudes
          completed_blockTimestamp
          completed_blockNumber
          completed_transactionHash
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
      
      const withdrawals = response.data.data?.withdrawals || [];
      
      return {
        withdrawals: withdrawals.map((withdrawal: any) => ({
          id: withdrawal.id,
          staker: withdrawal.staker ? {
            id: withdrawal.staker.id,
          } : {
            id: 'unknown',
          },
          operator: withdrawal.operator ? {
            id: withdrawal.operator.id,
          } : {
            id: 'unknown',
          },
          strategies: withdrawal.strategies || [],
          shares: withdrawal.shares,
          scaledShares: withdrawal.scaledShares,
          depositShares: withdrawal.depositShares,
          receiveAsTokens: withdrawal.receiveAsTokens,
          isUndelegationQueue: withdrawal.isUndelegationQueue,
          status: withdrawal.status ? {
            id: withdrawal.status.id,
          } : {
            id: 'unknown',
          },
          completed: withdrawal.completed,
          nonce: withdrawal.nonce,
          root: withdrawal.root,
          withdrawer: withdrawal.withdrawer,
          startBlockNumber: parseInt(withdrawal.start_blockNumber) || 0,
          startBlockTimestamp: parseInt(withdrawal.start_blockTimestamp) || 0,
          startTransactionHash: withdrawal.start_transactionHash,
          sharesWithdrawn: withdrawal.shares_withdrawn,
          completableBlockNumber: parseInt(withdrawal.completable_blockNumber) || 0,
          completableMaxMagnitudes: withdrawal.completable_maxMagnitudes,
          completedBlockTimestamp: parseInt(withdrawal.completed_blockTimestamp) || 0,
          completedBlockNumber: parseInt(withdrawal.completed_blockNumber) || 0,
          completedTransactionHash: withdrawal.completed_transactionHash,
        })),
        total: withdrawals.length, // Note: Subgraph doesn't provide total count, using current page length
      };
    } catch (error: any) {
      console.error('Error fetching withdrawals from subgraph:', error);
      
      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`Withdrawals service error: ${error.message}`);
      }
    }
  }
}

// Convenience exports
export const queryStakedEthAnalytics = GraphQLClient.getStakedEthAnalytics;
export const queryStakedEthStats = GraphQLClient.getStakedEthStats;
export const queryHealth = GraphQLClient.getHealth;
export const queryEigenPods = GraphQLClient.getEigenPods;
export const queryDeposits = GraphQLClient.getDeposits;
export const queryStrategies = GraphQLClient.getStrategies;
export const queryTokens = GraphQLClient.getTokens;
export const queryWithdrawals = GraphQLClient.getWithdrawals;
