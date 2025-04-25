import { S3Client, PutObjectCommand, HeadBucketCommand, ListBucketsCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";

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
// Per Cloudflare R2 requirements, use a simple endpoint without bucket name
// The endpoint should be in the format: https://<account_id>.r2.cloudflarestorage.com
const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

console.log(`Using R2 endpoint: ${endpoint}`);

export const r2Client = new S3Client({
  region: "auto", // Always use "auto" for Cloudflare R2
  endpoint: endpoint,
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
    // Note: Cloudflare R2 does not support ACLs like AWS S3
    // Public access is controlled via bucket-level settings in the Cloudflare dashboard
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: contentType
    });

    // Upload the file
    await r2Client.send(uploadCommand);

    // Generate the public URL
    // For Cloudflare R2, public URLs need to be generated in one of two ways:
    // 1. Using Custom Domains configured in Cloudflare
    // 2. Using the bucket's default public URL in the format: https://<bucket>.<accountid>.r2.dev/<filename>
    
    // For Cloudflare R2, we need to extract just the account ID for the public URL
    // The account ID is the first part of the hostname in the endpoint
    const accountId = process.env.R2_ACCOUNT_ID || '';
    
    // Public URLs use the format: https://<bucket-name>.<account-id>.r2.dev/<filename>
    const publicUrl = `https://${BUCKET_NAME}.${accountId}.r2.dev/${fileName}`;
    console.log(`Generated public URL: ${publicUrl}`);
    
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