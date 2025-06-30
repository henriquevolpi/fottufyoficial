import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ArrowLeft, ExternalLink } from "lucide-react";
import { useState } from "react";

interface Portfolio {
  id: number;
  name: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  createdAt: string;
  photos: PortfolioPhoto[];
  user: {
    name: string;
  };
}

interface PortfolioPhoto {
  id: number;
  photoUrl: string;
  originalName?: string;
  description?: string;
  order: number;
}

export default function PortfolioPublicPage() {
  const [, params] = useRoute("/portfolio/:slug");
  const [selectedPhoto, setSelectedPhoto] = useState<PortfolioPhoto | null>(null);
  const slug = params?.slug;

  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ["/api/portfolio/public", slug],
    enabled: !!slug
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Portfólio não encontrado</h2>
            <p className="text-gray-600 mb-4">
              Este portfólio não existe ou não está mais disponível.
            </p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!portfolio.isPublic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Portfólio Privado</h2>
            <p className="text-gray-600 mb-4">
              Este portfólio é privado e não está disponível para visualização pública.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const downloadPhoto = (photoUrl: string, originalName: string) => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = originalName || 'foto.jpg';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = async () => {
    for (const photo of portfolio.photos) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay between downloads
      downloadPhoto(photo.photoUrl, photo.originalName || `foto-${photo.id}.jpg`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{portfolio.name}</h1>
              {portfolio.description && (
                <p className="text-lg text-gray-600 mb-4">{portfolio.description}</p>
              )}
              <div className="flex items-center space-x-4">
                <Badge variant="outline">Por {portfolio.user.name}</Badge>
                <Badge variant="outline">{portfolio.photos.length} fotos</Badge>
                <Badge variant="outline">
                  {new Date(portfolio.createdAt).toLocaleDateString("pt-BR")}
                </Badge>
              </div>
            </div>
            
            {portfolio.photos.length > 0 && (
              <Button onClick={downloadAll} className="ml-4">
                <Download className="mr-2 h-4 w-4" />
                Baixar Todas
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="container mx-auto px-6 py-8">
        {portfolio.photos.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-medium mb-2">Nenhuma foto disponível</h3>
              <p className="text-gray-500">Este portfólio ainda não possui fotos.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cover Image */}
            {portfolio.coverImageUrl && (
              <div className="mb-8">
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-200">
                  <img
                    src={portfolio.coverImageUrl}
                    alt={`Capa - ${portfolio.name}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Photo Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {portfolio.photos
                .sort((a, b) => a.order - b.order)
                .map((photo) => (
                  <Card key={photo.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square bg-gray-200 relative overflow-hidden">
                      <img
                        src={photo.photoUrl}
                        alt={photo.originalName || `Foto ${photo.id}`}
                        className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                        onClick={() => setSelectedPhoto(photo)}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadPhoto(photo.photoUrl, photo.originalName || `foto-${photo.id}.jpg`);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {photo.description && (
                      <CardContent className="p-3">
                        <p className="text-sm text-gray-600">{photo.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={selectedPhoto.photoUrl}
              alt={selectedPhoto.originalName || `Foto ${selectedPhoto.id}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-4 right-4 flex space-x-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => downloadPhoto(selectedPhoto.photoUrl, selectedPhoto.originalName || `foto-${selectedPhoto.id}.jpg`)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedPhoto(null)}
              >
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="container mx-auto px-6 py-8 text-center">
          <p className="text-gray-500">
            Portfólio criado com{" "}
            <a href="/" className="text-blue-600 hover:underline font-medium">
              Fottufy
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}