#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS wacrm_migrations;
CREATE TABLE IF NOT EXISTS wacrm_migrations.applied (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

for migration in /migrations/*.sql; do
  [ -f "$migration" ] || continue
  filename=$(basename "$migration")
  if psql -tAc "SELECT 1 FROM wacrm_migrations.applied WHERE filename = '$filename'" | grep -q 1; then
    echo "Skipping already applied migration: $filename"
    continue
  fi
  echo "Applying migration: $filename"
  { echo "BEGIN;"; cat "$migration"; printf "\nINSERT INTO wacrm_migrations.applied (filename) VALUES ('%s');\n" "$filename"; echo "COMMIT;"; } | psql -v ON_ERROR_STOP=1
done
echo "WACRM migrations are up to date."
