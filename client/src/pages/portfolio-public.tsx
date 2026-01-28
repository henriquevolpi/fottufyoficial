import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Calendar, Camera, Download, ExternalLink, Moon, Share2, Sun, User, X } from "lucide-react";
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
  // About Me fields
  aboutTitle?: string;
  aboutDescription?: string;
  aboutProfileImageUrl?: string;
  aboutContact?: string;
  aboutEmail?: string;
  aboutPhone?: string;
  aboutWebsite?: string;
  aboutInstagram?: string;
  aboutEnabled?: boolean;
}

export default function PortfolioPublicPage() {
  const params = useParams();
  const { toast } = useToast();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PortfolioPhoto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'gallery'>('gallery');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const slug = params.slug;

  // Ensure gallery is always the default tab
  useEffect(() => {
    setActiveTab('gallery');
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
        
        // Always start with gallery tab
        setActiveTab('gallery');
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
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
      {/* Modern Navigation Bar */}
      <nav className={`sticky top-0 z-50 backdrop-blur-sm border-b transition-colors duration-300 ${isDarkMode ? 'bg-gray-900/90 border-gray-700' : 'bg-white/90 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Button 
              onClick={() => window.history.back()} 
              variant="ghost" 
              size="sm"
              className={`transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                variant="outline" 
                size="sm"
                className={`inline-flex items-center transition-all duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200' : 'bg-white hover:bg-gray-50 border-gray-300'}`}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button 
                onClick={sharePortfolio}
                variant="outline" 
                size="sm"
                className={`inline-flex items-center transition-all duration-200 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200' : 'bg-white hover:bg-gray-50 border-gray-300'}`}
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

      {/* Navigation Tabs */}
      {portfolio && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className={`flex justify-center border-b transition-colors duration-300 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-6 py-3 font-medium text-lg border-b-2 transition-colors duration-200 ${
                activeTab === 'gallery'
                  ? 'border-blue-600 text-blue-600'
                  : isDarkMode 
                    ? 'border-transparent text-gray-300 hover:text-white hover:border-gray-500'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Camera className="mr-2 h-5 w-5 inline" />
              Galeria de Fotos
            </button>
            {portfolio.aboutEnabled && (
              <button
                onClick={() => setActiveTab('about')}
                className={`px-6 py-3 font-medium text-lg border-b-2 transition-colors duration-200 ${
                  activeTab === 'about'
                    ? 'border-blue-600 text-blue-600'
                    : isDarkMode 
                      ? 'border-transparent text-gray-300 hover:text-white hover:border-gray-500'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <User className="mr-2 h-5 w-5 inline" />
                Sobre mim
              </button>
            )}
          </div>
        </div>
      )}

      {/* About Me Section */}
      {portfolio && activeTab === 'about' && portfolio.aboutEnabled && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold mb-6 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {portfolio.aboutTitle || 'Sobre mim'}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Profile Image */}
            {portfolio.aboutProfileImageUrl && (
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={portfolio.aboutProfileImageUrl}
                    alt={portfolio.aboutTitle || 'Foto do fotógrafo'}
                    className="w-80 h-80 object-cover rounded-2xl shadow-2xl"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              </div>
            )}

            {/* About Content */}
            <div className={`space-y-6 ${!portfolio.aboutProfileImageUrl ? 'md:col-span-2 text-center' : ''}`}>
              {portfolio.aboutDescription && (
                <div className="prose prose-lg max-w-none">
                  <p className={`leading-relaxed text-lg transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {portfolio.aboutDescription}
                  </p>
                </div>
              )}

              {portfolio.aboutContact && (
                <div className={`rounded-2xl p-6 transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <h3 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Informações adicionais</h3>
                  <p className={`leading-relaxed transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {portfolio.aboutContact}
                  </p>
                </div>
              )}

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Contato</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {portfolio.aboutEmail && (
                    <a
                      href={`mailto:${portfolio.aboutEmail}`}
                      className="flex items-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-medium">@</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-600">{portfolio.aboutEmail}</p>
                      </div>
                    </a>
                  )}

                  {portfolio.aboutPhone && (
                    <a
                      href={`tel:${portfolio.aboutPhone}`}
                      className="flex items-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-green-600 font-medium">📞</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Telefone</p>
                        <p className="text-sm text-gray-600">{portfolio.aboutPhone}</p>
                      </div>
                    </a>
                  )}

                  {portfolio.aboutWebsite && (
                    <a
                      href={portfolio.aboutWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <ExternalLink className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Website</p>
                        <p className="text-sm text-gray-600 truncate">{portfolio.aboutWebsite}</p>
                      </div>
                    </a>
                  )}

                  {portfolio.aboutInstagram && (
                    <a
                      href={`https://instagram.com/${portfolio.aboutInstagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-pink-600 font-medium">📷</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Instagram</p>
                        <p className="text-sm text-gray-600">@{portfolio.aboutInstagram.replace('@', '')}</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photos Gallery */}
      {portfolio && activeTab === 'gallery' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {portfolio.photos.length === 0 ? (
          <div className="text-center py-24">
            <div className={`rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <Camera className={`h-12 w-12 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
            </div>
            <h3 className={`text-2xl font-semibold mb-4 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Galeria em breve</h3>
            <p className={`text-lg max-w-md mx-auto transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Este portfólio está sendo preparado e em breve terá fotos incríveis para você ver.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Gallery Header */}
            <div className="text-center">
              <h2 className={`text-3xl md:text-4xl font-bold mb-4 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Galeria de Fotos
              </h2>
              <p className={`text-lg max-w-2xl mx-auto transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Explore {portfolio.photos.length} fotografias cuidadosamente selecionadas
              </p>
            </div>

            {/* Masonry Grid Layout */}
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3">
              {portfolio.photos
                .sort((a, b) => a.order - b.order)
                .map((photo, index) => (
                <div 
                  key={photo.id} 
                  className="break-inside-avoid cursor-pointer"
                  onClick={() => openLightbox(photo)}
                  onMouseEnter={(e) => {
                    const card = e.currentTarget.querySelector('[data-card]') as HTMLElement;
                    const img = e.currentTarget.querySelector('img') as HTMLElement;
                    const overlay = e.currentTarget.querySelector('[data-overlay]') as HTMLElement;
                    const icon = e.currentTarget.querySelector('[data-icon]') as HTMLElement;
                    if (card) {
                      card.style.transform = 'translateY(-8px) translateZ(0)';
                      card.style.webkitTransform = 'translateY(-8px) translateZ(0)';
                      card.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                    }
                    if (img) {
                      img.style.transform = 'scale(1.08)';
                      img.style.webkitTransform = 'scale(1.08)';
                    }
                    if (overlay) overlay.style.opacity = '0.2';
                    if (icon) icon.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const card = e.currentTarget.querySelector('[data-card]') as HTMLElement;
                    const img = e.currentTarget.querySelector('img') as HTMLElement;
                    const overlay = e.currentTarget.querySelector('[data-overlay]') as HTMLElement;
                    const icon = e.currentTarget.querySelector('[data-icon]') as HTMLElement;
                    if (card) {
                      card.style.transform = 'translateZ(0)';
                      card.style.webkitTransform = 'translateZ(0)';
                      card.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    }
                    if (img) {
                      img.style.transform = 'scale(1)';
                      img.style.webkitTransform = 'scale(1)';
                    }
                    if (overlay) overlay.style.opacity = '0';
                    if (icon) icon.style.opacity = '0';
                  }}
                >
                  <Card 
                    data-card
                    className="overflow-hidden bg-white border-0 shadow-md"
                    style={{ 
                      transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                      WebkitTransition: 'box-shadow 0.3s ease, -webkit-transform 0.3s ease',
                      WebkitTransform: 'translateZ(0)',
                      transform: 'translateZ(0)'
                    }}
                  >
                    <CardContent className="p-0">
                      <div className="relative overflow-hidden">
                        <img
                          src={photo.photoUrl}
                          alt={photo.originalName || `Foto ${photo.id}`}
                          className="w-full h-auto object-cover"
                          style={{
                            transition: 'transform 0.5s ease',
                            WebkitTransition: '-webkit-transform 0.5s ease',
                            WebkitTransform: 'scale(1)',
                            transform: 'scale(1)',
                            willChange: 'transform',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden'
                          }}
                          loading={index < 8 ? "eager" : "lazy"}
                        />
                        <div 
                          data-overlay
                          className="absolute inset-0 bg-black pointer-events-none"
                          style={{ opacity: 0, transition: 'opacity 0.3s ease' }}
                        ></div>
                        <div 
                          data-icon
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          style={{ opacity: 0, transition: 'opacity 0.3s ease' }}
                        >
                          <div className="bg-white rounded-full p-3 shadow-lg">
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
            <div className={`text-center pt-12 border-t transition-colors duration-300 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <p className={`mb-6 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Gostou do que viu?</p>
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
      )}

      {/* Lightbox Modal - Personalizado sem bordas */}
      {isLightboxOpen && selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65"
          onClick={closeLightbox}
        >
          <div className="relative max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            {/* Imagem */}
            <img
              src={selectedPhoto.photoUrl}
              alt="Foto do portfólio"
              className="max-w-full max-h-full w-auto h-auto object-contain"
              style={{ maxWidth: '95vw', maxHeight: '95vh' }}
            />
            
            {/* Botão X dentro da foto - canto superior direito */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 w-10 h-10 bg-black/10 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all duration-200 backdrop-blur-sm"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Navegação - apenas se houver mais de uma foto */}
            {portfolio && portfolio.photos.length > 1 && (
              <>
                {/* Seta esquerda */}
                <button
                  onClick={() => navigatePhoto('prev')}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/10 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all duration-200 backdrop-blur-sm"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                
                {/* Seta direita */}
                <button
                  onClick={() => navigatePhoto('next')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/10 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all duration-200 backdrop-blur-sm text-xl"
                >
                  →
                </button>
              </>
            )}
            
            {/* Download button - canto inferior direito */}
            <button
              onClick={() => downloadPhoto(selectedPhoto)}
              className="absolute bottom-4 right-4 px-4 py-2 bg-black/10 hover:bg-black/70 rounded-lg flex items-center gap-2 text-white transition-all duration-200 backdrop-blur-sm"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            
            {/* Contador de fotos - canto inferior esquerdo */}
            {portfolio && portfolio.photos.length > 1 && (
              <div className="absolute bottom-4 left-4 px-3 py-2 bg-black/10 rounded-lg text-white text-sm backdrop-blur-sm">
                {portfolio.photos.findIndex(p => p.id === selectedPhoto.id) + 1} de {portfolio.photos.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}