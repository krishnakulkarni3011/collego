#!/usr/bin/env bash
# Restore-drill: restore the latest weekly pg_dump into a throwaway Postgres 16 container.
# Run on the EC2 host. Does not touch the production database.
set -euo pipefail

BUCKET="collego-db-backups-prod"
PREFIX="pg_dumps/"
DUMP="/tmp/collego-restore-drill.dump"
CONTAINER="collego-restore-test"

LATEST=$(aws s3api list-objects-v2 --bucket "$BUCKET" --prefix "$PREFIX" \
  --query 'reverse(sort_by(Contents,&LastModified))[0].Key' --output text --region ap-south-1)
aws s3 cp "s3://$BUCKET/$LATEST" "$DUMP" --region ap-south-1 >/dev/null

TMPPW=$(openssl rand -hex 12)
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$TMPPW" postgres:16 >/dev/null
for _ in $(seq 1 30); do
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 2
done

docker exec -i "$CONTAINER" pg_restore -U postgres -d postgres \
  --no-owner --no-privileges < "$DUMP" 2>&1 | tail -10 || true

echo -n "users rows: "
docker exec "$CONTAINER" psql -U postgres -d postgres -tAc 'select count(*) from users'
echo -n "enrollments rows: "
docker exec "$CONTAINER" psql -U postgres -d postgres -tAc 'select count(*) from enrollments'

docker rm -f "$CONTAINER" >/dev/null
rm -f "$DUMP"
echo "restore drill complete"
