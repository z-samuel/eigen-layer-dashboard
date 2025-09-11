#!/bin/bash

# Setup script for EigenLayer Indexer environment

echo "Setting up EigenLayer Indexer environment..."

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Copy example environment file
if [ -f "config.example.env" ]; then
    cp config.example.env .env
    echo "✅ Created .env file from config.example.env"
else
    echo "❌ config.example.env not found!"
    exit 1
fi

echo ""
echo "📝 Next steps:"
echo "1. Edit .env file with your actual RPC URL:"
echo "   ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
echo ""
echo "2. Optionally customize other settings:"
echo "   EIGENPOD_MANAGER_ADDRESS=0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338"
echo "   INDEXER_CRON=* * * * *"
echo "   DATABASE_PATH=./indexer.db"
echo ""
echo "3. Run the indexer:"
echo "   yarn dev"
echo ""
echo "🎉 Setup complete!"
