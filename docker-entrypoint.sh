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
    # Clean up polyfill and proxy files
    rm -f /app/backend/crypto-polyfill.js 2>/dev/null || true
    rm -f /app/frontend/serve-proxy.js 2>/dev/null || true
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

# Start Backend
echo "🔧 Starting Backend..."
cd /app/backend

# Create crypto polyfill for Node.js 18
cat > crypto-polyfill.js << 'EOF'
const crypto = require('crypto');
global.crypto = crypto;
EOF

# Start backend with crypto polyfill and environment variables
PORT=${PORT:-4000} node -r ./crypto-polyfill.js dist/main.js &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start Frontend (serve static files)
echo "🌐 Starting Frontend..."
cd /app/frontend

# Use npx serve with a simple proxy configuration
# Create a simple proxy script
cat > serve-proxy.js << 'EOF'
const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');
const path = require('path');

const app = express();

// Proxy /graphql to backend
app.use('/graphql', createProxyMiddleware({
  target: 'http://localhost:4000',
  changeOrigin: true,
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'build')));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.FRONTEND_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
EOF

# Start the frontend server
node serve-proxy.js &
FRONTEND_PID=$!

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
