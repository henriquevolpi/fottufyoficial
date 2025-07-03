import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Camera, Download, ExternalLink, Share2, User, X } from "lucide-react";
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
  bannerUrl?: string;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Modern Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Button 
              onClick={() => window.history.back()} 
              variant="ghost" 
              size="sm"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            
            <div className="flex items-center space-x-3">
              <Button 
                onClick={sharePortfolio}
                variant="outline" 
                size="sm"
                className="inline-flex items-center bg-white hover:bg-gray-50 border-gray-300 transition-all duration-200"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Banner */}
      <div className="relative overflow-hidden">
        {/* Custom Banner */}
        {portfolio.bannerUrl ? (
          <div className="relative h-[60vh] min-h-[400px] max-h-[600px]">
            <div className="absolute inset-0">
              <img
                src={portfolio.bannerUrl}
                alt={`Banner do portfólio ${portfolio.name}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            </div>
            
            {/* Content overlay on banner */}
            <div className="relative h-full flex items-end">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
                <div className="text-center text-white">
                  <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    Portfólio Profissional
                  </Badge>
                  
                  <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-lg">
                    {portfolio.name}
                  </h1>
                  
                  {portfolio.description && (
                    <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed max-w-4xl mx-auto drop-shadow">
                      {portfolio.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center justify-center gap-4 text-white/80">
                    <div className="flex items-center backdrop-blur-sm bg-white/10 rounded-full px-4 py-2">
                      <User className="mr-2 h-5 w-5" />
                      <span className="font-medium">{portfolio.userName}</span>
                    </div>
                    
                    <div className="flex items-center backdrop-blur-sm bg-white/10 rounded-full px-4 py-2">
                      <Camera className="mr-2 h-5 w-5" />
                      <span className="font-medium">{portfolio.photos.length} fotos</span>
                    </div>
                    
                    <div className="flex items-center backdrop-blur-sm bg-white/10 rounded-full px-4 py-2">
                      <Calendar className="mr-2 h-5 w-5" />
                      <span className="font-medium">{new Date(portfolio.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Default gradient hero when no banner */
          <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
              <div className="text-center">
                <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm text-lg px-4 py-2">
                  Portfólio Profissional
                </Badge>
                
                <h1 className="text-5xl md:text-7xl font-bold mb-8 drop-shadow-lg">
                  {portfolio.name}
                </h1>
                
                {portfolio.description && (
                  <p className="text-xl md:text-2xl text-white/90 mb-12 leading-relaxed max-w-4xl mx-auto">
                    {portfolio.description}
                  </p>
                )}
                
                <div className="flex items-center justify-center space-x-8 text-lg">
                  <div className="flex items-center backdrop-blur-sm bg-white/10 rounded-full px-6 py-3">
                    <User className="mr-3 h-6 w-6" />
                    <span className="font-medium">{portfolio.userName}</span>
                  </div>
                  
                  <div className="flex items-center backdrop-blur-sm bg-white/10 rounded-full px-6 py-3">
                    <Camera className="mr-3 h-6 w-6" />
                    <span className="font-medium">{portfolio.photos.length} fotos</span>
                  </div>
                  
                  <div className="hidden sm:flex items-center backdrop-blur-sm bg-white/10 rounded-full px-6 py-3">
                    <Calendar className="mr-3 h-6 w-6" />
                    <span className="font-medium">{new Date(portfolio.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modern Photos Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {portfolio.photos.length === 0 ? (
          <div className="text-center py-24">
            <div className="bg-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Galeria em breve</h3>
            <p className="text-lg text-gray-600 max-w-md mx-auto">Este portfólio está sendo preparado e em breve terá fotos incríveis para você ver.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Gallery Header */}
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Galeria de Fotos
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Explore {portfolio.photos.length} fotografias cuidadosamente selecionadas
              </p>
            </div>

            {/* Masonry Grid Layout */}
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
              {portfolio.photos
                .sort((a, b) => a.order - b.order)
                .map((photo, index) => (
                <div 
                  key={photo.id} 
                  className="break-inside-avoid group cursor-pointer"
                  onClick={() => openLightbox(photo)}
                >
                  <Card className="overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white border-0 shadow-md">
                    <CardContent className="p-0">
                      <div className="relative overflow-hidden">
                        <img
                          src={photo.photoUrl}
                          alt={photo.originalName || `Foto ${photo.id}`}
                          className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-700"
                          loading={index < 8 ? "eager" : "lazy"}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full p-3">
                            <ExternalLink className="h-6 w-6 text-gray-800" />
                          </div>
                        </div>
                      </div>
                      {photo.description && (
                        <div className="p-4">
                          <p className="text-sm text-gray-700 leading-relaxed">{photo.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {/* Gallery Footer */}
            <div className="text-center pt-12 border-t border-gray-200">
              <p className="text-gray-600 mb-6">Gostou do que viu?</p>
              <Button 
                onClick={sharePortfolio}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <Share2 className="mr-2 h-5 w-5" />
                Compartilhar Portfólio
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 backdrop-blur-md border-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização da foto</DialogTitle>
          </DialogHeader>
          
          {selectedPhoto && (
            <div className="relative w-full h-full flex flex-col">
              {/* Header com controles */}
              <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex justify-between items-center">
                  <div className="text-white/80 text-sm font-medium">
                    {portfolio && portfolio.photos.length > 1 && (
                      <span>
                        {portfolio.photos.findIndex(p => p.id === selectedPhoto.id) + 1} de {portfolio.photos.length}
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={closeLightbox}
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm rounded-full w-10 h-10 p-0 transition-all duration-200"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              {/* Área principal da imagem */}
              <div className="flex-1 flex items-center justify-center p-4 pt-16 pb-20">
                <div className="relative max-w-full max-h-full">
                  <img
                    src={selectedPhoto.photoUrl}
                    alt={selectedPhoto.originalName || `Foto ${selectedPhoto.id}`}
                    className="max-w-full max-h-[calc(95vh-10rem)] w-auto h-auto object-contain rounded-lg shadow-2xl"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                  
                  {/* Navegação desktop - nas laterais da imagem */}
                  {portfolio && portfolio.photos.length > 1 && (
                    <>
                      <Button
                        onClick={() => navigatePhoto('prev')}
                        variant="ghost"
                        size="sm"
                        className="absolute left-[-60px] top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 rounded-full w-12 h-12 p-0 hidden lg:flex items-center justify-center transition-all duration-200"
                      >
                        <ArrowLeft className="h-6 w-6" />
                      </Button>
                      <Button
                        onClick={() => navigatePhoto('next')}
                        variant="ghost"
                        size="sm"
                        className="absolute right-[-60px] top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 rounded-full w-12 h-12 p-0 hidden lg:flex items-center justify-center transition-all duration-200"
                      >
                        →
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Footer com informações e controles */}
              <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
                  <div className="flex-1 min-w-0">
                    {selectedPhoto.originalName && (
                      <h3 className="font-semibold text-base truncate">{selectedPhoto.originalName}</h3>
                    )}
                    {selectedPhoto.description && (
                      <p className="text-sm text-gray-300 mt-1 line-clamp-2">{selectedPhoto.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Navegação mobile */}
                    {portfolio && portfolio.photos.length > 1 && (
                      <div className="flex lg:hidden gap-1 mr-2">
                        <Button
                          onClick={() => navigatePhoto('prev')}
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20 rounded-full w-9 h-9 p-0"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => navigatePhoto('next')}
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20 rounded-full w-9 h-9 p-0"
                        >
                          →
                        </Button>
                      </div>
                    )}
                    
                    <Button
                      onClick={() => downloadPhoto(selectedPhoto)}
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-200 px-3 py-2"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}