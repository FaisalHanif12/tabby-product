import 'server-only'

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider'

/**
 * Module-scope S3 client singleton, sharing the same OIDC credential provider
 * as DynamoDB. Bucket name comes from env. No static keys.
 */
const REGION = process.env.AWS_REGION
const ROLE_ARN = process.env.AWS_ROLE_ARN

export const S3_BUCKET = process.env.S3_BUCKET as string

export const s3 = new S3Client({
  region: REGION,
  credentials: awsCredentialsProvider({
    roleArn: ROLE_ARN as string,
    clientConfig: { region: REGION },
  }),
})

/** Presigned PUT URL the browser uses to upload a receipt image directly to S3. */
export async function presignPut(
  objectKey: string,
  contentType: string,
  expiresIn = 60,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: objectKey,
    ContentType: contentType,
  })
  return getSignedUrl(s3, command, { expiresIn })
}

/** Presigned GET URL for reading a stored object back (e.g. settlement receipt). */
export async function presignGet(
  objectKey: string,
  expiresIn = 300,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: objectKey })
  return getSignedUrl(s3, command, { expiresIn })
}

/** Server-side fetch of an object's bytes (used by the OCR proxy). */
export async function getObjectBytes(objectKey: string): Promise<{
  bytes: Uint8Array
  contentType: string
}> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: objectKey }),
  )
  const bytes = await res.Body!.transformToByteArray()
  return {
    bytes,
    contentType: res.ContentType ?? 'application/octet-stream',
  }
}
