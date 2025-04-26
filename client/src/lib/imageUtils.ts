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
    // Check if it's an old R2 URL that needs to be replaced with the CDN URL
    if (url.includes('.r2.cloudflarestorage.com')) {
      // Extract the filename from the old URL
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      return `https://cdn.fottufy.com/${filename}`;
    }
    // Return other full URLs as-is (including cdn.fottufy.com URLs)
    return url;
  }
  
  // Check if it might be a full R2 URL without the protocol
  if (url.includes('.r2.cloudflarestorage.com')) {
    // Extract the filename from the R2 URL
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return `https://cdn.fottufy.com/${filename}`;
  }
  
  // For URLs that are just filenames, use the new CDN domain
  return `https://cdn.fottufy.com/${url}`;
};

/**
 * Alternative URL format to try if the primary fails
 * @param url The original URL that failed
 * @returns An alternative URL format to try
 */
export const getAlternativePhotoUrl = (url: string): string => {
  if (!url) return '/placeholder.jpg';
  
  // If using cdn.fottufy.com and it failed, extract the filename and try direct R2 URL
  if (url.includes('cdn.fottufy.com')) {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    
    // Try to use the environment variables if available
    const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
    const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
    
    if (accountId && bucketName) {
      return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${filename}`;
    }
    
    // Fallback to static values if env vars are not available
    return `/placeholder.jpg`;
  }
  
  // If it's still using the old R2 URL format, convert to CDN URL
  if (url.includes('.r2.cloudflarestorage.com')) {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return `https://cdn.fottufy.com/${filename}`;
  }
  
  // No alternative available
  return '/placeholder.jpg';
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