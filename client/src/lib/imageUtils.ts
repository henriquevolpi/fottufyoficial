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
  // If the URL already starts with http/https, it's a complete URL (likely from R2)
  if (url.startsWith('http')) {
    return url;
  }
  
  // If it looks like a Cloudflare R2 key without domain, construct the R2 URL
  if (import.meta.env.VITE_R2_BUCKET_NAME && 
      import.meta.env.VITE_R2_ACCOUNT_ID && 
      !url.includes('://')) {
    return `https://${import.meta.env.VITE_R2_BUCKET_NAME}.${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.dev/${url}`;
  }
  
  // If there's a VITE_BASE_URL environment variable, use it
  if (import.meta.env.VITE_BASE_URL) {
    return `${import.meta.env.VITE_BASE_URL}${url}`;
  }
  
  // Otherwise, use the current origin (domain) as the base
  return `${window.location.origin}${url}`;
};

/**
 * Creates a properly formatted URL from a photo object
 * @param photo The photo object containing an id and url
 * @returns A properly formatted URL that can be used in img src
 */
export const getImageUrl = (photo: Photo): string => {
  if (!photo || !photo.url) {
    console.error('Invalid photo object or missing URL');
    return getPlaceholderImageUrl();
  }
  
  return getPhotoUrl(photo.url);
};

/**
 * Get a fallback image URL if the original fails to load
 * @param photoId The ID of the photo
 * @returns A fallback URL to try
 */
export const getFallbackPhotoUrl = (photoId: string): string => {
  // First try: Check if we can construct a Cloudflare R2 URL
  if (import.meta.env.VITE_R2_BUCKET_NAME && import.meta.env.VITE_R2_ACCOUNT_ID) {
    return `https://${import.meta.env.VITE_R2_BUCKET_NAME}.${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.dev/${photoId}`;
  }
  
  // Second try: Attempt to construct a fallback URL for local uploads
  return `${window.location.origin}/uploads/${photoId}`;
};

/**
 * Get a placeholder image URL as a last resort
 * @returns A generic placeholder image URL
 */
export const getPlaceholderImageUrl = (): string => {
  // Using a static placeholder image that's unlikely to be unavailable
  return "https://images.unsplash.com/photo-1526045612212-70caf35c14df";
};