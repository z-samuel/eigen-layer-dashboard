# EigenLayer Event Indexer

This indexer monitors multiple Ethereum contracts for relevant events and stores them in a local SQLite database. It supports indexing of both EigenPod deployments and Ethereum 2.0 staking deposits. The indexed data is accessible via the GraphQL subgraph in the backend service.

## Features

### EigenPod Indexing
- **Real-time indexing**: Monitors new blocks for PodDeployed events
- **Automatic deployment detection**: Automatically starts indexing from contract deployment block
- **Historical backfill**: Can backfill historical events from any block range
- **SQLite storage**: Stores events in a local SQLite database with proper indexing
- **Scheduled execution**: Runs periodically using cron expressions
- **Query interface**: Built-in commands to query indexed events

### Staking History Indexing
- **Ethereum 2.0 staking monitoring**: Tracks all staking deposits from the Ethereum 2.0 Deposit Contract
- **Block timestamp capture**: Records exact block timestamps for temporal analysis
- **Validator tracking**: Links staking deposits to validator public keys
- **Withdrawal credentials**: Tracks withdrawal destination addresses
- **Complete historical data**: Backfills from contract deployment (block 11052984)
- **Comprehensive statistics**: Total staked amounts and event counts

### Parallel Execution
- **Concurrent indexing**: Both EigenPod and Staked ETH indexers run simultaneously by default
- **Independent operation**: Each indexer can be run separately for specific use cases
- **Resource efficiency**: Shared database and RPC connections for optimal performance
- **Flexible control**: Choose between parallel execution or individual indexer control
- **Graceful shutdown**: Proper cleanup when stopping indexers

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Set up environment variables:
```bash
# Option 1: Use the setup script (recommended)
./setup-env.sh

# Option 2: Manual setup
cp config.example.env .env
# Then edit .env with your RPC URL
```

3. Configure your environment variables in `.env`:
```bash
# Required: Your Ethereum RPC endpoint
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Optional: EigenPodManager contract address (default: mainnet)
EIGENPOD_MANAGER_ADDRESS=0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338

# Optional: Staked ETH contract address (default: Ethereum 2.0 Deposit Contract)
STAKED_ETH_CONTRACT_ADDRESS=0x00000000219ab540356cbb839cbe05303d7705fa

# Optional: Customize the indexing schedule (default: every minute)
INDEXER_CRON=* * * * *

# Optional: Customize database location (default: ./indexer.db)
DATABASE_PATH=./indexer.db

# Optional: Retry configuration for rate limiting
MAX_RETRIES=10
RETRY_DELAY_BASE=2
```

4. Build the project:
```bash
yarn build
```

## Usage

### Parallel Execution (Default)
```bash
# Start both EigenPod and Staked ETH indexers in parallel (default)
yarn dev

# Explicitly start both indexers in parallel
yarn dev --parallel

# Run both indexers once
yarn dev run-once

# Backfill both indexers from specific block range
yarn dev backfill 18000000 19000000

# Check status of both indexers
yarn dev status

# Get deployment blocks for both contracts
yarn dev deployment-block
```

### Individual Indexer Commands

#### EigenPod Indexer
```bash
# Start EigenPod indexer continuously
yarn dev eigenpod start

# Run EigenPod indexer once
yarn dev eigenpod run-once

# Backfill EigenPod events from specific block range
yarn dev eigenpod backfill 18000000 19000000

# Check EigenPod indexer status
yarn dev eigenpod status

# Get EigenPodManager contract deployment block
yarn dev eigenpod deployment-block
```

#### Staked ETH Indexer
```bash
# Start Staked ETH indexer continuously
yarn dev staked-eth start

# Run Staked ETH indexer once
yarn dev staked-eth run-once

# Backfill Staked ETH events from specific block range
yarn dev staked-eth backfill 18000000 19000000

# Check Staked ETH indexer status
yarn dev staked-eth status

# Get Ethereum 2.0 Deposit Contract deployment block
yarn dev staked-eth deployment-block
```

### Query events
```bash
# Query EigenPod events by eigenPod address
yarn dev query by-eigenpod 0x1234...

# Query EigenPod events by podOwner address  
yarn dev query by-owner 0x5678...

# Query EigenPod events by block range
yarn dev query by-range 18000000 19000000

# Query staking events by validator pubkey
yarn dev query staked-eth by-pubkey 0x800000c8a5364c1d1e3c4cdb65a28fd21daff4e1fb426c0fb09808105467e4a490d8b3507e7efffbd71024129f1a6b8d

# Query staking events by withdrawal credentials
yarn dev query staked-eth by-withdrawal 0x0100000000000000000000007cd73ab82e3a8e74a3fdfd6a41fed60536b8e501

# Query staking events by block range
yarn dev query staked-eth by-range 18000000 19000000

# Query staking events by specific block
yarn dev query staked-eth by-block 18001984

# Show staking statistics
yarn dev query staked-eth stats
```

## Command Structure

### When to Use Parallel Execution
- **Production environments**: When you need both EigenPod and Staked ETH data
- **Development**: For comprehensive testing and data collection
- **Default usage**: Most common use case for complete indexing

### When to Use Individual Indexers
- **Resource constraints**: When you only need one type of data
- **Debugging**: Isolating issues with specific indexers
- **Custom workflows**: When you need fine-grained control over indexing
- **Testing**: Validating individual indexer functionality

### Command Examples by Use Case

#### Quick Start (Recommended)
```bash
# Start everything in parallel
yarn dev
```

#### Development & Testing
```bash
# Test EigenPod indexer only
yarn dev eigenpod run-once

# Test Staked ETH indexer only  
yarn dev staked-eth run-once

# Check specific indexer status
yarn dev eigenpod status
yarn dev staked-eth status
```

