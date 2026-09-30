# infra/terraform/main.tf
# Collego — AWS Infrastructure (Phase 8)
# Provisions: VPC, EC2, RDS PostgreSQL, S3, ECR repos, IAM, CloudWatch

terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Store Terraform state in S3 (create this bucket manually before first apply)
  backend "s3" {
    bucket = "collego-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "ap-south-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── Data sources ─────────────────────────────────────────────────────────────
data "aws_availability_zones" "available" {}

# ─── VPC ──────────────────────────────────────────────────────────────────────
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "collego-vpc"
  cidr = "10.0.0.0/16"

  azs             = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = local.common_tags
}

# ─── Security Groups ──────────────────────────────────────────────────────────

# EC2 — allows SSH from your IP, HTTP/HTTPS from anywhere
resource "aws_security_group" "ec2" {
  name        = "collego-ec2-sg"
  description = "Collego EC2 instance"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]  # restrict SSH to your IP
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = merge(local.common_tags, { Name = "collego-ec2-sg" })
}

# RDS — only reachable from EC2 SG
resource "aws_security_group" "rds" {
  name        = "collego-rds-sg"
  description = "Collego RDS PostgreSQL"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = merge(local.common_tags, { Name = "collego-rds-sg" })
}

# ─── EC2 ──────────────────────────────────────────────────────────────────────
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.ec2_instance_type
  subnet_id              = module.vpc.public_subnets[0]
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = var.ec2_key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    aws_region = var.aws_region
  }))

  tags = merge(local.common_tags, { Name = "collego-app-server" })
}

resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags     = merge(local.common_tags, { Name = "collego-eip" })
}

# ─── RDS PostgreSQL (Multi-AZ in prod) ───────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "collego-db-subnet-group"
  subnet_ids = module.vpc.private_subnets
  tags       = local.common_tags
}

resource "aws_db_instance" "postgres" {
  identifier              = "collego-postgres"
  engine                  = "postgres"
  engine_version          = "16.12"
  instance_class          = var.rds_instance_class
  allocated_storage       = 20
  max_allocated_storage   = 100
  storage_type            = "gp3"
  storage_encrypted       = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  deletion_protection       = false
  skip_final_snapshot       = true

  monitoring_interval = 0

  tags = merge(local.common_tags, { Name = "collego-rds" })
}

