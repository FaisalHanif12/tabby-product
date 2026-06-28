# ─────────────────────────────────────────────────────────────────────────────
# Provider configuration
#
# Region comes from a variable. `default_tags` stamps every taggable resource so
# the whole Tabby footprint is easy to find and clean up.
# ─────────────────────────────────────────────────────────────────────────────

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "Tabby"
      ManagedBy = "Terraform"
    }
  }
}
