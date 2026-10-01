#!/bin/bash
# user_data.sh — Bootstrap script for Collego EC2 instance
# Runs once on first boot via cloud-init

set -euo pipefail
exec > >(tee /var/log/collego-bootstrap.log) 2>&1
echo "=== Collego EC2 Bootstrap $(date) ==="

# ── System update ──────────────────────────────────────────────────────────────
dnf update -y
dnf install -y docker git curl unzip

# ── Docker ─────────────────────────────────────────────────────────────────────
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# ── Docker Compose ─────────────────────────────────────────────────────────────
COMPOSE_VERSION="v2.27.0"
curl -SL "https://github.com/docker/compose/releases/download/$${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# ── AWS CLI v2 ────────────────────────────────────────────────────────────────
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf awscliv2.zip aws/

# ── CloudWatch agent ──────────────────────────────────────────────────────────
dnf install -y amazon-cloudwatch-agent

cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/collego-bootstrap.log",
            "log_group_name": "/collego/ec2",
            "log_stream_name": "bootstrap",
            "retention_in_days": 14
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "Collego/EC2",
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["disk_used_percent"], "resources": ["/"] }
    }
  }
}
EOF

systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# ── App directory ─────────────────────────────────────────────────────────────
mkdir -p /opt/collego
chown ec2-user:ec2-user /opt/collego

# ── Certbot (Let's Encrypt) ───────────────────────────────────────────────────
dnf install -y certbot python3-certbot-nginx

# Renew cron — runs at 3:30 AM daily
echo "30 3 * * * root certbot renew --quiet --deploy-hook 'docker exec collego-nginx nginx -s reload'" \
  > /etc/cron.d/certbot-renew

echo "=== Bootstrap complete $(date) ==="
