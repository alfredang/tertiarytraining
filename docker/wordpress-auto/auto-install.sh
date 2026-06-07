#!/usr/bin/env bash
#
# Wrapper entrypoint for the auto-configuring WordPress lab image.
# Backgrounds a one-time `wp core install`, then execs the stock WordPress
# entrypoint so Apache runs in the foreground as usual.
set -uo pipefail

(
  cd /var/www/html || exit 0

  # Wait for the stock entrypoint to generate wp-config.php
  for _ in $(seq 1 60); do [ -f wp-config.php ] && break; sleep 1; done

  # Install once the database is reachable. We retry `wp core install` directly
  # (it connects via WordPress's PHP DB layer — no mysql/mysqlcheck client
  # binary needed, which the WordPress image doesn't ship). Idempotent.
  for _ in $(seq 1 60); do
    if wp core is-installed --allow-root >/dev/null 2>&1; then break; fi
    if wp core install --allow-root \
        --url="${WP_SITE_URL:-http://localhost}" \
        --title="${WP_SITE_TITLE:-WordPress Training Lab}" \
        --admin_user="${WP_ADMIN_USER:-admin}" \
        --admin_password="${WP_ADMIN_PASSWORD:-Tertiary12345}" \
        --admin_email="${WP_ADMIN_EMAIL:-admin@tertiary.local}" \
        --skip-email >/dev/null 2>&1; then
      echo "[tt-auto-install] WordPress ready at ${WP_SITE_URL:-http://localhost} (admin: ${WP_ADMIN_USER:-admin})"
      break
    fi
    sleep 3   # database not ready yet — retry
  done
) &

# Hand off to the official WordPress entrypoint (sets up wp-config, runs Apache).
exec docker-entrypoint.sh "$@"
