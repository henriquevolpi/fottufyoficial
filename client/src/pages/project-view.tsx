import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getPhotoUrl, getImageUrl } from "@/lib/imageUtils";
import { WatermarkOverlay } from "@/components/WatermarkOverlay";
import { VirtualizedPhotoGrid } from "@/components/VirtualizedPhotoGrid";
import { useDeviceCapabilities } from "@/hooks/useVirtualization";
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
  Plus,
  Filter,
  FilterX,
  ArrowUp
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
  includedPhotos?: number; // Fotos incluídas no pacote (0 = ilimitado)
  additionalPhotoPrice?: number; // Preço por foto adicional (em centavos)
}

export default function ProjectView({ params }: { params?: { id: string } }) {
  const urlParams = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  // Use os parâmetros passados ou os da URL
  const projectId = params?.id || urlParams.id;
  const { toast } = useToast();
  const { user } = useAuth();
  const deviceCapabilities = useDeviceCapabilities();
  
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
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Otimização: Memoizar mapa de índices para evitar findIndex repetitivo
  const photoIndexMap = useMemo(() => {
    if (!project?.photos) return new Map();
    const map = new Map<string, number>();
    project.photos.forEach((photo, index) => {
      map.set(photo.id, index);
    });
    return map;
  }, [project?.photos]);

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
      // Forçar recarregamento dos comentários da foto para mostrar o novo comentário
      reloadPhotoComments(data.photoId);
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

  // Função para forçar recarregamento dos comentários (usado após criar novo comentário)
  const reloadPhotoComments = useCallback(async (photoId: string) => {
    try {
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
        console.error("Erro ao recarregar comentários da foto:", error);
      }
    }
  }, []);

  
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
      showWatermark: project.showWatermark,
      includedPhotos: project.includedPhotos || 0,
      additionalPhotoPrice: project.additionalPhotoPrice || 0
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
  
  // Otimização: Handlers memoizados para o VirtualizedPhotoGrid
  const handleCommentTextChange = useCallback((photoId: string, text: string) => {
    setCommentTexts(prev => ({ ...prev, [photoId]: text }));
  }, []);
  
  const handleSubmitComment = useCallback((photoId: string) => {
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
      photoIdForClear: photoId,
    });
  }, [commentTexts, toast, createCommentMutation]);
  
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

  // Função para fazer scroll suave para o topo
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Controlar visibilidade do botão de scroll to top
  useEffect(() => {
    const handleScroll = () => {
      // Mostrar o botão quando o usuário rolar mais de 300px para baixo
      setShowScrollToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const isSelectionLimitReached = useMemo(() => {
    if (!project?.includedPhotos || project.includedPhotos === 0) return false;
    return selectedPhotos.size >= project.includedPhotos;
  }, [project?.includedPhotos, selectedPhotos.size]);

  const additionalPhotosCount = useMemo(() => {
    if (!project?.includedPhotos || project.includedPhotos === 0) return 0;
    return Math.max(0, selectedPhotos.size - project.includedPhotos);
  }, [project?.includedPhotos, selectedPhotos.size]);

  const additionalPriceTotal = useMemo(() => {
    if (!project?.additionalPhotoPrice) return 0;
    return additionalPhotosCount * project.additionalPhotoPrice;
  }, [additionalPhotosCount, project?.additionalPhotoPrice]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
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
  
  // Pegar a primeira foto para usar como capa
  const coverPhoto = project.photos && project.photos.length > 0 ? project.photos[0] : null;
  const coverPhotoUrl = coverPhoto 
    ? (coverPhoto.url && !coverPhoto.url.includes('project-photos') 
        ? coverPhoto.url 
        : `https://cdn.fottufy.com/${coverPhoto.filename}`)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Floating Counter - Youze Style */}
      {!isFinalized && !finalizationSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl shadow-purple-500/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isSelectionLimitReached ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}`}>
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seleção</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedPhotos.size} <span className="text-slate-400 text-sm font-bold">/ {project?.includedPhotos || '∞'}</span>
                </p>
              </div>
            </div>
            
            {additionalPhotosCount > 0 && (
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Adicionais (+{additionalPhotosCount})</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(additionalPriceTotal)}</p>
              </div>
            )}

            <Button 
              onClick={() => setShowConfirmDialog(true)}
              disabled={selectedPhotos.size === 0 || isSubmitting}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-xs uppercase tracking-widest px-6 h-12 rounded-2xl shadow-xl shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalizar"}
            </Button>
          </div>
        </div>
      )}
      {/* Hero Section Premium - Experiência Imersiva */}
      {coverPhotoUrl && (
        <div className="relative h-[100svh] md:h-[95vh] overflow-hidden">
          {/* Background principal com efeito Ken Burns suave */}
          <div 
            className="absolute inset-0 bg-cover bg-center animate-[kenburns_20s_ease-in-out_infinite_alternate]"
            style={{
              backgroundImage: `url(${coverPhotoUrl})`,
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
                  Galeria Exclusiva
                </span>
              </div>
            </div>
            
            {/* Título principal com animação */}
            <h1 className="font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-tight uppercase drop-shadow-2xl animate-[fadeInUp_1s_ease-out_0.3s_both] leading-[0.9]">
              {project.nome}
            </h1>
            
            {/* Linha decorativa animada */}
            <div className="mt-6 mb-4 animate-[scaleX_1s_ease-out_0.6s_both]">
              <div className="w-24 sm:w-32 h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-full" />
            </div>
            
            {/* Nome do cliente */}
            <p className="text-white/80 text-lg sm:text-xl md:text-2xl font-light tracking-wide animate-[fadeInUp_1s_ease-out_0.5s_both]">
              {project.cliente}
            </p>
            
            {/* Badges de informação com glassmorphism */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-[fadeInUp_1s_ease-out_0.7s_both]">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg">
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-white text-sm font-medium">
                  {new Date(project.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg">
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-white text-sm font-medium">{project.fotos} fotos</span>
              </div>
            </div>
          </div>
          
          {/* Indicador de scroll animado - apenas mobile */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-[fadeIn_1s_ease-out_1.5s_both] md:bottom-10">
            <div className="flex flex-col items-center gap-2">
              <span className="text-white/60 text-xs uppercase tracking-widest font-medium">Ver fotos</span>
              <div className="w-6 h-10 border-2 border-white/30 rounded-full p-1 flex justify-center">
                <div className="w-1.5 h-3 bg-white/70 rounded-full animate-[scrollDown_2s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
          
          {/* Overlay de proteção inferior para transição suave */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent" />
        </div>
      )}
      
      {/* Header com Ações - Youze Style */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="w-full">
            
            {/* Seção de ações - responsiva com wrap */}
            <div className="w-full flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-3">
              {isFinalized ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 flex items-center rounded-full font-bold shadow-lg shadow-green-500/20">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Seleção finalizada
                  </Badge>
                  
                  {selectedPhotos.size > 0 && (
                    <Dialog open={showSelectedFilenamesDialog} onOpenChange={setShowSelectedFilenamesDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center flex-shrink-0 rounded-xl border-slate-200 hover:bg-slate-50 font-semibold text-xs sm:text-sm"
                        >
                          <FileText className="w-4 h-4 mr-1.5" />
                          Ver Fotos Selecionadas
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="font-black text-xl">Fotos Selecionadas</DialogTitle>
                          <DialogDescription>
                            Lista de arquivos selecionados pelo cliente neste projeto.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto">
                          <div className="space-y-2">
                            {project.photos
                              .filter(photo => selectedPhotos.has(photo.id))
                              .map(photo => (
                                <div key={photo.id} className="p-3 bg-slate-50 rounded-xl flex items-center">
                                  <FileText className="w-4 h-4 mr-2 text-purple-500" />
                                  <span className="text-sm font-medium text-slate-700">{photo.originalName || photo.filename}</span>
                                </div>
                            ))}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={() => setShowSelectedFilenamesDialog(false)}
                            className="rounded-xl bg-slate-900 hover:bg-slate-800"
                          >
                            Fechar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              ) : (
                <div className="w-full flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-3">
                  {/* Badge com contador - Youze Style */}
                  <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 flex items-center rounded-full font-bold shadow-lg shadow-purple-500/20 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                    <span className="whitespace-nowrap">{selectedPhotos.size} de {project.photos.length}</span>
                  </Badge>
                  
                  {/* Badge de fotos incluídas/adicionais */}
                  {project.includedPhotos && project.includedPhotos > 0 && (
                    <Badge className={`text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 flex items-center rounded-full font-bold flex-shrink-0 ${
                      selectedPhotos.size > project.includedPhotos
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/20'
                    }`}>
                      {selectedPhotos.size <= project.includedPhotos ? (
                        <span className="whitespace-nowrap">✓ {selectedPhotos.size}/{project.includedPhotos} incluídas</span>
                      ) : (
                        <span className="whitespace-nowrap">
                          +{selectedPhotos.size - project.includedPhotos} extra
                          {project.additionalPhotoPrice && project.additionalPhotoPrice > 0 && (
                            <span className="ml-1 hidden sm:inline">
                              (R$ {((selectedPhotos.size - project.includedPhotos) * project.additionalPhotoPrice / 100).toFixed(2)})
                            </span>
                          )}
                        </span>
                      )}
                    </Badge>
                  )}
                  
                  {/* Botão de filtro - Youze Style */}
                  {selectedPhotos.size > 0 && (
                    <Button
                      variant={showOnlySelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowOnlySelected(!showOnlySelected)}
                      className={`flex items-center flex-shrink-0 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                        showOnlySelected 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {showOnlySelected ? (
                        <>
                          <FilterX className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                          <span className="hidden sm:inline">Mostrar Todas</span>
                          <span className="sm:hidden">Todas</span>
                        </>
                      ) : (
                        <>
                          <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                          <span className="hidden sm:inline">Apenas Selecionadas</span>
                          <span className="sm:hidden">Selecionadas</span>
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* Botões principais - Youze Style */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      size="sm"
                      onClick={() => setShowConfirmDialog(true)}
                      className="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white font-bold text-xs sm:text-sm border-none shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all rounded-xl px-4 sm:px-5 py-2.5 flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                      <span className="hidden sm:inline">Finalizar Seleção</span>
                      <span className="sm:hidden">Finalizar</span>
                    </Button>
                    
                    {selectedPhotos.size > 0 && (
                      <Dialog open={showSelectedFilenamesDialog} onOpenChange={setShowSelectedFilenamesDialog}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center flex-shrink-0 rounded-xl border-slate-200 hover:bg-slate-50 font-semibold text-xs sm:text-sm"
                          >
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden sm:inline">Ver Selecionadas</span>
                            <span className="sm:hidden">Ver</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md rounded-2xl">
                          <DialogHeader>
                            <DialogTitle className="font-black text-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
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
                                  <div key={photo.id} className="p-3 bg-slate-50 rounded-xl flex items-center">
                                    <FileText className="w-4 h-4 mr-2 text-purple-500" />
                                    <span className="text-sm font-medium text-slate-700">{photo.originalName || photo.filename}</span>
                                  </div>
                              ))}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={() => setShowSelectedFilenamesDialog(false)}
                              className="rounded-xl bg-slate-900 hover:bg-slate-800"
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
      {/* Main content - Youze Style */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isFinalized && finalizationSuccess ? (
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6 sm:p-8 mb-8 text-center shadow-lg shadow-green-500/10">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-emerald-800 mb-2">Seleção finalizada!</h2>
            <p className="text-emerald-700 mb-6 font-medium">
              Suas {selectedPhotos.size} fotos selecionadas foram salvas com sucesso.
              O fotógrafo receberá uma notificação.
            </p>
            <Button 
              variant="outline" 
              className="rounded-xl font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              onClick={() => setLocation("/dashboard")}
            >
              Voltar para o Dashboard
            </Button>
          </div>
        ) : null}
        
        {/* Grid otimizado com virtualização */}
        <VirtualizedPhotoGrid
          photos={project.photos}
          selectedPhotos={selectedPhotos}
          isFinalized={isFinalized}
          showWatermark={project.showWatermark === true}
          showOnlySelected={showOnlySelected}
          commentTexts={commentTexts}
          photoComments={photoComments}
          expandedCommentPhoto={expandedCommentPhoto}
          isCommentMutationPending={createCommentMutation.isPending}
          onToggleSelection={togglePhotoSelection}
          onOpenModal={openImageModal}
          onToggleCommentSection={toggleCommentSection}
          onCommentTextChange={handleCommentTextChange}
          onSubmitComment={handleSubmitComment}
          photoIndexMap={photoIndexMap}
        />
      </main>
      {/* Confirmation Dialog - Youze Style */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl">Finalizar Seleção</DialogTitle>
            <DialogDescription className="text-slate-500">
              Tem certeza que deseja finalizar sua seleção de fotos?
              Após finalizar, você não poderá mais alterar as fotos selecionadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-purple-600">{selectedPhotos.size}</p>
              <p className="text-sm text-purple-500 font-medium">de {project.photos.length} fotos selecionadas</p>
            </div>
            
            {project.includedPhotos && project.includedPhotos > 0 && (
              <div className={`rounded-xl p-4 text-center ${
                selectedPhotos.size > project.includedPhotos 
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                {selectedPhotos.size <= project.includedPhotos ? (
                  <p className="text-sm text-green-700 font-medium">
                    ✓ {selectedPhotos.size} de {project.includedPhotos} fotos incluídas no pacote
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-amber-700 font-medium">
                      📸 {project.includedPhotos} fotos incluídas + {selectedPhotos.size - project.includedPhotos} adicionais
                    </p>
                    {project.additionalPhotoPrice && project.additionalPhotoPrice > 0 && (
                      <p className="text-lg font-bold text-amber-800 mt-1">
                        Valor adicional: R$ {((selectedPhotos.size - project.includedPhotos) * project.additionalPhotoPrice / 100).toFixed(2)}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
              className="rounded-xl border-slate-200"
            >
              Cancelar
            </Button>
            <Button 
              onClick={finalizeSelection}
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 font-bold shadow-lg shadow-purple-500/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Sim, finalizar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Lightbox Modal - Estilo personalizado igual ao portfolio público */}
      {imageModalOpen && project.photos[currentPhotoIndex] && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
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
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl shadow-2xl"
                style={{ maxWidth: '95vw', maxHeight: '95vh' }}
                loading="eager"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.retryCount) {
                    delete img.dataset.retryCount;
                  }
                }}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.retryCount) {
                    img.dataset.retryCount = '1';
                    const originalSrc = img.src;
                    if (originalSrc.includes('cdn.fottufy.com')) {
                      img.src = originalSrc.replace('cdn.fottufy.com', 'cdn2.fottufy.com');
                      return;
                    }
                  } else if (img.dataset.retryCount === '1') {
                    img.dataset.retryCount = '2';
                    img.src = '/placeholder.jpg';
                    return;
                  }
                  img.style.display = "none";
                  console.error("Imagem não pode ser carregada:", img.src);
                }}
                onContextMenu={e => e.preventDefault()}
              />
            </WatermarkOverlay>
            
            {/* Botão X - Youze Style */}
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-200 backdrop-blur-md shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Navegação - Youze Style */}
            {project.photos.length > 1 && (
              <>
                <button
                  onClick={goToPrevPhoto}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-200 backdrop-blur-md shadow-lg"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                
                <button
                  onClick={goToNextPhoto}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-200 backdrop-blur-md shadow-lg"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            
            {/* Botão de seleção - Youze Style */}
            {!isFinalized && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePhotoSelection(project.photos[currentPhotoIndex].id);
                }}
                className={`absolute bottom-4 right-4 px-4 py-2.5 rounded-xl flex items-center gap-2 text-white font-bold text-sm transition-all duration-200 backdrop-blur-md shadow-xl ${
                  selectedPhotos.has(project.photos[currentPhotoIndex].id)
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 shadow-green-500/30'
                    : 'bg-gradient-to-r from-purple-600 to-fuchsia-500 shadow-purple-500/30'
                }`}
              >
                {selectedPhotos.has(project.photos[currentPhotoIndex].id) ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Selecionado</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Selecionar</span>
                  </>
                )}
              </button>
            )}
            
            {/* Contador de fotos - Youze Style */}
            {project.photos.length > 1 && (
              <div className="absolute bottom-4 left-4 px-4 py-2 bg-white/20 rounded-xl text-white text-sm font-bold backdrop-blur-md shadow-lg">
                {currentPhotoIndex + 1} / {project.photos.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão scroll to top - Youze Style */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 md:hidden w-12 h-12 bg-gradient-to-br from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-purple-500/30 transition-all duration-200"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}