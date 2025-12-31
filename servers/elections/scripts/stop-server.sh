#!/bin/bash

if [ -f /tmp/elections-server.pid ]; then
    PID=$(cat /tmp/elections-server.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Stopping elections server (PID: $PID)..."
        kill $PID
        rm /tmp/elections-server.pid
        echo "Server stopped."
    else
        echo "Server process not found. Cleaning up PID file."
        rm /tmp/elections-server.pid
    fi
else
    # Try to find and kill any process on port 4000
    PID=$(lsof -ti:4000)
    if [ ! -z "$PID" ]; then
        echo "Found process on port 4000 (PID: $PID). Stopping..."
        kill $PID
        echo "Server stopped."
    else
        echo "No elections server found running."
    fi
fi

