import { S3Client, PutObjectCommand, HeadBucketCommand, ListBucketsCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Check for required environment variables
if (!process.env.R2_ACCESS_KEY_ID) {
  throw new Error('R2_ACCESS_KEY_ID is not defined in environment variables');
}

if (!process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error('R2_SECRET_ACCESS_KEY is not defined in environment variables');
}

if (!process.env.R2_BUCKET_NAME) {
  throw new Error('R2_BUCKET_NAME is not defined in environment variables');
}

if (!process.env.R2_ACCOUNT_ID) {
  throw new Error('R2_ACCOUNT_ID is not defined in environment variables');
}

// Set default region if not provided
const R2_REGION = process.env.R2_REGION || 'auto';
export const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Create S3 client that points to Cloudflare R2
export const r2Client = new S3Client({
  region: R2_REGION,
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// File upload configurations
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Generate a unique filename to prevent collisions
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 12);
  const extension = originalName.split('.').pop() || 'jpg';
  
  return `${timestamp}-${randomString}.${extension}`;
}

/**
 * Check if the file type is in the allowed list
 */
export function isValidFileType(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimetype);
}

/**
 * Check if the file size is within limits
 */
export function isValidFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

/**
 * Upload a file to R2 storage
 */
export async function uploadFileToR2(
  buffer: Buffer, 
  fileName: string,
  contentType: string
): Promise<{ url: string, key: string }> {
  try {
    // Create command to upload file
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read'
    });

    // Upload the file
    await r2Client.send(uploadCommand);

    // Generate the public URL
    const publicUrl = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}/${fileName}`;
    
    return {
      url: publicUrl,
      key: fileName
    };
  } catch (error) {
    console.error('Error uploading file to R2:', error);
    throw error;
  }
}

/**
 * Ensure bucket exists, create if it doesn't
 */
export async function ensureBucketExists(): Promise<void> {
  try {
    // Try to access the bucket
    try {
      await r2Client.send(
        new HeadBucketCommand({
          Bucket: BUCKET_NAME
        })
      );
      console.log(`Bucket '${BUCKET_NAME}' already exists.`);
      return;
    } catch (error: any) {
      // If the bucket doesn't exist, we'll create it
      if (error.$metadata?.httpStatusCode === 404) {
        console.log(`Bucket '${BUCKET_NAME}' not found, creating...`);
        
        // Create the bucket
        await r2Client.send(
          new CreateBucketCommand({
            Bucket: BUCKET_NAME
          })
        );
        
        console.log(`Bucket '${BUCKET_NAME}' created successfully!`);
      } else {
        // If it's another error, rethrow it
        throw error;
      }
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    throw error;
  }
}