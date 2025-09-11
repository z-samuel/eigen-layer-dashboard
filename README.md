# EigenLayer Dashboard

A modern monorepo containing a NestJS backend with GraphQL subgraph, React frontend, and event indexer for monitoring and managing EigenLayer operations.

## 🏗️ Project Structure

```
eigen-layer-dashboard/
├── backend/              # NestJS API server
├── frontend/             # React web application
├── indexer/              # Event indexer
├── lib/                  # Shared types and utilities
│   ├── src/
│   │   ├── types/        # Shared TypeScript interfaces
│   │   ├── utils/        # Shared utility functions
│   │   └── index.ts      # Main export file
│   ├── package.json      # Library configuration
│   └── tsconfig.json     # Library TypeScript config
├── package.json          # Root workspace configuration
├── tsconfig.json         # Shared TypeScript configuration
├── .eslintrc.js         # Shared ESLint configuration
└── .prettierrc          # Shared Prettier configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Yarn 4.0.2+

### Installation

1. Install dependencies for all workspaces:
```bash
yarn install
```

2. Start both frontend and backend in development mode:
```bash
yarn dev
```

This will start:
- Backend API on http://localhost:3001
- GraphQL Playground on http://localhost:3001/graphql
- Frontend app on http://localhost:3000

### Individual Services

Start only the backend:
```bash
yarn backend:dev
```

Start only the frontend:
```bash
yarn frontend:dev
```

Start only the indexer:
```bash
yarn indexer:dev
```

## 📦 Available Scripts

### Root Level Scripts
- `yarn dev` - Start both frontend and backend in development mode
- `yarn build` - Build all projects (lib, backend, frontend, indexer)
- `yarn test` - Run tests for all projects
- `yarn clean` - Clean build artifacts for all projects
- `yarn backend:lint` - Lint backend code
- `yarn frontend:lint` - Lint frontend code

### Shared Library Scripts (`lib/`)
- `yarn lib:build` - Build shared library for production

### Backend Scripts (`backend/`)
- `yarn backend:dev` - Start backend in watch mode
- `yarn backend:build` - Build backend for production
- `yarn workspace @eigen-layer/backend start` - Start production server

### Frontend Scripts (`frontend/`)
- `yarn frontend:dev` - Start frontend development server
- `yarn frontend:build` - Build frontend for production

### Indexer Scripts (`indexer/`)
- `yarn indexer:dev` - Start event indexer in development mode
- `yarn indexer:build` - Build indexer for production
- `yarn indexer:start` - Start indexer in production mode

## 🛠️ Technology Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **GraphQL** - Query language and runtime for APIs
- **Apollo Server** - GraphQL server implementation
- **TypeScript** - Type-safe JavaScript
- **CORS** - Cross-origin resource sharing
- **Materialized Views** - Pre-computed analytics for 100-1000x performance improvement
- **Scheduled Tasks** - Automated data refresh with `@nestjs/schedule`

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Axios** - HTTP client
- **React Router** - Client-side routing
- **CSS3** - Modern styling

### Indexer
- **TypeScript** - Type-safe JavaScript
- **Ethers.js** - Ethereum interaction library
- **SQLite3** - Local database storage
- **Node-cron** - Scheduled task execution
- **Retry Logic** - Robust error handling with exponential backoff

### Shared Library (`lib/`)
- **TypeScript** - Type-safe JavaScript
- **Ethers.js** - Ethereum interaction library
- **Shared Types** - Common interfaces across all projects
- **Utility Functions** - Reusable formatting and helper functions

## 📚 Shared Library Architecture

The `lib/` package contains shared types and utilities used across all projects in the monorepo:

### **Shared Types** (`lib/src/types/`)
- **Database Types** - `PodDeployedEvent`, `StakedEthEvent` interfaces
- **GraphQL Types** - `StakedEthAnalytics`, `StakedEthStats`, `HealthStatus` interfaces
- **Input Types** - `StakedEthAnalyticsInput` for API requests

### **Shared Utilities** (`lib/src/utils/`)
- **Formatters** - `formatWeiToEth()`, `formatTimestamp()`, `formatBlockNumber()`
- **Data Processing** - `formatEthAmount()`, `formatShortEthAmount()`
- **Helper Functions** - Reusable utility functions across projects

### **Benefits**
- **Single Source of Truth** - All types and utilities defined once
- **Type Safety** - Consistent interfaces across frontend, backend, and indexer
- **No Duplication** - Eliminates duplicate code and interfaces
- **Easy Maintenance** - Changes made in one place affect all projects
- **Build Order** - Library is built first, then other projects consume it

### **Usage**
All projects import from the shared library:
```typescript
import { StakedEthEvent, formatWeiToEth } from '@eigen-layer-dashboard/lib';
```

## 🔧 Development

### Adding Dependencies

Add to a specific workspace:
```bash
yarn workspace @eigen-layer-dashboard/lib add <package>
yarn workspace @eigen-layer/backend add <package>
yarn workspace @eigen-layer/frontend add <package>
yarn workspace @eigen-layer/indexer add <package>
```

Add to root (dev dependencies):
```bash
yarn add -D <package>
```

### Code Quality

The project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type checking

Run linting:
```bash
yarn lint
```

## 🌐 API Endpoints

### GraphQL Subgraph
**Endpoint**: `http://localhost:3001/graphql`  
**Playground**: `http://localhost:3001/graphql` (accessible via browser)

