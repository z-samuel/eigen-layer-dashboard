import axios from 'axios';
import { 
  StakedEthAnalyticsResponse, 
  StakedEthAnalyticsInput, 
  StakedEthStatsResponse,
  HealthResponse 
} from '@eigen-layer-dashboard/lib';

const GRAPHQL_ENDPOINT = '/graphql';

export class GraphQLClient {
  private static async query<T>(query: string, variables?: any): Promise<T> {
    try {
      const response = await axios.post(GRAPHQL_ENDPOINT, {
        query,
        variables
      });
      
      if (response.data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      }
      
      return response.data.data;
    } catch (error) {
      console.error('GraphQL query error:', error);
      throw error;
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
}
