import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('staked_eth_events')
export class StakedEthEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pubkey: string;

  @Column({ name: 'withdrawalcredentials' })
  withdrawalCredentials: string;

  @Column()
  amount: string;

  @Column()
  signature: string;

  @Column({ name: 'depositindex' })
  depositIndex: string;

  @Column({ name: 'blocknumber' })
  blockNumber: number;

  @Column({ name: 'blocktimestamp' })
  blockTimestamp: number;

  @Column({ name: 'transactionhash' })
  transactionHash: string;

  @Column({ name: 'logindex' })
  logIndex: number;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;
}
