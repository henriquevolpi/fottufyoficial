/**
 * Utility functions for handling image URLs and formatting
 */

// Type definition for photos
export interface Photo {
  id: string;
  url: string;
  filename?: string;
  [key: string]: any; // Allow for other properties
}

/**
 * Ensures a photo URL is properly formatted regardless of its source (local or R2)
 * with improved fallback mechanisms
 * 
 * @param url The original photo URL to format
 * @returns A properly formatted URL that can be used in img src
 */
export const getPhotoUrl = (url: string): string => {
  // Guard against undefined or null URLs
  if (!url) {
    console.warn('getPhotoUrl called with empty URL');
    return '/placeholder.jpg';
  }
  
  // If the URL already starts with http/https, it's a complete URL
  if (url.startsWith('http')) {
    return url;
  }
  
  // Check if it might be a full R2 URL without the protocol
  if (url.includes('.r2.cloudflarestorage.com')) {
    return `https://${url}`;
  }
  
  const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
  const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
  
  // Verify we have the required environment variables
  if (!accountId || !bucketName) {
    console.error('Missing R2 environment variables');
    return url; // Return original as fallback
  }
  
  // Build the full Cloudflare R2 URL (assuming url is just a filename)
  return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${url}`;
};

/**
 * Alternative R2 URL format to try if the primary one fails
 * @param url The original URL that failed
 * @returns An alternative URL format to try
 */
export const getAlternativePhotoUrl = (url: string): string => {
  // If not an R2 URL, we can't create an alternative
  if (!url || !url.includes('.r2.cloudflarestorage.com')) {
    return url;
  }
  
  // Try the .r2.dev format instead of .r2.cloudflarestorage.com
  return url.replace('.r2.cloudflarestorage.com', '.r2.dev');
};

/**
 * Creates a properly formatted URL from a photo object
 * @param photo The photo object containing an id and url
 * @returns A properly formatted URL that can be used in img src
 */
export function getImageUrl(photo: { url: string }): string {
  if (!photo || !photo.url) return "/placeholder.jpg";
  
  // Use the same logic as getPhotoUrl
  return getPhotoUrl(photo.url);
}

/**
 * Get a fallback image URL if the original fails to load
 * @param photoId The ID of the photo
 * @returns A fallback URL to try
 */
export const getFallbackPhotoUrl = (photoId: string): string => {
  // Just return the local placeholder - no external fallbacks
  return "/placeholder.jpg";
};

/**
 * Get a placeholder image URL as a last resort
 * @returns A local placeholder image URL
 */
export const getPlaceholderImageUrl = (): string => {
  // Using a local placeholder image instead of external URLs
  return "/placeholder.jpg";
};