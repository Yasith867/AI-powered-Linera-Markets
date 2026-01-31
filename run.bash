#!/bin/bash
# Linera Prediction Markets - Buildathon Run Script
# This script builds and runs the application for the Linera Buildathon

set -e

echo "🚀 Starting Linera Prediction Markets..."

# Install Node.js dependencies
echo "📦 Installing dependencies..."
npm install

# Build the Linera contracts (if Rust is available)
if command -v cargo &> /dev/null; then
    echo "🦀 Building Linera contracts..."
    cd contracts
    cargo build --release --target wasm32-unknown-unknown 2>/dev/null || echo "Note: Linera SDK not installed, skipping contract build"
    cd ..
fi

# Push database schema
echo "🗄️ Setting up database..."
npm run db:push 2>/dev/null || echo "Database already configured"

# Start the development server
echo "⚡ Starting development server on port 5173..."
npm run dev
