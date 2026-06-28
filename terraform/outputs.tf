# ─────────────────────────────────────────────────────────────────────────────
# Outputs — paste these into your Vercel project's Environment Variables.
#
#   aws_role_arn → AWS_ROLE_ARN
#   aws_region   → AWS_REGION   (set explicitly in Vercel; do not rely on default)
#   table_name   → TABLE_NAME
#   s3_bucket    → S3_BUCKET
# ─────────────────────────────────────────────────────────────────────────────

output "aws_role_arn" {
  description = "Vercel env var AWS_ROLE_ARN - the IAM role Vercel assumes via OIDC."
  value       = aws_iam_role.vercel.arn
}

output "aws_region" {
  description = "Vercel env var AWS_REGION - region of the table and bucket."
  value       = var.aws_region
}

output "table_name" {
  description = "Vercel env var TABLE_NAME - DynamoDB table name."
  value       = aws_dynamodb_table.tabby.name
}

output "s3_bucket" {
  description = "Vercel env var S3_BUCKET - receipt image bucket."
  value       = aws_s3_bucket.receipts.bucket
}
