#!/usr/bin/env bash
# Saves the database to backups/ and keeps the last 14 days. Run daily from cron.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
file="backups/mozg-$(date +%F).sql.gz"
docker compose -f compose.prod.yaml exec -T db \
  pg_dump -U stalzone --clean --if-exists stalzone_clan | gzip >"$file.tmp"
mv "$file.tmp" "$file"
find backups -name 'mozg-*.sql.gz' -mtime +14 -delete
