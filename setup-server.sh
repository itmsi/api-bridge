#!/bin/bash

# Setup Script untuk Report Management SSO Client di Server Ubuntu
# Script ini akan membantu mengkonfigurasi environment dan menjalankan aplikasi

echo "🚀 Setting up Report Management SSO Client..."

# 1. Copy environment file untuk server
echo "📋 Copying server environment configuration..."
if [ -f "environment.server" ]; then
    cp environment.server .env
    echo "✅ Environment file copied successfully"
else
    echo "❌ environment.server file not found!"
    exit 1
fi

# 2. Check if RabbitMQ is running on custom port
echo "🐰 Checking RabbitMQ connection..."
RABBITMQ_URL=$(grep RABBITMQ_URL .env | cut -d '=' -f2)
echo "RabbitMQ URL: $RABBITMQ_URL"

# Test RabbitMQ connection
if command -v rabbitmqctl &> /dev/null; then
    echo "RabbitMQ service found, checking status..."
    if systemctl is-active --quiet rabbitmq-server; then
        echo "✅ RabbitMQ service is running"
    else
        echo "⚠️  RabbitMQ service is not running"
        echo "   Starting RabbitMQ service..."
        sudo systemctl start rabbitmq-server
        sudo systemctl enable rabbitmq-server
    fi
else
    echo "⚠️  RabbitMQ not installed, but will try to connect anyway"
fi

# 3. Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# 4. Run database migrations
echo "🗄️  Running database migrations..."
if command -v npm &> /dev/null; then
    npm run migrate
    echo "✅ Database migrations completed"
else
    echo "❌ npm not found!"
    exit 1
fi

# 5. Start the application
echo "🎯 Starting Report Management SSO Client..."
echo "   Port: $(grep APP_PORT .env | cut -d '=' -f2)"
echo "   RabbitMQ: $(grep RABBITMQ_URL .env | cut -d '=' -f2)"
echo ""
echo "Press Ctrl+C to stop the application"
echo "=================================="

npm run dev
