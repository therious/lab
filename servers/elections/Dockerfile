# Build stage for Elixir/Phoenix
FROM hexpm/elixir:1.17.0-erlang-26.2.5-alpine-3.19.1 AS builder

# Install build dependencies
RUN apk add --no-cache build-base git

WORKDIR /app

# Install hex and rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Copy mix files
COPY mix.exs mix.lock ./

# Install dependencies
RUN mix deps.get --only prod && \
    mix deps.compile

# Copy application code
COPY . .

# Compile application
RUN mix compile

# Build assets (if needed)
RUN mix assets.build || true

# Build release
RUN MIX_ENV=prod mix release

# Runtime stage
FROM alpine:3.19.1

# Install runtime dependencies
RUN apk add --no-cache \
    openssl \
    ncurses-libs \
    libstdc++ \
    sqlite

WORKDIR /app

# Copy release from builder
COPY --from=builder /app/_build/prod/rel/elections ./

# Copy election configs
COPY --from=builder /app/priv/elections ./priv/elections/

# Create directory for SQLite database
RUN mkdir -p priv/repo

# Expose port
EXPOSE 4000

# Set environment
ENV MIX_ENV=prod
ENV PORT=4000

# Run migrations and start server
CMD ["./bin/elections", "start"]

