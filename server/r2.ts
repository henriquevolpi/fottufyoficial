/**
 * Cloudflare R2 Storage Integration
 * 
 * This module provides utilities to interact with Cloudflare R2 storage service.
 * 
 * Required environment variables:
 * - R2_ACCESS_KEY_ID: Your Cloudflare R2 access key
 * - R2_SECRET_ACCESS_KEY: Your Cloudflare R2 secret key
 * - R2_ACCOUNT_ID: Your Cloudflare account ID 
 * - R2_BUCKET_NAME: The name of your R2 bucket
 * - R2_REGION: The region of your R2 bucket (optional, defaults to 'auto')
 * 
 * Important notes:
 * - Make sure your bucket is created manually in the Cloudflare dashboard before using this module
 * - Public access must be enabled on the bucket for URLs to work properly
 */

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

// Configure multer for R2 uploads using memory storage
export const r2Upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (isValidFileType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
      cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}. Apenas imagens JPEG, PNG, GIF e WebP são aceitas.`));
    }
  }
});

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
    // For Cloudflare R2, public URLs can be generated in three ways:
    // 1. Using Custom Domains configured in Cloudflare
    // 2. Using the bucket's default R2 URL: https://<bucket>.<accountid>.r2.dev/<filename>
    // 3. Using the standard S3 URL format: https://<accountid>.r2.cloudflarestorage.com/<bucket>/<filename>
    
    // For Cloudflare R2, we need to extract just the account ID for the public URL
    // The account ID is the first part of the hostname in the endpoint
    const accountId = process.env.R2_ACCOUNT_ID || '';
    
    // Using custom CDN domain for image URLs
    const publicUrl = `https://cdn.fottufy.com/project-photos/${fileName}`;
    console.log(`Generated CDN URL: ${publicUrl}`);
    
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
 * Download image from URL and upload to R2
 */
export async function downloadAndUploadToR2(
  sourceUrl: string,
  filename: string
): Promise<{ url: string, key: string }> {
  try {
    // Fetch the image from the URL
    const response = await fetch(sourceUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    // Get the image content type
    const contentType = response.headers.get("content-type") || "image/jpeg";
    
    // Convert the response to a buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload the image to R2
    const result = await uploadFileToR2(
      buffer,
      filename,
      contentType
    );
    
    return result;
  } catch (error) {
    console.error(`Error downloading and uploading image from ${sourceUrl}:`, error);
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
      // If the bucket doesn't exist, we'll inform the user they need to create it manually
      if (error.$metadata?.httpStatusCode === 404) {
        console.error(`Bucket '${BUCKET_NAME}' not found in Cloudflare R2.`);
        console.error(`IMPORTANT: Buckets must be created manually in the Cloudflare dashboard before use.`);
        console.error(`Please go to https://dash.cloudflare.com and create the bucket '${BUCKET_NAME}' with public access enabled.`);
        
        throw new Error(`Bucket '${BUCKET_NAME}' does not exist in Cloudflare R2. It must be created manually in the Cloudflare dashboard.`);
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