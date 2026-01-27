import React, { memo, useMemo } from 'react';
import { PhotoCard } from './PhotoCard';
import { useVirtualization, useDeviceCapabilities } from '@/hooks/useVirtualization';

interface Photo {
  id: string;
  url: string;
  filename: string;
  originalName?: string;
  selected: boolean;
}

interface VirtualizedPhotoGridProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  isFinalized: boolean;
  showWatermark: boolean;
  showOnlySelected: boolean;
  commentTexts: Record<string, string>;
  photoComments: Record<string, any[]>;
  expandedCommentPhoto: string | null;
  isCommentMutationPending: boolean;
  onToggleSelection: (photoId: string) => void;
  onOpenModal: (url: string, index: number, event: React.MouseEvent) => void;
  onToggleCommentSection: (photoId: string) => void;
  onCommentTextChange: (photoId: string, text: string) => void;
  onSubmitComment: (photoId: string) => void;
  photoIndexMap?: Map<string, number>;
}

export const VirtualizedPhotoGrid = memo(function VirtualizedPhotoGrid({
  photos,
  selectedPhotos,
  isFinalized,
  showWatermark,
  showOnlySelected,
  commentTexts,
  photoComments,
  expandedCommentPhoto,
  isCommentMutationPending,
  onToggleSelection,
  onOpenModal,
  onToggleCommentSection,
  onCommentTextChange,
  onSubmitComment,
  photoIndexMap
}: VirtualizedPhotoGridProps) {
  
  const deviceCapabilities = useDeviceCapabilities();
  
  const filteredPhotos = useMemo(() => {
    return showOnlySelected 
      ? photos.filter(photo => selectedPhotos.has(photo.id))
      : photos;
  }, [photos, showOnlySelected, selectedPhotos]);
  
  const localPhotoIndexMap = useMemo(() => {
    if (photoIndexMap && photoIndexMap.size > 0) return photoIndexMap;
    const map = new Map<string, number>();
    photos.forEach((photo, index) => {
      map.set(photo.id, index);
    });
    return map;
  }, [photos, photoIndexMap]);
  
  const shouldEnableVirtualization = useMemo(() => {
    if (deviceCapabilities.isMobile) return false;
    return deviceCapabilities.shouldUseVirtualization && filteredPhotos.length > 100;
  }, [deviceCapabilities.isMobile, deviceCapabilities.shouldUseVirtualization, filteredPhotos.length]);
  
  const virtualization = useVirtualization(filteredPhotos, {
    itemHeight: 420,
    containerHeight: 800,
    buffer: 2,
    enabled: shouldEnableVirtualization
  });
  
  const {
    visibleItems,
    totalHeight,
    offsetY,
    containerRef,
    itemsPerRow,
    isVirtualizationActive
  } = virtualization;
  
  const gridClasses = useMemo(() => {
    const baseClasses = "grid gap-4 sm:gap-5 px-2 sm:px-4 lg:px-6";
    switch (itemsPerRow) {
      case 1: return `${baseClasses} grid-cols-2 sm:grid-cols-1`;
      case 2: return `${baseClasses} grid-cols-2`;
      case 3: return `${baseClasses} grid-cols-2 sm:grid-cols-2 lg:grid-cols-3`;
      case 4: return `${baseClasses} grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
      case 5: return `${baseClasses} grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`;
      case 6: return `${baseClasses} grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 max-w-[1800px]:grid-cols-6`;
      default: return `${baseClasses} grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
    }
  }, [itemsPerRow]);
  
  if (!isVirtualizationActive) {
    return (
      <div className={gridClasses}>
        {filteredPhotos.map((photo) => {
          const originalIndex = localPhotoIndexMap.get(photo.id) ?? 0;
          return (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selectedPhotos.has(photo.id)}
              isFinalized={isFinalized}
              showWatermark={showWatermark}
              originalIndex={originalIndex}
              commentText={commentTexts[photo.id] || ""}
              photoComments={photoComments[photo.id] || []}
              isCommentExpanded={expandedCommentPhoto === photo.id}
              isCommentMutationPending={isCommentMutationPending}
              onToggleSelection={onToggleSelection}
              onOpenModal={onOpenModal}
              onToggleCommentSection={onToggleCommentSection}
              onCommentTextChange={onCommentTextChange}
              onSubmitComment={onSubmitComment}
            />
          );
        })}
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className="w-full overflow-auto"
      style={{ 
        height: '80vh',
        maxHeight: '80vh'
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div 
          className={gridClasses}
          style={{ 
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((photo) => {
            const originalIndex = localPhotoIndexMap.get(photo.id) ?? 0;
            return (
              <PhotoCard
                key={photo.id}
                photo={photo}
                isSelected={selectedPhotos.has(photo.id)}
                isFinalized={isFinalized}
                showWatermark={showWatermark}
                originalIndex={originalIndex}
                commentText={commentTexts[photo.id] || ""}
                photoComments={photoComments[photo.id] || []}
                isCommentExpanded={expandedCommentPhoto === photo.id}
                isCommentMutationPending={isCommentMutationPending}
                onToggleSelection={onToggleSelection}
                onOpenModal={onOpenModal}
                onToggleCommentSection={onToggleCommentSection}
                onCommentTextChange={onCommentTextChange}
                onSubmitComment={onSubmitComment}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});
