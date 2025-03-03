#!/bin/bash
# start-server.sh

# Stop the current server instance if it exists
pm2 stop recipe-app 2>/dev/null || true

# Load environment variables from .env file
set -a
source dist/.env
set +a

# Start the server with the new code and environment variables
pm2 start npm --name "recipe-app" -- run start:server

# Display the logs
pm2 logs recipe-app 