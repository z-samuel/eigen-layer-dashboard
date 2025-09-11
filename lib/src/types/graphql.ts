// GraphQL types shared across the application

export interface StakedEthAnalytics {
  blockNumber: number;
  blockTimestamp: number;
  totalDeposited: string;
  eventCount: number;
}

export interface StakedEthAnalyticsInput {
  blockNumber?: number;
  startBlock?: number;
  endBlock?: number;
  summary?: boolean;
}

export interface StakedEthAnalyticsResponse {
  stakedEthAnalytics: StakedEthAnalytics[];
}

export interface StakedEthStats {
  totalEvents: number;
  totalAmount: string;
  lastBlock: number;
}

export interface StakedEthStatsResponse {
  stakedEthStats: StakedEthStats;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
}

export interface HealthResponse {
  health: HealthStatus;
}
