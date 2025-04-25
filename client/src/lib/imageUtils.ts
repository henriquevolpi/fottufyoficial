/**
 * Utility functions for handling image URLs and formatting
 */

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
  
  // If there's a VITE_BASE_URL environment variable, use it
  if (import.meta.env.VITE_BASE_URL) {
    return `${import.meta.env.VITE_BASE_URL}${url}`;
  }
  
  // Otherwise, use the current origin (domain) as the base
  return `${window.location.origin}${url}`;
};

/**
 * Get a fallback image URL if the original fails to load
 * @param photoId The ID of the photo
 * @returns A fallback URL to try
 */
export const getFallbackPhotoUrl = (photoId: string): string => {
  // Attempt to construct a fallback URL for local uploads
  return `${window.location.origin}/uploads/${photoId}`;
};

/**
 * Get a placeholder image URL as a last resort
 * @returns A generic placeholder image URL
 */
export const getPlaceholderImageUrl = (): string => {
  return "https://images.unsplash.com/photo-1526045612212-70caf35c14df";
};