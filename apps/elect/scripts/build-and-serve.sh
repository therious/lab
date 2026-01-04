#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get directories
ELECT_DIR="$(dirname "$0")/.."
SERVER_DIR="../../servers/elections"

echo -e "${BLUE}Generating build info for UI and server (same git state)...${NC}"

# CRITICAL: Generate both UI and server build info at the SAME TIME
# This ensures they capture the same git commit hash
cd "$ELECT_DIR"

# Generate UI build info
echo -e "${YELLOW}Generating UI build info...${NC}"
node scripts/generate-build-info.js

# Generate server build info immediately after (same git state)
echo -e "${YELLOW}Generating server build info...${NC}"
cd "$SERVER_DIR"
mix buildinfo.generate
cd "$ELECT_DIR"

# Now build the UI (build info already generated and embedded)
echo -e "${BLUE}Building Elect UI...${NC}"
tsc && vite build

echo -e "${BLUE}Copying built assets to elections server...${NC}"
ELECT_BUILD_DIR="dist"
SERVER_STATIC_DIR="$SERVER_DIR/priv/static"

# Create static directory if it doesn't exist
mkdir -p "$SERVER_STATIC_DIR"

# Copy all built files
cp -r "$ELECT_BUILD_DIR"/* "$SERVER_STATIC_DIR/"

echo -e "${GREEN}Assets copied successfully!${NC}"
echo -e "${YELLOW}Ensuring Elixir dependencies are installed...${NC}"

cd "$SERVER_DIR"

# Check if server is already running and stop it if so
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null ; then
    SERVER_PID=$(lsof -Pi :4000 -sTCP:LISTEN -t | head -1)
    echo -e "${YELLOW}Stopping existing server on port 4000 (PID: $SERVER_PID)...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    # Wait for server to stop
    sleep 1
    # Force kill if still running
    if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null ; then
        kill -9 $SERVER_PID 2>/dev/null || true
        sleep 1
    fi
    echo -e "${GREEN}✓ Server stopped${NC}"
fi

# Check if dependencies are installed by looking for mix.lock and deps directory
# mix deps.get is idempotent, but we check to avoid unnecessary work
if [ ! -f "mix.lock" ] || [ ! -d "deps" ] || [ -z "$(ls -A deps 2>/dev/null)" ]; then
    echo -e "${BLUE}Installing Elixir dependencies...${NC}"
    mix deps.get
else
    echo -e "${GREEN}✓ Elixir dependencies already installed${NC}"
fi

echo -e "${YELLOW}Compiling server (build info already generated)...${NC}"
# Build info was already generated above, but mix compile alias will regenerate it
# This is fine - it ensures consistency. Clean first to remove cached modules.
mix clean
# Compile (the alias will run buildinfo.generate again, ensuring it matches)
mix compile

echo -e "${YELLOW}Starting elections server...${NC}"

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
