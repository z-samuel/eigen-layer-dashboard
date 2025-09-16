import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PodDeployedEvent, StakedEthEvent } from '@eigen-layer-dashboard/lib';

export const createIndexerDataSource = () => {
  const isPostgres = process.env.DB_URL?.startsWith('postgresql://');

  if (isPostgres) {
    return new DataSource({
      type: 'postgres',
      url: process.env.DB_URL,
      entities: [PodDeployedEvent, StakedEthEvent],
      synchronize: false, // We'll use migrations
      logging: false, // Disable SQL query logging
    });
  } else {
    return new DataSource({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || './indexer.db',
      entities: [PodDeployedEvent, StakedEthEvent],
      synchronize: false, // We'll use migrations
      logging: false, // Disable SQL query logging
    });
  }
};

let IndexerDataSource: DataSource | null = null;

export const getIndexerDataSource = () => {
  if (!IndexerDataSource) {
    IndexerDataSource = createIndexerDataSource();
  }
  return IndexerDataSource;
};
