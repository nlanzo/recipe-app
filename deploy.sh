#!/bin/bash
# deploy.sh

# Build frontend
npm run build

# Build server
npm run build:server

# Copy necessary files
mkdir -p dist/certs
cp certs/us-east-2-bundle.pem dist/certs/
cp .env dist/

# Start server
npm run start:server
