#!/bin/bash

NAME="${1:-suite}" # short name for the docker file, located at docker/<NAME>.dockerfile
PORT="${2:-3000}"  # port to publish on os (internal 3000 assumed) defaults to 3000
DOCKERFILE="docker/${NAME}.dockerfile"
IMAGE="therious-${NAME}"
CONTAINER="therious-${NAME}-${PORT}"

if ! [ -f "${DOCKERFILE}" ]; then
  echo "[$1] File does not exist."
  exit 1
fi


# build the static applications first (docker application--not server--build temporarily broken so disabled)
pnpm f ticket build

# kill a running container if it exists and has same name
docker kill "${CONTAINER}" || true

# run a docker build
docker build --nocache --progress=plain -f "${DOCKERFILE}" -t "${IMAGE}" .  2>&1 | tee "${DOCKERFILE}.log"

# run the container
nohup docker run --pull=never -p "${PORT}:3000" --name="${CONTAINER}" "${IMAGE}" &
