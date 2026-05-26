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

set -uo pipefail

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

# Tracks per-demo success
declare -a SKIPPED_DEMOS=()
declare -a FAILED_DEMOS=()
declare -a OK_DEMOS=()

process_demo() {
  local i=$1
  local PORT=$((8080 + i))
  local WP="wordpress-demo${i}-wordpress-1"
  local DB="wordpress-demo${i}-db-1"
  local SQL_FILE="$GOLDEN_DIR/demo-${i}.sql"

  echo "─── WP Demo $i (port $PORT) ───"

  # Sanity: containers exist?
  if ! docker ps --format '{{.Names}}' | grep -q "^${WP}$"; then
    echo "  ✗ $WP not running — skipping"
    SKIPPED_DEMOS+=("$i")
    return 0
  fi
  if ! docker ps --format '{{.Names}}' | grep -q "^${DB}$"; then
    echo "  ✗ $DB not running — skipping"
    SKIPPED_DEMOS+=("$i")
    return 0
  fi

  # Install WP-CLI + a stub sendmail (so WP's mail() calls during install
  # don't fail with "sendmail not found")
  if ! docker exec "$WP" bash -c '
    set -e
    export DEBIAN_FRONTEND=noninteractive
    if ! command -v wp >/dev/null 2>&1; then
      apt-get update -qq >/dev/null
      apt-get install -y -qq --no-install-recommends less ca-certificates curl >/dev/null
      curl -sSLo /usr/local/bin/wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
      chmod +x /usr/local/bin/wp
    fi
    if [ ! -x /usr/sbin/sendmail ]; then
      mkdir -p /usr/sbin
      printf "%s\n%s\n" "#!/bin/sh" "exit 0" > /usr/sbin/sendmail
      chmod +x /usr/sbin/sendmail
    fi
  ' 2>&1; then
    echo "  ✗ Failed to prepare $WP — skipping"
    FAILED_DEMOS+=("$i")
    return 0
  fi

  # Ensure WordPress is installed. core install can still produce non-fatal
  # warnings around mail; we don't fail the demo on its exit code.
  if ! docker exec "$WP" wp --allow-root core is-installed 2>/dev/null; then
    echo "  WordPress not yet installed — running core install"
    docker exec "$WP" wp --allow-root core install \
      --url="http://${HOST_IP}:${PORT}" \
      --title="WP Demo ${i}" \
      --admin_user="$ADMIN_USER" \
      --admin_password="$ADMIN_PASS" \
      --admin_email="$ADMIN_EMAIL" \
      --skip-email 2>&1 | tail -3 || true
  fi
  if ! docker exec "$WP" wp --allow-root core is-installed 2>/dev/null; then
    echo "  ✗ WP core install did not succeed on demo $i — skipping"
    FAILED_DEMOS+=("$i")
    return 0
  fi

  # Force credentials into the shared state — idempotent
  if docker exec "$WP" wp --allow-root user get "$ADMIN_USER" --field=ID >/dev/null 2>&1; then
    docker exec "$WP" wp --allow-root user update "$ADMIN_USER" \
      --user_pass="$ADMIN_PASS" \
      --role=administrator >/dev/null 2>&1 || true
  else
    docker exec "$WP" wp --allow-root user create "$ADMIN_USER" "$ADMIN_EMAIL" \
      --user_pass="$ADMIN_PASS" \
      --role=administrator >/dev/null 2>&1 || true
  fi

  # Ensure the URL option matches the demo's actual port
  docker exec "$WP" wp --allow-root option update siteurl "http://${HOST_IP}:${PORT}" >/dev/null 2>&1 || true
  docker exec "$WP" wp --allow-root option update home    "http://${HOST_IP}:${PORT}" >/dev/null 2>&1 || true

  # Capture the golden snapshot
  ROOT_PW=$(docker exec "$DB" printenv MYSQL_ROOT_PASSWORD)
  if [ -z "$ROOT_PW" ]; then
    echo "  ✗ Could not read MYSQL_ROOT_PASSWORD from $DB — skipping snapshot"
    FAILED_DEMOS+=("$i")
    return 0
  fi
  # mariadb-dump on MariaDB 11; on older images this might be mysqldump
  if docker exec "$DB" sh -c "command -v mariadb-dump >/dev/null"; then
    DUMP_CMD="mariadb-dump"
  else
    DUMP_CMD="mysqldump"
  fi
  if ! docker exec "$DB" sh -c "$DUMP_CMD --skip-comments --no-tablespaces -u root -p'$ROOT_PW' wordpress" \
      > "$SQL_FILE.tmp" 2>/dev/null; then
    echo "  ✗ Failed to dump $DB — skipping"
    rm -f "$SQL_FILE.tmp"
    FAILED_DEMOS+=("$i")
    return 0
  fi
  mv "$SQL_FILE.tmp" "$SQL_FILE"
  chmod 644 "$SQL_FILE"
  echo "  ✓ Snapshot saved: $SQL_FILE ($(wc -c < "$SQL_FILE") bytes)"
  OK_DEMOS+=("$i")
}

for i in 1 2 3 4 5; do
  process_demo $i || true
done

echo
echo "=== Done ==="
echo "  OK:      ${#OK_DEMOS[@]} (${OK_DEMOS[*]:-none})"
echo "  Failed:  ${#FAILED_DEMOS[@]} (${FAILED_DEMOS[*]:-none})"
echo "  Skipped: ${#SKIPPED_DEMOS[@]} (${SKIPPED_DEMOS[*]:-none})"
echo
if [ ${#OK_DEMOS[@]} -eq 0 ]; then
  echo "⚠ No snapshots were captured. Re-run after investigating the errors above."
  exit 1
fi
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
