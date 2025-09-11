import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';

@ObjectType()
export class HealthStatus {
  @Field()
  status: string;

  @Field()
  timestamp: string;

  @Field()
  service: string;
}

@ObjectType()
export class EigenPod {
  @Field(() => Int)
  id: number;

  @Field()
  eigenPod: string;

  @Field()
  podOwner: string;

  @Field(() => Int)
  blockNumber: number;

  @Field()
  transactionHash: string;

  @Field(() => Int)
  logIndex: number;

  @Field()
  createdAt: string;
}

@ObjectType()
export class EigenPodResponse {
  @Field(() => [EigenPod])
  pods: EigenPod[];

  @Field(() => Int)
  total: number;
}

@ObjectType()
export class EigenPodStatus {
  @Field(() => Int)
  totalEvents: number;

  @Field(() => Int)
  lastIndexedBlock: number;

  @Field()
  isConnected: boolean;
}

@ObjectType()
export class StakedEthEvent {
  @Field(() => Int)
  id: number;

  @Field()
  pubkey: string;

  @Field({ nullable: true })
  withdrawalCredentials?: string;

  @Field()
  amount: string;

  @Field()
  signature: string;

  @Field({ nullable: true })
  depositIndex?: string;

  @Field(() => Int)
  blockNumber: number;

  @Field(() => Int)
  blockTimestamp: number;

  @Field()
  transactionHash: string;

  @Field(() => Int)
  logIndex: number;

  @Field()
  createdAt: string;
}

@ObjectType()
export class StakedEthConnection {
  @Field(() => [StakedEthEvent])
  events: StakedEthEvent[];

  @Field(() => Int)
  total: number;
}

@ObjectType()
export class StakedEthStats {
  @Field(() => Int)
  totalEvents: number;

  @Field()
  totalAmount: string;

  @Field(() => Int)
  lastBlock: number;
}

@ObjectType()
export class StakedEthByBlock {
  @Field(() => Int)
  blockNumber: number;

  @Field(() => Int)
  blockTimestamp: number;

  @Field()
  totalDeposited: string;

  @Field(() => Int)
  eventCount: number;
}

@InputType()
export class EigenPodWhereInput {
  @Field({ nullable: true })
  ownerAddress?: string;

  @Field({ nullable: true })
  eigenPodAddress?: string;

  @Field({ nullable: true })
  validatorPublicKey?: string;

  @Field(() => Int, { nullable: true })
  startBlock?: number;

  @Field(() => Int, { nullable: true })
  endBlock?: number;
}

@InputType()
export class StakedEthWhereInput {
  @Field({ nullable: true })
  pubkey?: string;

  @Field({ nullable: true })
  withdrawalCredentials?: string;

  @Field(() => Int, { nullable: true })
  blockNumber?: number;

  @Field(() => Int, { nullable: true })
  startBlock?: number;

  @Field(() => Int, { nullable: true })
  endBlock?: number;
}

@InputType()
export class StakedEthAnalyticsInput {
  @Field(() => Int, { nullable: true })
  blockNumber?: number;

  @Field(() => Int, { nullable: true })
  startBlock?: number;

  @Field(() => Int, { nullable: true })
  endBlock?: number;

  @Field({ nullable: true, defaultValue: false })
  summary?: boolean;
}
