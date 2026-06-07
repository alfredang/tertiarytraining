#!/bin/sh
# tt-weekly-cleanup — weekly deep disk reclaim for the Tertiary Training VPS.
#
# SAFE BY DESIGN: it NEVER removes tagged images we depend on
# (tt-wordpress-auto, wordpress, mariadb, n8n, coolify…) or in-use volumes.
# It only prunes dangling images, build cache, anonymous unused volumes, old
# *app* image versions (keeping the running one), logs and stale caches.
#
# Installed at /usr/local/bin/tt-weekly-cleanup.sh, run by the
# tt-weekly-cleanup.timer systemd timer. Logs to syslog (tag tt-weekly-cleanup).
log() { echo "$*" | logger -t tt-weekly-cleanup; }

# 1) Docker build cache (regenerates on next build)
docker builder prune -af >/dev/null 2>&1 && log "build cache pruned"

# 2) Dangling images only — tagged images (incl. tt-wordpress-auto) are kept
docker image prune -f >/dev/null 2>&1 && log "dangling images pruned"

# 3) Old app (okg72…) image versions — keep the one the running container uses
RUN_IMG=$(docker inspect "$(docker ps -q -f name=okg72 | head -1)" --format '{{.Image}}' 2>/dev/null)
docker images 'okg72*' --format '{{.ID}} {{.Repository}}:{{.Tag}}' 2>/dev/null | while read -r id ref; do
  case "$RUN_IMG" in
    *"$id"*) : ;;
    *) docker rmi "$ref" >/dev/null 2>&1 && log "removed old app image $ref" ;;
  esac
done

# 4) Anonymous unused volumes (named in-use volumes like n8n_data are kept)
docker volume prune -f >/dev/null 2>&1 && log "anonymous volumes pruned"

# 5) System logs + apt cache
journalctl --vacuum-size=50M >/dev/null 2>&1
apt-get clean >/dev/null 2>&1

# 6) Stale caches (only files untouched for 7+ days) + npm cache
[ -d /root/.cache ] && find /root/.cache -type f -mtime +7 -delete 2>/dev/null
rm -rf /root/.npm/_cacache 2>/dev/null

# 7) Truncate oversized container JSON logs
find /var/lib/docker/containers -name '*-json.log' -size +20M -exec truncate -s 0 {} \; 2>/dev/null

log "weekly cleanup done; disk now $(df -h / | awk 'NR==2{print $5}')"
