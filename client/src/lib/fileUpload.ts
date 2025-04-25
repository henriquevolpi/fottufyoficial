import { nanoid } from 'nanoid';
import imageCompression from 'browser-image-compression';

// Maximum image dimensions and size
const MAX_WIDTH_HEIGHT = 2048;
const MAX_SIZE_MB = 5;

/**
 * Compresses an image file and returns the compressed file
 */
export async function compressImage(file: File): Promise<File> {
  try {
    const options = {
      maxWidthOrHeight: MAX_WIDTH_HEIGHT,
      maxSizeMB: MAX_SIZE_MB,
      useWebWorker: true,
    };

    return await imageCompression(file, options);
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return the original file if compression fails
    return file;
  }
}

/**
 * Uploads a file to the server and returns the permanent URL
 */
export async function uploadFileToStorage(file: File): Promise<{ url: string; filename: string; id: string }> {
  try {
    // Compress the image first
    const compressedFile = await compressImage(file);
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('photos', compressedFile);
    
    // Send the file to the upload endpoint
    const response = await fetch('/api/photos/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include cookies for authentication
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    // Parse the response to get the URL of the uploaded file
    const result = await response.json();
    
    // Return the URL and filename
    return {
      url: result.photos[0].url, // The permanent URL from the server
      filename: result.photos[0].filename || file.name,
      id: result.photos[0].id || nanoid()
    };
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
}

/**
 * Uploads multiple files to the server and returns their permanent URLs
 */
export async function uploadMultipleFiles(
  files: File[]
): Promise<Array<{ url: string; filename: string; id: string }>> {
  // Create an array of promises for each file upload
  const uploadPromises = files.map(uploadFileToStorage);
  
  // Wait for all uploads to complete
  return Promise.all(uploadPromises);
}