# ─── S3 Buckets ───────────────────────────────────────────────────────────────
locals {
  s3_buckets = [
    "collego-question-papers",
    "collego-assignments",
    "collego-materials",
    "collego-resumes",
    "collego-marksheets",
    "collego-db-backups",
  ]
  common_tags = {
    Project     = "Collego"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket" "app_buckets" {
  for_each = toset(local.s3_buckets)
  bucket   = "${each.key}-${var.environment}"
  tags     = merge(local.common_tags, { Name = each.key })
}

resource "aws_s3_bucket_versioning" "app_buckets" {
  for_each = aws_s3_bucket.app_buckets
  bucket   = each.value.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_buckets" {
  for_each = aws_s3_bucket.app_buckets
  bucket   = each.value.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "app_buckets" {
  for_each                = aws_s3_bucket.app_buckets
  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle: move DB backups to Glacier after 30 days, delete after 90
resource "aws_s3_bucket_lifecycle_configuration" "db_backups" {
  bucket = aws_s3_bucket.app_buckets["collego-db-backups"].id
  rule {
    id     = "backup-lifecycle"
    status = "Enabled"
    filter {}
    transition {
      days          = 30
      storage_class = "GLACIER"
    }
    expiration {
      days = 90
    }
  }
}

# ─── ECR Repositories ────────────────────────────────────────────────────────
resource "aws_ecr_repository" "repos" {
  for_each             = toset(["collego-backend", "collego-frontend", "collego-ai-service"])
  name                 = each.key
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = local.common_tags
}

resource "aws_ecr_lifecycle_policy" "repos" {
  for_each   = aws_ecr_repository.repos
  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# ─── IAM — EC2 Role (least-privilege) ────────────────────────────────────────
resource "aws_iam_role" "ec2_role" {
  name = "collego-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
  tags = local.common_tags
}

resource "aws_iam_policy" "ec2_policy" {
  name        = "collego-ec2-policy"
  description = "Least-privilege access for Collego EC2 app server"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3 access — only to collego buckets
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::collego-*-${var.environment}",
          "arn:aws:s3:::collego-*-${var.environment}/*"
        ]
      },
      # ECR — pull images
      {
        Effect   = "Allow"
        Action   = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },
      # CloudWatch Logs
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/collego/*"
      },
      # SSM Parameter Store (for reading secrets)
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/collego/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ec2_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "collego-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# RDS Enhanced Monitoring role
resource "aws_iam_role" "rds_monitoring" {
  name = "collego-rds-monitoring-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ─── CloudWatch — Log Groups ──────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "services" {
  for_each          = toset(["/collego/backend", "/collego/frontend", "/collego/ai-service", "/collego/nginx"])
  name              = each.key
  retention_in_days = 30
  tags              = local.common_tags
}

# ─── CloudWatch — Alarms ─────────────────────────────────────────────────────

# EC2 CPU > 80%
resource "aws_cloudwatch_metric_alarm" "ec2_cpu" {
  alarm_name          = "collego-ec2-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 CPU utilization > 80% for 10 minutes"
  dimensions          = { InstanceId = aws_instance.app.id }
  alarm_actions       = [aws_sns_topic.alerts.arn]
  tags                = local.common_tags
}

# RDS CPU > 75%
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "collego-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "RDS CPU > 75% for 10 minutes"
  dimensions          = { DBInstanceIdentifier = aws_db_instance.postgres.identifier }
  alarm_actions       = [aws_sns_topic.alerts.arn]
  tags                = local.common_tags
}

# RDS Free Storage < 2 GB
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "collego-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 2147483648  # 2 GB in bytes
  alarm_description   = "RDS free storage < 2 GB"
  dimensions          = { DBInstanceIdentifier = aws_db_instance.postgres.identifier }
  alarm_actions       = [aws_sns_topic.alerts.arn]
  tags                = local.common_tags
}

# Backend 5xx error rate (via CloudWatch Logs metric filter)
resource "aws_cloudwatch_log_metric_filter" "backend_errors" {
  name           = "collego-backend-5xx"
  log_group_name = aws_cloudwatch_log_group.services["/collego/backend"].name
  pattern        = "ERROR"
  metric_transformation {
    name      = "BackendErrorCount"
    namespace = "Collego/Application"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "backend_errors" {
  alarm_name          = "collego-backend-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BackendErrorCount"
  namespace           = "Collego/Application"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Backend logged > 10 ERRORs in 5 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"
  tags                = local.common_tags
}

# ─── SNS Alerts Topic ────────────────────────────────────────────────────────
resource "aws_sns_topic" "alerts" {
  name = "collego-alerts"
  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ─── EventBridge — Automated DB Backup (cron) ────────────────────────────────
resource "aws_cloudwatch_event_rule" "db_backup" {
  name                = "collego-db-backup-cron"
  description         = "Trigger DB backup Lambda every day at 02:00 UTC"
  schedule_expression = "cron(0 2 * * ? *)"
  tags                = local.common_tags
}

resource "aws_cloudwatch_event_target" "db_backup" {
  rule      = aws_cloudwatch_event_rule.db_backup.name
  target_id = "CollegoDBBackupLambda"
  arn       = aws_lambda_function.db_backup.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.db_backup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.db_backup.arn
}

# ─── Lambda — DB Backup ───────────────────────────────────────────────────────
resource "aws_iam_role" "lambda_backup" {
  name = "collego-lambda-backup-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_backup_policy" {
  name = "collego-lambda-backup-policy"
  role = aws_iam_role.lambda_backup.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::collego-db-backups-${var.environment}",
          "arn:aws:s3:::collego-db-backups-${var.environment}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["rds:CreateDBSnapshot", "rds:DescribeDBSnapshots"]
        Resource = aws_db_instance.postgres.arn
      },
      {
        Effect   = "Allow"
        Action   = ["ec2:CreateNetworkInterface", "ec2:DescribeNetworkInterfaces", "ec2:DeleteNetworkInterface"]
        Resource = "*"
      }
    ]
  })
}

# Lambda function (zip uploaded separately or via CI)
data "archive_file" "lambda_backup_zip" {
  type        = "zip"
  source_file = "${path.module}/../lambda/db_backup.py"
  output_path = "${path.module}/../lambda/db_backup.zip"
}

resource "aws_lambda_function" "db_backup" {
  filename         = data.archive_file.lambda_backup_zip.output_path
  source_code_hash = data.archive_file.lambda_backup_zip.output_base64sha256
  function_name    = "collego-db-backup"
  role             = aws_iam_role.lambda_backup.arn
  handler          = "db_backup.handler"
  runtime          = "python3.11"
  timeout          = 300
  memory_size      = 256

  environment {
    variables = {
      DB_INSTANCE_ID = aws_db_instance.postgres.identifier
      S3_BUCKET      = "collego-db-backups-${var.environment}"
    }
  }

  vpc_config {
    subnet_ids         = module.vpc.private_subnets
    security_group_ids = [aws_security_group.ec2.id]
  }

  tags = local.common_tags
}