The GraphQL subgraph provides a unified interface for all data queries with flexible, type-safe requests. The playground includes pre-configured sample queries organized in tabs:

#### **Available Playground Tabs**
- **Get EigenPods** - Basic EigenPod queries with pagination
- **Staked ETH Events** - Recent staking deposit events
- **Staked ETH by Validator** - Query by validator public key
- **Staked ETH by Block Range** - Query by block range
- **Analytics - Single Block** - Single block analytics
- **Analytics - Block Range** - Block range analytics
- **Analytics - Summary** - Summary analytics for block ranges
- **Staked ETH Statistics** - Overall staking statistics

#### **Health & Status**
- `health` - Service health check with timestamp

#### **EigenPod Queries**
- `eigenPods(skip, limit, where)` - Paginated list of EigenPod events with filtering
- `eigenPodStatus` - Database status and statistics

**EigenPod Filtering Options (`where` parameter):**
- `ownerAddress` - Filter by pod owner address
- `eigenPodAddress` - Filter by EigenPod address
- `validatorPublicKey` - Filter by validator public key
- `startBlock` - Filter by minimum block number
- `endBlock` - Filter by maximum block number

#### **Staked ETH Queries**
- `stakedEth(skip, limit, where)` - Unified staking events query with filtering
- `stakedEthStats` - Staking statistics

#### **Staking Analytics Queries**
- `stakedEthAnalytics(input)` - Unified analytics query supporting:
  - Single block analysis (`blockNumber`)
  - Block range analysis (`startBlock`, `endBlock`)
  - Summary analysis (`startBlock`, `endBlock`, `summary: true`)

#### **Example GraphQL Queries**
```graphql
# Health check
{ health { status timestamp service } }

# Get EigenPods with pagination
{ eigenPods(skip: 0, limit: 5) { 
  pods { id eigenPod podOwner blockNumber } 
  total 
} }

# Get EigenPods by owner address
{ eigenPods(where: { ownerAddress: "0x..." }) { 
  pods { id eigenPod podOwner blockNumber } 
  total 
} }

# Get EigenPods by block range
{ eigenPods(where: { startBlock: 18000000, endBlock: 18001000 }) { 
  pods { id eigenPod podOwner blockNumber } 
  total 
} }

# Get staking statistics
{ stakedEthStats { totalEvents totalAmount lastBlock } }

# Get staked ETH events with filtering
{ stakedEth(skip: 0, limit: 10, where: { pubkey: "0x..." }) { 
  events { id pubkey amount blockNumber } 
  total 
} }

# Get staked ETH events by withdrawal credentials
{ stakedEth(where: { withdrawalCredentials: "0x01..." }) { 
  events { id pubkey amount blockNumber } 
  total 
} }

# Get staked ETH events by block range
{ stakedEth(where: { startBlock: 18000000, endBlock: 18001000 }) { 
  events { id pubkey amount blockNumber } 
  total 
} }

# Get analytics for a single block
{ stakedEthAnalytics(input: { blockNumber: 18001984 }) { 
  blockNumber blockTimestamp totalDeposited eventCount 
} }

# Get analytics for a block range
{ stakedEthAnalytics(input: { 
  startBlock: 18001980, 
  endBlock: 18001990
}) { 
  blockNumber blockTimestamp totalDeposited eventCount 
} }

# Get summary analytics for a block range
{ stakedEthAnalytics(input: { 
  startBlock: 18001980, 
  endBlock: 18001990, 
  summary: true 
}) { 
  blockNumber blockTimestamp totalDeposited eventCount 
} }
```


## 🚀 GraphQL Subgraph Benefits

The GraphQL subgraph provides several advantages over traditional REST APIs:

### **Flexible Data Fetching**
- **Single Request**: Fetch data from multiple sources in one query
- **Field Selection**: Request only the fields you need, reducing payload size
- **Nested Queries**: Combine related data in a single request

