import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPhotoUrl, getFallbackPhotoUrl, getPlaceholderImageUrl } from "@/lib/imageUtils";

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

  // Format image URL for display
  const displayUrl = getPhotoUrl(url);

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
        
        {/* Improved image loading with better URL handling */}
        <img 
          src={displayUrl} 
          alt={filename}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error(`Error loading image: ${id} from URL: ${url}`);
            // Try the fallback URL first
            const fallbackUrl = getFallbackPhotoUrl(id);
            console.log(`Trying fallback URL: ${fallbackUrl}`);
            e.currentTarget.src = fallbackUrl;
            
            // Add a second error handler in case the fallback also fails
            e.currentTarget.onerror = () => {
              console.log(`Fallback failed, using placeholder for image ${id}`);
              e.currentTarget.src = getPlaceholderImageUrl();
              // Remove the error handler to prevent infinite loops
              e.currentTarget.onerror = null;
            };
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
