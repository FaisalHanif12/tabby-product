# ─────────────────────────────────────────────────────────────────────────────
# IAM — Vercel OIDC federation (NO static AWS keys)
#
# Vercel's runtime presents a short-lived OIDC token; AWS STS exchanges it for
# temporary credentials via sts:AssumeRoleWithWebIdentity. The app does this
# through @vercel/oidc-aws-credentials-provider (see lib/db/client.ts).
#
# Issuer / audience / subject (from Vercel's AWS OIDC docs, 2026-05-18):
#   • Team issuer mode:   https://oidc.vercel.com/<team-slug>   (default here)
#   • Global issuer mode: https://oidc.vercel.com
#   • Audience (aud):     https://vercel.com/<team-slug>        (Vercel default)
#   • Subject (sub):      owner:<team-slug>:project:<project>:environment:production
#
# IMPORTANT — audience must match the app: the Tabby code calls
# awsCredentialsProvider({ roleArn, clientConfig }) WITHOUT an `audience` option,
# so the token keeps Vercel's DEFAULT aud = https://vercel.com/<team-slug>. That
# is exactly what we pin below. If you ever add `audience: 'sts.amazonaws.com'`
# to the provider call (as some AWS SDK samples show), you must add that value to
# BOTH client_id_list and the trust-policy aud condition.
# ─────────────────────────────────────────────────────────────────────────────

locals {
  # Host portion of the issuer (no scheme). Also used to build the IAM condition
  # keys, which AWS names "<issuer-host>:aud" / "<issuer-host>:sub".
  issuer_host = var.vercel_issuer_mode == "team" ? "oidc.vercel.com/${var.vercel_team_slug}" : "oidc.vercel.com"

  issuer_url = "https://${local.issuer_host}"

  # Vercel's default token audience is team-scoped regardless of issuer mode.
  vercel_aud = "https://vercel.com/${var.vercel_team_slug}"

  # Pin to exactly this project + environment for least privilege.
  vercel_sub = "owner:${var.vercel_team_slug}:project:${var.vercel_project_name}:environment:${var.vercel_environment}"
}

# Fetch the issuer's TLS certificate chain so we can pass the root CA's SHA-1
# fingerprint as the provider thumbprint. This avoids hardcoding a value that
# could rotate; Terraform recomputes it on each plan.
data "tls_certificate" "vercel_oidc" {
  url = local.issuer_url
}

resource "aws_iam_openid_connect_provider" "vercel" {
  url = local.issuer_url

  # The accepted audience(s) for tokens from this IdP.
  client_id_list = [local.vercel_aud]

  thumbprint_list = [
    data.tls_certificate.vercel_oidc.certificates[length(data.tls_certificate.vercel_oidc.certificates) - 1].sha1_fingerprint,
  ]
}

# ── Trust policy: who may assume the role, and under what claims ──────────────
data "aws_iam_policy_document" "trust" {
  statement {
    sid     = "VercelOIDCAssume"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.vercel.arn]
    }

    # aud must equal Vercel's default team audience.
    condition {
      test     = "StringEquals"
      variable = "${local.issuer_host}:aud"
      values   = [local.vercel_aud]
    }

    # sub must equal this exact project + production environment.
    condition {
      test     = "StringEquals"
      variable = "${local.issuer_host}:sub"
      values   = [local.vercel_sub]
    }
  }
}

resource "aws_iam_role" "vercel" {
  name                 = var.role_name
  description          = "Assumed by Vercel (Tabby) via OIDC federation - DynamoDB + S3 only."
  assume_role_policy   = data.aws_iam_policy_document.trust.json
  max_session_duration = 3600
}

# ── Permission policy (a): DynamoDB — table + indexes + stream ───────────────
data "aws_iam_policy_document" "dynamodb" {
  # Item + query operations the app actually performs (repository.ts), scoped to
  # the table and any (future) indexes.
  statement {
    sid    = "TabbyTableData"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:BatchWriteItem",
    ]
    resources = [
      aws_dynamodb_table.tabby.arn,
      "${aws_dynamodb_table.tabby.arn}/index/*",
    ]
  }

  # Stream read access on the table's stream ARN. The six data actions above do
  # not apply to streams, so the minimal stream-consumer actions are granted
  # here instead — ready for a future DynamoDB Streams consumer. Remove this
  # statement if you don't plan to read the stream.
  statement {
    sid    = "TabbyTableStream"
    effect = "Allow"
    actions = [
      "dynamodb:DescribeStream",
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:ListStreams",
    ]
    resources = [aws_dynamodb_table.tabby.stream_arn]
  }
}

# ── Permission policy (b): S3 — objects + list on the receipts bucket ────────
data "aws_iam_policy_document" "s3" {
  statement {
    sid       = "TabbyObjectReadWrite"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${aws_s3_bucket.receipts.arn}/*"]
  }

  statement {
    sid       = "TabbyBucketList"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.receipts.arn]
  }
}

# Attach both as inline policies so they live and die with the role.
resource "aws_iam_role_policy" "dynamodb" {
  name   = "tabby-dynamodb"
  role   = aws_iam_role.vercel.id
  policy = data.aws_iam_policy_document.dynamodb.json
}

resource "aws_iam_role_policy" "s3" {
  name   = "tabby-s3"
  role   = aws_iam_role.vercel.id
  policy = data.aws_iam_policy_document.s3.json
}
