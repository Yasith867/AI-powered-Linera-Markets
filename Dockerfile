# Linera Prediction Markets - Buildathon Submission
# Multi-stage build for Linera contracts and Node.js frontend

FROM ghcr.io/aspect-build/rules_js:v2.0.0-rc0 AS node-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production=false

# Copy source files
COPY . .

# Build frontend
RUN npm run build

# Linera SDK builder stage
FROM rust:1.75-slim-bookworm AS rust-builder

RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN rustup target add wasm32-unknown-unknown

WORKDIR /contracts

# Copy contract source
COPY contracts/ .

# Build Linera contracts (commented out for now - requires full Linera SDK)
# RUN cargo build --release --target wasm32-unknown-unknown

# Final runtime image
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy built assets
COPY --from=node-builder /app/dist ./dist
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/package.json ./

# Copy contract source for reference
COPY contracts ./contracts

# Expose ports
EXPOSE 5173 8080 9001 13001

# Start the application
CMD ["npm", "run", "start"]
