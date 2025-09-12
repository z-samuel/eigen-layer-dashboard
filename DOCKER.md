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
   # First, build the image
   docker compose build

   # Then run with the correct image name
   docker run -p 3000:3000 -p 4000:4000 \
     -v $(pwd)/indexer/indexer.db:/app/indexer/indexer.db \
     eigen-layer-dashboard-eigenlayer-dashboard
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

- `./logs:/app/logs` - Optional: for application logs

**Note**: Database persistence is handled automatically by the indexer. The database file is created at `/app/indexer/indexer.db` inside the container. If you need to persist the database across container restarts, you can add a volume mount:

```yaml
volumes:
  - ./indexer/indexer.db:/app/indexer/indexer.db
```

### Customizing Indexer Configuration

You can override the default indexer settings by setting environment variables:

```bash
# Use a different RPC endpoint
ETHEREUM_RPC_URL="https://your-rpc-endpoint.com" docker compose up

# Change indexing frequency (every 5 minutes)
INDEXER_CRON="*/5 * * * *" docker compose up

# Increase retry attempts
MAX_RETRIES="20" docker compose up
```

Or create a `.env` file in your project root:

```bash
# .env
ETHEREUM_RPC_URL=https://your-rpc-endpoint.com
INDEXER_CRON=*/5 * * * *
MAX_RETRIES=20
```

### Database Management

The indexer automatically creates and manages the SQLite database:

- **Automatic Creation**: The database file is created at `/app/indexer/indexer.db` when the indexer starts
- **Table Initialization**: All necessary tables and indexes are created automatically
- **Data Persistence**: Database persists within the container during its lifetime
- **Volume Mounting**: For data persistence across container restarts, add a volume mount to docker-compose.yml

**Database Features:**
- **EigenPod Events**: Tracks EigenPod deployment events
- **Staked ETH Events**: Tracks Ethereum 2.0 staking events
- **Automatic Indexing**: Optimized indexes for fast queries
- **Shared Access**: Backend services read from the same database

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

## Database Persistence

### Enabling Database Persistence

To persist the database across container restarts:

1. **Add volume mount** to docker-compose.yml:
   ```yaml
   volumes:
     - ./indexer/indexer.db:/app/indexer/indexer.db
   ```

2. **Start the container**:
   ```bash
   docker compose up
   ```

3. **Database will be created** and persisted in `./indexer/indexer.db`

### Custom Database Location

To use a custom database path:

```yaml
volumes:
  - ./my-custom-path/eigenlayer.db:/app/indexer/indexer.db
```

### Database Backup

```bash
# Create backup
docker exec eigenlayer-dashboard sqlite3 /app/indexer/indexer.db ".backup /app/backup.db"

# Copy backup to host
docker cp eigenlayer-dashboard:/app/backup.db ./backup-$(date +%Y%m%d).db
```

## Troubleshooting

### Common Issues

1. **Database creation fails:**
   ```bash
   # Check container logs
   docker compose logs eigenlayer-dashboard
   
   # Check database directory permissions
   docker exec eigenlayer-dashboard ls -la /app/indexer/
   ```

2. **Environment variables not working:**
   ```bash
   # Verify environment variables are set
   docker exec eigenlayer-dashboard env | grep ETHEREUM_RPC_URL
   ```

3. **Port conflicts:**
   ```bash
   # Check if ports are in use
   lsof -i :3000
   lsof -i :4000
   ```

4. **Container won't start:**
   ```bash
   # Check container logs
   docker compose logs eigenlayer-dashboard
   
   # Rebuild without cache
   docker compose build --no-cache
   ```
