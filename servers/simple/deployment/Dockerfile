# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired (warning, this is ignored
ARG NODE_VERSION=22

# Final stage for app image  # cgr.dev/chainguard/node:${NODE_VERSION} might not be pullable directly
FROM cgr.dev/chainguard/node:latest

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Since intended to run from a dist directory, just copy all contents not ignored
COPY . .

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD node simple-server.mjs
