# Elect - Voting Application

React-based voting interface for the Elections system. This application provides a drag-and-drop interface for ranking candidates in elections using a 0-5 scoring system.

## Overview

Elect is a React + Vite application that connects to the [Elections Server](../servers/elections/README.md) to provide a user-friendly voting interface. Users can drag candidates into score bands (0-5) and view election summaries.

## Quick Start

### Development Mode (with Vite dev server)

1. **Start the development server:**
   ```bash
   cd apps/elect
   pnpm start
   ```
   This starts Vite dev server on `http://localhost:5173` with hot reload.

2. **Note:** In dev mode, the app expects the elections server to be running separately. See [Elections Server README](../servers/elections/README.md) for server setup.

### Production Build and Serve

1. **Build UI and start elections server:**
   ```bash
   cd apps/elect
   pnpm serve
   ```
   This will:
   - Build the React application
   - Copy built assets to the elections server
   - Start the Phoenix server
   - Serve the app at `http://localhost:4000`

2. **Stop the server:**
   ```bash
   # From anywhere in workspace
   ./scripts/stop-elections.sh
   
   # Or from server directory
   cd ../servers/elections
   ./scripts/stop-server.sh
   ```

## Available Scripts

- **`pnpm start`** - Start Vite dev server (port 5173)
- **`pnpm build`** - Build for production
- **`pnpm preview`** - Preview production build (port 5173)
- **`pnpm serve`** - Build and serve via elections server (port 4000)
- **`pnpm lint`** - Run ESLint

## Configuration

The app loads election configuration from `/config.yaml` (served from `public/config.yaml`). The elections server also loads configs from `servers/elections/priv/elections/*.yaml`.

See [Elections Server README](../servers/elections/README.md) for election configuration format.

## Testing

### Getting Test Tokens

The UI can request tokens for testing using the debug endpoint:

```javascript
// In browser console or component
fetch('/api/debug/token?election_identifier=presidential-2025')
  .then(r => r.json())
  .then(data => {
    console.log('Token:', data.tokens.token);
    console.log('View Token:', data.tokens.view_token);
  });
```

Or by election title:
```javascript
fetch('/api/debug/token?election_title=Presidential Election')
```

### Manual Testing

1. Start the server: `pnpm serve`
2. Open `http://localhost:4000`
3. Navigate to an election
4. Drag candidates into score bands (0-5)
5. View summary to see all rankings
6. Submit votes (requires token - use debug endpoint)

### Integration Testing

See [Elections Server TESTING.md](../servers/elections/TESTING.md) for API testing examples.

## Features

- **Drag-and-Drop Ranking**: Drag candidates into score bands (0-5)
- **Visual Score Bands**: Color-coded bands from "Excellent" (5) to "Unqualified" (0)
- **Candidate Information**: Display candidate names and party affiliations
- **Ranking Numbers**: Automatic numbering of candidates across all bands
- **Summary View**: Overview of all election rankings
- **Responsive Layout**: Adapts to screen size, switches to horizontal layout when needed

## Architecture

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Redux with `@therious/actions`
- **Styling**: Styled Components
- **Drag & Drop**: Atlassian Pragmatic Drag and Drop
- **Layout**: Masonry Grid for summary view (see [Layout Architecture](./docs/LAYOUT_ARCHITECTURE.md))
- **Routing**: React Router DOM
- **Configuration**: `@therious/boot` for YAML config loading

## Project Structure

```
apps/elect/
├── public/
│   ├── config.yaml          # Election configuration
│   └── favicon.*            # App icons
├── src/
│   ├── -elect.tsx          # Entry point
│   ├── App.tsx             # Main app component
│   ├── actions/            # Redux slices
│   ├── components/         # React components
│   └── index.css          # Global styles
├── scripts/
│   └── build-and-serve.sh  # Build and serve script
└── package.yaml           # Dependencies and scripts
```

## Integration with Elections Server

The elect app communicates with the elections server via:

- **API Endpoints**: `/api/*` routes
- **Static Assets**: Served from elections server's `priv/static/`
- **Configuration**: Elections loaded from server's YAML files

For server details, see [Elections Server README](../servers/elections/README.md).

## Database Inspection

To inspect the SQLite database used by the elections server, see [SQLITE_CONNECTION.md](../servers/elections/SQLITE_CONNECTION.md).

**Database Location:** `servers/elections/priv/repo/elections.db`

## Troubleshooting

### Server not responding
- Check if server is running: `lsof -i :4000`
- Stop server: `./scripts/stop-elections.sh` (from workspace root)
- View server logs: `tail -f /tmp/elections-server.log`
- Restart: `./scripts/start-elections.sh` (from workspace root)

### Tokens not working
- Ensure dev mode is enabled in `servers/elections/config/dev.exs`
- Check server logs for errors
- Verify election identifier matches server config

### Build errors
- Run `pnpm install` to ensure dependencies are installed
- Check that workspace dependencies (`@therious/*`) are built: `pnpm --filter . indexOnce`

## Related Documentation

### UI Documentation
- [UI Features](./docs/UI_FEATURES.md) - Tab management, badges, conditional views
- [Winner Ordering Presentation](./docs/WINNER_ORDERING_PRESENTATION.md) - How winner ordering is displayed
- [Layout Architecture](./docs/LAYOUT_ARCHITECTURE.md) - Summary view masonry layout implementation

### Server Documentation
- [Elections Server README](../servers/elections/README.md) - Server setup and API
- [Winner Ordering Data Structure](../servers/elections/docs/WINNER_ORDERING_NOTATION.md) - Data structure and tie classification
- [Winner Ordering Analysis](../servers/elections/docs/WINNER_ORDERING_ANALYSIS.md) - Algorithm ordering details
- [Elections Server TESTING.md](../servers/elections/docs/TESTING.md) - API testing guide
- [SQLITE_CONNECTION.md](../servers/elections/docs/SQLITE_CONNECTION.md) - Database inspection

