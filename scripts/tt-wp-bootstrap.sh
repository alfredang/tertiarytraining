#!/bin/bash
#
# tt-wp-bootstrap.sh — set up the 5 WordPress demo containers with the
# shared admin credentials, then capture a "golden" SQL snapshot of each.
#
# Run ONCE on the Coolify host as root, BEFORE flipping the app to
# DOCKER_HOST_MODE=dockerode.
#
# After this script runs, the app's refresh action will restore each
# WP demo's database from the matching golden snapshot — wiping any
# learner edits while preserving credentials and sample content.
#
# Re-run anytime you want to update the golden state (e.g. after adding
# new sample posts you want all demos to start with).

set -euo pipefail

GOLDEN_DIR="/opt/tertiarytraining/wp-golden"
HOST_IP="${HOST_IP:-168.231.119.201}"
ADMIN_USER="${ADMIN_USER:-tertiarytraining}"
ADMIN_PASS="${ADMIN_PASS:-Tertiary12345}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@tertiarytraining.com}"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

mkdir -p "$GOLDEN_DIR"
chmod 755 "$GOLDEN_DIR"

echo "=== Bootstrapping 5 WordPress demos ==="
echo "  Credentials: $ADMIN_USER / $ADMIN_PASS"
echo "  Golden dir:  $GOLDEN_DIR"
echo

for i in 1 2 3 4 5; do
  PORT=$((8080 + i))
  WP="wordpress-demo${i}-wordpress-1"
  DB="wordpress-demo${i}-db-1"
  SQL_FILE="$GOLDEN_DIR/demo-${i}.sql"

  echo "─── WP Demo $i (port $PORT) ───"

  # Sanity: containers exist?
  if ! docker ps --format '{{.Names}}' | grep -q "^${WP}$"; then
    echo "  ✗ $WP not running — skipping"
    continue
  fi
  if ! docker ps --format '{{.Names}}' | grep -q "^${DB}$"; then
    echo "  ✗ $DB not running — skipping"
    continue
  fi

  # Install WP-CLI in the WP container if not already there
  docker exec "$WP" bash -c '
    if ! command -v wp >/dev/null 2>&1; then
      apt-get update -qq && apt-get install -y -qq --no-install-recommends less ca-certificates curl >/dev/null
      curl -sO https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
      chmod +x wp-cli.phar
      mv wp-cli.phar /usr/local/bin/wp
    fi
  '

  # Ensure WordPress is installed
  if ! docker exec "$WP" wp --allow-root core is-installed 2>/dev/null; then
    echo "  WordPress not yet installed — running core install"
    docker exec "$WP" wp --allow-root core install \
      --url="http://${HOST_IP}:${PORT}" \
      --title="WP Demo ${i}" \
      --admin_user="$ADMIN_USER" \
      --admin_password="$ADMIN_PASS" \
      --admin_email="$ADMIN_EMAIL" \
      --skip-email
  fi

  # Force credentials into the shared state — idempotent
  if docker exec "$WP" wp --allow-root user get "$ADMIN_USER" --field=ID >/dev/null 2>&1; then
    docker exec "$WP" wp --allow-root user update "$ADMIN_USER" \
      --user_pass="$ADMIN_PASS" \
      --role=administrator >/dev/null
  else
    docker exec "$WP" wp --allow-root user create "$ADMIN_USER" "$ADMIN_EMAIL" \
      --user_pass="$ADMIN_PASS" \
      --role=administrator >/dev/null
  fi

  # Ensure the URL option matches the demo's actual port
  docker exec "$WP" wp --allow-root option update siteurl "http://${HOST_IP}:${PORT}" >/dev/null
  docker exec "$WP" wp --allow-root option update home "http://${HOST_IP}:${PORT}" >/dev/null

  # Capture the golden snapshot
  ROOT_PW=$(docker exec "$DB" printenv MYSQL_ROOT_PASSWORD)
  if [ -z "$ROOT_PW" ]; then
    echo "  ✗ Could not read MYSQL_ROOT_PASSWORD from $DB — skipping snapshot"
    continue
  fi
  docker exec "$DB" sh -c "mariadb-dump --skip-comments --no-tablespaces -u root -p'$ROOT_PW' wordpress" \
    > "$SQL_FILE.tmp"
  mv "$SQL_FILE.tmp" "$SQL_FILE"
  chmod 644 "$SQL_FILE"
  echo "  ✓ Snapshot saved: $SQL_FILE ($(wc -c < "$SQL_FILE") bytes)"
done

echo
echo "=== Done ==="
echo
echo "Next steps in Coolify (App resource):"
echo "  1. Storage → add bind mount:"
echo "     Host path:      /var/run/docker.sock"
echo "     Container path: /var/run/docker.sock"
echo "  2. Storage → add bind mount:"
echo "     Host path:      $GOLDEN_DIR"
echo "     Container path: $GOLDEN_DIR"
echo "     Read-only:      yes"
echo "  3. Environment Variables → set DOCKER_HOST_MODE=dockerode"
echo "  4. Redeploy"
echo
echo "After redeploy, the Refresh button in the admin UI will restore"
echo "each WP demo's DB from $GOLDEN_DIR/demo-N.sql in ~1-2 seconds,"
echo "wiping learner edits while preserving the $ADMIN_USER credentials."
