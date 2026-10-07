output "ec2_public_ip" {
  description = "Elastic IP of the app server"
  value       = aws_eip.app.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = aws_instance.app.public_dns
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (use as DB_HOST)"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "s3_bucket_names" {
  description = "All S3 bucket names created"
  value       = { for k, v in aws_s3_bucket.app_buckets : k => v.bucket }
}

output "ecr_repository_urls" {
  description = "ECR repository URLs for each service"
  value       = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}

output "sns_alert_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms"
  value       = aws_sns_topic.alerts.arn
}

output "lambda_backup_arn" {
  description = "ARN of the DB backup Lambda function"
  value       = aws_lambda_function.db_backup.arn
}
