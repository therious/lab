# Stopping Elections Server

This guide explains how to stop the Elections Server from various contexts.

## Quick Stop (Recommended)

From anywhere in the workspace:
```bash
./scripts/stop-elections.sh
```

## Methods to Stop

### 1. Using the Stop Script (Recommended)

The stop script (`./scripts/stop-elections.sh`) tries multiple methods:
1. Uses PID file (`/tmp/elections-server.pid`) if available
2. Kills any process on port 4000
3. Kills any `mix phx.server` processes
4. Verifies nothing is still running

**Usage:**
```bash
# From workspace root
./scripts/stop-elections.sh

# From any subdirectory
../../scripts/stop-elections.sh
```

### 2. From Server Directory

```bash
cd servers/elections
./scripts/stop-server.sh
```

### 3. Manual Methods

**By PID file:**
```bash
kill $(cat /tmp/elections-server.pid)
rm /tmp/elections-server.pid
```

**By port:**
```bash
kill $(lsof -ti:4000)
```

**Force kill (if process won't stop):**
```bash
kill -9 $(lsof -ti:4000)
```

**By process name:**
```bash
pkill -f "mix phx.server"
```

### 4. From Cursor/IDE

If the server was started from within Cursor:
1. The PID is saved to `/tmp/elections-server.pid`
2. Use the stop script: `./scripts/stop-elections.sh`
3. Or manually: `kill $(cat /tmp/elections-server.pid)`

### 5. From External Terminal

Same as above - the stop script works from any terminal:
```bash
cd /path/to/lab-b
./scripts/stop-elections.sh
```

## Verifying Server is Stopped

```bash
# Check port 4000
lsof -i :4000

# Should return nothing if stopped

# Check for mix processes
ps aux | grep "mix phx.server"

# Check PID file
cat /tmp/elections-server.pid
# Should show "No such file" if cleaned up
```

## Troubleshooting

### Port Still in Use

If port 4000 is still in use after stopping:
```bash
# Find what's using it
lsof -i :4000

# Kill it
kill $(lsof -ti:4000)

# Force kill if needed
kill -9 $(lsof -ti:4000)
```

### PID File Exists But Process is Dead

Clean up the PID file:
```bash
rm /tmp/elections-server.pid
```

### Multiple Servers Running

Kill all mix processes:
```bash
pkill -f "mix phx.server"
```

## Related Documentation

- [Elections Server README](./servers/elections/README.md) - Full server documentation
- [Elect Webapp README](./apps/elect/README.md) - UI application docs

