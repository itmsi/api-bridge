#!/bin/bash

# Setup script for Core API MSI Server directories
# This script creates necessary directories with proper permissions

set -e

echo "🔧 Setting up Core API MSI Server directories..."

# Colors for output
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

# Create logs directory structure
print_status "Creating logs directory structure..."
mkdir -p logs/listener logs/upload logs/email logs/queue logs/mail logs/image-ktp logs/pdf logs/excel

# Create public directories
print_status "Creating public directories..."
mkdir -p public/pdf public/excel

# Create storages directories
print_status "Creating storages directories..."
mkdir -p storages/tmp

# Set permissions
print_status "Setting directory permissions..."
chmod -R 755 logs public storages
chmod -R 777 logs/* public/* storages/*

print_status "✅ Directory setup completed successfully!"
print_status "📁 Created directories:"
echo "   - logs/ (with subdirectories)"
echo "   - public/pdf/"
echo "   - public/excel/"
echo "   - storages/tmp/"
print_warning "Note: Directories are set with write permissions for the container" 