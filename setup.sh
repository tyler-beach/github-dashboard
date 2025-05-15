#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}GitHub Dashboard - Initial Setup${NC}"
echo "----------------------------------------"
echo
echo "This script will help you set up your GitHub Dashboard environment."
echo

# Check if .env file exists
if [ -f .env ]; then
    echo "An existing .env file was found. Would you like to:"
    echo "1. Keep the existing file"
    echo "2. Create a new file"
    read -p "Enter your choice (1-2): " choice
    
    if [ "$choice" = "1" ]; then
        echo "Keeping existing .env file..."
        exit 0
    fi
fi

# GitHub OAuth Setup
echo -e "${BLUE}GitHub OAuth Setup${NC}"
echo "To use this application, you need to create a GitHub OAuth App."
echo "1. Go to GitHub -> Settings -> Developer settings -> OAuth Apps -> New OAuth App"
echo "2. Set Homepage URL to: http://localhost:3000"
echo "3. Set Authorization callback URL to: http://localhost:3000/auth/callback"
echo

# Get GitHub OAuth credentials
read -p "Enter your GitHub Client ID: " github_client_id
read -p "Enter your GitHub Client Secret: " github_client_secret

# Create .env file
cat > .env << EOL
# GitHub OAuth Configuration
VITE_GITHUB_CLIENT_ID=${github_client_id}
VITE_GITHUB_CLIENT_SECRET=${github_client_secret}
VITE_GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback

# API Configuration
VITE_API_URL=http://localhost:3000

# Application Configuration
VITE_APP_NAME=GitHub Dashboard
NODE_ENV=development

# Optional: Rate Limiting (requests per hour)
VITE_GITHUB_RATE_LIMIT=5000
EOL

echo
echo -e "${GREEN}Environment configuration complete!${NC}"
echo
echo "To start the application, run:"
echo "  ./start.sh"
echo
echo "The application will be available at: http://localhost:3000"

# Make start.sh executable if it exists
if [ -f start.sh ]; then
    chmod +x start.sh
fi 