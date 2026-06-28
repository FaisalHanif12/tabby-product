# GSI1 migration — enable saved history

The optional auth feature (saved history) queries a global secondary index,
**GSI1**, to list a user's splits by `USER#<clerkUserId>`. The live table does
not have GSI1 yet. This is the **only** infra change required; apply it when you
want history to work. Until it's applied, the app degrades gracefully — the
history list simply returns empty (the query is wrapped in try/catch) and every
other flow is unaffected.

The app already writes the index attributes (`GSI1PK` / `GSI1SK`) onto USERLINK
rows, so when you add the GSI, DynamoDB **backfills** it from existing rows.

## What the app expects (must match exactly)

- Index name: `GSI1`
- Partition key: `GSI1PK` (S) — value `USER#<clerkUserId>`
- Sort key: `GSI1SK` (S) — value `<zero-padded createdAt>#<sessionId>`
- Projection: `ALL`

These names match the commented placeholder already in `terraform/dynamodb.tf`.

## The diff

In `terraform/dynamodb.tf`, **uncomment** the GSI1 attribute + index blocks:

```diff
   stream_enabled   = true
   stream_view_type = "NEW_AND_OLD_IMAGES"

-  # attribute {
-  #   name = "GSI1PK"
-  #   type = "S"
-  # }
-  #
-  # attribute {
-  #   name = "GSI1SK"
-  #   type = "S"
-  # }
-  #
-  # global_secondary_index {
-  #   name            = "GSI1"
-  #   hash_key        = "GSI1PK"
-  #   range_key       = "GSI1SK"
-  #   projection_type = "ALL"
-  # }
+  attribute {
+    name = "GSI1PK"
+    type = "S"
+  }
+
+  attribute {
+    name = "GSI1SK"
+    type = "S"
+  }
+
+  global_secondary_index {
+    name            = "GSI1"
+    hash_key        = "GSI1PK"
+    range_key       = "GSI1SK"
+    projection_type = "ALL"
+  }
```

## Apply

```bash
cd terraform
terraform plan    # should show 1 GSI being added, no destroy/replace
terraform apply
```

On-demand (PAY_PER_REQUEST) tables add the index with no capacity to configure.
The IAM policy already grants `dynamodb:Query` on `…/index/*`, so no policy
change is needed. Adding a GSI is an online operation; the table stays available
while DynamoDB backfills.
