// Load environment variables from .env file first
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PodDeployedEvent } from '@eigen-layer-dashboard/lib';
import { StakedEthEvent } from '@eigen-layer-dashboard/lib';

export const getTypeOrmConfig = (): TypeOrmModuleOptions => {
  const isPostgres = process.env.DB_URL?.startsWith('postgresql://');
  
  if (isPostgres) {
    return {
      type: 'postgres',
      url: process.env.DB_URL,
      entities: [PodDeployedEvent, StakedEthEvent],
      synchronize: false, // We'll use migrations
      logging: false, // Disable SQL query logging
    };
  } else {
    return {
      type: 'sqlite',
      database: process.env.DATABASE_PATH || './indexer.db',
      entities: [PodDeployedEvent, StakedEthEvent],
      synchronize: false, // We'll use migrations
      logging: false, // Disable SQL query logging
    };
  }
};
