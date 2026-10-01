"""
db_backup.py — Lambda function for automated Collego DB backups.
Triggered by EventBridge cron daily at 02:00 UTC.

Strategy:
  1. Create an RDS snapshot (managed, encrypted, retained 7 days by RDS config).
  2. Export a pg_dump via the backend's /api/admin/backup endpoint (SSH tunnel or VPC endpoint).
  3. Upload the dump to S3 collego-db-backups bucket.
  4. Send a summary notification to SNS.

For Phase 8 we use RDS snapshots (simplest, zero-downtime, AWS-managed).
pg_dump export is wired via the EC2 instance using Systems Manager Run Command.
"""

import boto3
import os
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger()
logger.setLevel(logging.INFO)

rds       = boto3.client("rds")
ssm       = boto3.client("ssm")
s3        = boto3.client("s3")
sns       = boto3.client("sns")

DB_INSTANCE_ID = os.environ["DB_INSTANCE_ID"]
S3_BUCKET      = os.environ["S3_BUCKET"]
AWS_REGION     = os.environ.get("AWS_REGION", "ap-south-1")
SNS_TOPIC_ARN  = os.environ.get("SNS_TOPIC_ARN", "")
EC2_INSTANCE_ID = os.environ.get("EC2_INSTANCE_ID", "")


def handler(event, context):
    timestamp  = datetime.now(timezone.utc)
    date_str   = timestamp.strftime("%Y-%m-%d-%H%M")
    snapshot_id = f"collego-auto-backup-{date_str}"

    logger.info("Starting DB backup. Snapshot: %s", snapshot_id)
    results = {}

    # ── 1. RDS Snapshot ────────────────────────────────────────────────────────
    try:
        resp = rds.create_db_snapshot(
            DBSnapshotIdentifier=snapshot_id,
            DBInstanceIdentifier=DB_INSTANCE_ID,
            Tags=[
                {"Key": "Project",    "Value": "Collego"},
                {"Key": "CreatedBy",  "Value": "LambdaBackup"},
                {"Key": "CreatedAt",  "Value": timestamp.isoformat()},
            ],
        )
        snapshot_arn = resp["DBSnapshot"]["DBSnapshotArn"]
        results["rds_snapshot"] = {"status": "INITIATED", "arn": snapshot_arn}
        logger.info("RDS snapshot initiated: %s", snapshot_arn)
    except Exception as e:
        logger.error("RDS snapshot failed: %s", str(e))
        results["rds_snapshot"] = {"status": "FAILED", "error": str(e)}

    # ── 2. pg_dump via SSM Run Command on EC2 ──────────────────────────────────
    if EC2_INSTANCE_ID:
        try:
            dump_key = f"pg_dumps/{date_str}/collego_dump.sql.gz"
            ssm_command = (
                f"docker exec collego-postgres pg_dump "
                f"-U $DB_USERNAME $DB_NAME | gzip | "
                f"aws s3 cp - s3://{S3_BUCKET}/{dump_key} --region {AWS_REGION}"
            )
            ssm_resp = ssm.send_command(
                InstanceIds=[EC2_INSTANCE_ID],
                DocumentName="AWS-RunShellScript",
                Parameters={"commands": [ssm_command]},
                Comment=f"Collego pg_dump backup {date_str}",
                TimeoutSeconds=600,
            )
            cmd_id = ssm_resp["Command"]["CommandId"]
            results["pg_dump"] = {"status": "SENT", "command_id": cmd_id, "s3_key": dump_key}
            logger.info("SSM pg_dump command sent: %s → s3://%s/%s", cmd_id, S3_BUCKET, dump_key)
        except Exception as e:
            logger.error("pg_dump SSM command failed: %s", str(e))
            results["pg_dump"] = {"status": "FAILED", "error": str(e)}
    else:
        results["pg_dump"] = {"status": "SKIPPED", "reason": "EC2_INSTANCE_ID not set"}

    # ── 3. Write backup manifest to S3 ────────────────────────────────────────
    manifest = {
        "backup_timestamp": timestamp.isoformat(),
        "snapshot_id": snapshot_id,
        "db_instance": DB_INSTANCE_ID,
        "s3_bucket": S3_BUCKET,
        "results": results,
    }
    manifest_key = f"manifests/{date_str}/backup_manifest.json"
    try:
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=manifest_key,
            Body=json.dumps(manifest, indent=2).encode(),
            ContentType="application/json",
        )
        logger.info("Manifest uploaded: s3://%s/%s", S3_BUCKET, manifest_key)
    except Exception as e:
        logger.error("Manifest upload failed: %s", str(e))

    # ── 4. SNS notification ───────────────────────────────────────────────────
    if SNS_TOPIC_ARN:
        try:
            overall_status = "SUCCESS" if all(
                r.get("status") not in ("FAILED",) for r in results.values()
            ) else "PARTIAL_FAILURE"
            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=f"[Collego] DB Backup {overall_status} — {date_str}",
                Message=json.dumps(manifest, indent=2),
            )
        except Exception as e:
            logger.error("SNS publish failed: %s", str(e))

    logger.info("Backup complete. Results: %s", json.dumps(results))
    return {"statusCode": 200, "body": results}
