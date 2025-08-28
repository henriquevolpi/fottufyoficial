import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getPhotoUrl, getImageUrl } from "@/lib/imageUtils";
import { WatermarkOverlay } from "@/components/WatermarkOverlay";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PhotoComment, InsertPhotoComment } from "@shared/schema";
import { 
  Check, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  ArrowLeftCircle,
  ShieldAlert,
  FileText,
  List,
  X,
  Maximize,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Plus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Interface para fotos
interface Photo {
  id: string;
  url: string;
  filename: string;
  originalName?: string; // Nome original do arquivo
  selected: boolean;
}

// Interface para o projeto
interface Project {
  id: number;
  nome: string;
  cliente: string;
  emailCliente: string;
  data: string;
  status: string;
  fotos: number;
  selecionadas: number;
  fotografoId: number;
  photos: Photo[];
  finalizado?: boolean;
  showWatermark?: boolean; // Controle da marca d'água frontend
}

export default function ProjectView({ params }: { params?: { id: string } }) {
  const urlParams = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  // Use os parâmetros passados ou os da URL
  const projectId = params?.id || urlParams.id;
  const { toast } = useToast();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [finalizationSuccess, setFinalizationSuccess] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showSelectedFilenamesDialog, setShowSelectedFilenamesDialog] = useState(false);
  
  // Estados para o modal de visualização de imagem
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  
  // Estados para comentários
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [photoComments, setPhotoComments] = useState<Record<string, any[]>>({});
  const [expandedCommentPhoto, setExpandedCommentPhoto] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Carrega comentários apenas quando necessário (não todos de uma vez)
  // useEffect removido para melhor performance - comentários são carregados sob demanda

  // Função para alternar visualização dos comentários
  const toggleCommentSection = useCallback((photoId: string) => {
    if (expandedCommentPhoto === photoId) {
      setExpandedCommentPhoto(null);
    } else {
      setExpandedCommentPhoto(photoId);
      // Carrega comentários quando expande a seção (lazy loading)
      loadPhotoComments(photoId);
    }
  }, [expandedCommentPhoto]);

  // Mutation para criar comentário
  const createCommentMutation = useMutation({
    mutationFn: async (commentData: InsertPhotoComment & { photoIdForClear: string }) => {
      const { photoIdForClear, ...actualCommentData } = commentData;
      const response = await apiRequest("POST", "/api/photo-comments", actualCommentData);
      return { result: await response.json(), photoIdForClear, photoId: actualCommentData.photoId };
    },
    onSuccess: (data) => {
      toast({
        title: "Comentário enviado!",
        description: "Seu comentário foi enviado com sucesso para o fotógrafo.",
      });
      // Limpar o campo de comentário da foto específica
      setCommentTexts(prev => ({ ...prev, [data.photoIdForClear]: "" }));
      // Recarregar comentários da foto
      loadPhotoComments(data.photoId);
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar comentário",
        description: "Não foi possível enviar seu comentário. Tente novamente.",
        variant: "destructive",
      });
      console.error("Erro ao enviar comentário:", error);
    },
  });

  // Função para carregar comentários de uma foto específica com timeout
  const loadPhotoComments = useCallback(async (photoId: string) => {
    try {
      // Verificar se já foi carregado para evitar requests duplicados
      if (photoComments[photoId]) {
        return;
      }
      
      // AbortController para timeout de comentarios
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`/api/photos/${photoId}/comments`, {
        signal: controller.signal,
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const comments = await response.json();
        setPhotoComments(prev => ({
          ...prev,
          [photoId]: comments
        }));
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("Erro ao carregar comentários da foto:", error);
      }
    }
  }, [photoComments]);

  // Função para enviar comentário
  const handleSubmitComment = (photoId: string) => {
    const commentText = commentTexts[photoId];
    if (!commentText?.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite seu comentário.",
        variant: "destructive",
      });
      return;
    }

    createCommentMutation.mutate({
      photoId,
      clientName: "Cliente",
      comment: commentText.trim(),
      photoIdForClear: photoId, // Para saber qual campo limpar
    });
  };
  
  // Função para adaptar o formato do projeto (servidor ou localStorage)
  const adaptProject = (project: any): Project => {
    // Log para depuração
    console.log('Adaptando projeto:', project.id, 'com', project.photos?.length || 0, 'fotos');
    console.log('[PROJECT-VIEW] showWatermark do projeto:', project.showWatermark);
    
    // Helpers para garantir URLs corretas
    const ensureValidImageUrl = (url: string): string => {
      // Log de cada URL para depuração
      console.log('Verificando URL:', url);
      
      if (!url) return '/placeholder.jpg';
      
      // Se já for uma URL completa, retorne-a
      if (url.startsWith('http')) return url;
      
      // Se for um URL do R2 sem o protocolo
      if (url.includes('.r2.cloudflarestorage.com')) {
        return `https://${url}`;
      }
      
      // Se for apenas um nome de arquivo, construa a URL completa
      const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
      const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
      
      if (accountId && bucketName) {
        return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${url}`;
      }
      
      // Fallback para o que foi fornecido
      return url;
    };
    
    // Mapeie o formato do servidor (name, clientName) para o formato do frontend (nome, cliente)
    const result = {
      id: project.id,
      nome: project.name || project.nome,
      cliente: project.clientName || project.cliente,
      emailCliente: project.clientEmail || project.emailCliente,
      data: project.createdAt || project.data,
      status: project.status,
      fotos: project.photos ? project.photos.length : project.fotos,
      selecionadas: project.selectedPhotos ? project.selectedPhotos.length : project.selecionadas,
      fotografoId: project.photographerId || project.fotografoId,
      photos: project.photos ? project.photos.map((p: any) => ({
        id: p.id,
        url: ensureValidImageUrl(p.url),
        filename: p.filename || 'photo.jpg',
        originalName: p.originalName || p.filename || 'photo.jpg',
        selected: p.selected !== undefined ? p.selected : (project.selectedPhotos ? project.selectedPhotos.includes(p.id) : false)
      })) : [],
      finalizado: project.status === "Completed" || project.status === "finalizado" || project.finalizado,
      showWatermark: project.showWatermark
    };
    
    console.log('🔍 WATERMARK DEBUG - Projeto adaptado:', {
      originalShowWatermark: project.showWatermark,
      adaptedShowWatermark: result.showWatermark
    });
    
    return result;
  };

  // Função para carregar dados do projeto - Definida fora do useEffect para poder ser reutilizada
  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      
      // Verificar se o ID é válido
      if (!projectId) {
        console.error('ID do projeto não fornecido');
        throw new Error('ID do projeto não fornecido');
      }
      
      console.log('Buscando projeto com ID:', projectId);
      
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Criar novo AbortController para timeout e cancelamento
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 30000); // 30 segundos de timeout
      
      try {
        // Fazer fetch diretamente da API com cache busting e timeout
        const response = await fetch(`/api/projects/${projectId}`, {
          credentials: 'include', // envia cookies para autenticação
          signal: abortControllerRef.current.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        clearTimeout(timeoutId);
      
      console.log('Status da resposta API:', response.status);
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar projeto: ${response.status} ${response.statusText}`);
      }
      
      const projectData = await response.json();
      console.log('Projeto carregado da API:', projectData);
      console.log('🔍 WATERMARK DEBUG - Valor showWatermark da API:', projectData.showWatermark);
      
      // Log detalhado para debug
      if (projectData.photos) {
        console.log(`Projeto tem ${projectData.photos.length} fotos`);
        if (projectData.photos.length > 0) {
          console.log('Primeira foto:', JSON.stringify(projectData.photos[0]));
        }
      } else {
        console.warn('Projeto sem fotos ou array de fotos é null/undefined');
      }
      
      // Adapter para manter compatibilidade com o resto do código
      const adaptedProject = adaptProject(projectData);
      console.log('Projeto adaptado:', adaptedProject);
      
      // Verificar acesso - apenas log, view é pública
      if (user && user.id !== adaptedProject.fotografoId && user.role !== 'admin') {
        console.log(`Usuário ${user.id} acessando projeto do fotógrafo ${adaptedProject.fotografoId} - permitido para visualização pública`);
      }
      
      // Atualizar state com dados do projeto
      setProject(adaptedProject);
      
      // Inicializar seleções de forma mais eficiente (evitar travamento em projetos grandes)
      const preSelectedPhotos = new Set<string>();
      if (adaptedProject.photos && adaptedProject.photos.length > 0) {
        // Para projetos grandes, usar requestIdleCallback para não travar a UI
        if (adaptedProject.photos.length > 50) {
          // Processar em lotes pequenos para não bloquear a thread principal
          const processPhotosInBatches = (photos: any[], startIndex = 0) => {
            const batchSize = 20;
            const endIndex = Math.min(startIndex + batchSize, photos.length);
            
            for (let i = startIndex; i < endIndex; i++) {
              if (photos[i].selected) {
                preSelectedPhotos.add(photos[i].id);
              }
            }
            
            if (endIndex < photos.length) {
              // Usar setTimeout para dar uma pausa à thread principal
              setTimeout(() => processPhotosInBatches(photos, endIndex), 0);
            } else {
              // Processamento concluído, atualizar state
              setSelectedPhotos(new Set(preSelectedPhotos));
            }
          };
          
          processPhotosInBatches(adaptedProject.photos);
        } else {
          // Para projetos pequenos, processar normalmente
          adaptedProject.photos.forEach(photo => {
            if (photo.selected) {
              preSelectedPhotos.add(photo.id);
            }
          });
          setSelectedPhotos(preSelectedPhotos);
        }
      } else {
        setSelectedPhotos(preSelectedPhotos);
      }
      
      // selectedPhotos já foi definido acima baseado no tamanho do projeto
      setIsFinalized(!!adaptedProject.finalizado);
      
        // Remover este projeto do localStorage para evitar usar dados desatualizados
        try {
          const storedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
          const filteredProjects = storedProjects.filter((p: any) => p.id.toString() !== projectId.toString());
          localStorage.setItem('projects', JSON.stringify(filteredProjects));
          console.log('Removido projeto do localStorage para garantir dados atualizados');
        } catch (storageError) {
          console.error('Erro ao limpar localStorage:', storageError);
        }
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      
      // Error handling melhorado
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Requisição cancelada ou timeout');
          toast({
            title: "Tempo limite excedido",
            description: "A conexão está lenta. Tente novamente.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao carregar projeto",
            description: "Não foi possível encontrar o projeto solicitado. Verifique se o link está correto.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro ao carregar projeto",
          description: "Não foi possível encontrar o projeto solicitado. Verifique se o link está correto.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);
  
  // Carregar dados do projeto ao montar o componente
  useEffect(() => {
    loadProject();
  }, [loadProject]);
  
  // Cleanup completo: cancelar requisições e limpar memória ao desmontar
  useEffect(() => {
    return () => {
      // Cancelar requisições pendentes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Cancelar auto-save pendente
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Limpar URLs de objetos e blobs para evitar memory leaks
      if (currentImageUrl && currentImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentImageUrl);
      }
      
      // Sugerir garbage collection em dispositivos móveis
      if (typeof window !== 'undefined' && 'gc' in window && typeof window.gc === 'function') {
        try {
          window.gc();
        } catch (e) {
          // Silently ignore if gc is not available
        }
      }
    };
  }, [currentImageUrl]);
  
  // Referência para o timer de debounce do auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Função para salvar automaticamente as seleções com debounce
  const autoSaveSelections = useCallback(async (newSelectedPhotos: Set<string>) => {
    if (!project) return;
    
    try {
      const selectedIds = Array.from(newSelectedPhotos);
      
      console.log(`Auto-salvando seleção para projeto ${projectId} com ${selectedIds.length} fotos`);
      
      const response = await fetch(`/api/v2/photos/select`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          projectId: project.id,
          photoIds: selectedIds 
        }),
      });
      
      if (!response.ok) {
        console.error('Erro ao auto-salvar seleção:', response.status);
      } else {
        console.log('Seleção auto-salva com sucesso');
      }
    } catch (error) {
      console.error('Erro ao auto-salvar seleções:', error);
    }
  }, [project, projectId]);

  // Alternar seleção de foto com auto-save automático
  const togglePhotoSelection = useCallback((photoId: string) => {
    // Verificação dupla para garantir que projetos finalizados não possam ser editados
    const isProjectFinalized = isFinalized || 
                              project?.status === "finalizado" || 
                              project?.status === "Completed" || 
                              project?.finalizado === true;
    
    if (isProjectFinalized) {
      return; // Impedir seleção se o projeto estiver finalizado
    }
    
    setSelectedPhotos(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(photoId)) {
        newSelected.delete(photoId);
      } else {
        newSelected.add(photoId);
      }
      
      // Cancelar auto-save anterior se houver
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Agendar auto-save com delay de 1 segundo
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveSelections(newSelected);
      }, 1000);
      
      return newSelected;
    });
  }, [isFinalized, autoSaveSelections]);
  
  // Abrir modal com a imagem em tamanho completo (com otimização de memória)
  const openImageModal = useCallback((url: string, photoIndex: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Impedir que o clique propague para o Card (que faria a seleção da foto)
    
    // Get the photo from the current project
    const photo = project?.photos[photoIndex];
    if (photo) {
      // Use the photo's url directly
      setCurrentImageUrl(photo.url);
    } else {
      // Fallback if photo is not found
      setCurrentImageUrl(url);
    }
    
    setCurrentPhotoIndex(photoIndex);
    setImageModalOpen(true);
  }, [project?.photos]);
  
  // Navegar para a próxima foto no modal com cleanup de memória
  const goToNextPhoto = useCallback(() => {
    if (!project || project.photos.length === 0) return;
    
    // Limpar URL anterior se for blob
    if (currentImageUrl && currentImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentImageUrl);
    }
    
    const nextIndex = (currentPhotoIndex + 1) % project.photos.length;
    const nextPhoto = project.photos[nextIndex];
    
    // Just store the URL directly - getPhotoUrl will be applied when rendered
    setCurrentImageUrl(nextPhoto.url);
    setCurrentPhotoIndex(nextIndex);
  }, [project, currentPhotoIndex, currentImageUrl]);
  
  // Navegar para a foto anterior no modal com cleanup de memória
  const goToPrevPhoto = useCallback(() => {
    if (!project || project.photos.length === 0) return;
    
    // Limpar URL anterior se for blob
    if (currentImageUrl && currentImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentImageUrl);
    }
    
    const prevIndex = (currentPhotoIndex - 1 + project.photos.length) % project.photos.length;
    const prevPhoto = project.photos[prevIndex];
    
    // Just store the URL directly - getPhotoUrl will be applied when rendered
    setCurrentImageUrl(prevPhoto.url);
    setCurrentPhotoIndex(prevIndex);
  }, [project, currentPhotoIndex, currentImageUrl]);
  
  // Salvar seleções atuais sem finalizar
  const saveSelections = async () => {
    if (!project) return;
    
    try {
      // Array para guardar IDs das fotos selecionadas
      const selectedIds = Array.from(selectedPhotos);
      
      // Salvar via API
      console.log(`Salvando seleção temporária para projeto ${projectId} com ${selectedIds.length} fotos`);
      
      const response = await fetch(`/api/v2/photos/select`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          projectId: project.id,
          photoIds: selectedIds 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Erro na resposta da API:', response.status, errorData);
        throw new Error(`Erro ao salvar seleção: ${response.status} ${response.statusText}`);
      }
      
      // Atualizar o projeto local
      const updatedProject = { ...project };
      updatedProject.photos = updatedProject.photos.map(photo => ({
        ...photo,
        selected: selectedPhotos.has(photo.id)
      }));
      updatedProject.selecionadas = selectedPhotos.size;
      
      // Atualizar status se necessário
      if (updatedProject.status === "pendente" && selectedPhotos.size > 0) {
        updatedProject.status = "revisado";
      }
      
      setProject(updatedProject);
      
      toast({
        title: "Seleção salva",
        description: `${selectedPhotos.size} fotos selecionadas. Você ainda pode modificar sua seleção.`,
      });
      
      // Recarregar o projeto para garantir dados atualizados
      setTimeout(() => {
        loadProject();
      }, 500);
      
    } catch (error) {
      console.error('Erro ao salvar seleções:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um problema ao salvar suas seleções.",
        variant: "destructive",
      });
    }
  };
  
  // Finalizar seleção
  const finalizeSelection = async () => {
    if (!project) return;
    
    try {
      setIsSubmitting(true);
      
      // Array para guardar IDs das fotos selecionadas
      const selectedIds = Array.from(selectedPhotos);
      
      // Tenta finalizar via API primeiro
      try {
        // Usa o mesmo ID usado para buscar o projeto
        console.log(`Finalizando seleção para projeto ${projectId} com ${selectedIds.length} fotos`);
        
        const response = await fetch(`/api/projects/${projectId}/finalize`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ selectedPhotos: selectedIds }),
        });
        
        if (response.ok) {
          console.log('Seleção finalizada com sucesso via API');
          
          // Simular uma pequena demora para melhorar UX
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Atualizar a UI
          setIsFinalized(true);
          setFinalizationSuccess(true);
          return;
        } else {
          const errorData = await response.json();
          console.error('Erro ao finalizar via API:', errorData);
          // Continuar para tentar usar localStorage como fallback
        }
      } catch (apiError) {
        console.error('Erro ao finalizar via API:', apiError);
        // Continuar para tentar usar localStorage como fallback
      }
      
      // Fallback para localStorage
      console.log('Usando localStorage como fallback para finalização');
      
      // Obter projetos existentes
      const storedProjects = localStorage.getItem('projects');
      if (!storedProjects) {
        throw new Error('Erro ao finalizar: projetos não encontrados');
      }
      
      const projects: Project[] = JSON.parse(storedProjects);
      
      // Tentar encontrar o projeto de várias formas
      let projectIndex = projects.findIndex(p => p.id === project.id);
      
      // Se não encontrar pelo id como número, tentar como string
      if (projectIndex === -1) {
        projectIndex = projects.findIndex(p => p.id.toString() === project.id.toString());
      }
      
      // Se ainda não encontrou, verificar com o ID da URL
      if (projectIndex === -1 && projectId) {
        projectIndex = projects.findIndex(p => p.id.toString() === projectId);
      }
      
      console.log('Projeto encontrado no localStorage no índice:', projectIndex);
      
      if (projectIndex === -1) {
        throw new Error('Erro ao finalizar: projeto não encontrado');
      }
      
      // Atualizar o projeto com as seleções finais
      const updatedProject = { ...projects[projectIndex] };
      updatedProject.photos = updatedProject.photos.map(photo => ({
        ...photo,
        selected: selectedPhotos.has(photo.id)
      }));
      updatedProject.selecionadas = selectedPhotos.size;
      updatedProject.status = "finalizado";
      updatedProject.finalizado = true;
      
      // Simular uma pequena demora para melhorar UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Salvar de volta no array de projetos
      projects[projectIndex] = updatedProject;
      localStorage.setItem('projects', JSON.stringify(projects));
      
      // Atualizar o projeto local
      setProject(updatedProject);
      setIsFinalized(true);
      setFinalizationSuccess(true);
      
    } catch (error) {
      console.error('Erro ao finalizar seleção:', error);
      toast({
        title: "Erro ao finalizar",
        description: "Ocorreu um problema ao finalizar sua seleção.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-gray-600">Carregando galeria...</p>
      </div>
    );
  }
  
  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white shadow-lg rounded-lg">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">
            Você não tem permissão para visualizar este projeto, pois ele pertence a outro fotógrafo.
          </p>
          <Button onClick={() => setLocation("/dashboard")}>
            Voltar para o Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold mb-2">Projeto não encontrado</h1>
          <p className="text-gray-600 mb-6">
            O projeto que você está tentando acessar não existe ou foi removido.
          </p>
          <Button onClick={() => setLocation("/dashboard")}>
            Voltar para o Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
        <header className="bg-gradient-to-r from-blue-50 via-white to-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <div>
                <h1 className="font-extrabold text-[39px] bg-gradient-to-r from-blue-800 to-blue-300 bg-clip-text text-transparent">
                  {project.nome}
                </h1>
                <p className="text-gray-600 text-[15px]">Cliente: {project.cliente}</p>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center">
              {isFinalized ? (
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Seleção finalizada
                  </Badge>
                  
                  {selectedPhotos.size > 0 && (
                    <Dialog open={showSelectedFilenamesDialog} onOpenChange={setShowSelectedFilenamesDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Ver Fotos Selecionadas
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Fotos Selecionadas</DialogTitle>
                          <DialogDescription>
                            Lista de arquivos selecionados pelo cliente neste projeto.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto">
                          <div className="space-y-2">
                            {project.photos
                              .filter(photo => selectedPhotos.has(photo.id))
                              .map(photo => (
                                <div key={photo.id} className="p-2 bg-gray-50 rounded-sm flex items-center">
                                  <FileText className="w-4 h-4 mr-2 text-gray-500" />
                                  <span className="text-sm font-mono">{photo.originalName || photo.filename}</span>
                                </div>
                            ))}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={() => setShowSelectedFilenamesDialog(false)}
                          >
                            Fechar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              ) : (
                <div className="space-x-2 flex items-center">
                  <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {selectedPhotos.size} de {project.photos.length} fotos selecionadas
                  </Badge>
                  <div className="space-x-2">
                    <Button 
                      size="sm"
                      onClick={() => setShowConfirmDialog(true)}
                      className="bg-gradient-to-r from-pink-700 via-pink-500 to-fuchsia-400 text-white font-semibold border-none shadow hover:brightness-110 transition-colors"
                    >
                      Finalizar Seleção
                    </Button>
                    
                    {selectedPhotos.size > 0 && (
                      <Dialog open={showSelectedFilenamesDialog} onOpenChange={setShowSelectedFilenamesDialog}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Ver Selecionadas
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle
                              className="font-extrabold text-[27px] bg-gradient-to-r from-pink-600 via-pink-400 to-pink-300 bg-clip-text text-transparent"
                            >
                              Fotos Selecionadas
                            </DialogTitle>
                            <DialogDescription>
                              Lista de arquivos selecionados neste projeto.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="max-h-[60vh] overflow-y-auto">
                            <div className="space-y-2">
                              {project.photos
                                .filter(photo => selectedPhotos.has(photo.id))
                                .map(photo => (
                                  <div key={photo.id} className="p-2 bg-gray-50 rounded-sm flex items-center">
                                    <FileText className="w-4 h-4 mr-2 text-gray-500" />
                                    <span className="text-sm font-mono">{photo.originalName || photo.filename}</span>
                                  </div>
                              ))}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={() => setShowSelectedFilenamesDialog(false)}
                            >
                              Fechar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isFinalized && finalizationSuccess ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Seleção finalizada com sucesso!</h2>
            <p className="text-green-700 mb-4">
              Suas {selectedPhotos.size} fotos selecionadas foram salvas com sucesso.
              O fotógrafo receberá uma notificação com sua seleção.
            </p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => setLocation("/dashboard")}
            >
              Voltar para o Dashboard
            </Button>
          </div>
        ) : null}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {project.photos.map((photo, index) => (
            <Card
              key={photo.id}
              className={`overflow-hidden group cursor-pointer transition ${
                isFinalized ? 'opacity-80' : 'hover:shadow-md'
              } ${selectedPhotos.has(photo.id) ? 'ring-2 ring-primary' : ''}`}
              onClick={() => {
                const isProjectFinalized = isFinalized || 
                                          project?.status === "finalizado" || 
                                          project?.status === "Completed" || 
                                          project?.finalizado === true;
                if (!isProjectFinalized) {
                  togglePhotoSelection(photo.id);
                }
              }}
            >
              <div className="relative h-64">
                {/* Debug info - will show in development only */}
                {/* Removed ID display */}
                
                <WatermarkOverlay 
                  enabled={project.showWatermark === true} 
                  className="absolute inset-0 w-full h-full cursor-zoom-in group"
                >
                  <div 
                    className="w-full h-full"
                    onClick={(e) => openImageModal(photo.url, index, e)}
                  >
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 rounded-full p-3 opacity-0 group-hover:opacity-80 transition-opacity duration-200 z-20">
                      <Maximize className="h-6 w-6 text-white" />
                    </div>
                    <img
                      src={photo.url && !photo.url.includes('project-photos') ? photo.url : `https://cdn.fottufy.com/${photo.filename}`}
                      alt="Photo"
                      className="w-full h-full object-cover ml-[0px] mr-[0px] pl-[2px] pr-[2px] mt-[0px] mb-[0px] pt-[0px] pb-[0px]"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.jpg';
                      }}
                      onContextMenu={e => e.preventDefault()}
                      title="Clique para ampliar"
                    />
                  </div>
                </WatermarkOverlay>
                
                {/* Selection indicator */}
                {selectedPhotos.has(photo.id) && (
                  <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                    <Check className="h-5 w-5" />
                  </div>
                )}
                
                {/* Filename - mostrar nome original se disponível */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-sm truncate">
                  {photo.originalName || photo.filename}
                </div>
              </div>
              <CardContent className="p-3 space-y-3">
                <div className="text-center">
                  <Button
                    variant={selectedPhotos.has(photo.id) ? "default" : "outline"}
                    size="sm"
                    className={
                      `w-full transition-colors` +
                      (selectedPhotos.has(photo.id)
                        ? " bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 text-white font-semibold border-none shadow"
                        : "")
                    }
                    disabled={isFinalized || project?.status === "finalizado" || project?.status === "Completed" || project?.finalizado === true}
                  >
                    {selectedPhotos.has(photo.id) ? (
                      <>
                        <Check className="mr-1 h-4 w-4" /> Selecionado
                      </>
                    ) : (
                      "Selecionar"
                    )}
                  </Button>
                </div>

                {/* Comment Button */}
                <div className="border-t pt-3" onClick={(e) => e.stopPropagation()}>
                  {selectedPhotos.has(photo.id) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCommentSection(photo.id);
                      }}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {photoComments[photo.id] && photoComments[photo.id].length > 0 
                        ? `Comentários (${photoComments[photo.id].length})`
                        : "Comentar"
                      }
                    </Button>
                  ) : (
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-gray-400 cursor-not-allowed"
                        disabled
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Selecione a foto para comentar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Expanded Comment Section - Only for selected photos */}
                {expandedCommentPhoto === photo.id && selectedPhotos.has(photo.id) && (
                  <div className="border-t space-y-2 text-[15px] text-left pt-3 mt-2" onClick={(e) => e.stopPropagation()}>
                    {/* Comment Text Area */}
                    <div>
                      <Textarea
                        placeholder="Digite seu comentário sobre esta foto..."
                        value={commentTexts[photo.id] || ""}
                        onChange={(e) => setCommentTexts(prev => ({ 
                          ...prev, 
                          [photo.id]: e.target.value 
                        }))}
                        className="text-xs min-h-[60px] resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Submit Comment Button */}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full text-xs"
                      onClick={() => handleSubmitComment(photo.id)}
                      disabled={createCommentMutation.isPending || !commentTexts[photo.id]?.trim()}
                    >
                      {createCommentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar Comentário"
                      )}
                    </Button>

                    {/* Existing Comments Display */}
                    {photoComments[photo.id] && photoComments[photo.id].length > 0 && (
                      <div className="border-t mt-3 pt-3 space-y-2">
                        <div className="text-xs font-medium text-gray-600">
                          Comentários anteriores ({photoComments[photo.id].length}):
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {photoComments[photo.id].map((comment, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-lg p-2 text-[12px] font-light">
                              <div className="flex justify-end mb-1">
                                <span className="text-gray-400 text-xs">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-gray-600 text-xs leading-relaxed">
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
          ))}
        </div>
      </main>
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Seleção</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja finalizar sua seleção de fotos?
              Após finalizar, você não poderá mais alterar as fotos selecionadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="font-medium">
              Você selecionou {selectedPhotos.size} de {project.photos.length} fotos disponíveis.
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={finalizeSelection}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                "Sim, finalizar seleção"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Lightbox Modal - Estilo personalizado igual ao portfolio público */}
      {imageModalOpen && project.photos[currentPhotoIndex] && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            {/* Imagem com watermark */}
            <WatermarkOverlay 
              enabled={project.showWatermark === true} 
              className="relative"
            >
              <img
                src={
                  project.photos[currentPhotoIndex].url && 
                  !project.photos[currentPhotoIndex].url.includes('project-photos') 
                    ? project.photos[currentPhotoIndex].url 
                    : `https://cdn.fottufy.com/${project.photos[currentPhotoIndex].filename}`
                }
                alt="Foto do projeto"
                className="max-w-full max-h-full w-auto h-auto object-contain"
                style={{ maxWidth: '95vw', maxHeight: '95vh' }}
                loading="eager"
                onLoad={(e) => {
                  // Otimização: liberar recursos após carregamento
                  const img = e.currentTarget;
                  if (img.dataset.retryCount) {
                    delete img.dataset.retryCount;
                  }
                }}
                onError={(e) => {
                  // Error handling melhorado com múltiplos fallbacks
                  const img = e.currentTarget;
                  if (!img.dataset.retryCount) {
                    img.dataset.retryCount = '1';
                    // Primeira tentativa: usar CDN alternativo
                    const originalSrc = img.src;
                    if (originalSrc.includes('cdn.fottufy.com')) {
                      img.src = originalSrc.replace('cdn.fottufy.com', 'cdn2.fottufy.com');
                      return;
                    }
                  } else if (img.dataset.retryCount === '1') {
                    img.dataset.retryCount = '2';
                    // Segunda tentativa: usar placeholder
                    img.src = '/placeholder.jpg';
                    return;
                  }
                  // Última tentativa: usar data URL simples
                  // Última tentativa: esconder imagem problemática
                  img.style.display = "none";
                  console.error("Imagem não pode ser carregada:", img.src);
                }}
                onContextMenu={e => e.preventDefault()}
              />
            </WatermarkOverlay>
            
            {/* Botão X dentro da foto - canto superior direito */}
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/10 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all duration-200 backdrop-blur-sm"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Navegação - apenas se houver mais de uma foto */}
            {project.photos.length > 1 && (
              <>
                {/* Seta esquerda */}
                <button
                  onClick={goToPrevPhoto}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/10 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all duration-200 backdrop-blur-sm"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                
                {/* Seta direita */}
                <button
                  onClick={goToNextPhoto}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/10 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all duration-200 backdrop-blur-sm"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            
            {/* Botão de seleção - canto inferior direito */}
            {!isFinalized && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePhotoSelection(project.photos[currentPhotoIndex].id);
                }}
                className={`absolute bottom-4 right-4 px-4 py-2 rounded-lg flex items-center gap-2 text-white transition-all duration-200 backdrop-blur-sm shadow-lg ${
                  selectedPhotos.has(project.photos[currentPhotoIndex].id)
                    ? 'bg-green-600/80 hover:bg-green-700/80'
                    : 'bg-blue-800/70 hover:bg-blue-900/80'
                }`}
              >
                {selectedPhotos.has(project.photos[currentPhotoIndex].id) ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="hidden sm:inline">Selecionado</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Selecionar</span>
                  </>
                )}
              </button>
            )}
            
            {/* Contador de fotos - canto inferior esquerdo */}
            {project.photos.length > 1 && (
              <div className="absolute bottom-4 left-4 px-3 py-2 bg-black/10 rounded-lg text-white text-sm backdrop-blur-sm">
                {currentPhotoIndex + 1} de {project.photos.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}