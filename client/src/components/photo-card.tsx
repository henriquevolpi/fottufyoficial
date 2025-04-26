import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPhotoUrl } from "@/lib/imageUtils";

interface PhotoCardProps {
  id: string;
  url: string;
  filename: string;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  disabled?: boolean;
}

export default function PhotoCard({
  id,
  url,
  filename,
  isSelected,
  onToggleSelect,
  disabled = false,
}: PhotoCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (!disabled) {
      onToggleSelect(id);
    }
  };

  return (
    <div 
      className={cn(
        "group relative cursor-pointer",
        disabled && "cursor-default opacity-80"
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`ID: ${id}\nURL: ${url}`}
    >
      <div className="relative w-full h-60 bg-gray-200 rounded-lg overflow-hidden group-hover:opacity-75">
        {/* Debug info overlay when hovering */}
        {isHovered && (
          <div className="absolute top-0 left-0 bg-black bg-opacity-70 text-white text-xs p-1 z-10 max-w-full overflow-hidden">
            ID: {id?.substring(0, 8)}... 
          </div>
        )}
        
        {/* Use photo URL directly with getPhotoUrl as fallback */}
        <img 
          src={url || getPhotoUrl(url) || "/placeholder.jpg"}
          alt={filename}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            // Safety check to ensure currentTarget exists and is an image
            if (!e || !e.currentTarget || !(e.currentTarget instanceof HTMLImageElement)) {
              console.error('Error handler received invalid event');
              return;
            }
            
            console.warn(`First attempt loading image failed: ${id} from URL: ${url}`);
            
            // Cast to HTMLImageElement for type safety
            const img = e.currentTarget as HTMLImageElement;
            
            // Clear previous error handler to prevent loops
            img.onerror = null;
            
            try {
              // Get the current URL that failed
              const currentUrl = img.src;
              console.log(`Failed URL was: ${currentUrl}`);
              
              // Extract the filename from the URL that failed
              let filename = '';
              
              // Extract the filename regardless of URL format
              const parts = currentUrl.split('/');
              filename = parts[parts.length - 1];
              
              if (filename && filename.length > 0) {
                // First fallback: If we're using cdn.fottufy.com, try direct R2 URL
                if (currentUrl.includes('cdn.fottufy.com')) {
                  const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
                  const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
                  
                  if (accountId && bucketName) {
                    // Set up fallback chain
                    img.onerror = function() {
                      console.log(`Direct R2 URL failed, trying R2.dev format`);
                      
                      img.onerror = function() {
                        console.error(`All attempts to load image failed: ${id}`);
                        img.onerror = null;
                        img.src = "/placeholder.jpg";
                      };
                      
                      // Try the R2.dev format as last attempt
                      const devUrl = `https://${bucketName}.${accountId}.r2.dev/${filename}`;
                      console.log(`Final attempt: Trying .r2.dev URL: ${devUrl}`);
                      img.src = devUrl;
                    };
                    
                    // Try direct R2 URL first
                    const directUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${filename}`;
                    console.log(`Attempt 1: Trying direct R2 URL: ${directUrl}`);
                    img.src = directUrl;
                  } else {
                    // No environment variables, go straight to placeholder
                    img.src = "/placeholder.jpg";
                  }
                } 
                // If using old R2 URL format, try the CDN URL
                else if (currentUrl.includes('.r2.cloudflarestorage.com')) {
                  img.onerror = function() {
                    console.error(`CDN URL failed, using placeholder`);
                    img.onerror = null;
                    img.src = "/placeholder.jpg";
                  };
                  
                  // Try CDN URL
                  const cdnUrl = `https://cdn.fottufy.com/${filename}`;
                  console.log(`Attempt: Trying CDN URL: ${cdnUrl}`);
                  img.src = cdnUrl;
                }
                else {
                  // Non-recognized URL format, go to placeholder
                  img.src = "/placeholder.jpg";
                }
              } else {
                // Couldn't extract filename, use placeholder
                img.src = "/placeholder.jpg";
              }
            } catch (error) {
              console.error('Error in fallback handling:', error);
              
              // Last resort - try placeholder
              if (img) {
                img.src = "/placeholder.jpg";
              }
            }
          }}
        />
        <div className={cn(
          "absolute inset-0 bg-black transition-opacity",
          isHovered && !disabled ? "bg-opacity-10" : "bg-opacity-0"
        )}></div>
      </div>
      
      <div className="absolute top-2 right-2">
        <div className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center border-2 border-white shadow-md",
          isSelected ? "bg-primary-600" : "bg-white"
        )}>
          <svg 
            className={cn(
              "h-4 w-4", 
              isSelected ? "text-white" : "text-primary-600 hidden"
            )} 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      </div>
      
      <div className="mt-2 flex justify-between">
        <p className="text-sm text-gray-500">{filename}</p>
      </div>
    </div>
  );
}