#### Production Deployment
```bash
# Start both indexers continuously
yarn dev --parallel

# Or start individually if needed
yarn dev eigenpod start
yarn dev staked-eth start
```

## Database Schema

The indexer creates two main tables for storing indexed events:

### EigenPod Events Table (`pod_deployed_events`)
- `id`: Primary key (auto-increment)
- `eigenPod`: The deployed EigenPod address
- `podOwner`: The owner of the pod
- `blockNumber`: Block number where the event occurred
- `transactionHash`: Transaction hash
- `logIndex`: Log index within the transaction
- `createdAt`: Timestamp when the record was created

### Staking Events Table (`staked_eth_events`)
- `id`: Primary key (auto-increment)
- `pubkey`: Validator public key (96 hex characters)
- `withdrawalCredentials`: Withdrawal credentials (32 hex characters)
- `amount`: Staked amount in wei
- `signature`: Validator signature
- `depositIndex`: Deposit index number
- `blockNumber`: Block number where the event occurred
- `blockTimestamp`: Block timestamp (Unix timestamp)
- `transactionHash`: Transaction hash
- `logIndex`: Log index within the transaction
- `createdAt`: Timestamp when the record was created

## Configuration

Environment variables:

- `ETHEREUM_RPC_URL`: Ethereum RPC endpoint (required)
- `EIGENPOD_MANAGER_ADDRESS`: EigenPodManager contract address (default: `0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338`)
- `STAKED_ETH_CONTRACT_ADDRESS`: Staked ETH contract address (default: `0x00000000219ab540356cbb839cbe05303d7705fa`)
- `INDEXER_CRON`: Cron expression for scheduling (default: `* * * * *`)
- `DATABASE_PATH`: Path to SQLite database file (default: `./indexer.db`)
- `MAX_RETRIES`: Maximum number of retries for rate-limited requests (default: `10`)
- `RETRY_DELAY_BASE`: Base delay in seconds for exponential backoff (default: `2`)

## Contract Details

### EigenPodManager Contract
- **Contract Address**: Configurable via `EIGENPOD_MANAGER_ADDRESS` (default: `0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338`)
- **Event**: `PodDeployed(address indexed eigenPod, address indexed podOwner)`
- **Deployment Block**: Automatically detected (typically around block 19939000)
- **Purpose**: Tracks EigenPod deployments for EigenLayer

### Ethereum 2.0 Deposit Contract
- **Contract Address**: Configurable via `STAKED_ETH_CONTRACT_ADDRESS` (default: `0x00000000219ab540356cbb839cbe05303d7705fa`)
- **Event**: `DepositEvent(bytes pubkey, bytes withdrawal_credentials, bytes amount, bytes signature, bytes index)`
- **Deployment Block**: Block 11052984 (November 2020)
- **Purpose**: Tracks all Ethereum 2.0 staking deposits

### Network Configuration
- **Network**: Configurable via `ETHEREUM_RPC_URL` (default: Ethereum Mainnet)
- **Rate Limiting**: Built-in retry logic with exponential backoff for RPC rate limits

## Staking Data Analysis

The staking history indexer provides comprehensive data for analyzing Ethereum 2.0 staking patterns:

### Key Metrics Available
- **Total Staked Amount**: Sum of all staking deposits in wei
- **Event Counts**: Number of staking events per block/range
- **Validator Activity**: Staking patterns by validator public key
- **Withdrawal Patterns**: Analysis of withdrawal credentials usage
- **Temporal Analysis**: Staking activity over time using block timestamps

### Use Cases
- **Staking Analytics**: Track overall staking trends and patterns
- **Validator Research**: Analyze specific validator staking behavior
- **Withdrawal Analysis**: Study withdrawal credential usage patterns
- **Historical Research**: Investigate staking events from any time period
- **Integration**: Connect staking data with EigenPod deployments for comprehensive analysis

### Data Quality
- **Complete Coverage**: All staking events from contract deployment (November 2020)
- **Accurate Timestamps**: Precise block timestamps for temporal analysis
- **Deduplication**: Built-in duplicate prevention using transaction hash + log index
- **Retry Logic**: Robust error handling ensures data completeness

## Data Access

The indexed data is accessible through the backend service via the GraphQL subgraph:

### GraphQL Subgraph
- **Endpoint**: `http://localhost:3001/graphql`
- **Playground**: `http://localhost:3001/graphql` (browser interface)
- **Benefits**: Type-safe, flexible queries, single endpoint for all data

### Example GraphQL Queries
```graphql
# Get EigenPod events
{ eigenPods(skip: 0, limit: 10) { 
  events { id eigenPod podOwner blockNumber } 
  total 
} }

# Get staking statistics
{ stakedEthStats { totalEvents totalAmount lastBlock } }

# Get staking events by validator
{ stakedEth(where: { 
  pubkey: "0x800000c8a5364c1d1e3c4cdb65a28fd21daff4e1fb426c0fb09808105467e4a490d8b3507e7efffbd71024129f1a6b8d" 
}) { 
  events { id pubkey withdrawalCredentials amount blockNumber blockTimestamp } 
  total 
} }

# Get staking events by withdrawal credentials
{ stakedEth(where: { 
  withdrawalCredentials: "0x0100000000000000000000007cd73ab82e3a8e74a3fdfd6a41fed60536b8e501" 
}) { 
  events { id pubkey withdrawalCredentials amount blockNumber blockTimestamp } 
  total 
} }

# Get staking analytics for a block
{ stakedEthAnalytics(input: { blockNumber: 18001984 }) { 
  blockNumber blockTimestamp totalDeposited eventCount 
} }
```
