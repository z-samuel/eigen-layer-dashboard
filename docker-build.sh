#!/bin/bash

# Docker build script for EigenLayer Dashboard

set -e

echo "🐳 Building EigenLayer Dashboard Docker image..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build the image
echo "📦 Building Docker image..."
docker build -t eigenlayer-dashboard:latest .

echo "✅ Docker image built successfully!"
echo ""
echo "🚀 To run the container:"
echo "   docker compose up"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:4000/graphql"
echo ""
echo "📚 For more information, see DOCKER.md"
