# ─────────────────────────────────────────────────────────────────────────────
# DynamoDB — Tabby single-table store
#
# Keys match lib/db/keys.ts:  PK = GROUP#<id>,  SK = META | MEMBER# | EXPENSE# |
# ITEM#<expenseId>#<itemId> | SETTLEMENT#<ts>.  A single Query on PK returns a
# whole session. Rows carry a `ttl` epoch-seconds attribute (see repository.ts);
# TTL is enabled on exactly that attribute so sessions self-expire after 7 days.
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_dynamodb_table" "tabby" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST" # on-demand: no capacity planning, scales to zero

  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # App writes `ttl` as Unix epoch SECONDS (repository.ts: Math.floor(now/1000)+…)
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  # Streams on for future fan-out (live updates, analytics, history projection).
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  # ── GSI1 placeholder — future "saved history" (Tabby Pro) ──────────────────
  # A sparse global secondary index keyed by user, e.g. GSI1PK = USER#<userId>,
  # GSI1SK = SESSION#<createdAt>, so a signed-in user can list their past splits.
  # Uncomment BOTH the attribute blocks and the index block to enable. With
  # PAY_PER_REQUEST the index is also on-demand (no separate capacity to set).
  #
  # attribute {
  #   name = "GSI1PK"
  #   type = "S"
  # }
  #
  # attribute {
  #   name = "GSI1SK"
  #   type = "S"
  # }
  #
  # global_secondary_index {
  #   name            = "GSI1"
  #   hash_key        = "GSI1PK"
  #   range_key       = "GSI1SK"
  #   projection_type = "ALL"
  # }

  # ── Optional hardening (uncomment if desired) ──────────────────────────────
  # point_in_time_recovery {
  #   enabled = true
  # }
}
