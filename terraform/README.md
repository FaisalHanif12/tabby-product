# Tabby — AWS Infrastructure (Terraform)

Provisions everything Tabby needs on AWS, wired for **Vercel ↔ AWS OIDC
federation**. There are **no static AWS access keys** anywhere — Vercel presents
a short-lived OIDC token at runtime and assumes an IAM role via
`sts:AssumeRoleWithWebIdentity`.

## What it creates

| Resource | Purpose |
|---|---|
| `aws_dynamodb_table.tabby` | Single-table store (`PK`/`SK`), on-demand, TTL on `ttl`, Streams (NEW_AND_OLD_IMAGES). Commented GSI1 placeholder for future saved-history. |
| `aws_s3_bucket.receipts` (+ public-access block, CORS, SSE) | Private receipt-image bucket; CORS allows browser PUT/GET from your app origins. |
| `aws_iam_openid_connect_provider.vercel` | Trusts Vercel's OIDC IdP. Thumbprint derived dynamically (not hardcoded). |
| `aws_iam_role.vercel` (+ 2 inline policies) | Role Vercel assumes. Least-privilege: DynamoDB (table + index/* + stream) and S3 (objects + list). Nothing else. |

## Files

- `versions.tf` — pinned Terraform + provider versions (AWS `~> 5.0`, TLS `~> 4.0`)
- `providers.tf` — AWS provider + default tags
- `variables.tf` — all inputs (nothing hardcoded)
- `dynamodb.tf` / `s3.tf` / `iam_oidc.tf` — resources, grouped by concern
- `outputs.tf` — values to paste into Vercel
- `terraform.tfvars.example` — copy to `terraform.tfvars` and fill in

## Prerequisites

- Terraform >= 1.5
- AWS credentials **for running Terraform** (your admin/CI identity — e.g.
  `aws sso login` or an `AWS_PROFILE`). These are only for provisioning; the
  Tabby app itself never uses static keys.
- Your Vercel **team slug** and **project name**, and your **issuer mode**
  (Vercel → Settings → Secure Backend Access). This config defaults to the
  **team** issuer (`https://oidc.vercel.com/<team-slug>`).

## Usage

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # then edit terraform.tfvars

terraform init
terraform plan
terraform apply
```

After `apply`, read the outputs and set them as Environment Variables on your
Vercel project (Production):

```bash
terraform output
```

| Terraform output | Vercel env var |
|---|---|
| `aws_role_arn` | `AWS_ROLE_ARN` |
| `aws_region`   | `AWS_REGION` |
| `table_name`   | `TABLE_NAME` |
| `s3_bucket`    | `S3_BUCKET` |

> Set `AWS_REGION` explicitly in Vercel. Vercel sets it automatically to the
> function's execution region, which can differ from where your resources live.

## Notes

- **No static credentials are stored** by this config or the app. The IAM role
  is assumed via OIDC; `terraform.tfvars` (gitignored) holds only names/slugs.
- **Audience:** the app does not override `audience`, so the role trusts
  Vercel's default `aud = https://vercel.com/<team-slug>`. If you later set
  `audience: 'sts.amazonaws.com'` in `awsCredentialsProvider`, add that value to
  both the OIDC provider's `client_id_list` and the trust-policy `aud`
  condition.
- **Destroy** (tears down all Tabby AWS resources — the S3 bucket must be empty
  first):

  ```bash
  terraform destroy
  ```