### **Type Safety**
- **Strong Typing**: GraphQL schema provides compile-time type checking
- **Auto-completion**: IDE support for query building and validation
- **Runtime Validation**: Automatic validation of queries and responses

### **Developer Experience**
- **Interactive Playground**: Built-in GraphQL playground for testing queries
- **Schema Introspection**: Explore available queries and types dynamically
- **Query Optimization**: GraphQL automatically optimizes data fetching

### **Example: Combined Query**
```graphql
{
  # Get EigenPod data
  eigenPods(skip: 0, limit: 3) {
    events { id eigenPod podOwner blockNumber }
    total
  }
  
  # Get staked ETH events
  stakedEth(skip: 0, limit: 5) {
    events { id pubkey amount blockNumber }
    total
  }
  
  # Get staking statistics
  stakedEthStats {
    totalEvents totalAmount lastBlock
  }
  
  # Get health status
  health {
    status timestamp service
  }
}
```

## ⚡ Performance Optimization

### **Materialized View for Analytics**

The Staked ETH Analytics queries use a materialized view for **dramatic performance improvements**:

#### **Performance Results**
- **Query Response Time**: 2-29ms (100-1000x faster than real-time aggregation)
- **Data Coverage**: 45,374 events pre-aggregated into 16,226 optimized blocks
- **Automatic Refresh**: Updates every minute via scheduled cron job
- **Fallback System**: Graceful degradation to original queries if needed

#### **Technical Implementation**
- **Materialized View**: `staked_eth_analytics_mv` with pre-computed aggregations
- **BigInt Handling**: Proper JavaScript BigInt processing to avoid SQLite overflow
- **Scheduled Refresh**: `@Cron(CronExpression.EVERY_MINUTE)` for real-time updates
- **Error Recovery**: Falls back to original `StakedEthService` if materialized view fails

#### **Architecture**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   GraphQL API    │───▶│ Materialized    │
│   Dashboard     │    │   (NestJS)       │    │ View Service    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Fallback to    │    │   SQLite DB     │
                       │   Original Query │    │ (Pre-aggregated)│
                       └──────────────────┘    └─────────────────┘
