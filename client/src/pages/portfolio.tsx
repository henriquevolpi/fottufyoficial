import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Eye, Edit, Trash2, Share, Upload, Image, ExternalLink, Settings, GripVertical, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { compressMultipleImages } from "@/lib/imageCompression";

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
  portfolioId: number;
  photoUrl: string;
  originalName?: string;
  description?: string;
  order: number;
  createdAt: string;
}

interface ProjectPhoto {
  id: string;
  url: string;
  filename: string;
  originalName?: string;
}

interface Project {
  id: number;
  name: string;
  photos: ProjectPhoto[];
}

export default function PortfolioPage() {
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
  
  // Estados para upload direto de fotos
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "completed">("idle");
  const [isSubmittingPhotos, setIsSubmittingPhotos] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch portfolios from real API
  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: ['/api/portfolios'],
    queryFn: async () => {
      console.log('[Portfolio] Fetching portfolios...');
      const response = await fetch('/api/portfolios', { credentials: 'include' });
      const data = await response.json();
      console.log('[Portfolio] Portfolios fetched:', data);
      return data;
    }
  });

  // Fetch user projects for photo selection
  const { data: userProjects = [] } = useQuery({
    queryKey: ['/api/portfolios/photos-source'],
    queryFn: () => fetch('/api/portfolios/photos-source', { credentials: 'include' }).then(res => res.json()),
    enabled: isAddPhotosOpen
  });

  // Create portfolio mutation
  const createPortfolioMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; isPublic: boolean }) => {
      const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create portfolio');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      setIsCreateOpen(false);
      setNewPortfolio({ name: "", description: "", isPublic: true });
      toast({ title: "Portfólio criado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao criar portfólio", 
        description: error.message || "Tente novamente",
        variant: "destructive" 
      });
    }
  });

  // Update portfolio mutation
  const updatePortfolioMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; description: string; isPublic: boolean } }) => {
      const response = await fetch(`/api/portfolios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update portfolio');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      setIsEditOpen(false);
      setEditingPortfolio(null);
      toast({ title: "Portfólio atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao atualizar portfólio", 
        description: error.message || "Tente novamente",
        variant: "destructive" 
      });
    }
  });

  // Delete portfolio mutation
  const deletePortfolioMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/portfolios/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete portfolio');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      toast({ title: "Portfólio excluído com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao excluir portfólio", 
        description: error.message || "Tente novamente",
        variant: "destructive" 
      });
    }
  });

  // Add photos to portfolio mutation
  const addPhotosMutation = useMutation({
    mutationFn: async ({ portfolioId, photoUrls }: { portfolioId: number; photoUrls: string[] }) => {
      const response = await fetch(`/api/portfolios/${portfolioId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ photoUrls })
      });
      if (!response.ok) throw new Error('Failed to add photos');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      setIsAddPhotosOpen(false);
      setSelectedPhotos([]);
      setSelectedPortfolioId(null);
      toast({ title: `${data?.length || 0} fotos adicionadas ao portfólio!` });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao adicionar fotos", 
        description: error.message || "Tente novamente",
        variant: "destructive" 
      });
    }
  });

  // Delete photo from portfolio mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async ({ portfolioId, photoId }: { portfolioId: number; photoId: number }) => {
      const response = await fetch(`/api/portfolios/${portfolioId}/photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete photo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      toast({ title: "Foto removida do portfólio!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao remover foto", 
        description: error.message || "Tente novamente",
        variant: "destructive" 
      });
    }
  });

  const handleCreatePortfolio = () => {
    if (!newPortfolio.name.trim()) {
      toast({ title: "Nome do portfólio é obrigatório", variant: "destructive" });
      return;
    }

    createPortfolioMutation.mutate(newPortfolio);
  };

  const handleEditPortfolio = () => {
    if (!editingPortfolio) return;

    updatePortfolioMutation.mutate({
      id: editingPortfolio.id,
      data: {
        name: editingPortfolio.name,
        description: editingPortfolio.description || "",
        isPublic: editingPortfolio.isPublic
      }
    });
  };

  const handleDeletePortfolio = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este portfólio? Esta ação não pode ser desfeita.")) {
      deletePortfolioMutation.mutate(id);
    }
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

    addPhotosMutation.mutate({
      portfolioId: selectedPortfolioId,
      photoUrls: selectedPhotos
    });
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

  const handleDeletePhoto = (portfolioId: number, photoId: number) => {
    if (confirm("Tem certeza que deseja remover esta foto do portfólio?")) {
      deletePhotoMutation.mutate({ portfolioId, photoId });
    }
  };

  // Funções para upload direto de fotos
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (droppedFiles.length > 0) {
      addFilesToUpload(droppedFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFilesToUpload(selectedFiles);
    }
  };

  const addFilesToUpload = (newFiles: File[]) => {
    // Criar previews para as novas imagens
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    
    setUploadFiles(prev => [...prev, ...newFiles]);
    setUploadPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeUploadFile = (index: number) => {
    // Liberar URL de preview
    URL.revokeObjectURL(uploadPreviews[index]);
    
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
    setUploadPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDirectUpload = async () => {
    if (!selectedPortfolioId || uploadFiles.length === 0) {
      toast({ title: "Selecione fotos para fazer upload", variant: "destructive" });
      return;
    }

    try {
      setIsSubmittingPhotos(true);
      setUploadStatus("uploading");
      setUploadPercentage(10);

      // Comprimir imagens usando a mesma lógica do dashboard
      console.log(`[Portfolio] Iniciando compressão de ${uploadFiles.length} imagens`);
      
      const compressedFiles = await compressMultipleImages(
        uploadFiles,
        {
          maxWidthOrHeight: 970,
          quality: 0.9,
          useWebWorker: true,
        },
        (processed, total) => {
          const compressionProgress = 10 + ((processed / total) * 30);
          setUploadPercentage(Math.round(compressionProgress));
        }
      );

      setUploadPercentage(40);
      console.log(`[Portfolio] Compressão concluída: ${compressedFiles.length} imagens`);

      // Fazer upload para o portfólio específico
      const formData = new FormData();
      compressedFiles.forEach((file, index) => {
        formData.append('photos', file, file.name);
      });

      const response = await fetch(`/api/portfolios/${selectedPortfolioId}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Falha no upload');
      }

      const result = await response.json();
      console.log(`[Portfolio] Upload result:`, result);
      
      setUploadPercentage(100);
      setUploadStatus("completed");

      // Limpar estado e fechar modal
      uploadPreviews.forEach(url => URL.revokeObjectURL(url));
      setUploadFiles([]);
      setUploadPreviews([]);
      setIsUploadModalOpen(false);
      setUploadPercentage(0);
      setUploadStatus("idle");

      // Atualizar dados - invalidar tanto a lista quanto o portfólio específico
      await queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      await queryClient.refetchQueries({ queryKey: ['/api/portfolios'] });
      
      toast({ 
        title: "Upload concluído!", 
        description: `${result.photos?.length || compressedFiles.length} fotos adicionadas ao portfólio` 
      });

    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro no upload",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingPhotos(false);
      setUploadStatus("idle");
    }
  };

  const openUploadModal = (portfolioId: number) => {
    setSelectedPortfolioId(portfolioId);
    setUploadFiles([]);
    setUploadPreviews([]);
    setUploadPercentage(0);
    setUploadStatus("idle");
    setIsUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    if (!isSubmittingPhotos) {
      // Limpar URLs de preview
      uploadPreviews.forEach(url => URL.revokeObjectURL(url));
      setUploadFiles([]);
      setUploadPreviews([]);
      setUploadPercentage(0);
      setUploadStatus("idle");
      setIsUploadModalOpen(false);
    }
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
          {portfolios.map((portfolio: Portfolio) => (
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
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openUploadModal(portfolio.id)}
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    Upload
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
        <DialogContent className="max-w-6xl max-h-[90vh] w-[95vw] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Adicionar Fotos ao Portfólio</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col flex-1 min-h-0">
            <p className="text-gray-600 mb-4 flex-shrink-0">
              Selecione fotos dos seus projetos para adicionar ao portfólio:
            </p>
            
            {/* Área de rolagem dos projetos */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {userProjects.map((project: Project) => (
                <div key={project.id} className="space-y-3">
                  <h4 className="font-medium text-lg sticky top-0 bg-white py-2 border-b">
                    {project.name} ({project.photos.length} fotos)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {project.photos.map((photo: ProjectPhoto) => (
                      <div
                        key={photo.id}
                        className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all hover:scale-105 ${
                          selectedPhotos.includes(photo.url) 
                            ? 'border-blue-500 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedPhotos(prev =>
                            prev.includes(photo.url)
                              ? prev.filter(url => url !== photo.url)
                              : [...prev, photo.url]
                          );
                        }}
                      >
                        <div className="aspect-square">
                          <img
                            src={photo.url}
                            alt={photo.originalName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        {selectedPhotos.includes(photo.url) && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-30 flex items-center justify-center">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">✓</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Área de ações fixa na parte inferior */}
            <div className="flex-shrink-0 flex justify-between items-center pt-4 mt-4 border-t bg-white">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 font-medium">
                  {selectedPhotos.length} fotos selecionadas
                </span>
                {selectedPhotos.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedPhotos([])}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Limpar seleção
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setIsAddPhotosOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddPhotos} 
                  disabled={selectedPhotos.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Adicionar {selectedPhotos.length > 0 ? `${selectedPhotos.length} ` : ''}Fotos
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Photos Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={closeUploadModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Upload de Fotos para o Portfólio</DialogTitle>
            <DialogDescription>
              Selecione fotos do seu computador para adicionar ao portfólio
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col flex-1 min-h-0 space-y-4">
            {/* Área de Upload */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/10" : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
            >
              <div className="flex flex-col items-center">
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {isDragging ? "Solte as fotos aqui" : "Arraste fotos aqui ou clique para selecionar"}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Formatos aceitos: JPG, PNG, WebP, GIF
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("portfolio-file-upload")?.click()}
                >
                  Selecionar Fotos
                </Button>
                <input
                  id="portfolio-file-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            {/* Preview das Fotos Selecionadas */}
            {uploadFiles.length > 0 && (
              <div className="flex-1 overflow-y-auto">
                <h4 className="font-medium mb-3">
                  Fotos Selecionadas ({uploadFiles.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {uploadFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={uploadPreviews[index]}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeUploadFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="text-xs text-gray-600 mt-1 truncate" title={file.name}>
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Barra de Progresso */}
            {uploadStatus === "uploading" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processando fotos...</span>
                  <span>{uploadPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                {uploadFiles.length > 0 && (
                  <span>{uploadFiles.length} fotos selecionadas</span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={closeUploadModal}
                  disabled={isSubmittingPhotos}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleDirectUpload} 
                  disabled={uploadFiles.length === 0 || isSubmittingPhotos}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmittingPhotos ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {uploadFiles.length > 0 ? `${uploadFiles.length} ` : ''}Fotos
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}