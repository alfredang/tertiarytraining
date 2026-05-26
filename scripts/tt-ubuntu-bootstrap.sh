#!/bin/bash
#
# tt-ubuntu-bootstrap.sh — build the tertiary-ubuntu image and run 5
# Ubuntu demo containers (with ttyd web terminals) on ports 8091..8095.
#
# Run ONCE on the Coolify host as root. Re-run anytime to rebuild the
# image (e.g. after editing the Dockerfile) and recreate the containers.

set -uo pipefail

REPO="${REPO:-/opt/tertiarytraining/ubuntu}"
IMAGE="${IMAGE:-tertiary-ubuntu:latest}"
HOST_IP="${HOST_IP:-168.231.119.201}"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

# Fetch the latest Dockerfile + motd from the repo if not present, OR
# always refresh from main so the host stays in sync.
mkdir -p "$REPO"
echo "=== Fetching latest Dockerfile + motd from GitHub main ==="
curl -fsSL -o "$REPO/Dockerfile" \
  https://raw.githubusercontent.com/alfredang/tertiarytraining/main/infra/ubuntu/Dockerfile
curl -fsSL -o "$REPO/motd.txt" \
  https://raw.githubusercontent.com/alfredang/tertiarytraining/main/infra/ubuntu/motd.txt

echo
echo "=== Building image $IMAGE ==="
docker build -t "$IMAGE" -f "$REPO/Dockerfile" "$REPO"

echo
echo "=== (Re)creating ubuntu-demo1..ubuntu-demo5 ==="
declare -a OK_DEMOS=()
declare -a FAILED_DEMOS=()

for i in 1 2 3 4 5; do
  PORT=$((8090 + i))
  NAME="ubuntu-demo${i}"

  # Stop & remove if it already exists
  if docker ps -a --format '{{.Names}}' | grep -q "^${NAME}$"; then
    echo "  Removing existing ${NAME}…"
    docker stop "$NAME" >/dev/null 2>&1 || true
    docker rm "$NAME" >/dev/null 2>&1 || true
  fi

  if docker run -d \
      --name "$NAME" \
      --restart unless-stopped \
      -p "${PORT}:${PORT}" \
      -e "PORT=${PORT}" \
      "$IMAGE" >/dev/null; then
    echo "  ✓ ${NAME} → http://${HOST_IP}:${PORT}/"
    OK_DEMOS+=("$i")
  else
    echo "  ✗ Failed to start ${NAME}"
    FAILED_DEMOS+=("$i")
  fi
done

echo
echo "=== Done ==="
echo "  OK:     ${#OK_DEMOS[@]} (${OK_DEMOS[*]:-none})"
echo "  Failed: ${#FAILED_DEMOS[@]} (${FAILED_DEMOS[*]:-none})"
echo
if [ ${#OK_DEMOS[@]} -gt 0 ]; then
  echo "Open any of these URLs in a browser:"
  for i in "${OK_DEMOS[@]}"; do
    PORT=$((8090 + i))
    echo "  http://${HOST_IP}:${PORT}/"
  done
  echo
  echo "Each one drops you into a bash shell with Node 24 + dev tools preinstalled."
  echo "You can run: sudo apt-get install <pkg>, npm install -g <pkg>, etc."
fi
