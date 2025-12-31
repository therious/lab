# Multi-stage build for Elect UI + Elections Server

# Stage 1: Build UI
FROM node:20-alpine AS ui-builder
WORKDIR /app/ui
COPY apps/elect/package.yaml apps/elect/pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
COPY apps/elect .
RUN pnpm build

# Stage 2: Build Elixir/Phoenix Server
FROM hexpm/elixir:1.17.0-erlang-26.2.5-alpine-3.19.1 AS server-builder

RUN apk add --no-cache build-base git

WORKDIR /app

RUN mix local.hex --force && \
    mix local.rebar --force

COPY servers/elections/mix.exs servers/elections/mix.lock ./
RUN mix deps.get --only prod && \
    mix deps.compile

COPY servers/elections .

# Copy UI build to server static directory
COPY --from=ui-builder /app/ui/dist priv/static/

# Build release
RUN MIX_ENV=prod mix release

# Stage 3: Runtime
FROM alpine:3.19.1

RUN apk add --no-cache \
    openssl \
    ncurses-libs \
    libstdc++ \
    sqlite

WORKDIR /app

COPY --from=server-builder /app/_build/prod/rel/elections ./
COPY --from=server-builder /app/priv/elections ./priv/elections/

RUN mkdir -p priv/repo

EXPOSE 4000

ENV MIX_ENV=prod
ENV PORT=4000

CMD ["./bin/elections", "start"]

