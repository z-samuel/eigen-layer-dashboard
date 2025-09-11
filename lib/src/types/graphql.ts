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

// EigenPod types
export interface EigenPod {
  id: number;
  eigenPod: string;
  podOwner: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  createdAt: string;
}

export interface EigenPodResponse {
  pods: EigenPod[];
  total: number;
}

export interface EigenPodWhereInput {
  ownerAddress?: string;
  eigenPodAddress?: string;
  validatorPublicKey?: string;
  startBlock?: number;
  endBlock?: number;
}

export interface EigenPodStatus {
  totalEvents: number;
  lastIndexedBlock: number;
  isConnected: boolean;
}

export interface HealthResponse {
  health: HealthStatus;
}
