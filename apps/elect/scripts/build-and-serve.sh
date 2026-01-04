#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building Elect UI...${NC}"
cd "$(dirname "$0")/.."
pnpm build

echo -e "${BLUE}Copying built assets to elections server...${NC}"
ELECT_BUILD_DIR="dist"
SERVER_STATIC_DIR="../../servers/elections/priv/static"

# Create static directory if it doesn't exist
mkdir -p "$SERVER_STATIC_DIR"

# Copy all built files
cp -r "$ELECT_BUILD_DIR"/* "$SERVER_STATIC_DIR/"

echo -e "${GREEN}Assets copied successfully!${NC}"
echo -e "${YELLOW}Ensuring Elixir dependencies are installed...${NC}"

cd ../../servers/elections

# Check if dependencies are installed by looking for mix.lock and deps directory
# mix deps.get is idempotent, but we check to avoid unnecessary work
if [ ! -f "mix.lock" ] || [ ! -d "deps" ] || [ -z "$(ls -A deps 2>/dev/null)" ]; then
    echo -e "${BLUE}Installing Elixir dependencies...${NC}"
    mix deps.get
else
    echo -e "${GREEN}✓ Elixir dependencies already installed${NC}"
fi

echo -e "${YELLOW}Regenerating server build info and recompiling...${NC}"
# Force regeneration of build info and recompilation to ensure fresh build
# This ensures server commit hash matches UI commit hash
mix buildinfo.generate
mix compile --force

echo -e "${YELLOW}Starting elections server...${NC}"

# Check if server is already running
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null ; then
    SERVER_PID=$(lsof -Pi :4000 -sTCP:LISTEN -t | head -1)
    echo -e "${YELLOW}Server already running on port 4000 (PID: $SERVER_PID)${NC}"
    echo -e "${RED}⚠️  Server needs to be restarted to use fresh build info${NC}"
    echo -e "${YELLOW}Please stop the server and run 'pnpm serve' again, or restart manually${NC}"
    echo -e "${GREEN}Server URL: http://localhost:4000${NC}"
    echo -e "${GREEN}API URL: http://localhost:4000/api${NC}"
else
    mix phx.server &
    SERVER_PID=$!
    echo $SERVER_PID > /tmp/elections-server.pid
    
    # Wait a moment for server to start
    sleep 2
    
    echo -e "${GREEN}✓ Elections server started (PID: $SERVER_PID)${NC}"
    echo -e "${GREEN}Server URL: http://localhost:4000${NC}"
    echo -e "${GREEN}API URL: http://localhost:4000/api${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
    
    # Wait for server process
    wait $SERVER_PID
fi
