import dotenv from 'dotenv';
import * as cron from 'node-cron';
import { IndexerScheduler } from './scheduler';
import { DatabaseService } from './database';
import { StakedEthIndexer } from './staked-eth-indexer';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
const CONTRACT_ADDRESS = process.env.EIGENPOD_MANAGER_ADDRESS || '0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338';
const STAKED_ETH_CONTRACT_ADDRESS = process.env.STAKED_ETH_CONTRACT_ADDRESS || '0x00000000219ab540356cbb839cbe05303d7705fa';
const CRON_EXPRESSION = process.env.INDEXER_CRON || '* * * * *';
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '10');
const RETRY_DELAY_BASE = parseInt(process.env.RETRY_DELAY_BASE || '2');

async function main() {
  const scheduler = new IndexerScheduler(RPC_URL, CONTRACT_ADDRESS, MAX_RETRIES, RETRY_DELAY_BASE);
  const stakedEthIndexer = new StakedEthIndexer(RPC_URL, STAKED_ETH_CONTRACT_ADDRESS, MAX_RETRIES, RETRY_DELAY_BASE);
  let stakedEthCron: cron.ScheduledTask | null = null;

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await scheduler.close();
    if (stakedEthCron) {
      stakedEthCron.stop();
    }
    await stakedEthIndexer.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await scheduler.close();
    if (stakedEthCron) {
      stakedEthCron.stop();
    }
    await stakedEthIndexer.close();
    process.exit(0);
  });

  try {
    // Initialize the scheduler
    await scheduler.initialize();
    await stakedEthIndexer.initialize();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0 || (args.length === 1 && args[0] === '--parallel')) {
      // Start both indexers in parallel
      console.log('Starting both EigenPod and Staked ETH indexers in parallel...');
      console.log(`RPC URL: ${RPC_URL}`);
      console.log(`EigenPod Contract Address: ${CONTRACT_ADDRESS}`);
      console.log(`Staked ETH Contract Address: ${STAKED_ETH_CONTRACT_ADDRESS}`);
      console.log(`Cron Expression: ${CRON_EXPRESSION}`);
      console.log(`Database Path: ./indexer.db`);
      
      // Start EigenPod indexer scheduler
      scheduler.start(CRON_EXPRESSION);
      
      // Start Staked ETH indexer scheduler
      stakedEthCron = cron.schedule(CRON_EXPRESSION, async () => {
        try {
          console.log('Running scheduled staked ETH indexing...');
          await stakedEthIndexer.startIndexing();
        } catch (error) {
          console.error('Error during scheduled staked ETH indexing:', error);
        }
      }, {
        scheduled: false
      });
      stakedEthCron.start();
      
      // Keep the process running and log status
      setInterval(async () => {
        const eigenPodStatus = await scheduler.getStatus();
        const stakedEthStatus = await stakedEthIndexer.getIndexingStatus();
        console.log(`EigenPod Status - Last indexed: ${eigenPodStatus.lastIndexedBlock}, Current: ${eigenPodStatus.currentBlock}, Events: ${eigenPodStatus.totalEvents}, Running: ${eigenPodStatus.isRunning}`);
        console.log(`Staked ETH Status - Last indexed: ${stakedEthStatus.lastIndexedBlock}, Current: ${stakedEthStatus.currentBlock}, Events: ${stakedEthStatus.totalEvents}, Running: ${stakedEthStatus.isRunning}`);
      }, 60000); // Log status every minute
      
    } else if (args[0] === 'run-once') {
      // Run both indexers once
      console.log('Running both indexers once...');
      await scheduler.runOnce();
      await stakedEthIndexer.startIndexing();
      const eigenPodStatus = await scheduler.getStatus();
      const stakedEthStatus = await stakedEthIndexer.getIndexingStatus();
      console.log(`EigenPod Status:`, eigenPodStatus);
      console.log(`Staked ETH Status:`, stakedEthStatus);
      
    } else if (args[0] === 'backfill' && args.length === 3) {
      // Backfill historical events
      const startBlock = parseInt(args[1]);
      const endBlock = parseInt(args[2]);
      
      if (isNaN(startBlock) || isNaN(endBlock)) {
        console.error('Invalid block numbers provided');
        process.exit(1);
      }
      
      console.log(`Backfilling events from block ${startBlock} to ${endBlock}...`);
      await scheduler.backfill(startBlock, endBlock);
      
    } else if (args[0] === 'status') {
      // Show current status (database only, no RPC)
      const status = await scheduler.getStatus();
      console.log('Indexer Status:');
      console.log(`  Last indexed block: ${status.lastIndexedBlock}`);
      console.log(`  Total events indexed: ${status.totalEvents}`);
      console.log(`  Note: Current block requires valid RPC URL`);
      
    } else if (args[0] === 'deployment-block') {
      // Get contract deployment block
      try {
        const deploymentBlock = await scheduler.getDeploymentBlock();
        console.log(`Contract deployment block: ${deploymentBlock}`);
      } catch (error) {
        console.error('Error getting deployment block:', error);
      }
      
    } else if (args[0] === 'staked-eth') {
      // Staked ETH indexer commands
      if (args[1] === 'run-once') {
        console.log('Running staked ETH indexer once...');
        await stakedEthIndexer.startIndexing();
        
      } else if (args[1] === 'start') {
        // Start Staked ETH indexer continuously
        console.log('Starting Staked ETH indexer continuously...');
        console.log(`RPC URL: ${RPC_URL}`);
        console.log(`Staked ETH Contract Address: ${STAKED_ETH_CONTRACT_ADDRESS}`);
        console.log(`Cron Expression: ${CRON_EXPRESSION}`);
        console.log(`Database Path: ./indexer.db`);
        
        stakedEthCron = cron.schedule(CRON_EXPRESSION, async () => {
          try {
            console.log('Running scheduled staked ETH indexing...');
            await stakedEthIndexer.startIndexing();
          } catch (error) {
            console.error('Error during scheduled staked ETH indexing:', error);
          }
        }, {
          scheduled: false
        });
        stakedEthCron.start();
        
        // Keep the process running
        setInterval(async () => {
          const status = await stakedEthIndexer.getIndexingStatus();
          console.log(`Staked ETH Status - Last indexed: ${status.lastIndexedBlock}, Current: ${status.currentBlock}, Events: ${status.totalEvents}, Running: ${status.isRunning}`);
        }, 60000); // Log status every minute
        
      } else if (args[1] === 'backfill' && args[2] && args[3]) {
        const startBlock = parseInt(args[2]);
        const endBlock = parseInt(args[3]);
        console.log(`Backfilling staked ETH events from block ${startBlock} to ${endBlock}...`);
        await stakedEthIndexer.backfillHistoricalEvents(startBlock, endBlock);
        
      } else if (args[1] === 'status') {
        const status = await stakedEthIndexer.getIndexingStatus();
        console.log('Staked ETH Indexer Status:');
        console.log(`  Last indexed block: ${status.lastIndexedBlock}`);
        console.log(`  Current block: ${status.currentBlock}`);
        console.log(`  Total events indexed: ${status.totalEvents}`);
        console.log(`  Is running: ${status.isRunning}`);
        
      } else if (args[1] === 'deployment-block') {
        try {
          const deploymentBlock = await stakedEthIndexer.getDeploymentBlock();
          console.log(`Ethereum 2.0 Deposit Contract deployment block: ${deploymentBlock}`);
        } catch (error) {
          console.error('Error getting deployment block:', error);
        }
        
      } else {
        console.log('Staked ETH indexer commands:');
        console.log('  yarn indexer:dev staked-eth start        - Start Staked ETH indexer continuously');
        console.log('  yarn indexer:dev staked-eth run-once     - Run staked ETH indexer once');
        console.log('  yarn indexer:dev staked-eth backfill <start> <end> - Backfill staked ETH events');
        console.log('  yarn indexer:dev staked-eth status       - Show staked ETH indexer status');
        console.log('  yarn indexer:dev staked-eth deployment-block - Get deployment block');
      }
      
    } else if (args[0] === 'eigenpod') {
      // EigenPod indexer commands
      if (args[1] === 'run-once') {
        console.log('Running EigenPod indexer once...');
        await scheduler.runOnce();
        
      } else if (args[1] === 'start') {
        // Start EigenPod indexer continuously
        console.log('Starting EigenPod indexer continuously...');
        console.log(`RPC URL: ${RPC_URL}`);
        console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
        console.log(`Cron Expression: ${CRON_EXPRESSION}`);
        console.log(`Database Path: ./indexer.db`);
        
        scheduler.start(CRON_EXPRESSION);
        
        // Keep the process running
        setInterval(async () => {
          const status = await scheduler.getStatus();
          console.log(`EigenPod Status - Last indexed: ${status.lastIndexedBlock}, Current: ${status.currentBlock}, Events: ${status.totalEvents}, Running: ${status.isRunning}`);
        }, 60000); // Log status every minute
        
      } else if (args[1] === 'backfill' && args[2] && args[3]) {
        const startBlock = parseInt(args[2]);
        const endBlock = parseInt(args[3]);
        console.log(`Backfilling EigenPod events from block ${startBlock} to ${endBlock}...`);
        await scheduler.backfill(startBlock, endBlock);
        
      } else if (args[1] === 'status') {
        const status = await scheduler.getStatus();
        console.log('EigenPod Indexer Status:');
        console.log(`  Last indexed block: ${status.lastIndexedBlock}`);
        console.log(`  Current block: ${status.currentBlock}`);
        console.log(`  Total events indexed: ${status.totalEvents}`);
        console.log(`  Is running: ${status.isRunning}`);
        
      } else if (args[1] === 'deployment-block') {
        try {
          const deploymentBlock = await scheduler.getDeploymentBlock();
          console.log(`EigenPodManager Contract deployment block: ${deploymentBlock}`);
        } catch (error) {
          console.error('Error getting deployment block:', error);
        }
        
      } else {
        console.log('EigenPod indexer commands:');
        console.log('  yarn indexer:dev eigenpod start          - Start EigenPod indexer continuously');
        console.log('  yarn indexer:dev eigenpod run-once       - Run EigenPod indexer once');
        console.log('  yarn indexer:dev eigenpod backfill <start> <end> - Backfill EigenPod events');
        console.log('  yarn indexer:dev eigenpod status         - Show EigenPod indexer status');
        console.log('  yarn indexer:dev eigenpod deployment-block - Get deployment block');
      }
      
    } else if (args[0] === 'query') {
      // Query events from database
      if (args[1] === 'by-eigenpod' && args[2]) {
        const events = await scheduler.getEventsByEigenPod(args[2]);
        console.log(`Found ${events.length} events for eigenPod ${args[2]}:`);
        events.forEach(event => {
          console.log(`  Block ${event.blockNumber}: ${event.eigenPod} -> ${event.podOwner}`);
        });
      } else if (args[1] === 'by-owner' && args[2]) {
        const events = await scheduler.getEventsByPodOwner(args[2]);
        console.log(`Found ${events.length} events for podOwner ${args[2]}:`);
        events.forEach(event => {
          console.log(`  Block ${event.blockNumber}: ${event.eigenPod} -> ${event.podOwner}`);
        });
      } else if (args[1] === 'by-range' && args[2] && args[3]) {
        const startBlock = parseInt(args[2]);
        const endBlock = parseInt(args[3]);
        const events = await scheduler.getEventsByBlockRange(startBlock, endBlock);
        console.log(`Found ${events.length} events in blocks ${startBlock}-${endBlock}:`);
        events.forEach(event => {
          console.log(`  Block ${event.blockNumber}: ${event.eigenPod} -> ${event.podOwner}`);
        });
      } else if (args[1] === 'staked-eth') {
        // Query staked ETH events
        if (args[2] === 'by-pubkey' && args[3]) {
          const events = await stakedEthIndexer.getStakedEthEventsByPubkey(args[3]);
          console.log(`Found ${events.length} staked ETH events for pubkey ${args[3]}:`);
          events.forEach(event => {
            console.log(`  Block ${event.blockNumber}: ${event.pubkey} - ${event.amount} ETH`);
          });
        } else if (args[2] === 'by-withdrawal' && args[3]) {
          const events = await stakedEthIndexer.getStakedEthEventsByWithdrawalCredentials(args[3]);
          console.log(`Found ${events.length} staked ETH events for withdrawal credentials ${args[3]}:`);
          events.forEach(event => {
            console.log(`  Block ${event.blockNumber}: ${event.pubkey} - ${event.amount} ETH`);
          });
        } else if (args[2] === 'by-range' && args[3] && args[4]) {
          const startBlock = parseInt(args[3]);
          const endBlock = parseInt(args[4]);
          const events = await stakedEthIndexer.getStakedEthEventsByBlockRange(startBlock, endBlock);
          console.log(`Found ${events.length} staked ETH events in blocks ${startBlock}-${endBlock}:`);
          events.forEach(event => {
            console.log(`  Block ${event.blockNumber}: ${event.pubkey} - ${event.amount} ETH`);
          });
        } else if (args[2] === 'by-block' && args[3]) {
          const blockNumber = parseInt(args[3]);
          const events = await stakedEthIndexer.getStakedEthByBlock(blockNumber);
          console.log(`Found ${events.length} staked ETH events in block ${blockNumber}:`);
          events.forEach((event: any) => {
            console.log(`  ${event.pubkey} - ${event.amount} ETH`);
          });
        } else if (args[2] === 'stats') {
          const stats = await stakedEthIndexer.getStakedEthStats();
          console.log('Staked ETH Statistics:');
          console.log(`  Total events: ${stats.totalEvents}`);
          console.log(`  Total amount: ${stats.totalAmount} wei`);
          console.log(`  Last block: ${stats.lastBlock}`);
        } else {
          console.log('Staked ETH query commands:');
          console.log('  yarn indexer:dev query staked-eth by-pubkey <pubkey> - Query by validator pubkey');
          console.log('  yarn indexer:dev query staked-eth by-withdrawal <credentials> - Query by withdrawal credentials');
          console.log('  yarn indexer:dev query staked-eth by-range <start> <end> - Query by block range');
          console.log('  yarn indexer:dev query staked-eth by-block <block> - Query by specific block');
          console.log('  yarn indexer:dev query staked-eth stats - Show statistics');
        }
      } else {
        console.log('Usage:');
        console.log('  npm run dev                           - Start both indexers in parallel (default)');
        console.log('  npm run dev --parallel                - Start both indexers in parallel');
        console.log('  npm run dev run-once                  - Run both indexers once');
        console.log('  npm run dev backfill <start> <end>    - Backfill historical events');
        console.log('  npm run dev status                    - Show current status');
        console.log('  npm run dev deployment-block          - Get contract deployment block');
        console.log('  npm run dev eigenpod <command>        - EigenPod indexer commands');
        console.log('  npm run dev staked-eth <command>      - Staked ETH indexer commands');
        console.log('  npm run dev query by-eigenpod <address> - Query events by eigenPod');
        console.log('  npm run dev query by-owner <address>  - Query events by podOwner');
        console.log('  npm run dev query by-range <start> <end> - Query events by block range');
        console.log('  npm run dev query staked-eth <command> - Query staked ETH events');
      }
      
    } else {
      console.log('Usage:');
      console.log('  npm run dev                           - Start both indexers in parallel (default)');
      console.log('  npm run dev --parallel                - Start both indexers in parallel');
      console.log('  npm run dev run-once                  - Run both indexers once');
      console.log('  npm run dev backfill <start> <end>    - Backfill historical events');
      console.log('  npm run dev status                    - Show current status');
      console.log('  npm run dev deployment-block          - Get contract deployment block');
      console.log('  npm run dev eigenpod <command>        - EigenPod indexer commands');
      console.log('  npm run dev staked-eth <command>      - Staked ETH indexer commands');
      console.log('  npm run dev query by-eigenpod <address> - Query events by eigenPod');
      console.log('  npm run dev query by-owner <address>  - Query events by podOwner');
      console.log('  npm run dev query by-range <start> <end> - Query events by block range');
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (process.argv.length > 2) {
      // Close connections if not running in scheduler mode
      await scheduler.close();
    }
  }
}

// Run the main function
main().catch(console.error);
