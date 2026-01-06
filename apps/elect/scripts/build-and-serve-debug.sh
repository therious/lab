#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Performing DEBUG build of Elect UI (with source maps, unmangled names)...${NC}"
cd "$(dirname "$0")/.."

# Clean previous build artifacts
echo -e "${YELLOW}Removing old build artifacts...${NC}"
rm -rf dist

# Build with debug mode enabled
echo -e "${BLUE}Building Elect UI (DEBUG mode: source maps, unmangled names)...${NC}"
VITE_DEBUG=true pnpm build --mode debug

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

echo -e "${YELLOW}Stopping any existing server on port 4000...${NC}"

# Kill ALL processes using port 4000
PIDS_ON_PORT=$(lsof -ti:4000 2>/dev/null || true)
if [ -n "$PIDS_ON_PORT" ]; then
    echo -e "${YELLOW}Found processes on port 4000: $PIDS_ON_PORT${NC}"
    echo "$PIDS_ON_PORT" | xargs kill -9 2>/dev/null || true
fi

# Kill any beam/elixir processes that might be the elections server
pkill -9 -f "mix phx.server" 2>/dev/null || true
pkill -9 -f "elections.*phx" 2>/dev/null || true

# Wait for processes to fully stop
sleep 3

# Verify port is free
if lsof -ti:4000 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 4000 still in use, forcing cleanup...${NC}"
    lsof -ti:4000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Verify it's actually free now
if lsof -ti:4000 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ WARNING: Port 4000 is still in use after cleanup${NC}"
    echo -e "${YELLOW}You may need to manually kill processes: lsof -ti:4000 | xargs kill -9${NC}"
else
    echo -e "${GREEN}✓ Port 4000 is free${NC}"
fi

# Clean up PID file
rm -f /tmp/elections-server.pid

echo -e "${YELLOW}Performing clean build of Elixir server...${NC}"

# Clean build - remove all compiled code
echo -e "${BLUE}Removing old build artifacts...${NC}"
rm -rf _build
mix clean

echo -e "${BLUE}Compiling server (clean build)...${NC}"
mix compile

echo -e "${GREEN}✓ Clean build completed${NC}"

echo -e "${YELLOW}Starting elections server (DEBUG mode)...${NC}"

# Start the server
mix phx.server &
SERVER_PID=$!
echo $SERVER_PID > /tmp/elections-server.pid

# Wait a moment for server to start
sleep 3

# Verify server started successfully
if ps -p "$SERVER_PID" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Elections server started (PID: $SERVER_PID)${NC}"
    echo -e "${GREEN}Server URL: http://localhost:4000${NC}"
    echo -e "${GREEN}API URL: http://localhost:4000/api${NC}"
    echo -e "${BLUE}DEBUG MODE: Source maps enabled, names unmangled${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

    # Wait for server process
    wait $SERVER_PID
else
    echo -e "${YELLOW}⚠ Server process may have failed to start${NC}"
    exit 1
fi
