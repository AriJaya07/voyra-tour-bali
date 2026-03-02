import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

let s3: S3Client | null = null;

function ensureS3() {
  if (s3) return s3;

  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_STORAGE_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    console.warn("[S3] Not configured — S3 disabled.");
    return null;
  }

  s3 = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3;
}

export async function uploadImageToS3({
  buffer,
  key,
  contentType,
}: {
  buffer: Buffer;
  key: string;
  contentType: string;
}): Promise<{ url: string; key: string }> {
  const client = ensureS3();

  if (!client) {
    throw new Error("S3 not configured");
  }

  const bucket = process.env.AWS_STORAGE_BUCKET!;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  const baseUrl =
    process.env.AWS_PUBLIC_BASE_URL ??
    `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`;

  return {
    url: `${baseUrl}/${key}`,
    key,
  };
}

export async function deleteImageFromS3(key: string) {
  const client = ensureS3();
  if (!client) return;

  const bucket = process.env.AWS_STORAGE_BUCKET!;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}