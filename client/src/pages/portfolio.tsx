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
import { Plus, Eye, Edit, Trash2, Share, Upload, Image, ExternalLink, Settings, GripVertical, X, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { compressMultiplePortfolioImages, calculateCompressionStats } from "@/lib/portfolioImageCompression";
import { uploadPortfolioPhotos, validatePortfolioFiles } from "@/lib/portfolioBatchUpload";

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
  const [isAboutMeOpen, setIsAboutMeOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [aboutMeData, setAboutMeData] = useState({
    aboutTitle: "",
    aboutDescription: "",
    aboutProfileImageUrl: "",
    aboutContact: "",
    aboutEmail: "",
    aboutPhone: "",
    aboutWebsite: "",
    aboutInstagram: "",
    aboutEnabled: false
  });
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
  
  // Estados para banner
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  
  // Estado para upload de foto de perfil
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);

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

  // Update About Me mutation
  const updateAboutMeMutation = useMutation({
    mutationFn: async ({ portfolioId, aboutData }: { portfolioId: number; aboutData: any }) => {
      const response = await fetch(`/api/portfolios/${portfolioId}/about`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(aboutData)
      });
      if (!response.ok) throw new Error('Failed to update about me');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      setIsAboutMeOpen(false);
      toast({ title: "Informações 'Sobre mim' atualizadas com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao atualizar informações", 
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

  const openAboutMeModal = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setSelectedPortfolioId(portfolio.id); // Necessário para upload da foto de perfil
    setAboutMeData({
      aboutTitle: portfolio.aboutTitle || "",
      aboutDescription: portfolio.aboutDescription || "",
      aboutProfileImageUrl: portfolio.aboutProfileImageUrl || "",
      aboutContact: portfolio.aboutContact || "",
      aboutEmail: portfolio.aboutEmail || "",
      aboutPhone: portfolio.aboutPhone || "",
      aboutWebsite: portfolio.aboutWebsite || "",
      aboutInstagram: portfolio.aboutInstagram || "",
      aboutEnabled: portfolio.aboutEnabled || false
    });
    setIsAboutMeOpen(true);
  };

  const handleSaveAboutMe = () => {
    if (!editingPortfolio) return;
    
    updateAboutMeMutation.mutate({
      portfolioId: editingPortfolio.id,
      aboutData: aboutMeData
    });
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

    // Validação específica para portfólios
    const validation = validatePortfolioFiles(uploadFiles);
    if (!validation.valid) {
      toast({ title: validation.error, variant: "destructive" });
      return;
    }

    try {
      setIsSubmittingPhotos(true);
      setUploadStatus("uploading");
      setUploadPercentage(10);

      // Comprimir imagens usando sistema específico para portfólios
      console.log(`[Portfolio] Iniciando compressão de ${uploadFiles.length} imagens`);
      
      const compressionResults = await compressMultiplePortfolioImages(
        uploadFiles,
        (processed: number, total: number) => {
          const compressionProgress = 10 + ((processed / total) * 40);
          setUploadPercentage(Math.round(compressionProgress));
        }
      );

      // Estatísticas de compressão
      const stats = calculateCompressionStats(compressionResults);
      console.log(`[Portfolio] Compressão concluída:`, {
        arquivos: stats.totalFiles,
        tamanhoOriginal: `${(stats.totalOriginalSize / 1024 / 1024).toFixed(2)} MB`,
        tamanhoFinal: `${(stats.totalCompressedSize / 1024 / 1024).toFixed(2)} MB`,
        reducaoMedia: `${stats.averageReduction.toFixed(1)}%`
      });

      setUploadPercentage(50);

      // Upload usando sistema específico de portfólios
      const compressedFiles = compressionResults.map(result => result.compressedFile);
      
      const uploadResult = await uploadPortfolioPhotos({
        portfolioId: selectedPortfolioId,
        files: compressedFiles,
        onProgress: (uploaded: number, total: number) => {
          const uploadProgress = 50 + ((uploaded / total) * 40);
          setUploadPercentage(Math.round(uploadProgress));
        },
        onError: (error: string) => {
          console.error('[Portfolio] Erro durante upload:', error);
          toast({ title: error, variant: "destructive" });
        }
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Falha no upload');
      }

      console.log(`[Portfolio] Upload result:`, uploadResult);
      
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
        description: `${uploadResult.photos?.length || compressionResults.length} fotos adicionadas ao portfólio com qualidade superior` 
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

  // Banner functions
  const openBannerModal = (portfolioId: number) => {
    setSelectedPortfolioId(portfolioId);
    setBannerFile(null);
    setBannerPreview(null);
    setIsUploadingBanner(false);
    setIsBannerModalOpen(true);
  };

  const closeBannerModal = () => {
    if (!isUploadingBanner) {
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }
      setBannerFile(null);
      setBannerPreview(null);
      setIsBannerModalOpen(false);
    }
  };

  const handleBannerFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive"
      });
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleBannerUpload = async () => {
    if (!bannerFile || !selectedPortfolioId) return;

    setIsUploadingBanner(true);

    try {
      const formData = new FormData();
      formData.append('banner', bannerFile);

      const response = await fetch(`/api/portfolios/${selectedPortfolioId}/banner`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Falha no upload do banner');
      }

      const result = await response.json();

      // Atualizar dados
      await queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      await queryClient.refetchQueries({ queryKey: ['/api/portfolios'] });

      closeBannerModal();
      
      toast({ 
        title: "Banner atualizado!", 
        description: "O banner do portfólio foi atualizado com sucesso" 
      });

    } catch (error: any) {
      console.error("Erro no upload do banner:", error);
      toast({
        title: "Erro no upload",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Profile image upload function
  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPortfolioId) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingProfileImage(true);

    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await fetch(`/api/portfolios/${selectedPortfolioId}/about/profile-image`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Falha no upload da foto de perfil');
      }

      const result = await response.json();

      // Atualizar o estado local
      setAboutMeData(prev => ({ 
        ...prev, 
        aboutProfileImageUrl: result.profileImageUrl 
      }));

      toast({ 
        title: "Foto de perfil atualizada!", 
        description: "A foto foi enviada com sucesso" 
      });

    } catch (error: any) {
      console.error("Erro no upload da foto de perfil:", error);
      toast({
        title: "Erro no upload",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsUploadingProfileImage(false);
      // Limpar o input
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header moderno estilo Apple */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h1 className="text-4xl tracking-tight text-gray-900 font-semibold">Portfólios</h1>
              <p className="text-gray-600 font-light">
                Organize suas melhores fotos em coleções elegantes
              </p>
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 rounded-full px-6 py-3 font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl">
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
        </div>
      </div>
      {/* Conteúdo principal */}
      <div className="container mx-auto px-6 py-8">
        {portfolios.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <Image className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-light text-gray-900 mb-3">
                Comece sua coleção
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Crie seu primeiro portfólio para organizar e compartilhar suas melhores fotos de forma elegante
              </p>
              <Button 
                onClick={() => setIsCreateOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 rounded-full px-8 py-3 font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Plus className="mr-2 h-5 w-5" />
                Criar Primeiro Portfólio
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {portfolios.map((portfolio: Portfolio) => (
              <div key={portfolio.id} className="group">
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-sm hover:shadow-2xl border border-gray-200/50 overflow-hidden transition-all duration-300 transform hover:-translate-y-2">
                  {/* Imagem do card */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    {portfolio.photos.length > 0 ? (
                      <img
                        src={portfolio.photos[0].photoUrl}
                        alt={portfolio.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center">
                          <Image className="h-8 w-8 text-gray-500" />
                        </div>
                      </div>
                    )}
                    
                    {/* Overlay gradiente */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Badge de status */}
                    <div className="absolute top-4 right-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md ${
                        portfolio.isPublic 
                          ? 'bg-green-500/90 text-white' 
                          : 'bg-gray-600/90 text-white'
                      }`}>
                        {portfolio.isPublic ? "Público" : "Privado"}
                      </div>
                    </div>
                  </div>
                  
                  {/* Conteúdo do card */}
                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-light text-gray-900 mb-2 tracking-tight">{portfolio.name}</h3>
                        {portfolio.description && (
                          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                            {portfolio.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 border-t border-gray-100 pt-4">
                        <span className="font-medium">{portfolio.photos.length} fotos</span>
                        <span>{new Date(portfolio.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      
                      {/* Botões de ação modernos */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {portfolio.isPublic && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/portfolio/${portfolio.slug}`, '_blank')}
                            className="h-8 px-3 text-xs font-medium hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Ver
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(portfolio)}
                          className="h-8 px-3 text-xs font-medium hover:bg-gray-50 transition-colors"
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Editar
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUploadModal(portfolio.id)}
                          className="h-8 px-3 text-xs font-medium hover:bg-purple-50 hover:text-purple-700 transition-colors"
                        >
                          <Upload className="mr-1 h-3 w-3" />
                          Upload
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAboutMeModal(portfolio)}
                          className="h-8 px-3 text-xs font-medium hover:bg-green-50 hover:text-green-700 transition-colors"
                        >
                          <User className="mr-1 h-3 w-3" />
                          Sobre mim
                        </Button>
                        
                        {portfolio.isPublic && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyPublicLink(portfolio.slug)}
                            className="h-8 px-3 text-xs font-medium hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <Share className="mr-1 h-3 w-3" />
                            Link
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
      {/* Banner Upload Modal */}
      <Dialog open={isBannerModalOpen} onOpenChange={closeBannerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Banner do Portfólio</DialogTitle>
            <DialogDescription>
              Selecione uma imagem para ser o banner da página pública do seu portfólio
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Área de Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="flex flex-col items-center">
                <Image className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-4">
                  Arraste uma imagem aqui ou clique para selecionar
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("banner-file-upload")?.click()}
                >
                  Selecionar Banner
                </Button>
                <input
                  id="banner-file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerFileSelect}
                />
              </div>
            </div>

            {/* Preview do Banner */}
            {bannerPreview && (
              <div className="space-y-3">
                <h4 className="font-medium">Preview do Banner</h4>
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={bannerPreview}
                    alt="Preview do banner"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-gray-600">
                  {bannerFile?.name}
                </p>
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-between space-x-2">
              <Button 
                variant="outline" 
                onClick={closeBannerModal}
                disabled={isUploadingBanner}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleBannerUpload} 
                disabled={!bannerFile || isUploadingBanner}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUploadingBanner ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Atualizar Banner
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* About Me Modal */}
      <Dialog open={isAboutMeOpen} onOpenChange={setIsAboutMeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar "Sobre mim"</DialogTitle>
            <DialogDescription>
              Configure as informações que aparecerão na aba "Sobre mim" do seu portfólio público.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Habilitar Sobre mim */}
            <div className="flex items-center space-x-2">
              <Switch 
                id="about-enabled"
                checked={aboutMeData.aboutEnabled}
                onCheckedChange={(checked) => setAboutMeData(prev => ({ ...prev, aboutEnabled: checked }))}
              />
              <Label htmlFor="about-enabled">Habilitar seção "Sobre mim"</Label>
            </div>
            
            {aboutMeData.aboutEnabled && (
              <>
                {/* Título */}
                <div>
                  <Label htmlFor="about-title">Título</Label>
                  <Input
                    id="about-title"
                    placeholder="Ex: Sobre João Silva"
                    value={aboutMeData.aboutTitle}
                    onChange={(e) => setAboutMeData(prev => ({ ...prev, aboutTitle: e.target.value }))}
                  />
                </div>
                
                {/* Descrição */}
                <div>
                  <Label htmlFor="about-description">Descrição</Label>
                  <Textarea
                    id="about-description"
                    placeholder="Conte um pouco sobre você, sua experiência e seu trabalho..."
                    rows={4}
                    value={aboutMeData.aboutDescription}
                    onChange={(e) => setAboutMeData(prev => ({ ...prev, aboutDescription: e.target.value }))}
                  />
                </div>
                
                {/* Foto de perfil - Upload ou URL */}
                <div className="space-y-4">
                  <Label>Foto de perfil</Label>
                  
                  {/* Preview da foto atual */}
                  {aboutMeData.aboutProfileImageUrl && (
                    <div className="flex items-center gap-4">
                      <img 
                        src={aboutMeData.aboutProfileImageUrl} 
                        alt="Foto de perfil atual"
                        className="w-20 h-20 object-cover rounded-full border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAboutMeData(prev => ({ ...prev, aboutProfileImageUrl: '' }))}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  )}
                  
                  {/* Upload de arquivo */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('profile-image-upload')?.click()}
                        disabled={isUploadingProfileImage}
                      >
                        {isUploadingProfileImage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Enviar foto
                          </>
                        )}
                      </Button>
                      <span className="text-sm text-gray-500 self-center">ou</span>
                    </div>
                    <Input
                      id="about-profile-image-url"
                      placeholder="https://exemplo.com/foto-perfil.jpg"
                      value={aboutMeData.aboutProfileImageUrl}
                      onChange={(e) => setAboutMeData(prev => ({ ...prev, aboutProfileImageUrl: e.target.value }))}
                    />
                    <input
                      id="profile-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
                
                {/* Informações de contato */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="about-contact">Contato</Label>
                    <Input
                      id="about-contact"
                      placeholder="Como entrar em contato"
                      value={aboutMeData.aboutContact}
                      onChange={(e) => setAboutMeData(prev => ({ ...prev, aboutContact: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="about-email">E-mail</Label>
                    <Input
                      id="about-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={aboutMeData.aboutEmail}
                      onChange={(e) => setAboutMeData(prev => ({ ...prev, aboutEmail: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="about-phone">Telefone</Label>
                    <Input
                      id="about-phone"
                      placeholder="(11) 99999-9999"
                      value={aboutMeData.aboutPhone}
                      onChange={(e) => setAboutMeData(prev => ({ ...prev, aboutPhone: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="about-website">Website</Label>
                    <Input
                      id="about-website"
                      placeholder="https://seusite.com"
                      value={aboutMeData.aboutWebsite}
                      onChange={(e) => setAboutMeData(prev => ({ ...prev, aboutWebsite: e.target.value }))}
                    />
                  </div>
                </div>
                
                {/* Instagram */}
                <div>
                  <Label htmlFor="about-instagram">Instagram</Label>
                  <Input
                    id="about-instagram"
                    placeholder="@seuinstagram"
                    value={aboutMeData.aboutInstagram}
                    onChange={(e) => setAboutMeData(prev => ({ ...prev, aboutInstagram: e.target.value }))}
                  />
                </div>
              </>
            )}
            
            {/* Botões */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsAboutMeOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveAboutMe}
                disabled={updateAboutMeMutation.isPending}
              >
                {updateAboutMeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}