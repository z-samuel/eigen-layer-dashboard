#!/bin/sh

# Start all services in the EigenLayer Dashboard container

# Fix crypto module issue for Node.js 18
export NODE_OPTIONS="--experimental-global-webcrypto"

echo "🚀 Starting EigenLayer Dashboard..."

# Check if database exists, if not, the indexer will create it
if [ ! -f "/app/indexer/indexer.db" ]; then
    echo "📊 No existing database found, indexer will create a new one..."
else
    echo "📊 Found existing database, using as bootstrap data..."
fi

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    kill $INDEXER_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    # Clean up polyfill file
    rm -f /app/backend/crypto-polyfill.js 2>/dev/null || true
    wait
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Start Indexer
echo "📊 Starting Indexer..."
cd /app/indexer

# Database directory already created with proper permissions in Dockerfile

# Packages are already installed in the Docker image
echo "📊 Using pre-installed packages..."
cd /app/indexer

# Check if dist directory exists, if not build it
if [ ! -d "dist" ]; then
    echo "📊 Building indexer..."
    npm run build
fi

# Set indexer environment variables
export ETHEREUM_RPC_URL=${ETHEREUM_RPC_URL:-"https://eth-mainnet.g.alchemy.com/v2/demo"}
export EIGENPOD_MANAGER_ADDRESS=${EIGENPOD_MANAGER_ADDRESS:-"0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338"}
export STAKED_ETH_CONTRACT_ADDRESS=${STAKED_ETH_CONTRACT_ADDRESS:-"0x00000000219ab540356cbb839cbe05303d7705fa"}
export INDEXER_CRON=${INDEXER_CRON:-"* * * * *"}
export MAX_RETRIES=${MAX_RETRIES:-"10"}
export RETRY_DELAY_BASE=${RETRY_DELAY_BASE:-"2"}

echo "📊 Indexer environment:"
echo "  - RPC URL: $ETHEREUM_RPC_URL"
echo "  - EigenPod Manager: $EIGENPOD_MANAGER_ADDRESS"
echo "  - Staked ETH Contract: $STAKED_ETH_CONTRACT_ADDRESS"
echo "  - Cron: $INDEXER_CRON"

node dist/index.js &
INDEXER_PID=$!

# Wait a bit for indexer to initialize
sleep 5

# Initialize database tables if they don't exist
echo "🔧 Initializing database tables..."
cd /app
node -e "
const { DataSource } = require('typeorm');
const postgresDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DB_URL || 'postgresql://sam:1qaz1qaz@postgres:5432/eigenlayer',
  entities: [],
  synchronize: false,
  logging: false
});

async function ensureTablesExist() {
  try {
    await postgresDataSource.initialize();
    console.log('📡 Connected to PostgreSQL');
    
    // Create tables if they don't exist
    await postgresDataSource.query(\`
      CREATE TABLE IF NOT EXISTS \"pod_deployed_events\" (
        \"id\" SERIAL PRIMARY KEY,
        \"eigenpod\" VARCHAR NOT NULL,
        \"podowner\" VARCHAR NOT NULL,
        \"blocknumber\" INTEGER NOT NULL,
        \"transactionhash\" VARCHAR NOT NULL,
        \"logindex\" INTEGER NOT NULL,
        \"createdat\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(\"transactionhash\", \"logindex\")
      )
    \`);
    console.log('✅ Created pod_deployed_events table');
    
    await postgresDataSource.query(\`
      CREATE TABLE IF NOT EXISTS \"staked_eth_events\" (
        \"id\" SERIAL PRIMARY KEY,
        \"pubkey\" VARCHAR NOT NULL,
        \"withdrawalcredentials\" VARCHAR NOT NULL,
        \"amount\" VARCHAR NOT NULL,
        \"signature\" VARCHAR NOT NULL,
        \"depositindex\" VARCHAR NOT NULL,
        \"blocknumber\" INTEGER NOT NULL,
        \"blocktimestamp\" INTEGER NOT NULL,
        \"transactionhash\" VARCHAR NOT NULL,
        \"logindex\" INTEGER NOT NULL,
        \"createdat\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(\"transactionhash\", \"logindex\")
      )
    \`);
    console.log('✅ Created staked_eth_events table');
    
    // Create indexes
    await postgresDataSource.query(\`CREATE INDEX IF NOT EXISTS \"IDX_pod_deployed_events_blocknumber\" ON \"pod_deployed_events\" (\"blocknumber\")\`);
    await postgresDataSource.query(\`CREATE INDEX IF NOT EXISTS \"IDX_pod_deployed_events_podowner\" ON \"pod_deployed_events\" (\"podowner\")\`);
    await postgresDataSource.query(\`CREATE INDEX IF NOT EXISTS \"IDX_staked_eth_events_blocknumber\" ON \"staked_eth_events\" (\"blocknumber\")\`);
    await postgresDataSource.query(\`CREATE INDEX IF NOT EXISTS \"IDX_staked_eth_events_pubkey\" ON \"staked_eth_events\" (\"pubkey\")\`);
    console.log('✅ Created database indexes');
    
    await postgresDataSource.destroy();
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

ensureTablesExist();
"

# Start Backend
echo "🔧 Starting Backend..."
cd /app/backend

# Create crypto polyfill for Node.js 18
cat > crypto-polyfill.js << 'EOF'
const crypto = require('crypto');
global.crypto = crypto;
EOF

# Start backend with crypto polyfill
echo "🔧 Starting Backend on port 4000..."
node -r ./crypto-polyfill.js dist/main.js &
BACKEND_PID=$!
echo "🔧 Backend started with PID: $BACKEND_PID"

# Wait for backend to start and be ready
echo "⏳ Waiting for backend to be ready..."
sleep 5

# Test if backend is responding
for i in {1..10}; do
  if curl -s http://localhost:4000/graphql > /dev/null 2>&1; then
    echo "✅ Backend is ready!"
    break
  fi
  echo "⏳ Backend not ready yet, waiting... ($i/10)"
  sleep 2
done

# Start Frontend (serve static files)
echo "🌐 Starting Frontend..."
cd /app/frontend

# Start frontend with serve (simple static file server)
echo "🌐 Starting Frontend on port 3000..."
echo "🌐 Frontend will connect to backend at: http://localhost:4000/graphql"
npx serve -s build -l 3000 &
FRONTEND_PID=$!
echo "🌐 Frontend started with PID: $FRONTEND_PID"

echo "✅ All services started!"
echo "📊 Indexer PID: $INDEXER_PID"
echo "🔧 Backend PID: $BACKEND_PID"
echo "🌐 Frontend PID: $FRONTEND_PID"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend GraphQL: http://localhost:4000/graphql"
echo ""

# Wait for any process to exit
wait
