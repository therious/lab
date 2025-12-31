#!/bin/bash
# Start Elections Server - can be run from anywhere in the workspace

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Find workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$SCRIPT_DIR"

# PID file location
PID_FILE="/tmp/elections-server.pid"

echo -e "${BLUE}Starting Elections Server...${NC}"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}Server already running (PID: $PID)${NC}"
        echo -e "${GREEN}Server URL: http://localhost:4000${NC}"
        echo -e "${GREEN}API URL: http://localhost:4000/api${NC}"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

# Check if port is in use
if lsof -ti:4000 > /dev/null 2>&1; then
    echo -e "${RED}Port 4000 is already in use${NC}"
    echo -e "${YELLOW}Run './scripts/stop-elections.sh' to stop existing server${NC}"
    exit 1
fi

# Build UI and start server
cd "$WORKSPACE_ROOT/apps/elect"
echo -e "${BLUE}Building UI...${NC}"
pnpm build

echo -e "${BLUE}Copying assets to server...${NC}"
mkdir -p "$WORKSPACE_ROOT/servers/elections/priv/static"
cp -r dist/* "$WORKSPACE_ROOT/servers/elections/priv/static/"

echo -e "${BLUE}Starting Phoenix server...${NC}"
cd "$WORKSPACE_ROOT/servers/elections"

# Start server in background
mix phx.server > /tmp/elections-server.log 2>&1 &
SERVER_PID=$!

# Save PID
echo $SERVER_PID > "$PID_FILE"

# Wait a moment for server to start
sleep 3

# Check if server started successfully
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Elections server started (PID: $SERVER_PID)${NC}"
    echo -e "${GREEN}Server URL: http://localhost:4000${NC}"
    echo -e "${GREEN}API URL: http://localhost:4000/api${NC}"
    echo -e "${YELLOW}Logs: tail -f /tmp/elections-server.log${NC}"
    echo -e "${YELLOW}To stop: ./scripts/stop-elections.sh${NC}"
else
    echo -e "${RED}✗ Server failed to start${NC}"
    echo -e "${YELLOW}Check logs: cat /tmp/elections-server.log${NC}"
    rm -f "$PID_FILE"
    exit 1
fi