```

#### **Benefits**
- **Speed**: 100-1000x faster query responses
- **Scalability**: Consistent performance regardless of data size
- **Reliability**: Automatic refresh with error handling
- **Efficiency**: Pre-computed aggregations eliminate real-time calculations

### Indexer Commands

**Parallel Execution (Default):**
- `yarn indexer:dev` - Start both EigenPod and Staked ETH indexers in parallel
- `yarn indexer:dev --parallel` - Start both indexers in parallel (explicit)

**One-time Operations:**
- `yarn indexer:dev run-once` - Run both indexers once
- `yarn indexer:dev backfill <start> <end>` - Backfill historical events
- `yarn indexer:dev status` - Show indexer status
- `yarn indexer:dev deployment-block` - Get contract deployment block

**EigenPod Indexer:**
- `yarn indexer:dev eigenpod start` - Start EigenPod indexer continuously
- `yarn indexer:dev eigenpod run-once` - Run EigenPod indexer once
- `yarn indexer:dev eigenpod backfill <start> <end>` - Backfill EigenPod events
- `yarn indexer:dev eigenpod status` - Show EigenPod indexer status
- `yarn indexer:dev eigenpod deployment-block` - Get EigenPodManager deployment block

**Staked ETH Indexer:**
- `yarn indexer:dev staked-eth start` - Start Staked ETH indexer continuously
- `yarn indexer:dev staked-eth run-once` - Run Staked ETH indexer once
- `yarn indexer:dev staked-eth backfill <start> <end>` - Backfill Staked ETH events
- `yarn indexer:dev staked-eth status` - Show Staked ETH indexer status
- `yarn indexer:dev staked-eth deployment-block` - Get Deposit Contract deployment block

**Database Queries:**
- `yarn indexer:dev query by-eigenpod <address>` - Query events by eigenPod
- `yarn indexer:dev query by-owner <address>` - Query events by podOwner
- `yarn indexer:dev query by-range <start> <end>` - Query events by block range
- `yarn indexer:dev query staked-eth by-pubkey <pubkey>` - Query by validator pubkey
- `yarn indexer:dev query staked-eth by-withdrawal <credentials>` - Query by withdrawal credentials
- `yarn indexer:dev query staked-eth by-range <start> <end>` - Query by block range
- `yarn indexer:dev query staked-eth by-block <block>` - Query by specific block
- `yarn indexer:dev query staked-eth stats` - Show staking statistics

## 📊 Indexer Features

The indexer system monitors both EigenPod deployments and Ethereum 2.0 staking events, storing them in a local SQLite database:

### **Parallel Execution**
- **Dual Indexers**: Runs both EigenPod and Staked ETH indexers simultaneously by default
- **Independent Operation**: Each indexer operates independently with separate cron schedules
- **Flexible Control**: Option to run indexers individually or in parallel
- **Unified Status**: Combined status reporting for both indexers

### **EigenPod Indexing**
- **Real-time indexing**: Monitors new blocks for PodDeployed events
- **Automatic deployment detection**: Starts indexing from contract deployment block
- **Historical backfill**: Can backfill events from any block range

### **Staked ETH Indexing**
- **Deposit Event Monitoring**: Tracks Ethereum 2.0 DepositEvent from contract 0x00000000219ab540356cbb839cbe05303d7705fa
- **Validator Tracking**: Links staking deposits to validator public keys
- **Block Timestamps**: Captures exact block timestamps for temporal analysis
- **Complete History**: Backfills from contract deployment (block 11052984)

### **Core Features**
- **SQLite storage**: Stores events with proper indexing for efficient querying
- **Scheduled execution**: Runs periodically using cron expressions
- **Retry logic**: Robust error handling with exponential backoff for rate limits
- **Query interface**: Built-in commands to query indexed events

### GraphQL Subgraph Features

The GraphQL subgraph provides comprehensive data access with intelligent fallback and flexible querying:

#### **EigenPod Data Access**
- **Database-First Search**: Searches the indexed database for historical EigenPod deployments
- **Contract Fallback**: If no results found in database, calls the EigenPodManager contract's `getPod` function
- **Unified Queries**: Single `eigenPods` query with flexible filtering options
- **Source Attribution**: Indicates whether data came from database or contract
- **Case-Insensitive**: Handles address case variations automatically
- **Validator Integration**: Links Ethereum validators to EigenPods via withdrawal credentials

#### **Staked ETH Data Access**
- **Deposit Event Monitoring**: Tracks `DepositEvent` from Ethereum 2.0 Deposit Contract
- **Validator Tracking**: Links staking deposits to validator public keys
- **Withdrawal Credentials**: Tracks withdrawal destination addresses
- **Block Timestamps**: Captures exact block timestamps for temporal analysis
- **Historical Data**: Complete backfill from contract deployment (block 11052984)
- **Unified Queries**: Single `stakedEth` query with flexible filtering options
- **Analytics Support**: Comprehensive `stakedEthAnalytics` query for temporal analysis

#### **Advanced Query Features**
- **Flexible Filtering**: Query by pubkey, withdrawal credentials, block ranges, and more
- **Pagination Support**: Efficient handling of large datasets with skip/limit
- **Type Safety**: Strong typing with automatic validation
- **Single Endpoint**: All data accessible through one GraphQL endpoint
- **Interactive Playground**: Built-in query testing and exploration interface

### Indexer Data Schema

**EigenPod Events:**
```sql
CREATE TABLE pod_deployed_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eigenPod TEXT NOT NULL,
  podOwner TEXT NOT NULL,
  blockNumber INTEGER NOT NULL,
  transactionHash TEXT NOT NULL,
  logIndex INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transactionHash, logIndex)
);
```

**Staked ETH Events:**
```sql
CREATE TABLE staked_eth_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pubkey TEXT NOT NULL,
  withdrawalCredentials TEXT NOT NULL,
  amount TEXT NOT NULL,
  signature TEXT NOT NULL,
  depositIndex TEXT NOT NULL,
  blockNumber INTEGER NOT NULL,
  blockTimestamp INTEGER NOT NULL,
  transactionHash TEXT NOT NULL,
  logIndex INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transactionHash, logIndex)
);
```

## 📝 Environment Variables

Create `.env` files in the respective app directories as needed:

### Backend (`backend/.env`)
```
PORT=3001
NODE_ENV=development
```

### Frontend (`frontend/.env`)
```
REACT_APP_API_URL=http://localhost:3001
```

### Indexer (`indexer/.env`)
```
# Required: Your Ethereum RPC endpoint
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_API_KEY

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

## 🚀 Deployment

### Build for Production

```bash
yarn build
```

### Backend Deployment
The backend builds to `backend/dist/` and can be deployed as a Node.js application.

### Frontend Deployment
The frontend builds to `frontend/build/` and can be deployed to any static hosting service.

### Indexer Deployment
The indexer builds to `indexer/dist/` and can be deployed as a Node.js application or run as a background service.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
