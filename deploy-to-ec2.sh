#!/bin/bash
# deploy-to-ec2.sh

# Build the application and run tests
echo "Running tests and building the application..."
./deploy.sh

# Check if deploy.sh was successful
if [ $? -ne 0 ]; then
  echo "❌ Tests or build failed. Deployment aborted."
  exit 1
fi

echo "✅ All tests passed and build completed successfully."

# Replace these with your EC2 instance details
EC2_KEY=".ssh/secret-key-2.pem"        # Path to your EC2 private key file
EC2_USER="ec2-user"                   # Default user for Amazon Linux EC2 instances
EC2_IP=18.219.208.65                 # Your EC2 instance's public IP address
EC2_PATH="/home/ec2-user/server"      # Path to your application on EC2

# Create necessary directories on EC2
echo "Setting up directories on EC2..."
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "mkdir -p $EC2_PATH/dist"

# Install tree if not available
echo "Ensuring tree command is available..."
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "
  if ! command -v tree &> /dev/null; then
    sudo yum install -y tree > /dev/null 2>&1
  fi
"

# Convert line endings to Unix format for all scripts
echo "Converting line endings..."
if command -v dos2unix &> /dev/null; then
    dos2unix deploy-scripts/start-server.sh deploy-scripts/setup-ssl.sh deploy-scripts/setup-nginx.sh
else
    echo "Warning: dos2unix not found. Line endings might cause issues."
fi

# Kill any existing Node.js processes and clear port 443
echo "Cleaning up existing processes..."
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "
  sudo lsof -t -i:443 | xargs sudo kill -9 || true
  sudo lsof -t -i:80 | xargs sudo kill -9 || true
  pm2 delete all || true
  pm2 kill || true
  sudo systemctl stop nginx || true
" > /dev/null 2>&1

# Copy files to EC2
echo "Copying files to EC2..."
scp -i $EC2_KEY deploy-scripts/*.sh ecosystem.config.cjs package.json package-lock.json $EC2_USER@$EC2_IP:$EC2_PATH/ > /dev/null 2>&1
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "chmod +x $EC2_PATH/*.sh"

# Copy the .env file directly and set permissions
echo "Setting up environment variables..."
scp -i $EC2_KEY .env $EC2_USER@$EC2_IP:$EC2_PATH/.env > /dev/null 2>&1
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "
  # Clean up any carriage returns in the .env file
  sed -i 's/\r$//' $EC2_PATH/.env
  chmod 600 $EC2_PATH/.env
  # Verify environment variables
  echo 'Verifying environment variables...'
  if [ -f $EC2_PATH/.env ]; then
    # Check required variables without displaying values
    required_vars=(
      'AWS_ACCESS_KEY_ID'
      'AWS_SECRET_ACCESS_KEY'
      'AWS_REGION'
      'SMTP_FROM'
      'FRONTEND_URL'
    )
    missing_vars=()
    
    for var in \${required_vars[@]}; do
      if ! grep -q \"^\$var=\" $EC2_PATH/.env; then
        missing_vars+=(\$var)
      fi
    done
    
    if [ \${#missing_vars[@]} -eq 0 ]; then
      echo '✓ All required environment variables are set'
    else
      echo '✗ Missing required environment variables:'
      printf '%s\n' \"\${missing_vars[@]}\"
      exit 1
    fi
  else
    echo '✗ .env file is missing!'
    exit 1
  fi
"

# Then copy the application files
echo "Copying dist directory contents..."
scp -r -i $EC2_KEY dist/* $EC2_USER@$EC2_IP:$EC2_PATH/dist/ > /dev/null 2>&1

# Set proper ownership
echo "Setting proper ownership..."
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "sudo chown -R ec2-user:ec2-user $EC2_PATH"

# Install dependencies and fix vulnerabilities
echo "Installing dependencies..."
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "cd $EC2_PATH && npm install --omit=dev && npm audit fix --force" > /dev/null 2>&1

# Setup nginx
echo "Setting up nginx..."
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "cd $EC2_PATH && ./setup-nginx.sh" > /dev/null 2>&1

# Ensure certificate auto-renewal is set up (updates renewal script and cron job)
echo "Setting up certificate auto-renewal..."
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "cd $EC2_PATH && sudo ./fix-cert-renewal.sh" > /dev/null 2>&1

# Verify deployment
echo -e "\nVerifying deployment..."
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "
  echo 'Directory structure:' && \
  if command -v tree &> /dev/null; then
    tree -L 2 $EC2_PATH
  else
    echo 'Listing directories (tree command not available):' && \
    ls -R --color=auto $EC2_PATH | grep '^.*:$' | sed -e 's/:$//' -e 's/[^-][^\/]*\//  /g' -e 's/^/  /'
  fi && \
  echo '\nEnvironment file status:' && \
  if [ -f $EC2_PATH/.env ]; then
    echo '✓ .env file is present and secured'
  else
    echo '✗ .env file is missing!'
  fi
"

# Restart the server
echo -e "\nRestarting server..."
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "cd $EC2_PATH && ./start-server.sh" > /dev/null 2>&1

# Wait a moment for the server to start
sleep 3

# Check server status
echo -e "\nServer Status:"
echo "--------------------"
ssh -i $EC2_KEY $EC2_USER@$EC2_IP "
  echo 'PM2 Process:' && \
  pm2 list && \
  echo '\nNginx Status:' && \
  systemctl is-active --quiet nginx && echo '✓ Nginx is running' || echo '✗ Nginx is not running' && \
  echo '\nRecent Application Logs:' && \
  pm2 logs recipe-app --lines 5 --nostream
" 