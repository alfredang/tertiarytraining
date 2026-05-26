#!/bin/bash
#
# tt-ubuntu-bootstrap.sh — run 5 Ubuntu XFCE desktop containers (web GUI via
# linuxserver/webtop), accessed via the reverse-proxied HTTPS paths
# https://www.tertiarytraining.com/lab/ubuntu-1/ ... ubuntu-5/.
#
# Each container listens on internal port 3000 (HTTP). The host nginx vhost
# (see scripts/tt-nginx-labs-apply.sh) does HTTPS termination and forwards
# /lab/ubuntu-N/ to host port 809{1..5}. The container is told via the
# SUBFOLDER env var so Selkies generates correct asset URLs.

set -uo pipefail

IMAGE="${IMAGE:-lscr.io/linuxserver/webtop:ubuntu-xfce}"
TZ="${TZ:-Asia/Singapore}"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

echo "=== Pulling $IMAGE ==="
docker pull "$IMAGE"

declare -a OK_DEMOS=()
declare -a FAILED_DEMOS=()

for i in 1 2 3 4 5; do
  PORT=$((8090 + i))
  NAME="ubuntu-demo${i}"
  SUBFOLDER="/lab/ubuntu-${i}/"

  if docker ps -a --format '{{.Names}}' | grep -q "^${NAME}$"; then
    echo "  Removing existing ${NAME}…"
    docker stop "$NAME" >/dev/null 2>&1 || true
    docker rm "$NAME" >/dev/null 2>&1 || true
  fi

  if docker run -d \
      --name "$NAME" \
      --restart unless-stopped \
      --security-opt seccomp=unconfined \
      --shm-size="1gb" \
      -p "127.0.0.1:${PORT}:3000" \
      -e PUID=1000 -e PGID=1000 \
      -e TZ="$TZ" \
      -e SUBFOLDER="$SUBFOLDER" \
      "$IMAGE" >/dev/null; then
    echo "  ✓ ${NAME} → https://www.tertiarytraining.com${SUBFOLDER}"
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
  echo "After running scripts/tt-nginx-labs-apply.sh, open:"
  for i in "${OK_DEMOS[@]}"; do
    echo "  https://www.tertiarytraining.com/lab/ubuntu-${i}/"
  done
fi
