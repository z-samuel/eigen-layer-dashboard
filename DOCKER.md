# Docker Setup for EigenLayer Dashboard

This document explains how to run the EigenLayer Dashboard using Docker.

## Overview

The Docker setup combines all three services (indexer, backend, frontend) into a single container for easy deployment and management. The container includes bootstrap data from any existing `indexer.db` file, allowing you to start with pre-indexed data.

## Quick Start

### Prerequisites

- Docker Engine 20.10.13+ 
- Docker Compose V2 (included with Docker Desktop)
- For older systems, install Docker Compose V2: https://docs.docker.com/compose/install/

> **Note**: This documentation uses `docker compose` (with space) which is the Docker Compose V2 syntax. If you're using Docker Compose V1, replace `docker compose` with `docker-compose` (with hyphen) throughout this guide.

### Using Docker Compose (Recommended)

1. **Build and start the container:**
   ```bash
   docker compose up --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend GraphQL: http://localhost:4000/graphql

3. **Stop the container:**
   ```bash
   docker compose down
   ```

### Using Docker directly

1. **Build the image:**
   ```bash
   docker build -t eigenlayer-dashboard .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:3000 -p 4000:4000 \
     -v $(pwd)/indexer/indexer.db:/app/indexer/indexer.db \
     eigenlayer-dashboard
   ```

## Services

The container runs three services:

1. **Indexer** - Indexes Ethereum blockchain data
2. **Backend** - GraphQL API server (port 4000)
3. **Frontend** - React web application (port 3000)

## Configuration

### Environment Variables

**General:**
- `NODE_ENV=production` - Sets production mode
- `PORT=4000` - Backend server port
- `FRONTEND_PORT=3000` - Frontend server port

**Indexer Configuration:**
- `ETHEREUM_RPC_URL` - Ethereum RPC endpoint (default: https://eth-mainnet.g.alchemy.com/v2/demo)
- `EIGENPOD_MANAGER_ADDRESS` - EigenPod Manager contract address (default: 0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338)
- `STAKED_ETH_CONTRACT_ADDRESS` - Staked ETH contract address (default: 0x00000000219ab540356cbb839cbe05303d7705fa)
- `INDEXER_CRON` - Cron expression for indexing schedule (default: * * * * *)
- `MAX_RETRIES` - Maximum retry attempts for failed requests (default: 10)
- `RETRY_DELAY_BASE` - Base delay in seconds for retries (default: 2)

### Volumes

- `./indexer/indexer.db:/app/indexer/indexer.db` - Persists the SQLite database
- `./logs:/app/logs` - Optional: for application logs

### Customizing Indexer Configuration

You can override the default indexer settings by setting environment variables:

```bash
# Use a different RPC endpoint
docker compose up -e ETHEREUM_RPC_URL="https://your-rpc-endpoint.com"

# Change indexing frequency (every 5 minutes)
docker compose up -e INDEXER_CRON="*/5 * * * *"

# Increase retry attempts
docker compose up -e MAX_RETRIES="20"
```

Or create a `.env` file in your project root:

```bash
# .env
ETHEREUM_RPC_URL=https://your-rpc-endpoint.com
INDEXER_CRON=*/5 * * * *
MAX_RETRIES=20
```

### Bootstrap Data

The Docker image automatically includes any existing `indexer.db` file as bootstrap data:

- **With existing database**: If `indexer/indexer.db` exists, it's copied into the container
- **Without existing database**: The indexer will create a new database and start indexing
- **Volume override**: The volume mount will override the bootstrap data with your local database

This allows you to:
- Start with pre-indexed data for faster initial setup
- Share a database across different deployments
- Maintain data persistence across container restarts

## Health Checks

The container includes health checks to monitor service status:

- **Backend Health Check**: Tests GraphQL endpoint availability
- **Interval**: Every 30 seconds
- **Timeout**: 3 seconds
- **Retries**: 3 attempts
- **Start Period**: 5 seconds

## Development

### Building for Development

```bash
# Build without cache
docker compose build --no-cache

# Run in detached mode
docker compose up -d

# View logs
docker compose logs -f
```

### Debugging

```bash
# Access container shell
docker exec -it eigenlayer-dashboard sh

# View specific service logs
docker compose logs indexer
docker compose logs backend
docker compose logs frontend
```

## Production Deployment

### Using Docker Compose

1. **Create production override:**
   ```yaml
   # docker-compose.prod.yml
   version: '3.8'
   services:
     eigenlayer-dashboard:
       environment:
         - NODE_ENV=production
       restart: always
       deploy:
         resources:
           limits:
             memory: 2G
             cpus: '1.0'
   ```

2. **Deploy:**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml eigenlayer-dashboard
```

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check if ports are in use
   lsof -i :3000
   lsof -i :4000
   ```

2. **Database permissions:**
   ```bash
   # Fix database file permissions
   sudo chown -R $USER:$USER indexer/indexer.db
   ```

3. **Container won't start:**
   ```bash
   # Check container logs
   docker compose logs eigenlayer-dashboard
   ```

### Performance Optimization

1. **Resource limits:**
   ```yaml
   services:
     eigenlayer-dashboard:
       deploy:
         resources:
           limits:
             memory: 2G
             cpus: '1.0'
   ```

2. **Database optimization:**
   - Use SSD storage for database volume
   - Consider external database for production

## Security Considerations

1. **Network isolation:**
   - Use custom Docker networks
   - Limit exposed ports

2. **File permissions:**
   - Run container as non-root user
   - Secure volume mounts

3. **Environment variables:**
   - Use secrets management
   - Avoid hardcoded credentials

## Monitoring

### Health Check Endpoints

- **Backend**: `GET http://localhost:4000/graphql`
- **Frontend**: `GET http://localhost:3000`

### Logging

```bash
# View all logs
docker compose logs

# Follow logs in real-time
docker compose logs -f

# View specific service logs
docker compose logs -f eigenlayer-dashboard
```

## Bootstrap Data Management

### Creating Bootstrap Data

To include existing data in your Docker image:

1. **Run the indexer locally** to create a database:
   ```bash
   # Start local development
   yarn install
   yarn indexer:start
   
   # Wait for indexing to complete
   # The database will be created at indexer/indexer.db
   ```

2. **Build Docker image** with the database:
   ```bash
   docker compose build
   ```

3. **The database is now included** as bootstrap data in the image

### Updating Bootstrap Data

To update the bootstrap data:

1. **Stop the container**:
   ```bash
   docker compose down
   ```

2. **Update your local database**:
   ```bash
   # Run indexer to update data
   yarn indexer:start
   ```

3. **Rebuild the image**:
   ```bash
   docker compose build --no-cache
   ```

4. **Start with updated data**:
   ```bash
   docker compose up
   ```

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker exec eigenlayer-dashboard sqlite3 /app/indexer/indexer.db ".backup /app/backup.db"

# Copy backup to host
docker cp eigenlayer-dashboard:/app/backup.db ./backup-$(date +%Y%m%d).db
```

### Restore Database

```bash
# Copy backup to container
docker cp ./backup.db eigenlayer-dashboard:/app/restore.db

# Restore database
docker exec eigenlayer-dashboard sqlite3 /app/indexer/indexer.db ".restore /app/restore.db"
```
