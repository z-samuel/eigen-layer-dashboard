#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// PostgreSQL connection
const postgresDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DB_URL || 'postgresql://sam:1qaz1qaz@localhost:5432/eigenlayer',
  entities: [],
  synchronize: false,
  logging: false, // Disable verbose logging
});

// SQLite connection
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'indexer', 'indexer.db'));
const sqliteGet = promisify(sqliteDb.get.bind(sqliteDb));
const sqliteAll = promisify(sqliteDb.all.bind(sqliteDb));

async function migrateData() {
  console.log('🔄 Starting SQLite to PostgreSQL migration...');
  
  try {
    // Initialize PostgreSQL connection
    console.log('📡 Connecting to PostgreSQL...');
    await postgresDataSource.initialize();
    console.log('✅ PostgreSQL connected');
    
    // Create tables in PostgreSQL
    console.log('📋 Creating PostgreSQL tables...');
    await postgresDataSource.query(`
      CREATE TABLE IF NOT EXISTS pod_deployed_events (
        id SERIAL PRIMARY KEY,
        eigenpod VARCHAR NOT NULL,
        podowner VARCHAR NOT NULL,
        blocknumber INTEGER NOT NULL,
        transactionhash VARCHAR NOT NULL,
        logindex INTEGER NOT NULL,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(transactionhash, logindex)
      );
    `);
    
    await postgresDataSource.query(`
      CREATE TABLE IF NOT EXISTS staked_eth_events (
        id SERIAL PRIMARY KEY,
        pubkey VARCHAR NOT NULL,
        withdrawalcredentials VARCHAR NOT NULL,
        amount VARCHAR NOT NULL,
        signature VARCHAR NOT NULL,
        depositindex VARCHAR NOT NULL,
        blocknumber INTEGER NOT NULL,
        blocktimestamp INTEGER NOT NULL,
        transactionhash VARCHAR NOT NULL,
        logindex INTEGER NOT NULL,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(transactionhash, logindex)
      );
    `);
    
    // Create indexes
    await postgresDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_pod_deployed_events_blocknumber 
      ON pod_deployed_events(blocknumber);
    `);
    
    await postgresDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_pod_deployed_events_podowner 
      ON pod_deployed_events(podowner);
    `);
    
    await postgresDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_staked_eth_events_blocknumber 
      ON staked_eth_events(blocknumber);
    `);
    
    await postgresDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_staked_eth_events_pubkey 
      ON staked_eth_events(pubkey);
    `);
    
    console.log('✅ PostgreSQL tables created');
    
    // Get data from SQLite
    console.log('📦 Reading data from SQLite...');
    
    const podEvents = await sqliteAll('SELECT * FROM pod_deployed_events') as any[];
    console.log(`   Found ${podEvents.length} pod_deployed_events records`);
    
    const stakedEvents = await sqliteAll('SELECT * FROM staked_eth_events') as any[];
    console.log(`   Found ${stakedEvents.length} staked_eth_events records`);
    
    // Migrate pod_deployed_events
    if (podEvents.length > 0) {
      console.log('🔄 Migrating pod_deployed_events...');
      
      for (let i = 0; i < podEvents.length; i++) {
        const event = podEvents[i];
        await postgresDataSource.query(`
          INSERT INTO pod_deployed_events (
            eigenpod, podowner, blocknumber, transactionhash, logindex, createdat
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (transactionhash, logindex) DO NOTHING
        `, [
          event.eigenPod,
          event.podOwner,
          event.blockNumber,
          event.transactionHash,
          event.logIndex,
          event.createdAt
        ]);
        
        // Show progress every 1000 records
        if ((i + 1) % 1000 === 0 || i === podEvents.length - 1) {
          console.log(`   Progress: ${i + 1}/${podEvents.length} records`);
        }
      }
      
      console.log('✅ pod_deployed_events migrated');
    }
    
    // Migrate staked_eth_events
    if (stakedEvents.length > 0) {
      console.log('🔄 Migrating staked_eth_events...');
      
      for (let i = 0; i < stakedEvents.length; i++) {
        const event = stakedEvents[i];
        await postgresDataSource.query(`
          INSERT INTO staked_eth_events (
            pubkey, withdrawalcredentials, amount, signature, depositindex,
            blocknumber, blocktimestamp, transactionhash, logindex, createdat
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (transactionhash, logindex) DO NOTHING
        `, [
          event.pubkey,
          event.withdrawalCredentials,
          event.amount,
          event.signature,
          event.depositIndex,
          event.blockNumber,
          event.blockTimestamp,
          event.transactionHash,
          event.logIndex,
          event.createdAt
        ]);
        
        // Show progress every 10000 records (more frequent for larger dataset)
        if ((i + 1) % 10000 === 0 || i === stakedEvents.length - 1) {
          console.log(`   Progress: ${i + 1}/${stakedEvents.length} records`);
        }
      }
      
      console.log('✅ staked_eth_events migrated');
    }
    
    // Verify migration
    const postgresPodCount = await postgresDataSource.query('SELECT COUNT(*) as count FROM pod_deployed_events');
    const postgresStakedCount = await postgresDataSource.query('SELECT COUNT(*) as count FROM staked_eth_events');
    
    console.log('📊 Migration Summary:');
    console.log(`   SQLite pod_deployed_events: ${podEvents.length}`);
    console.log(`   PostgreSQL pod_deployed_events: ${postgresPodCount[0].count}`);
    console.log(`   SQLite staked_eth_events: ${stakedEvents.length}`);
    console.log(`   PostgreSQL staked_eth_events: ${postgresStakedCount[0].count}`);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (postgresDataSource.isInitialized) {
      await postgresDataSource.destroy();
    }
    sqliteDb.close();
  }
}

migrateData();
