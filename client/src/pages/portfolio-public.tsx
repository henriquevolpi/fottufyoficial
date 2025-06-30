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
  user: {
    name: string;
  };
}

// Mock portfolios data for demonstration
const mockPortfolios: Portfolio[] = [
  {
    id: 1,
    name: "Ensaios de Casamento",
    slug: "ensaios-casamento",
    description: "Coleção dos melhores momentos de casamentos fotografados. Cada imagem conta uma história única de amor, alegria e celebração. Meu trabalho visa capturar a essência natural e espontânea dos momentos mais preciosos do seu grande dia.",
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      name: "Fotógrafo Profissional"
    },
    photos: [
      {
        id: 1,
        photoUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop",
        originalName: "casamento_ana_joao_01.jpg",
        order: 0
      },
      {
        id: 2,
        photoUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=600&fit=crop",
        originalName: "casamento_ana_joao_02.jpg",
        order: 1
      },
      {
        id: 3,
        photoUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=600&fit=crop",
        originalName: "casamento_ana_joao_03.jpg",
        order: 2
      },
      {
        id: 4,
        photoUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&h=600&fit=crop",
        originalName: "casamento_ana_joao_04.jpg",
        order: 3
      },
      {
        id: 5,
        photoUrl: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&h=600&fit=crop",
        originalName: "casamento_ana_joao_05.jpg",
        order: 4
      },
      {
        id: 6,
        photoUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&h=600&fit=crop",
        originalName: "casamento_ana_joao_06.jpg",
        order: 5
      }
    ]
  },
  {
    id: 2,
    name: "Retratos Corporativos",
    slug: "retratos-corporativos",
    description: "Fotos profissionais para empresas e executivos. Imagens que transmitem confiança, profissionalismo e personalidade para seu uso corporativo.",
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      name: "Fotógrafo Profissional"
    },
    photos: [
      {
        id: 7,
        photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
        originalName: "executivo_01.jpg",
        order: 0
      },
      {
        id: 8,
        photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=600&fit=crop",
        originalName: "executivo_02.jpg",
        order: 1
      },
      {
        id: 9,
        photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&h=600&fit=crop",
        originalName: "executivo_03.jpg",
        order: 2
      }
    ]
  },
  {
    id: 3,
    name: "Ensaios Família",
    slug: "ensaios-familia",
    description: "Momentos especiais em família capturados com carinho e naturalidade. Fotografias que eternizam os laços e a felicidade compartilhada.",
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      name: "Fotógrafo Profissional"
    },
    photos: [
      {
        id: 10,
        photoUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=600&fit=crop",
        originalName: "familia_01.jpg",
        order: 0
      },
      {
        id: 11,
        photoUrl: "https://images.unsplash.com/photo-1609220136736-443140cceaac?w=800&h=600&fit=crop",
        originalName: "familia_02.jpg",
        order: 1
      }
    ]
  }
];

export default function PortfolioPublicPage() {
  const params = useParams();
  const { toast } = useToast();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PortfolioPhoto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const slug = params.slug;

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const foundPortfolio = mockPortfolios.find(p => p.slug === slug && p.isPublic);
      setPortfolio(foundPortfolio || null);
      setIsLoading(false);
    }, 500);
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
    // In a real implementation, this would trigger a download
    toast({ title: `Download iniciado: ${photo.originalName}` });
  };

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

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Portfólio não encontrado</h1>
          <p className="text-gray-600 mb-6">
            O portfólio que você está procurando não existe ou não está público.
          </p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const sortedPhotos = portfolio.photos.sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={sharePortfolio}
                className="hidden sm:flex"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
              
              <Button
                variant="outline"
                onClick={sharePortfolio}
                size="sm"
                className="sm:hidden"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Portfolio Header */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Cover Image */}
            {portfolio.photos.length > 0 && (
              <div className="mb-8">
                <img
                  src={portfolio.photos[0].photoUrl}
                  alt={portfolio.name}
                  className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-lg shadow-lg"
                />
              </div>
            )}
            
            {/* Portfolio Info */}
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {portfolio.name}
              </h1>
              
              {portfolio.description && (
                <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  {portfolio.description}
                </p>
              )}
              
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <User className="mr-1 h-4 w-4" />
                  {portfolio.user.name}
                </div>
                <div className="flex items-center">
                  <Camera className="mr-1 h-4 w-4" />
                  {portfolio.photos.length} fotos
                </div>
                <div className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  {new Date(portfolio.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {sortedPhotos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Este portfólio ainda não possui fotos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedPhotos.map((photo) => (
                <Card
                  key={photo.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => openLightbox(photo)}
                >
                  <div className="aspect-square relative group">
                    <img
                      src={photo.photoUrl}
                      alt={photo.originalName || `Foto ${photo.id}`}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                      <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>Powered by Fottufy - Sistema de Gestão para Fotógrafos</p>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-6xl w-full h-full max-h-[90vh] p-0">
          {selectedPhoto && (
            <div className="relative w-full h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-white">
                <h3 className="text-lg font-medium truncate">
                  {selectedPhoto.originalName || `Foto ${selectedPhoto.id}`}
                </h3>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadPhoto(selectedPhoto)}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Image */}
              <div className="flex-1 flex items-center justify-center bg-black p-4">
                <img
                  src={selectedPhoto.photoUrl}
                  alt={selectedPhoto.originalName || `Foto ${selectedPhoto.id}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between p-4 bg-white border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentIndex = sortedPhotos.findIndex(p => p.id === selectedPhoto.id);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedPhotos.length - 1;
                    setSelectedPhoto(sortedPhotos[prevIndex]);
                  }}
                  disabled={sortedPhotos.length <= 1}
                >
                  Anterior
                </Button>
                
                <span className="text-sm text-gray-600">
                  {sortedPhotos.findIndex(p => p.id === selectedPhoto.id) + 1} de {sortedPhotos.length}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentIndex = sortedPhotos.findIndex(p => p.id === selectedPhoto.id);
                    const nextIndex = currentIndex < sortedPhotos.length - 1 ? currentIndex + 1 : 0;
                    setSelectedPhoto(sortedPhotos[nextIndex]);
                  }}
                  disabled={sortedPhotos.length <= 1}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}