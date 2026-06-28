# ─────────────────────────────────────────────────────────────────────────────
# Terraform + provider version pinning
#
# AWS provider is pinned to the v5 major line. The `tls` provider is used only
# to derive the Vercel OIDC issuer's certificate thumbprint at plan time (so we
# never hardcode a thumbprint that could rotate).
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}
