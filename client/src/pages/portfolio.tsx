import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Eye, Edit, Trash2, Share, Upload, Image, ExternalLink, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

interface PortfolioPhoto {
  id: number;
  photoUrl: string;
  originalName?: string;
  description?: string;
  order: number;
}

// Mock data para demonstração
const mockPortfolios: Portfolio[] = [
  {
    id: 1,
    name: "Ensaios de Casamento",
    slug: "ensaios-casamento",
    description: "Coleção dos melhores momentos de casamentos fotografados",
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
      }
    ]
  },
  {
    id: 2,
    name: "Retratos Corporativos",
    slug: "retratos-corporativos",
    description: "Fotos profissionais para empresas e executivos",
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    photos: [
      {
        id: 3,
        photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
        originalName: "executivo_01.jpg",
        order: 0
      }
    ]
  }
];

const mockUserProjects = [
  {
    id: 1,
    name: "Casamento Ana & João",
    photos: [
      {
        id: "photo_1",
        url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop",
        filename: "casamento_01.jpg",
        originalName: "casamento_ana_joao_01.jpg"
      },
      {
        id: "photo_2", 
        url: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=600&fit=crop",
        filename: "casamento_02.jpg",
        originalName: "casamento_ana_joao_02.jpg"
      },
      {
        id: "photo_3",
        url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=600&fit=crop",
        filename: "casamento_03.jpg",
        originalName: "casamento_ana_joao_03.jpg"
      }
    ]
  },
  {
    id: 2,
    name: "Ensaio Corporativo",
    photos: [
      {
        id: "photo_4",
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
        filename: "corporativo_01.jpg",
        originalName: "executivo_silva.jpg"
      },
      {
        id: "photo_5",
        url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=600&fit=crop",
        filename: "corporativo_02.jpg",
        originalName: "executivo_santos.jpg"
      }
    ]
  }
];

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(mockPortfolios);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddPhotosOpen, setIsAddPhotosOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [newPortfolio, setNewPortfolio] = useState({
    name: "",
    description: "",
    isPublic: true
  });

  const { toast } = useToast();

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .trim();
  };

  const handleCreatePortfolio = () => {
    if (!newPortfolio.name.trim()) {
      toast({ title: "Nome do portfólio é obrigatório", variant: "destructive" });
      return;
    }

    const slug = generateSlug(newPortfolio.name);
    const portfolio: Portfolio = {
      id: Date.now(),
      ...newPortfolio,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      photos: []
    };

    setPortfolios(prev => [...prev, portfolio]);
    setIsCreateOpen(false);
    setNewPortfolio({ name: "", description: "", isPublic: true });
    toast({ title: "Portfólio criado com sucesso!" });
  };

  const handleEditPortfolio = () => {
    if (!editingPortfolio) return;

    setPortfolios(prev => prev.map(p => 
      p.id === editingPortfolio.id 
        ? { ...editingPortfolio, updatedAt: new Date().toISOString() }
        : p
    ));
    setIsEditOpen(false);
    setEditingPortfolio(null);
    toast({ title: "Portfólio atualizado com sucesso!" });
  };

  const handleDeletePortfolio = (id: number) => {
    setPortfolios(prev => prev.filter(p => p.id !== id));
    toast({ title: "Portfólio excluído com sucesso!" });
  };

  const copyPublicLink = (slug: string) => {
    const link = `${window.location.origin}/portfolio/${slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado para a área de transferência!" });
  };

  const handleAddPhotos = () => {
    if (!selectedPortfolioId || selectedPhotos.length === 0) {
      toast({ title: "Selecione fotos para adicionar", variant: "destructive" });
      return;
    }

    const allPhotos = mockUserProjects.flatMap(project => project.photos);
    const photosToAdd = allPhotos.filter(photo => selectedPhotos.includes(photo.id));

    setPortfolios(prev => prev.map(portfolio => {
      if (portfolio.id === selectedPortfolioId) {
        const newPhotos = photosToAdd.map((photo, index) => ({
          id: Date.now() + index,
          photoUrl: photo.url,
          originalName: photo.originalName,
          order: portfolio.photos.length + index
        }));
        return {
          ...portfolio,
          photos: [...portfolio.photos, ...newPhotos],
          updatedAt: new Date().toISOString()
        };
      }
      return portfolio;
    }));

    setIsAddPhotosOpen(false);
    setSelectedPhotos([]);
    setSelectedPortfolioId(null);
    toast({ title: `${photosToAdd.length} fotos adicionadas ao portfólio!` });
  };

  const openAddPhotosModal = (portfolioId: number) => {
    setSelectedPortfolioId(portfolioId);
    setSelectedPhotos([]);
    setIsAddPhotosOpen(true);
  };

  const openEditModal = (portfolio: Portfolio) => {
    setEditingPortfolio({ ...portfolio });
    setIsEditOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Meus Portfólios</h1>
          <p className="text-gray-600 mt-2">
            Organize suas melhores fotos em portfólios públicos para mostrar seu trabalho
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Portfólio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Portfólio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Portfólio</Label>
                <Input
                  id="name"
                  value={newPortfolio.name}
                  onChange={(e) => setNewPortfolio(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Ensaios de Casamento"
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={newPortfolio.description}
                  onChange={(e) => setNewPortfolio(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o tema ou estilo do portfólio"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={newPortfolio.isPublic}
                  onCheckedChange={(checked) => setNewPortfolio(prev => ({ ...prev, isPublic: checked }))}
                />
                <Label htmlFor="isPublic">Portfólio público</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePortfolio}>
                  Criar Portfólio
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {portfolios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Image className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum portfólio criado
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Crie seu primeiro portfólio para organizar e compartilhar suas melhores fotos
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Portfólio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((portfolio) => (
            <Card key={portfolio.id} className="overflow-hidden">
              <div className="aspect-video bg-gray-100 relative">
                {portfolio.photos.length > 0 ? (
                  <img
                    src={portfolio.photos[0].photoUrl}
                    alt={portfolio.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={portfolio.isPublic ? "default" : "secondary"}>
                    {portfolio.isPublic ? "Público" : "Privado"}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">{portfolio.name}</h3>
                {portfolio.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {portfolio.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{portfolio.photos.length} fotos</span>
                  <span>Criado em {new Date(portfolio.createdAt).toLocaleDateString()}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {portfolio.isPublic && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/portfolio/${portfolio.slug}`, '_blank')}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Visualizar
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(portfolio)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddPhotosModal(portfolio.id)}
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    Fotos
                  </Button>
                  
                  {portfolio.isPublic && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPublicLink(portfolio.slug)}
                    >
                      <Share className="mr-1 h-3 w-3" />
                      Compartilhar
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePortfolio(portfolio.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Portfolio Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Portfólio</DialogTitle>
          </DialogHeader>
          {editingPortfolio && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome do Portfólio</Label>
                <Input
                  id="edit-name"
                  value={editingPortfolio.name}
                  onChange={(e) => setEditingPortfolio(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={editingPortfolio.description || ""}
                  onChange={(e) => setEditingPortfolio(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isPublic"
                  checked={editingPortfolio.isPublic}
                  onCheckedChange={(checked) => setEditingPortfolio(prev => prev ? { ...prev, isPublic: checked } : null)}
                />
                <Label htmlFor="edit-isPublic">Portfólio público</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditPortfolio}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Photos Modal */}
      <Dialog open={isAddPhotosOpen} onOpenChange={setIsAddPhotosOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Adicionar Fotos ao Portfólio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Selecione fotos dos seus projetos para adicionar ao portfólio:
            </p>
            
            {mockUserProjects.map((project) => (
              <div key={project.id} className="space-y-2">
                <h4 className="font-medium">{project.name}</h4>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {project.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`relative cursor-pointer border-2 rounded-lg overflow-hidden ${
                        selectedPhotos.includes(photo.id) 
                          ? 'border-blue-500' 
                          : 'border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedPhotos(prev =>
                          prev.includes(photo.id)
                            ? prev.filter(id => id !== photo.id)
                            : [...prev, photo.id]
                        );
                      }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.originalName}
                        className="w-full h-20 object-cover"
                      />
                      {selectedPhotos.includes(photo.id) && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-30 flex items-center justify-center">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="flex justify-between items-center pt-4">
              <span className="text-sm text-gray-600">
                {selectedPhotos.length} fotos selecionadas
              </span>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setIsAddPhotosOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddPhotos} disabled={selectedPhotos.length === 0}>
                  Adicionar Fotos
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}