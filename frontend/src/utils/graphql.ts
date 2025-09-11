import axios from 'axios';
import { 
  StakedEthAnalyticsResponse, 
  StakedEthAnalyticsInput, 
  StakedEthStatsResponse,
  HealthResponse,
  EigenPodResponse,
  EigenPodWhereInput
} from '@eigen-layer-dashboard/lib';

const GRAPHQL_ENDPOINT = '/graphql';

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
        throw new Error(`GraphQL network error: Unable to connect to backend server. Make sure the backend is running on port 3001.`);
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
    
    return this.query<StakedEthAnalyticsResponse>(query, { input });
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
    
    return this.query<StakedEthStatsResponse>(query);
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
    
    return this.query<HealthResponse>(query);
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
    
    return this.query<{ eigenPods: EigenPodResponse }>(query, { skip, limit, where }).then(result => result.eigenPods);
  }
}

// Convenience exports
export const queryStakedEthAnalytics = GraphQLClient.getStakedEthAnalytics;
export const queryStakedEthStats = GraphQLClient.getStakedEthStats;
export const queryHealth = GraphQLClient.getHealth;
export const queryEigenPods = GraphQLClient.getEigenPods;
