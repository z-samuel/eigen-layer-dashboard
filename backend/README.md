# EigenLayer Backend API

A NestJS backend service providing a GraphQL subgraph for EigenLayer data.

## Features

- **GraphQL Subgraph**: Type-safe queries and flexible data fetching
- **EigenPod Management**: Search and manage EigenPod deployments
- **Staking Analytics**: Track Ethereum 2.0 staking deposits and withdrawals
- **Database Integration**: SQLite database with indexed blockchain events

## Quick Start

### Development
```bash
# Install dependencies
yarn install

# Start development server
yarn dev
```

### Production
```bash
# Build the application
yarn build

# Start production server
yarn start
```

## API Endpoints

### GraphQL Subgraph
- **Endpoint**: `http://localhost:3001/graphql`
- **Playground**: `http://localhost:3001/graphql` (browser interface)

## GraphQL Schema

The GraphQL schema provides comprehensive queries for:

- **EigenPod Events**: Search and filter EigenPod deployments
- **Staked ETH Events**: Track Ethereum 2.0 staking deposits
- **Analytics**: Cumulative staking data and statistics
- **Health**: Service status and monitoring

## Technology Stack

- **NestJS**: Progressive Node.js framework
- **GraphQL**: Query language with Apollo Server
- **TypeScript**: Type-safe development
- **SQLite3**: Local database storage

## Environment Variables

```bash
PORT=3001
NODE_ENV=development
```

## Database

The backend connects to the SQLite database created by the indexer service, containing:
- EigenPod deployment events
- Ethereum 2.0 staking deposits
- Block timestamps and metadata

## Development

### Adding New Queries

1. Define GraphQL types in `src/graphql.types.ts`
2. Add resolver methods in `src/graphql.resolver.ts`
3. Implement service methods in respective service files
4. Update schema by restarting the server

### Testing

```bash
# Run tests
yarn test

# Run tests in watch mode
yarn test:watch
```

## Deployment

The backend builds to `dist/` and can be deployed as a standard Node.js application. Ensure the SQLite database file is accessible and the indexer service is running to populate data.
