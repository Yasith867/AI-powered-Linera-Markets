#!/bin/bash

# Linera Prediction Market Deployment Script
# For Testnet Conway

set -e

echo "================================================"
echo "  Linera Prediction Market - Deployment Script"
echo "  Target: Testnet Conway"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Linera CLI is installed
if ! command -v linera &> /dev/null; then
    echo -e "${RED}Error: Linera CLI not found${NC}"
    echo "Install it with: curl -sSL https://get.linera.io | sh"
    exit 1
fi

echo -e "${GREEN}✓ Linera CLI found${NC}"

# Check Rust and wasm target
if ! command -v rustup &> /dev/null; then
    echo -e "${RED}Error: Rust not found${NC}"
    echo "Install it with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

echo -e "${GREEN}✓ Rust found${NC}"

# Add wasm target if not present
rustup target add wasm32-unknown-unknown 2>/dev/null || true
echo -e "${GREEN}✓ wasm32-unknown-unknown target ready${NC}"

echo ""
echo "Step 1: Initialize wallet for Testnet Conway"
echo "============================================="

FAUCET_URL="https://faucet.testnet-conway.linera.net"

# Check if wallet exists, if not initialize
if [ ! -f "$HOME/.linera/wallet.json" ]; then
    echo "Initializing new wallet..."
    linera wallet init --faucet $FAUCET_URL
    echo -e "${GREEN}✓ Wallet initialized${NC}"
else
    echo -e "${YELLOW}Wallet already exists${NC}"
fi

echo ""
echo "Step 2: Request microchain from faucet"
echo "======================================="

linera wallet request-chain --faucet $FAUCET_URL || echo "Using existing chain"
echo -e "${GREEN}✓ Microchain ready${NC}"

echo ""
echo "Step 3: Build contracts"
echo "======================="

cd "$(dirname "$0")"

echo "Building prediction-market contract..."
cd market
cargo build --release --target wasm32-unknown-unknown
cd ..

echo -e "${GREEN}✓ Contracts built${NC}"

echo ""
echo "Step 4: Deploy application"
echo "=========================="

# Get the built wasm files
CONTRACT_WASM="../target/wasm32-unknown-unknown/release/prediction_market_contract.wasm"
SERVICE_WASM="../target/wasm32-unknown-unknown/release/prediction_market_service.wasm"

if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
    echo -e "${RED}Error: WASM files not found${NC}"
    echo "Expected:"
    echo "  $CONTRACT_WASM"
    echo "  $SERVICE_WASM"
    exit 1
fi

echo "Deploying prediction market application..."

# Deploy the application
APP_ID=$(linera publish-and-create \
    "$CONTRACT_WASM" \
    "$SERVICE_WASM" \
    --json-argument '{"admin": null, "oracle_threshold": 67}' \
    2>&1 | grep -oP 'Created application \K[a-f0-9]+' || true)

if [ -z "$APP_ID" ]; then
    echo -e "${YELLOW}Deployment may have failed or APP_ID not captured${NC}"
    echo "Run manually:"
    echo "  linera publish-and-create $CONTRACT_WASM $SERVICE_WASM --json-argument '{\"admin\": null, \"oracle_threshold\": 67}'"
else
    echo -e "${GREEN}✓ Application deployed!${NC}"
    echo ""
    echo "================================================"
    echo "  APPLICATION ID: $APP_ID"
    echo "================================================"
    echo ""
    echo "Update your frontend with this ID:"
    echo "  PREDICTION_MARKET_APP_ID = '$APP_ID'"
fi

echo ""
echo "Step 5: Start node service"
echo "=========================="
echo ""
echo "To interact with your application, run:"
echo "  linera service"
echo ""
echo "Then open http://localhost:8080 in your browser"
echo ""
echo -e "${GREEN}Deployment complete!${NC}"
