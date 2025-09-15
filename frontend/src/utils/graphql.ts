import axios from 'axios';
import { 
  StakedEthAnalyticsResponse, 
  StakedEthAnalyticsInput, 
  StakedEthStatsResponse,
  HealthResponse,
  EigenPodResponse,
  EigenPodWhereInput,
  StrategyResponse
} from '@eigen-layer-dashboard/lib/frontend-types';

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

  static async getOperators(
    skip: number = 0,
    limit: number = 100
  ): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';

    const query = `
      query GetOperators($skip: Int!, $first: Int!) {
        operators(
          skip: $skip,
          first: $first,
          orderBy: lastUpdateBlockTimestamp,
          orderDirection: desc
        ) {
          id
          strategyCount
          operatorSetCount
          stakerCount
          avsCount
          metadataURI
          delegationApprover
          slashingCount
          registeredTransactionHash
          registeredBlockNumber
          registeredBlockTimestamp
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

      const operators = response.data.data?.operators || [];

      return {
        operators: operators.map((operator: any) => ({
          id: operator.id,
          strategyCount: parseInt(operator.strategyCount) || 0,
          operatorSetCount: parseInt(operator.operatorSetCount) || 0,
          stakerCount: parseInt(operator.stakerCount) || 0,
          avsCount: parseInt(operator.avsCount) || 0,
          metadataURI: operator.metadataURI,
          delegationApprover: operator.delegationApprover,
          slashingCount: parseInt(operator.slashingCount) || 0,
          registeredTransactionHash: operator.registeredTransactionHash,
          registeredBlockNumber: parseInt(operator.registeredBlockNumber) || 0,
          registeredBlockTimestamp: parseInt(operator.registeredBlockTimestamp) || 0,
          lastUpdateBlockNumber: parseInt(operator.lastUpdateBlockNumber) || 0,
          lastUpdateBlockTimestamp: parseInt(operator.lastUpdateBlockTimestamp) || 0,
        })),
        total: operators.length, // Note: Subgraph doesn't provide total count, using current page length
      };
    } catch (error: any) {
      console.error('Error fetching operators from subgraph:', error);

      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`Operators service error: ${error.message}`);
      }
    }
  }

  static async getOperatorStrategies(operatorId: string): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';

    const query = `
      query GetOperatorStrategies($operatorId: String!) {
        operators(where: { id: $operatorId }) {
          strategies {
            strategy {
              id
              avsCount
              stakerCount
            }
          }
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query, variables: { operatorId } });

      const response = await axios.post(subgraphUrl, {
        query,
        variables: { operatorId }
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

      const operators = response.data.data?.operators || [];
      const operator = operators[0];

      if (!operator) {
        return { strategies: [] };
      }

      const strategies = operator.strategies?.map((item: any) => ({
        id: item.strategy?.id || 'unknown',
        avsCount: parseInt(item.strategy?.avsCount) || 0,
        stakerCount: parseInt(item.strategy?.stakerCount) || 0,
      })) || [];

      return { strategies };
    } catch (error: any) {
      console.error('Error fetching operator strategies from subgraph:', error);

      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`Operator strategies service error: ${error.message}`);
      }
    }
  }

  static async getOperatorAVSs(operatorId: string): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';

    const query = `
      query GetOperatorAVSs($operatorId: String!) {
        operators(where: { id: $operatorId }) {
          avss {
            avs {
              id
              owner
              operatorCount
              operatorSetCount
              strategyCount
              slashingCount
              lastUpdateBlockNumber
              lastUpdateBlockTimestamp
            }
          }
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query, variables: { operatorId } });

      const response = await axios.post(subgraphUrl, {
        query,
        variables: { operatorId }
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

      const operators = response.data.data?.operators || [];
      const operator = operators[0];

      if (!operator) {
        return { avss: [] };
      }

      const avss = operator.avss?.map((item: any) => ({
        id: item.avs?.id || 'unknown',
        owner: item.avs?.owner || 'unknown',
        operatorCount: parseInt(item.avs?.operatorCount) || 0,
        operatorSetCount: parseInt(item.avs?.operatorSetCount) || 0,
        strategyCount: parseInt(item.avs?.strategyCount) || 0,
        slashingCount: parseInt(item.avs?.slashingCount) || 0,
        lastUpdateBlockNumber: parseInt(item.avs?.lastUpdateBlockNumber) || 0,
        lastUpdateBlockTimestamp: parseInt(item.avs?.lastUpdateBlockTimestamp) || 0,
      })) || [];

      return { avss };
    } catch (error: any) {
      console.error('Error fetching operator AVSs from subgraph:', error);

      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`Operator AVSs service error: ${error.message}`);
      }
    }
  }

  static async getOperatorStakers(operatorId: string): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';

    const query = `
      query GetOperatorStakers($operatorId: String!) {
        operators(where: { id: $operatorId }) {
          stakerCount
          stakers {
            staker {
              address
              operatorCount
              depositCount
              withdrawalCount
              delegationCount
            }
          }
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query, variables: { operatorId } });

      const response = await axios.post(subgraphUrl, {
        query,
        variables: { operatorId }
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

      const operators = response.data.data?.operators || [];
      const operator = operators[0];

      if (!operator) {
        return { stakers: [], stakerCount: 0 };
      }

      const stakers = operator.stakers?.map((item: any) => ({
        address: item.staker?.address || 'unknown',
        operatorCount: parseInt(item.staker?.operatorCount) || 0,
        depositCount: parseInt(item.staker?.depositCount) || 0,
        withdrawalCount: parseInt(item.staker?.withdrawalCount) || 0,
        delegationCount: parseInt(item.staker?.delegationCount) || 0,
      })) || [];

      return { 
        stakers,
        stakerCount: parseInt(operator.stakerCount) || 0
      };
    } catch (error: any) {
      console.error('Error fetching operator stakers from subgraph:', error);

      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`Operator stakers service error: ${error.message}`);
      }
    }
  }

  static async getOperatorSets(skip: number = 0, limit: number = 20): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';

    const query = `
      query GetOperatorSets($skip: Int!, $limit: Int!) {
        operatorSets(
          skip: $skip
          first: $limit
          orderBy: lastUpdateBlockTimestamp
          orderDirection: desc
        ) {
          id
          avs {
            id
            owner
            lastUpdateBlockNumber
            lastUpdateBlockTimestamp
          }
          owner
          operatorCount
          strategyCount
          stakerCount
          slashingCount
          lastUpdateBlockNumber
          lastUpdateBlockTimestamp
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query, variables: { skip, limit } });

      const response = await axios.post(subgraphUrl, {
        query,
        variables: { skip, limit }
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

      const operatorSets = response.data.data?.operatorSets || [];

      const mappedOperatorSets = operatorSets.map((operatorSet: any) => ({
        id: operatorSet.id || 'unknown',
        avs: {
          id: operatorSet.avs?.id || 'unknown',
          owner: operatorSet.avs?.owner || 'unknown',
          lastUpdateBlockNumber: parseInt(operatorSet.avs?.lastUpdateBlockNumber) || 0,
          lastUpdateBlockTimestamp: parseInt(operatorSet.avs?.lastUpdateBlockTimestamp) || 0,
        },
        owner: operatorSet.owner || 'unknown',
        operatorCount: parseInt(operatorSet.operatorCount) || 0,
        strategyCount: parseInt(operatorSet.strategyCount) || 0,
        stakerCount: parseInt(operatorSet.stakerCount) || 0,
        slashingCount: parseInt(operatorSet.slashingCount) || 0,
        lastUpdateBlockNumber: parseInt(operatorSet.lastUpdateBlockNumber) || 0,
        lastUpdateBlockTimestamp: parseInt(operatorSet.lastUpdateBlockTimestamp) || 0,
      }));

      return { operatorSets: mappedOperatorSets };
    } catch (error: any) {
      console.error('Error fetching operator sets from subgraph:', error);

      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`Operator sets service error: ${error.message}`);
      }
    }
  }

  static async getOperatorSetOperators(operatorSetId: string): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';

    const query = `
      query GetOperatorSetOperators($operatorSetId: String!) {
        operatorSets(where: { id: $operatorSetId }) {
          operators {
            operator {
              id
              avsCount
              strategyCount
              stakerCount
              lastUpdateBlockNumber
              lastUpdateBlockTimestamp
            }
          }
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query, variables: { operatorSetId } });

      const response = await axios.post(subgraphUrl, {
        query,
        variables: { operatorSetId }
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

      const operatorSets = response.data.data?.operatorSets || [];
      const operatorSet = operatorSets[0];

      if (!operatorSet) {
        return { operators: [] };
      }

      const operators = operatorSet.operators?.map((item: any) => ({
        id: item.operator?.id || 'unknown',
        avsCount: parseInt(item.operator?.avsCount) || 0,
        strategyCount: parseInt(item.operator?.strategyCount) || 0,
        stakerCount: parseInt(item.operator?.stakerCount) || 0,
        lastUpdateBlockNumber: parseInt(item.operator?.lastUpdateBlockNumber) || 0,
        lastUpdateBlockTimestamp: parseInt(item.operator?.lastUpdateBlockTimestamp) || 0,
      })) || [];

      return { operators };
    } catch (error: any) {
      console.error('Error fetching operator set operators from subgraph:', error);

      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`Operator set operators service error: ${error.message}`);
      }
    }
  }

  static async getOperatorSetStrategies(operatorSetId: string): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';

    const query = `
      query GetOperatorSetStrategies($operatorSetId: String!) {
        operatorSets(where: { id: $operatorSetId }) {
          strategies {
            strategy {
              id
              avsCount
              stakerCount
              lastUpdateBlockNumber
              lastUpdateBlockTimestamp
            }
          }
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query, variables: { operatorSetId } });

      const response = await axios.post(subgraphUrl, {
        query,
        variables: { operatorSetId }
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

      const operatorSets = response.data.data?.operatorSets || [];
      const operatorSet = operatorSets[0];

      if (!operatorSet) {
        return { strategies: [] };
      }

      const strategies = operatorSet.strategies?.map((item: any) => ({
        id: item.strategy?.id || 'unknown',
        avsCount: parseInt(item.strategy?.avsCount) || 0,
        stakerCount: parseInt(item.strategy?.stakerCount) || 0,
        lastUpdateBlockNumber: parseInt(item.strategy?.lastUpdateBlockNumber) || 0,
        lastUpdateBlockTimestamp: parseInt(item.strategy?.lastUpdateBlockTimestamp) || 0,
      })) || [];

      return { strategies };
    } catch (error: any) {
      console.error('Error fetching operator set strategies from subgraph:', error);

      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`Operator set strategies service error: ${error.message}`);
      }
    }
  }

  static async getAVSs(skip: number = 0, limit: number = 20): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';

    const query = `
      query GetAVSs($skip: Int!, $limit: Int!) {
        avss(
          skip: $skip
          first: $limit
          orderBy: lastUpdateBlockTimestamp
          orderDirection: desc
        ) {
          id
          owner
          operatorCount
          operatorSetCount
          slashingCount
          strategyCount
          stakerCount
          lastUpdateBlockNumber
          lastUpdateBlockTimestamp
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query, variables: { skip, limit } });

      const response = await axios.post(subgraphUrl, {
        query,
        variables: { skip, limit }
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

      const avss = response.data.data?.avss || [];

      const mappedAVSs = avss.map((avs: any) => ({
        id: avs.id || 'unknown',
        owner: avs.owner || 'unknown',
        operatorCount: parseInt(avs.operatorCount) || 0,
        operatorSetCount: parseInt(avs.operatorSetCount) || 0,
        slashingCount: parseInt(avs.slashingCount) || 0,
        strategyCount: parseInt(avs.strategyCount) || 0,
        stakerCount: parseInt(avs.stakerCount) || 0,
        lastUpdateBlockNumber: parseInt(avs.lastUpdateBlockNumber) || 0,
        lastUpdateBlockTimestamp: parseInt(avs.lastUpdateBlockTimestamp) || 0,
      }));

      return { avss: mappedAVSs };
    } catch (error: any) {
      console.error('Error fetching AVSs from subgraph:', error);

      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`AVSs service error: ${error.message}`);
      }
    }
  }

  static async getAVSOperators(avsId: string): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';

    const query = `
      query GetAVSOperators($avsId: String!) {
        avss(where: { id: $avsId }) {
          operators {
            operator {
              id
              strategyCount
              stakerCount
              avsCount
              slashingCount
              lastUpdateBlockNumber
              lastUpdateBlockTimestamp
            }
          }
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query, variables: { avsId } });

      const response = await axios.post(subgraphUrl, {
        query,
        variables: { avsId }
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

      const avss = response.data.data?.avss || [];
      const avs = avss[0];

      if (!avs) {
        return { operators: [] };
      }

      const operators = avs.operators?.map((item: any) => ({
        id: item.operator?.id || 'unknown',
        strategyCount: parseInt(item.operator?.strategyCount) || 0,
        stakerCount: parseInt(item.operator?.stakerCount) || 0,
        avsCount: parseInt(item.operator?.avsCount) || 0,
        slashingCount: parseInt(item.operator?.slashingCount) || 0,
        lastUpdateBlockNumber: parseInt(item.operator?.lastUpdateBlockNumber) || 0,
        lastUpdateBlockTimestamp: parseInt(item.operator?.lastUpdateBlockTimestamp) || 0,
      })) || [];

      return { operators };
    } catch (error: any) {
      console.error('Error fetching AVS operators from subgraph:', error);

      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`AVS operators service error: ${error.message}`);
      }
    }
  }

  static async getAVSOperatorSets(avsId: string): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';

    const query = `
      query GetAVSOperatorSets($avsId: String!) {
        avss(where: { id: $avsId }) {
          operatorSets {
            id
            avs {
              id
            }
            operatorCount
            strategyCount
            slashingCount
            lastUpdateBlockNumber
            lastUpdateBlockTimestamp
          }
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query, variables: { avsId } });

      const response = await axios.post(subgraphUrl, {
        query,
        variables: { avsId }
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

      const avss = response.data.data?.avss || [];
      const avs = avss[0];

      if (!avs) {
        return { operatorSets: [] };
      }

      const operatorSets = avs.operatorSets?.map((item: any) => ({
        id: item.id || 'unknown',
        operatorCount: parseInt(item.operatorCount) || 0,
        strategyCount: parseInt(item.strategyCount) || 0,
        slashingCount: parseInt(item.slashingCount) || 0,
        lastUpdateBlockNumber: parseInt(item.lastUpdateBlockNumber) || 0,
        lastUpdateBlockTimestamp: parseInt(item.lastUpdateBlockTimestamp) || 0,
      })) || [];

      return { operatorSets };
    } catch (error: any) {
      console.error('Error fetching AVS operator sets from subgraph:', error);

      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`AVS operator sets service error: ${error.message}`);
      }
    }
  }

  static async getAVSStrategies(avsId: string): Promise<any> {
    const subgraphUrl = 'https://subgraph.satsuma-prod.com/027e731a6242/eigenlabs/eigen-graph-mainnet/api';

    const query = `
      query GetAVSStrategies($avsId: String!) {
        avss(where: { id: $avsId }) {
          strategies {
            strategy {
              id
              token
              totalShares
              exchangeRate
              stakerCount
              operatorCount
              lastUpdateBlockNumber
              lastUpdateBlockTimestamp
            }
          }
        }
      }
    `;

    try {
      console.log('GraphQL query to subgraph:', { endpoint: subgraphUrl, query, variables: { avsId } });

      const response = await axios.post(subgraphUrl, {
        query,
        variables: { avsId }
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

      const avss = response.data.data?.avss || [];
      const avs = avss[0];

      if (!avs) {
        return { strategies: [] };
      }

      const strategies = avs.strategies?.map((item: any) => ({
        id: item.strategy?.id || 'unknown',
        token: item.strategy?.token || null,
        totalShares: item.strategy?.totalShares || '0',
        exchangeRate: item.strategy?.exchangeRate || '0',
        stakerCount: parseInt(item.strategy?.stakerCount) || 0,
        operatorCount: parseInt(item.strategy?.operatorCount) || 0,
        lastUpdateBlockNumber: parseInt(item.strategy?.lastUpdateBlockNumber) || 0,
        lastUpdateBlockTimestamp: parseInt(item.strategy?.lastUpdateBlockTimestamp) || 0,
      })) || [];

      return { strategies };
    } catch (error: any) {
      console.error('Error fetching AVS strategies from subgraph:', error);

      if (error.response) {
        throw new Error(`Subgraph server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Subgraph network error: Unable to connect to subgraph server');
      } else {
        throw new Error(`AVS strategies service error: ${error.message}`);
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
export const queryOperators = GraphQLClient.getOperators;
export const queryOperatorStrategies = GraphQLClient.getOperatorStrategies;
export const queryOperatorAVSs = GraphQLClient.getOperatorAVSs;
export const queryOperatorStakers = GraphQLClient.getOperatorStakers;
export const queryOperatorSets = GraphQLClient.getOperatorSets;
export const queryOperatorSetOperators = GraphQLClient.getOperatorSetOperators;
export const queryOperatorSetStrategies = GraphQLClient.getOperatorSetStrategies;
export const queryAVSs = GraphQLClient.getAVSs;
export const queryAVSOperators = GraphQLClient.getAVSOperators;
export const queryAVSOperatorSets = GraphQLClient.getAVSOperatorSets;
export const queryAVSStrategies = GraphQLClient.getAVSStrategies;
