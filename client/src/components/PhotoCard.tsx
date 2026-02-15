import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WatermarkOverlay } from "./WatermarkOverlay";
import { 
  Check, 
  Loader2,
  Maximize,
  MessageCircle,
  ImageIcon
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
  
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(card);
          }
        });
      },
      {
        rootMargin: '200px',
        threshold: 0.01
      }
    );
    
    observer.observe(card);
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
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

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageError(true);
    e.currentTarget.src = '/placeholder.jpg';
  }, []);

  const imageUrl = photo.url && !photo.url.includes('project-photos') 
    ? photo.url 
    : `https://cdn.fottufy.com/${photo.filename}`;

  return (
    <Card
      ref={cardRef}
      className={`overflow-hidden group cursor-pointer transition-shadow duration-300 rounded-2xl border-0 shadow-md ${
        isFinalized ? 'opacity-80' : 'hover:shadow-xl'
      } ${isSelected ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20' : ''}`}
      onClick={handleCardClick}
      style={{ 
        contain: 'layout style paint'
      }}
    >
      <div className="relative h-64 bg-slate-100">
        {isVisible ? (
          <WatermarkOverlay 
            enabled={showWatermark} 
            className="absolute inset-0 w-full h-full cursor-zoom-in group"
            reuseCanvas={true}
          >
            <div 
              className="w-full h-full"
              onClick={handleImageClick}
            >
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/40 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                <Maximize className="h-6 w-6 text-white drop-shadow-lg" />
              </div>
              
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                  <div className="animate-pulse">
                    <ImageIcon className="h-10 w-10 text-slate-300" />
                  </div>
                </div>
              )}
              
              <img
                src={imageUrl}
                alt="Photo"
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                decoding="async"
                onLoad={handleImageLoad}
                onError={handleImageError}
                onContextMenu={e => e.preventDefault()}
                title="Clique para ampliar"
              />
            </div>
          </WatermarkOverlay>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <ImageIcon className="h-10 w-10 text-slate-200" />
          </div>
        )}
        
        {isSelected && (
          <div className="absolute top-3 right-3 bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white rounded-full p-1.5 shadow-lg shadow-purple-500/40">
            <Check className="h-4 w-4" />
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white p-3 pt-8 text-sm font-medium truncate">
          {photo.originalName || photo.filename}
        </div>
      </div>
      
      <CardContent className="p-3 space-y-3 bg-white">
        <div className="text-center">
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className={
              `w-full transition-all duration-200 rounded-xl font-black text-sm` +
              (isSelected
                ? " bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white border-none shadow-lg shadow-purple-500/30 hover:shadow-xl"
                : " border-slate-200 hover:bg-slate-50 text-slate-700")
            }
            disabled={isFinalized}
          >
            {isSelected ? (
              <>
                <Check className="mr-1.5 h-4 w-4" /> Selecionado
              </>
            ) : (
              "Selecionar"
            )}
          </Button>
        </div>

        <div className="border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
          {isSelected ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl font-bold"
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
                className="w-full text-slate-400 cursor-not-allowed rounded-xl text-xs"
                disabled
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Selecione para comentar
              </Button>
            </div>
          )}
        </div>

        {isCommentExpanded && isSelected && (
          <div className="border-t border-slate-100 space-y-3 text-[15px] text-left pt-3 mt-2" onClick={(e) => e.stopPropagation()}>
            <div>
              <Textarea
                placeholder="Digite seu comentário..."
                value={commentText || ""}
                onChange={handleCommentChange}
                className="text-sm min-h-[60px] resize-none rounded-xl border-slate-200 focus:border-purple-500 focus:ring-purple-500"
                rows={2}
              />
            </div>

            <Button
              size="sm"
              className="w-full text-xs rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 text-white font-bold shadow shadow-purple-500/20"
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

            {photoComments && photoComments.length > 0 && (
              <div className="border-t border-slate-100 mt-3 pt-3 space-y-2">
                <div className="text-xs font-bold text-slate-600">
                  Comentários ({photoComments.length}):
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {photoComments.map((comment, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3 text-[12px]">
                      <div className="flex justify-end mb-1">
                        <span className="text-slate-400 text-xs">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed">
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
