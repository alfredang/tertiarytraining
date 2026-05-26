#!/bin/sh
# Runtime entrypoint — handles bind-mounted /var/run/docker.sock by ensuring
# the `app` user can access it. The host's docker group GID isn't known at
# build time and may collide with existing alpine groups, so we resolve it
# at boot.
set -e

if [ -S /var/run/docker.sock ]; then
  SOCK_GID=$(stat -c '%g' /var/run/docker.sock 2>/dev/null || echo "")
  if [ -n "$SOCK_GID" ] && [ "$SOCK_GID" != "0" ]; then
    # Try to find an existing group with this GID
    GROUP_NAME=$(getent group "$SOCK_GID" 2>/dev/null | cut -d: -f1)
    if [ -z "$GROUP_NAME" ]; then
      # No group with this GID exists — create one called dockersock
      addgroup -g "$SOCK_GID" dockersock 2>/dev/null && GROUP_NAME="dockersock"
    fi
    if [ -n "$GROUP_NAME" ]; then
      addgroup app "$GROUP_NAME" 2>/dev/null || true
      echo "[entrypoint] app user added to group $GROUP_NAME (gid $SOCK_GID) for docker.sock access"
    fi
  fi
fi

# Drop privileges to the `app` user and exec the real command.
exec su-exec app "$@"
