import { DataSource } from 'typeorm';
import { PodDeployedEvent } from './entities/PodDeployedEvent.entity';
import { StakedEthEvent } from './entities/StakedEthEvent.entity';
import { CreateTables1700000000001 } from './migrations/001-create-tables';

export const createDataSource = () => {
  const isPostgres = process.env.DB_URL?.startsWith('postgresql://');
  
  if (isPostgres) {
    return new DataSource({
      type: 'postgres',
      url: process.env.DB_URL,
      entities: [PodDeployedEvent, StakedEthEvent],
      migrations: [CreateTables1700000000001],
      synchronize: false, // We'll use migrations
      logging: process.env.NODE_ENV === 'development',
    });
  } else {
    return new DataSource({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || './indexer.db',
      entities: [PodDeployedEvent, StakedEthEvent],
      migrations: [CreateTables1700000000001],
      synchronize: false, // We'll use migrations
      logging: process.env.NODE_ENV === 'development',
    });
  }
};

export const AppDataSource = createDataSource();
