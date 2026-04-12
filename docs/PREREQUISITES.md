# Prerequisites

This document describes the prerequisites for building and running applications and servers in this monorepo.

## General Prerequisites

These are required for all applications and servers:

- **Git** - Version control (any recent version)
- **Bash** - Shell scripting (standard on macOS/Linux, Git Bash on Windows)
- **Node.js** - `>= 18.17.1` (required by root `package.yaml`)
- **pnpm** - `>= 8.7.4` (package manager, required by root `package.yaml`)
- **TypeScript** - `~5.4.5` (installed as dev dependency, used by most projects)

## Applications

### React/Vite Applications

The following applications are React-based and use Vite for building:

- **elect** - Voting interface application
- **circle** - Circle of fifths visualization
- **graphic** - Graph visualization application
- **progressions** - Music progression viewer
- **roots** - Roots application
- **ticket** - Ticket application
- **zclient** - Z client application
- **angman** - Angman application
- **lotto** - Lotto application

**Prerequisites:**
- Node.js >= 18.17.1
- pnpm >= 8.7.4
- TypeScript ~5.4.5

**Build:**
```bash
cd apps/<app-name>
pnpm install
pnpm build
```

**Run (Development):**
```bash
cd apps/<app-name>
pnpm start  # or pnpm dev
```

### Electron Application

- **lectro** - Electron-based desktop application

**Prerequisites:**
- Node.js >= 18.17.1
- pnpm >= 8.7.4
- TypeScript ~5.4.5
- Electron 30.0.1 (installed as dependency)

**Build:**
```bash
cd apps/lectro
pnpm install
pnpm build  # Builds and packages Electron app
```

**Run (Development):**
```bash
cd apps/lectro
pnpm start
```

### Node.js Scripts

- **anthropic** - Dictionary and AI analysis scripts

**Prerequisites:**
- Node.js >= 18.17.1
- pnpm >= 8.7.4
- TypeScript ~5.4.5

**Run:**
```bash
cd apps/anthropic
pnpm install
tsx <script-name>.ts
```

## Servers

### Elections Server

**Location:** `servers/elections`

**Prerequisites:**
- **Elixir** - `~> 1.15` (required by `mix.exs`)
- **Erlang/OTP** - Compatible with Elixir 1.15 (typically OTP 25+)
- **Mix** - Elixir build tool (included with Elixir)
- **Node.js** - For building frontend assets (esbuild, tailwind)
- **pnpm** - For installing frontend dependencies (if building UI)
- **SQLite** - Embedded database (no external database server needed)
  - SQLite is included with most systems
  - Database files are created automatically in `priv/repo/`

**Build:**
```bash
cd servers/elections
mix deps.get
mix compile
```

**Run:**
```bash
cd servers/elections
mix phx.server
```

**Note:** The elections server can also be built and served with the `elect` application UI:
```bash
cd apps/elect
pnpm serve  # Builds UI and starts Phoenix server
```

### Scraper Server

**Location:** `servers/scraper`

**Prerequisites:**
- Node.js >= 18.17.1
- pnpm >= 8.7.4
- TypeScript ~5.4.5
- **Puppeteer** - `~21.6.0` (installed as dependency)
  - Requires Chrome/Chromium browser
  - Puppeteer will download Chromium automatically on first install
  - On some systems, you may need to install Chrome/Chromium separately

**Build:**
```bash
cd servers/scraper
pnpm install
```

**Run:**
```bash
cd servers/scraper
pnpm start  # Runs tsx scraper.ts
```

### Simple Server

**Location:** `servers/simple`

**Prerequisites:**
- Node.js >= 18.17.1
- pnpm >= 8.7.4
- TypeScript ~5.4.5
- **Fastify** - `~4.27.0` (installed as dependency)

**Build:**
```bash
cd servers/simple
pnpm install
pnpm build
```

**Run (Development):**
```bash
cd servers/simple
pnpm start
```

**Optional:**
- **Doppler** - For secrets management (if using `pnpm secstart`)

## Special Notes

### Database Requirements

- **No PostgreSQL/MySQL required** - The elections server uses SQLite, which is file-based and requires no external database server
- SQLite databases are created automatically in `servers/elections/priv/repo/` per election

### Browser Requirements

- **Puppeteer (scraper server)** - Requires Chrome/Chromium
  - Automatically downloaded on first `pnpm install`
  - May require manual installation on some Linux distributions

### Port Usage

- **Elections Server** - Default port `4000` (configurable via `PORT` environment variable)
- **Vite Dev Servers** - Default port `5173` (for React apps in development mode)

### Build Tools

- **Vite** - Used by all React applications and some servers
- **Mix** - Used by Elixir/Phoenix applications
- **TypeScript** - Used throughout the monorepo
- **esbuild** - Used by Phoenix for asset bundling
- **Tailwind CSS** - Used by Phoenix and some React apps

## Version Ranges Summary

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 18.17.1 | Required by root package.yaml |
| pnpm | 8.7.4 | Required by root package.yaml |
| TypeScript | 5.4.5 | Standard across monorepo |
| Elixir | 1.15.x | Required by elections server |
| Erlang/OTP | 25+ | Compatible with Elixir 1.15 |
| Git | Any recent | Version control |
| Bash | Standard | Shell scripting |

## Installation Quick Reference

### macOS (using Homebrew)
```bash
brew install node@18
brew install pnpm
brew install elixir
```

### Linux (Ubuntu/Debian)
```bash
# Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# pnpm
npm install -g pnpm

# Elixir
sudo apt-get update
sudo apt-get install elixir
```

### Windows
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Install pnpm: `npm install -g pnpm`
- Install Elixir from [elixir-lang.org](https://elixir-lang.org/install.html#windows)
- Use Git Bash for shell scripts
