#!/bin/bash
#
# tt-kali-bootstrap.sh — run 5 Kali Linux desktop containers (web GUI via
# linuxserver/kali-linux), accessed via the reverse-proxied HTTPS paths
# https://www.tertiarytraining.com/lab/kali-1/ ... kali-5/.

set -uo pipefail

IMAGE="${IMAGE:-lscr.io/linuxserver/kali-linux:latest}"
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
  SUBFOLDER="/lab/kali-${i}/"

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
    echo "  https://www.tertiarytraining.com/lab/kali-${i}/"
  done
  echo
  echo "Install Kali toolsets inside a demo:"
  echo "  sudo apt-get update && sudo apt-get install -y kali-tools-top10"
fi
