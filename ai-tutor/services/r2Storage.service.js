/**
 * Cloudflare R2 (S3-compatible) — private PDF storage for production.
 * PDFs are never served as public URLs; backend reads via API credentials.
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

function getR2Client(config) {
  return new S3Client({
    region: "auto",
    endpoint: config.r2Endpoint,
    credentials: {
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,
    },
  });
}

export function isR2Configured(config) {
  return Boolean(
    config.pdfStorage === "r2" &&
      config.r2Bucket &&
      config.r2AccessKeyId &&
      config.r2SecretAccessKey &&
      config.r2Endpoint
  );
}

export async function getPdfBufferFromR2(config, filename) {
  const client = getR2Client(config);
  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.r2Bucket,
      Key: filename,
    })
  );

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function uploadPdfToR2(config, filename, buffer) {
  const client = getR2Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.r2Bucket,
      Key: filename,
      Body: buffer,
      ContentType: "application/pdf",
    })
  );
  return { bucket: config.r2Bucket, key: filename };
}
