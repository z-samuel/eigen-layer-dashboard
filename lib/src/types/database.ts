// Database interfaces shared across the application

export interface PodDeployedEvent {
  id: number;
  eigenPod: string;
  podOwner: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  createdAt: string;
}

export interface StakedEthEvent {
  id: number;
  pubkey: string;
  withdrawalCredentials: string;
  amount: string;
  signature: string;
  depositIndex: string;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
  logIndex: number;
  createdAt: string;
}
