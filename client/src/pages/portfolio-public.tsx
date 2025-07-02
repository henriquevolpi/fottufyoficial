import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Camera, Download, ExternalLink, Share2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PortfolioPhoto {
  id: number;
  photoUrl: string;
  originalName?: string;
  description?: string;
  order: number;
}

interface Portfolio {
  id: number;
  name: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  photos: PortfolioPhoto[];
  userName: string;
}

export default function PortfolioPublicPage() {
  const params = useParams();
  const { toast } = useToast();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PortfolioPhoto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = params.slug;

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/portfolios/public/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Portfólio não encontrado");
          } else {
            setError("Erro ao carregar portfólio");
          }
          setPortfolio(null);
          return;
        }
        
        const data = await response.json();
        setPortfolio(data);
      } catch (err) {
        console.error("Erro ao buscar portfólio:", err);
        setError("Erro ao carregar portfólio");
        setPortfolio(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchPortfolio();
    }
  }, [slug]);

  const openLightbox = (photo: PortfolioPhoto) => {
    setSelectedPhoto(photo);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
    setIsLightboxOpen(false);
  };

  const sharePortfolio = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado para a área de transferência!" });
  };

  const downloadPhoto = (photo: PortfolioPhoto) => {
    const link = document.createElement('a');
    link.href = photo.photoUrl;
    link.download = photo.originalName || `foto_${photo.id}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedPhoto || !portfolio) return;
    
    const currentIndex = portfolio.photos.findIndex(p => p.id === selectedPhoto.id);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : portfolio.photos.length - 1;
    } else {
      newIndex = currentIndex < portfolio.photos.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedPhoto(portfolio.photos[newIndex]);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando portfólio...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Portfólio não encontrado</h1>
            <p className="text-gray-600">
              {error === "Portfólio não encontrado" 
                ? "O portfólio que você está procurando não existe ou foi removido."
                : "Ocorreu um erro ao carregar o portfólio. Tente novamente mais tarde."
              }
            </p>
          </div>
          <Button 
            onClick={() => window.history.back()} 
            variant="outline"
            className="inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  // Portfolio not found (different from error)
  if (!portfolio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Portfólio não encontrado</h1>
            <p className="text-gray-600">
              O portfólio que você está procurando não existe ou não está público.
            </p>
          </div>
          <Button 
            onClick={() => window.history.back()} 
            variant="outline"
            className="inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <Button 
              onClick={() => window.history.back()} 
              variant="ghost" 
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button 
                onClick={sharePortfolio}
                variant="outline" 
                size="sm"
                className="inline-flex items-center"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </div>

          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              Portfólio Público
            </Badge>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {portfolio.name}
            </h1>
            
            {portfolio.description && (
              <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                {portfolio.description}
              </p>
            )}
            
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>{portfolio.userName}</span>
              </div>
              
              <div className="flex items-center">
                <Camera className="mr-2 h-4 w-4" />
                <span>{portfolio.photos.length} fotos</span>
              </div>
              
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                <span>{new Date(portfolio.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {portfolio.photos.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma foto neste portfólio ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {portfolio.photos
              .sort((a, b) => a.order - b.order)
              .map((photo) => (
                <Card 
                  key={photo.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => openLightbox(photo)}
                >
                  <CardContent className="p-0">
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={photo.photoUrl}
                        alt={photo.originalName || `Foto ${photo.id}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 flex items-center justify-center">
                        <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 bg-black">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização da foto</DialogTitle>
          </DialogHeader>
          
          {selectedPhoto && (
            <div className="relative">
              {/* Close button */}
              <Button
                onClick={closeLightbox}
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              >
                ✕
              </Button>
              
              {/* Navigation buttons */}
              {portfolio && portfolio.photos.length > 1 && (
                <>
                  <Button
                    onClick={() => navigatePhoto('prev')}
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  >
                    ←
                  </Button>
                  <Button
                    onClick={() => navigatePhoto('next')}
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  >
                    →
                  </Button>
                </>
              )}
              
              {/* Image */}
              <div className="flex items-center justify-center min-h-[60vh] max-h-[80vh]">
                <img
                  src={selectedPhoto.photoUrl}
                  alt={selectedPhoto.originalName || `Foto ${selectedPhoto.id}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              
              {/* Footer with photo info and actions */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center justify-between text-white">
                  <div>
                    {selectedPhoto.originalName && (
                      <p className="font-medium">{selectedPhoto.originalName}</p>
                    )}
                    {selectedPhoto.description && (
                      <p className="text-sm text-gray-300 mt-1">{selectedPhoto.description}</p>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => downloadPhoto(selectedPhoto)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}