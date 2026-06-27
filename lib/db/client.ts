import 'server-only'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider'

/**
 * Module-scope DynamoDB DocumentClient singleton.
 *
 * Credentials are supplied at runtime via Vercel↔AWS OIDC — there are NO static
 * AWS keys anywhere in the codebase. The IAM role and region come from env vars
 * provisioned alongside the Terraform-managed infrastructure.
 */
const REGION = process.env.AWS_REGION
const ROLE_ARN = process.env.AWS_ROLE_ARN

export const TABLE_NAME = process.env.TABLE_NAME as string

const client = new DynamoDBClient({
  region: REGION,
  credentials: awsCredentialsProvider({
    roleArn: ROLE_ARN as string,
    clientConfig: { region: REGION },
  }),
})

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    // Treat undefined values as "absent" instead of throwing.
    removeUndefinedValues: true,
  },
})
