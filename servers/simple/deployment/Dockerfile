# syntax = docker/dockerfile:1
# see also https://pnpm.io/next/docker

# Perform the build on node:<version>-slim then transfer results to distroless
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim as build

# These three commands will make pnpm available without running an install (avalailable node v20+)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install packages needed to build node modules
#RUN apt-get update -qq && apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# we start by putting stuff in the predeploy directory, then run pnpm deploy to the deploy directory
WORKDIR /a_temp

COPY ./pnpm-lock.yaml ./

# now add in everything else rely on good .dockerignore  leave out the --prod for now
# rely on copying the dist directory
COPY ./libs                 ./libs/
COPY ./scripts              ./scripts/
COPY ./servers              ./servers/
COPY ./.eslintrc.yaml       ./
COPY ./package.yaml         ./
COPY ./pnpm-workspace.yaml  ./
COPY ./tsconfig.json        ./

RUN pnpm fetch              # fetch requires only the lock file to work (leaving out the --prod) for now

# pnpm offline install is not working in docker so far
RUN pnpm install -r --prefer-offline

# pnpm deploy is made for stuff like docker to create a proper unified node_modules
# --prod option would prevent running vite, so a second deploy post-build can shrink it
RUN pnpm --filter=simple deploy /app

RUN pnpm --filter=simple --prod deploy /papp
WORKDIR /app

# this command line builds the servers/simple server into the directory servers
RUN pnpm build
#==========
# Final stage for app image
FROM gcr.io/distroless/nodejs${NODE_VERSION}

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Copy the node_modules from /papp (production app, and the built application that needed devDependencies to build from /app)
COPY --from=build /papp /app
COPY --from=build /app/dist /app/dist

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000

# docker CMD syntax CANNOT use string interpolation as the RUN command can
# so no variables allowed here
# distroless specifies node as the entrypoint, so the command is interpret as parameters passed to nodejs!
CMD [ "dist/simple-server.mjs", "dist"]

