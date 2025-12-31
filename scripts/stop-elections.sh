#!/bin/bash
# Stop Elections Server - can be run from anywhere in the workspace

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Find workspace root (look for servers/elections directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$SCRIPT_DIR"

# PID file location
PID_FILE="/tmp/elections-server.pid"

echo -e "${YELLOW}Stopping Elections Server...${NC}"

# Method 1: Use PID file if it exists
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${GREEN}Found server process (PID: $PID)${NC}"
        kill "$PID" 2>/dev/null || true
        sleep 1
        
        # Force kill if still running
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}Force killing process...${NC}"
            kill -9 "$PID" 2>/dev/null || true
        fi
        
        rm -f "$PID_FILE"
        echo -e "${GREEN}Server stopped (was PID: $PID)${NC}"
    else
        echo -e "${YELLOW}PID file exists but process not found. Cleaning up...${NC}"
        rm -f "$PID_FILE"
    fi
fi

# Method 2: Kill any process on port 4000
PORT_PID=$(lsof -ti:4000 2>/dev/null || true)
if [ ! -z "$PORT_PID" ]; then
    echo -e "${GREEN}Found process on port 4000 (PID: $PORT_PID)${NC}"
    kill "$PORT_PID" 2>/dev/null || true
    sleep 1
    
    # Force kill if still running
    if lsof -ti:4000 > /dev/null 2>&1; then
        PORT_PID=$(lsof -ti:4000)
        echo -e "${YELLOW}Force killing process on port 4000...${NC}"
        kill -9 "$PORT_PID" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}Process on port 4000 stopped${NC}"
fi

# Method 3: Kill any mix phx.server processes
MIX_PIDS=$(pgrep -f "mix phx.server" 2>/dev/null || true)
if [ ! -z "$MIX_PIDS" ]; then
    echo -e "${GREEN}Found mix phx.server processes: $MIX_PIDS${NC}"
    echo "$MIX_PIDS" | xargs kill 2>/dev/null || true
    sleep 1
    echo "$MIX_PIDS" | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}Mix processes stopped${NC}"
fi

# Check if anything is still running
if lsof -ti:4000 > /dev/null 2>&1; then
    echo -e "${RED}Warning: Something is still running on port 4000${NC}"
    echo -e "${YELLOW}Run 'lsof -i :4000' to see what it is${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Elections server stopped successfully${NC}"
    exit 0
fi

