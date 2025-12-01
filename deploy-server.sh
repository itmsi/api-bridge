#!/bin/bash

# Core API MSI Server Deployment Script
# This script deploys only the API service without database or Redis

set -e

echo "🚀 Starting Core API MSI Server Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it first."
    exit 1
fi

# Setup directories
print_status "Setting up directories..."
if [ -f "./setup-server-dirs.sh" ]; then
    ./setup-server-dirs.sh
else
    print_warning "setup-server-dirs.sh not found, creating directories manually..."
    mkdir -p logs/listener logs/upload logs/email logs/queue logs/mail logs/image-ktp logs/pdf logs/excel
    mkdir -p public/pdf public/excel
    mkdir -p storages/tmp
    chmod -R 755 logs public storages
    chmod -R 777 logs/* public/* storages/*
fi

# Stop existing containers if running
print_status "Stopping existing containers..."
docker-compose -f docker-compose.server.yml down || true

# Build the image
print_status "Building Docker image..."
docker-compose -f docker-compose.server.yml build

# Start the service
print_status "Starting API service..."
docker-compose -f docker-compose.server.yml up -d

# Wait a moment for the service to start
sleep 5

# Check if the service is running
if docker-compose -f docker-compose.server.yml ps | grep -q "Up"; then
    print_status "✅ API service is running successfully!"
    print_status "🌐 API available at: http://localhost:9509"
    print_status "📊 Health check: http://localhost:9509/health"
    
    # Show container status
    echo ""
    print_status "Container status:"
    docker-compose -f docker-compose.server.yml ps
    
    # Show logs
    echo ""
    print_status "Recent logs:"
    docker-compose -f docker-compose.server.yml logs --tail=20
    
else
    print_error "❌ Failed to start API service"
    print_status "Checking logs for errors:"
    docker-compose -f docker-compose.server.yml logs
    exit 1
fi

echo ""
print_status "🎉 Deployment completed successfully!"
print_warning "Note: This deployment includes only the API service (no database or Redis)"
print_status "Use 'make docker-server-logs' to view logs"
print_status "Use 'make docker-server-down' to stop the service" 