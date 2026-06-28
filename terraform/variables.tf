# ─────────────────────────────────────────────────────────────────────────────
# Input variables
#
# Everything environment-specific (account, slugs, names, origins) is a variable.
# Nothing is hardcoded. Fill these in terraform.tfvars (see the .example).
# ─────────────────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region for the DynamoDB table and S3 bucket (e.g. us-east-1). Set the SAME value as AWS_REGION in Vercel."
  type        = string
}

variable "table_name" {
  description = "DynamoDB single-table name. The app reads this from TABLE_NAME."
  type        = string
  default     = "Tabby"
}

variable "bucket_name" {
  description = "S3 bucket name for receipt images. Must be GLOBALLY unique across all of AWS."
  type        = string
}

variable "role_name" {
  description = "Name of the IAM role Vercel assumes via OIDC."
  type        = string
  default     = "tabby-vercel-oidc"
}

# ── Vercel OIDC federation ───────────────────────────────────────────────────

variable "vercel_team_slug" {
  description = "Your Vercel team slug - the path segment in your team URL (vercel.com/<team-slug>). Used in the OIDC issuer, audience, and subject."
  type        = string
}

variable "vercel_project_name" {
  description = "Your Vercel project name (as shown in the project's URL/settings). Used to pin the OIDC subject to this project only."
  type        = string
}

variable "vercel_issuer_mode" {
  description = "Vercel OIDC issuer mode: \"team\" (issuer https://oidc.vercel.com/<team-slug>) or \"global\" (https://oidc.vercel.com). Confirm in Vercel -> Settings -> Secure Backend Access. Defaults to team (recommended)."
  type        = string
  default     = "team"

  validation {
    condition     = contains(["team", "global"], var.vercel_issuer_mode)
    error_message = "vercel_issuer_mode must be either \"team\" or \"global\"."
  }
}

variable "vercel_environment" {
  description = "Vercel deployment environment the role is allowed for. Kept to \"production\" for least privilege."
  type        = string
  default     = "production"
}

# ── Browser CORS origins ─────────────────────────────────────────────────────

variable "allowed_origins" {
  description = "Origins allowed to PUT/GET receipt images directly in the browser. MUST include your production domain and http://localhost:3000 for local dev - otherwise browser uploads fail silently."
  type        = list(string)

  validation {
    condition     = length(var.allowed_origins) > 0
    error_message = "allowed_origins must contain at least one origin."
  }
}
