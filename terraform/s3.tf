# ─────────────────────────────────────────────────────────────────────────────
# S3 — receipt image storage
#
# Browsers upload the original receipt straight to S3 via a presigned PUT URL
# (the bytes never pass through a Vercel function). The server then reads the
# object back for OCR. So the bucket must be PRIVATE (no public access) but ALSO
# allow cross-origin PUT/GET from the app's own origins — without the CORS rule
# the browser PUT fails silently with an opaque network error.
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "receipts" {
  bucket = var.bucket_name
}

# Lock the bucket down completely — all access is via the IAM role / presigned
# URLs, never public.
resource "aws_s3_bucket_public_access_block" "receipts" {
  bucket = aws_s3_bucket.receipts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS: allow the browser to PUT (upload) and GET (view) receipt objects from the
# app's origins. allowed_headers "*" is required so the presigned PUT's
# Content-Type (and any signed headers) are accepted; ETag is exposed so the
# client can confirm the upload.
resource "aws_s3_bucket_cors_configuration" "receipts" {
  bucket = aws_s3_bucket.receipts.id

  cors_rule {
    allowed_methods = ["PUT", "GET", "HEAD"]
    allowed_origins = var.allowed_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Sensible default: encrypt objects at rest with SSE-S3 (no extra cost, no key
# management). Remove or switch to aws:kms if you have stricter requirements.
resource "aws_s3_bucket_server_side_encryption_configuration" "receipts" {
  bucket = aws_s3_bucket.receipts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
