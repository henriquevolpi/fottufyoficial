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
 * @param url The original photo URL to format
 * @returns A properly formatted URL that can be used in img src
 */
export const getPhotoUrl = (url: string): string => {
  // If the URL already starts with http/https, it's a complete URL
  if (url.startsWith('http')) {
    return url;
  }
  
  // Build the full Cloudflare R2 URL
  return `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${import.meta.env.VITE_R2_BUCKET_NAME}/${url}`;
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