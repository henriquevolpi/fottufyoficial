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

      {/* Hero Section Premium - Experiência Imersiva */}
      {(() => {
        const heroImageUrl = portfolio.bannerUrl || (portfolio.photos.length > 0 ? portfolio.photos[0].photoUrl : null);
        
        return heroImageUrl ? (
          <div className="relative h-[100svh] md:h-[85vh] overflow-hidden">
            {/* Background principal com efeito Ken Burns suave */}
            <div 
              className="absolute inset-0 bg-cover bg-center animate-[kenburns_20s_ease-in-out_infinite_alternate]"
              style={{
                backgroundImage: `url(${heroImageUrl})`,
              }}
            />
            
            {/* Camada de blur sutil */}
            <div className="absolute inset-0 backdrop-blur-[1px]" />
            
            {/* Gradiente cinematográfico multicamada */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
            
            {/* Efeito vinheta nas bordas */}
            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.5)]" />
            
            {/* Partículas decorativas (bokeh effect) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse" style={{animationDuration: '4s'}} />
              <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-purple-300/10 rounded-full blur-2xl animate-pulse" style={{animationDuration: '5s', animationDelay: '1s'}} />
              <div className="absolute bottom-1/3 left-1/3 w-40 h-40 bg-fuchsia-300/5 rounded-full blur-3xl animate-pulse" style={{animationDuration: '6s', animationDelay: '2s'}} />
            </div>
            
            {/* Conteúdo principal centralizado */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
              {/* Badge decorativo animado */}
              <div className="mb-6 animate-[fadeInDown_1s_ease-out]">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/90 text-xs sm:text-sm font-medium tracking-wide uppercase">
                    Portfólio Profissional
                  </span>
                </div>
              </div>
              
              {/* Título principal com animação */}
              <h1 className="font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-tight uppercase drop-shadow-2xl animate-[fadeInUp_1s_ease-out_0.3s_both] leading-[0.9]">
                {portfolio.name}
              </h1>
              
              {/* Linha decorativa animada */}
              <div className="mt-6 mb-4 animate-[scaleX_1s_ease-out_0.6s_both]">
                <div className="w-24 sm:w-32 h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-full" />
              </div>
              
              {/* Nome do fotógrafo */}
              <p className="text-white/80 text-lg sm:text-xl md:text-2xl font-light tracking-wide animate-[fadeInUp_1s_ease-out_0.5s_both]">
                {portfolio.userName}
              </p>
              
              {/* Descrição se houver */}
              {portfolio.description && (
                <p className="mt-4 text-white/70 text-base sm:text-lg max-w-2xl mx-auto animate-[fadeInUp_1s_ease-out_0.6s_both]">
                  {portfolio.description}
                </p>
              )}
              
              {/* Badges de informação com glassmorphism */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-[fadeInUp_1s_ease-out_0.7s_both]">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg">
                  <Camera className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm font-medium">{portfolio.photos.length} fotos</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg">
                  <Calendar className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm font-medium">
                    {new Date(portfolio.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Indicador de scroll animado */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-[fadeIn_1s_ease-out_1.5s_both] md:bottom-10">
              <div className="flex flex-col items-center gap-2">
                <span className="text-white/60 text-xs uppercase tracking-widest font-medium">Ver fotos</span>
                <div className="w-6 h-10 border-2 border-white/30 rounded-full p-1 flex justify-center">
                  <div className="w-1.5 h-3 bg-white/70 rounded-full animate-[scrollDown_2s_ease-in-out_infinite]" />
                </div>
              </div>
            </div>
            
            {/* Overlay de proteção inferior para transição suave */}
            <div className={`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t ${isDarkMode ? 'from-gray-900' : 'from-slate-50'} to-transparent`} />
          </div>
        ) : (
          /* Default gradient hero when no banner or photos */
          <div className="relative h-[60vh] min-h-[400px] bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            
            {/* Partículas decorativas */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse" style={{animationDuration: '4s'}} />
              <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-purple-300/20 rounded-full blur-2xl animate-pulse" style={{animationDuration: '5s', animationDelay: '1s'}} />
            </div>
            
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/90 text-xs sm:text-sm font-medium tracking-wide uppercase">
                    Portfólio Profissional
                  </span>
                </div>
              </div>
              
              <h1 className="font-black text-4xl sm:text-6xl md:text-7xl text-white tracking-tight uppercase drop-shadow-2xl leading-[0.9]">
                {portfolio.name}
              </h1>
              
              <div className="mt-6 mb-4">
                <div className="w-24 sm:w-32 h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-full" />
              </div>
              
              <p className="text-white/80 text-lg sm:text-xl md:text-2xl font-light tracking-wide">
                {portfolio.userName}
              </p>
              
              {portfolio.description && (
                <p className="mt-4 text-white/70 text-base sm:text-lg max-w-2xl mx-auto">
                  {portfolio.description}
                </p>
              )}
              
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10">
                  <Camera className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm font-medium">{portfolio.photos.length} fotos</span>
                </div>
              </div>
            </div>
            
            <div className={`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t ${isDarkMode ? 'from-gray-900' : 'from-slate-50'} to-transparent`} />
          </div>
        );
      })()}

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