import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('pod_deployed_events')
export class PodDeployedEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'eigenpod' })
  eigenPod: string;

  @Column({ name: 'podowner' })
  podOwner: string;

  @Column({ name: 'blocknumber' })
  blockNumber: number;

  @Column({ name: 'transactionhash' })
  transactionHash: string;

  @Column({ name: 'logindex' })
  logIndex: number;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;
}
