#!/bin/bash
#
# tt-kali-bootstrap.sh — run 5 Kali Linux desktop containers (web GUI via
# linuxserver/kali-linux) on ports 8096..8100.
#
# Each container is a full Kali Linux rolling release with web desktop.
# Out of the box only the base Kali system is installed — learners can
# `sudo apt-get install kali-tools-everything` (or specific metapackages
# like kali-tools-top10, kali-tools-web) to add the offensive security
# toolchain.
#
# Run ONCE on the Coolify host as root. Re-run anytime to recreate.
#
# WARNING: the Kali image is ~5 GB. First pull will take a while.

set -uo pipefail

IMAGE="${IMAGE:-lscr.io/linuxserver/kali-linux:latest}"
HOST_IP="${HOST_IP:-168.231.119.201}"
TZ="${TZ:-Asia/Singapore}"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

echo "=== Pulling $IMAGE (this may take a few minutes) ==="
docker pull "$IMAGE"

declare -a OK_DEMOS=()
declare -a FAILED_DEMOS=()

for i in 1 2 3 4 5; do
  PORT=$((8095 + i))
  NAME="kali-demo${i}"

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
      -p "${PORT}:3000" \
      -e PUID=1000 -e PGID=1000 \
      -e TZ="$TZ" \
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
  echo "Open any of these URLs in a browser (give it ~30s on first boot):"
  for i in "${OK_DEMOS[@]}"; do
    PORT=$((8095 + i))
    echo "  http://${HOST_IP}:${PORT}/"
  done
  echo
  echo "Each one drops you into a full Kali Linux desktop in the browser."
  echo "Install Kali toolsets via:"
  echo "  sudo apt-get update"
  echo "  sudo apt-get install -y kali-tools-top10        # ~1 GB, popular tools"
  echo "  sudo apt-get install -y kali-tools-everything    # ~9 GB, full Kali"
fi
