import React, { memo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WatermarkOverlay } from "./WatermarkOverlay";
import { 
  Check, 
  Loader2,
  Maximize,
  MessageCircle
} from "lucide-react";

interface Photo {
  id: string;
  url: string;
  filename: string;
  originalName?: string;
  selected: boolean;
}

interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  isFinalized: boolean;
  showWatermark: boolean;
  originalIndex: number;
  commentText: string;
  photoComments: any[];
  isCommentExpanded: boolean;
  isCommentMutationPending: boolean;
  onToggleSelection: (photoId: string) => void;
  onOpenModal: (url: string, index: number, event: React.MouseEvent) => void;
  onToggleCommentSection: (photoId: string) => void;
  onCommentTextChange: (photoId: string, text: string) => void;
  onSubmitComment: (photoId: string) => void;
}

// Componente memoizado para evitar re-renders desnecessários
export const PhotoCard = memo(function PhotoCard({
  photo,
  isSelected,
  isFinalized,
  showWatermark,
  originalIndex,
  commentText,
  photoComments,
  isCommentExpanded,
  isCommentMutationPending,
  onToggleSelection,
  onOpenModal,
  onToggleCommentSection,
  onCommentTextChange,
  onSubmitComment
}: PhotoCardProps) {
  
  // Memoizar handlers para evitar re-criação
  const handleCardClick = useCallback(() => {
    if (!isFinalized) {
      onToggleSelection(photo.id);
    }
  }, [isFinalized, onToggleSelection, photo.id]);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    onOpenModal(photo.url, originalIndex, e);
  }, [onOpenModal, photo.url, originalIndex]);

  const handleCommentToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCommentSection(photo.id);
  }, [onToggleCommentSection, photo.id]);

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onCommentTextChange(photo.id, e.target.value);
  }, [onCommentTextChange, photo.id]);

  const handleCommentSubmit = useCallback(() => {
    onSubmitComment(photo.id);
  }, [onSubmitComment, photo.id]);

  // Determinar URL da imagem com fallback otimizado
  const imageUrl = photo.url && !photo.url.includes('project-photos') 
    ? photo.url 
    : `https://cdn.fottufy.com/${photo.filename}`;

  return (
    <Card
      className={`overflow-hidden group cursor-pointer transition ${
        isFinalized ? 'opacity-80' : 'hover:shadow-md'
      } ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={handleCardClick}
    >
      <div className="relative h-64">
        <WatermarkOverlay 
          enabled={showWatermark} 
          className="absolute inset-0 w-full h-full cursor-zoom-in group"
          reuseCanvas={true}
        >
          <div 
            className="w-full h-full"
            onClick={handleImageClick}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 rounded-full p-3 opacity-0 group-hover:opacity-80 transition-opacity duration-200 z-20">
              <Maximize className="h-6 w-6 text-white" />
            </div>
            <img
              src={imageUrl}
              alt="Photo"
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.jpg';
              }}
              onContextMenu={e => e.preventDefault()}
              title="Clique para ampliar"
            />
          </div>
        </WatermarkOverlay>
        
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
            <Check className="h-5 w-5" />
          </div>
        )}
        
        {/* Filename */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-sm truncate">
          {photo.originalName || photo.filename}
        </div>
      </div>
      
      <CardContent className="p-3 space-y-3">
        <div className="text-center">
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className={
              `w-full transition-colors` +
              (isSelected
                ? " bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 text-white font-semibold border-none shadow"
                : "")
            }
            disabled={isFinalized}
          >
            {isSelected ? (
              <>
                <Check className="mr-1 h-4 w-4" /> Selecionado
              </>
            ) : (
              "Selecionar"
            )}
          </Button>
        </div>

        {/* Comment Button */}
        <div className="border-t pt-3" onClick={(e) => e.stopPropagation()}>
          {isSelected ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              onClick={handleCommentToggle}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {photoComments && photoComments.length > 0 
                ? `Comentários (${photoComments.length})`
                : "Comentar"
              }
            </Button>
          ) : (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-gray-400 cursor-not-allowed"
                disabled
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Selecione a foto para comentar
              </Button>
            </div>
          )}
        </div>

        {/* Expanded Comment Section */}
        {isCommentExpanded && isSelected && (
          <div className="border-t space-y-2 text-[15px] text-left pt-3 mt-2" onClick={(e) => e.stopPropagation()}>
            {/* Comment Text Area */}
            <div>
              <Textarea
                placeholder="Digite seu comentário sobre esta foto..."
                value={commentText || ""}
                onChange={handleCommentChange}
                className="text-xs min-h-[60px] resize-none"
                rows={2}
              />
            </div>

            {/* Submit Comment Button */}
            <Button
              size="sm"
              variant="secondary"
              className="w-full text-xs"
              onClick={handleCommentSubmit}
              disabled={isCommentMutationPending || !commentText?.trim()}
            >
              {isCommentMutationPending ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Comentário"
              )}
            </Button>

            {/* Existing Comments Display */}
            {photoComments && photoComments.length > 0 && (
              <div className="border-t mt-3 pt-3 space-y-2">
                <div className="text-xs font-medium text-gray-600">
                  Comentários anteriores ({photoComments.length}):
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {photoComments.map((comment, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-2 text-[12px] font-light">
                      <div className="flex justify-end mb-1">
                        <span className="text-gray-400 text-xs">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        {comment.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Comparação customizada para otimizar re-renders
  return (
    prevProps.photo.id === nextProps.photo.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFinalized === nextProps.isFinalized &&
    prevProps.showWatermark === nextProps.showWatermark &&
    prevProps.commentText === nextProps.commentText &&
    prevProps.isCommentExpanded === nextProps.isCommentExpanded &&
    prevProps.isCommentMutationPending === nextProps.isCommentMutationPending &&
    prevProps.photoComments?.length === nextProps.photoComments?.length
  );
});