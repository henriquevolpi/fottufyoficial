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
  onSubmitComment
}: VirtualizedPhotoGridProps) {
  
  const deviceCapabilities = useDeviceCapabilities();
  
  // Filtrar fotos se necessário
  const filteredPhotos = useMemo(() => {
    return showOnlySelected 
      ? photos.filter(photo => selectedPhotos.has(photo.id))
      : photos;
  }, [photos, showOnlySelected, selectedPhotos]);
  
  // Configurar virtualização
  const virtualization = useVirtualization(filteredPhotos, {
    itemHeight: 420, // Altura estimada de cada card (h-64 + CardContent + margins)
    containerHeight: 800, // Altura típica da viewport
    buffer: 2, // Buffer de 2 linhas acima e abaixo
    enabled: deviceCapabilities.shouldUseVirtualization && filteredPhotos.length > 20
  });
  
  const {
    visibleItems,
    totalHeight,
    offsetY,
    containerRef,
    itemsPerRow,
    isVirtualizationActive
  } = virtualization;
  
  // Determinar classes do grid baseado no número de colunas
  const gridClasses = useMemo(() => {
    const baseClasses = "grid gap-4 px-4 sm:px-6 lg:px-8";
    switch (itemsPerRow) {
      case 1: return `${baseClasses} grid-cols-1`;
      case 2: return `${baseClasses} grid-cols-1 sm:grid-cols-2`;
      case 3: return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`;
      case 4: return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
      case 5: return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`;
      case 6: return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 max-w-[1800px]:grid-cols-6`;
      default: return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
    }
  }, [itemsPerRow]);
  
  // Log de debug em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log(`[VirtualizedPhotoGrid] Total: ${filteredPhotos.length}, Visible: ${visibleItems.length}, Columns: ${itemsPerRow}, Virtualization: ${isVirtualizationActive}`);
  }
  
  return (
    <div 
      ref={containerRef}
      className="w-full overflow-auto"
      style={{ 
        height: isVirtualizationActive ? '80vh' : 'auto',
        maxHeight: isVirtualizationActive ? '80vh' : 'none'
      }}
    >
      {isVirtualizationActive ? (
        // Grid virtualizado
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
            {visibleItems.map((photo, index) => {
              const originalIndex = photos.findIndex(p => p.id === photo.id);
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
      ) : (
        // Grid normal para poucos itens ou dispositivos potentes
        <div className={gridClasses}>
          {filteredPhotos.map((photo) => {
            const originalIndex = photos.findIndex(p => p.id === photo.id);
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
      )}
      
      {/* Indicador de performance em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs">
          <div>Total: {filteredPhotos.length} fotos</div>
          <div>Visíveis: {visibleItems.length}</div>
          <div>Colunas: {itemsPerRow}</div>
          <div>Virtual: {isVirtualizationActive ? 'Sim' : 'Não'}</div>
          <div>Device: {deviceCapabilities.isLowEnd ? 'Low-end' : 'Normal'}</div>
        </div>
      )}
    </div>
  );
});