import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Helper function to handle different URL formats for R2 storage
function getPhotoUrl(url: string): string {
  // If the URL already includes http/https, use it directly
  if (url.startsWith('http')) {
    return url;
  }
  
  // Check if the URL already has the old format (bucket.accountid.r2.dev)
  if (url.includes('.r2.dev/')) {
    return url;
  }
  
  // Use the new recommended format
  return `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${import.meta.env.VITE_R2_BUCKET_NAME}/${url}`;
}
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
  ChevronRight
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
  
  // Função para adaptar o formato do projeto (servidor ou localStorage)
  const adaptProject = (project: any): Project => {
    // Mapeie o formato do servidor (name, clientName) para o formato do frontend (nome, cliente)
    // ou vice-versa
    return {
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
        url: p.url,
        filename: p.filename,
        selected: project.selectedPhotos ? project.selectedPhotos.includes(p.id) : p.selected || false
      })) : [],
      finalizado: project.status === "reviewed" || project.finalizado
    };
  };

  // Carregar dados do projeto
  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        
        // Verificar se o ID é um número válido
        if (!projectId) {
          console.error('ID do projeto não fornecido');
          throw new Error('ID do projeto não fornecido');
        }
        
        // Não validamos o formato do ID, apenas verificamos se existe
        console.log('Buscando projeto com ID (sem validação de formato):', projectId);
        
        // Tenta buscar do backend primeiro com mais detalhes de debug
        try {
          // Melhorado para usar o ID original da URL, não apenas números
          console.log('Buscando projeto com ID original:', projectId);
          const response = await fetch(`/api/projects/${projectId}`);
          
          console.log('Status da resposta API:', response.status);
          
          if (response.ok) {
            const projectData = await response.json();
            console.log('Projeto carregado da API:', projectData);
            
            // Adicionar log detalhado para debug do projeto retornado
            console.log('Propriedades do projeto retornado:',
              Object.keys(projectData).map(key => `${key}: ${typeof projectData[key]} - ${
                Array.isArray(projectData[key]) 
                  ? `Array com ${projectData[key].length} itens` 
                  : typeof projectData[key] === 'object' && projectData[key] !== null
                    ? JSON.stringify(projectData[key]).substring(0, 100) + '...' 
                    : projectData[key]
              }`)
            );
            
            // Verificar se tem array de fotos
            if (projectData.photos) {
              console.log(`Projeto tem ${projectData.photos.length} fotos`);
              if (projectData.photos.length > 0) {
                console.log('Exemplo da primeira foto:', JSON.stringify(projectData.photos[0]));
              }
            } else {
              console.warn('Projeto não tem fotos ou array de fotos é null/undefined');
            }
            
            const adaptedProject = adaptProject(projectData);
            console.log('Projeto após adaptação:', adaptedProject);
            
            // Project view is always public for clients
            // Only log the access attempt but don't block it
            if (user && user.id !== adaptedProject.fotografoId && user.role !== 'admin') {
              console.log(`Usuário logado ${user.id} acessando projeto do fotógrafo ${adaptedProject.fotografoId} - permitido para visualização pública`);
            }
            
            setProject(adaptedProject);
            
            // Inicializar seleções se houver
            const preSelectedPhotos = new Set<string>();
            if (adaptedProject.photos) {
              adaptedProject.photos.forEach(photo => {
                if (photo.selected) {
                  preSelectedPhotos.add(photo.id);
                }
              });
            }
            
            setSelectedPhotos(preSelectedPhotos);
            setIsFinalized(!!adaptedProject.finalizado);
            
            // Atualizar o localStorage para manter consistência
            const storedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
            
            // Verificar se o projeto já existe no localStorage
            const existingIndex = storedProjects.findIndex((p: any) => p.id.toString() === projectId);
            
            if (existingIndex >= 0) {
              // Atualizar o projeto existente
              storedProjects[existingIndex] = adaptedProject;
              console.log('Projeto existente atualizado no localStorage');
            } else {
              // Adicionar o novo projeto
              storedProjects.push(adaptedProject);
              console.log('Novo projeto adicionado ao localStorage');
            }
            
            localStorage.setItem('projects', JSON.stringify(storedProjects));
            
            return;
          } else {
            const error = await response.json();
            console.error('Erro da API:', error);
          }
        } catch (apiError) {
          console.error('Erro ao buscar da API:', apiError);
          // Continuar para tentar buscar do localStorage
        }
        
        // Fallback para localStorage se a API falhar
        const storedProjects = localStorage.getItem('projects');
        if (!storedProjects) {
          console.log('Nenhum projeto encontrado no localStorage');
          throw new Error('Projeto não encontrado');
        }
        
        // Log para debug
        console.log('Projetos armazenados:', JSON.parse(storedProjects));
        
        let projects: Project[] = [];
        try {
          projects = JSON.parse(storedProjects);
        } catch (e) {
          console.error('Erro ao parsear projetos:', e);
          throw new Error('Erro ao ler dados dos projetos');
        }
        
        // Estratégias múltiplas para encontrar o projeto pelo ID
        console.log('Tentando diferentes estratégias para encontrar o projeto com ID:', projectId);
        console.log('Total de projetos no localStorage:', projects.length);
        
        // Log de todos os IDs para debug
        console.log('IDs disponíveis:', projects.map(p => `${p.id} (${typeof p.id})`));
        
        // Tentar várias estratégias para encontrar o projeto
        let foundProject = null;
        
        // Estratégia 1: Busca direta pelo ID como string
        foundProject = projects.find(p => p.id.toString() === projectId);
        if (foundProject) {
          console.log('Projeto encontrado pela estratégia 1 (ID como string)');
        }
        
        // Estratégia 2: Tentar converter o ID para número
        if (!foundProject && !isNaN(parseInt(projectId))) {
          const numericId = parseInt(projectId);
          foundProject = projects.find(p => p.id === numericId);
          if (foundProject) {
            console.log('Projeto encontrado pela estratégia 2 (ID como número)');
          }
        }
        
        // Estratégia 3: Busca por correspondência parcial
        if (!foundProject) {
          foundProject = projects.find(p => {
            const pid = p.id.toString();
            const searchId = projectId.toString();
            return pid.includes(searchId) || searchId.includes(pid);
          });
          if (foundProject) {
            console.log('Projeto encontrado pela estratégia 3 (correspondência parcial)');
          }
        }
        
        if (!foundProject) {
          console.error('Projeto não encontrado com ID:', projectId);
          throw new Error('Projeto não encontrado');
        }
        
        console.log('Projeto encontrado:', foundProject);
        
        // Verificar se o projeto tem a propriedade photos
        if (!foundProject.photos || !Array.isArray(foundProject.photos)) {
          console.error('Projeto sem fotos ou formato inválido');
          foundProject.photos = []; // Garantir que existe um array vazio se não houver fotos
        }
        
        // Project view is always public for clients, allow access regardless of user
        // Only log the access attempt but don't block it
        if (user && user.id !== foundProject.fotografoId && user.role !== 'admin') {
          console.log(`Usuário logado ${user.id} acessando projeto do fotógrafo ${foundProject.fotografoId} (localStorage) - permitido para visualização pública`);
        }
        
        setProject(foundProject);
        
        // Se o projeto já tiver seleções salvas, carregá-las
        const preSelectedPhotos = new Set<string>();
        foundProject.photos.forEach(photo => {
          if (photo.selected) {
            preSelectedPhotos.add(photo.id);
          }
        });
        
        setSelectedPhotos(preSelectedPhotos);
        setIsFinalized(!!foundProject.finalizado);
        
      } catch (error) {
        console.error('Erro ao carregar projeto:', error);
        toast({
          title: "Erro ao carregar projeto",
          description: "Não foi possível encontrar o projeto solicitado.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadProject();
  }, [projectId, toast, user]);
  
  // Alternar seleção de foto
  const togglePhotoSelection = (photoId: string) => {
    if (isFinalized) return; // Impedir seleção se o projeto estiver finalizado
    
    setSelectedPhotos(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(photoId)) {
        newSelected.delete(photoId);
      } else {
        newSelected.add(photoId);
      }
      return newSelected;
    });
  };
  
  // Abrir modal com a imagem em tamanho completo
  const openImageModal = (url: string, photoIndex: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Impedir que o clique propague para o Card (que faria a seleção da foto)
    
    // Get the photo from the current project
    const photo = project?.photos[photoIndex];
    if (photo) {
      // Format URL using our helper function
      setCurrentImageUrl(getPhotoUrl(photo.url));
    } else {
      // Fallback if photo is not found, using our helper function
      setCurrentImageUrl(getPhotoUrl(url));
    }
    
    setCurrentPhotoIndex(photoIndex);
    setImageModalOpen(true);
  };
  
  // Navegar para a próxima foto no modal
  const goToNextPhoto = () => {
    if (!project || project.photos.length === 0) return;
    
    const nextIndex = (currentPhotoIndex + 1) % project.photos.length;
    const nextPhoto = project.photos[nextIndex];
    
    // Format URL using our helper function
    setCurrentImageUrl(getPhotoUrl(nextPhoto.url));
    setCurrentPhotoIndex(nextIndex);
  };
  
  // Navegar para a foto anterior no modal
  const goToPrevPhoto = () => {
    if (!project || project.photos.length === 0) return;
    
    const prevIndex = (currentPhotoIndex - 1 + project.photos.length) % project.photos.length;
    const prevPhoto = project.photos[prevIndex];
    
    // Format URL using our helper function
    setCurrentImageUrl(getPhotoUrl(prevPhoto.url));
    setCurrentPhotoIndex(prevIndex);
  };
  
  // Salvar seleções atuais sem finalizar
  const saveSelections = async () => {
    if (!project) return;
    
    try {
      // Array para guardar IDs das fotos selecionadas
      const selectedIds = Array.from(selectedPhotos);
      
      // Tenta salvar via API primeiro - embora não tenhamos um endpoint específico para isso
      // No futuro, se implementarmos, poderia ser usado aqui
      
      // Usar localStorage como fallback para salvar seleções temporárias
      const storedProjects = localStorage.getItem('projects');
      if (!storedProjects) {
        throw new Error('Erro ao salvar seleção: projetos não encontrados');
      }
      
      const projects: Project[] = JSON.parse(storedProjects);
      const projectIndex = projects.findIndex(p => p.id === project.id);
      
      if (projectIndex === -1) {
        throw new Error('Erro ao salvar seleção: projeto não encontrado');
      }
      
      // Atualizar o projeto com as seleções atuais
      const updatedProject = { ...projects[projectIndex] };
      updatedProject.photos = updatedProject.photos.map(photo => ({
        ...photo,
        selected: selectedPhotos.has(photo.id)
      }));
      updatedProject.selecionadas = selectedPhotos.size;
      
      // Atualizar status se necessário
      if (updatedProject.status === "pendente" && selectedPhotos.size > 0) {
        updatedProject.status = "revisado";
      }
      
      // Salvar de volta no array de projetos
      projects[projectIndex] = updatedProject;
      localStorage.setItem('projects', JSON.stringify(projects));
      
      // Atualizar o projeto local
      setProject(updatedProject);
      
      toast({
        title: "Seleção salva",
        description: `${selectedPhotos.size} fotos selecionadas. Você ainda pode modificar sua seleção.`,
      });
      
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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="mr-4"
                onClick={() => window.history.back()}
              >
                <ArrowLeftCircle className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.nome}</h1>
                <p className="text-gray-600">Cliente: {project.cliente}</p>
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
                                  <span className="text-sm font-mono">{photo.filename}</span>
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
                      variant="outline" 
                      size="sm"
                      onClick={saveSelections}
                    >
                      Salvar
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => setShowConfirmDialog(true)}
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
                            <DialogTitle>Fotos Selecionadas</DialogTitle>
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
                                    <span className="text-sm font-mono">{photo.filename}</span>
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
              onClick={() => togglePhotoSelection(photo.id)}
            >
              <div className="relative h-64">
                {/* Debug info - will show in development only */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="absolute top-0 left-0 bg-black bg-opacity-70 text-white text-xs p-1 z-10 max-w-full overflow-hidden">
                    ID: {photo.id?.substring(0, 8)}...
                  </div>
                )}
                
                <div 
                  className="absolute inset-0 w-full h-full cursor-zoom-in group"
                  onClick={(e) => openImageModal(photo.url, index, e)}
                >
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 rounded-full p-3 opacity-0 group-hover:opacity-80 transition-opacity duration-200">
                    <Maximize className="h-6 w-6 text-white" />
                  </div>
                  <img
                    src={getPhotoUrl(photo.url)}
                    alt={photo.filename}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      if (!e.currentTarget) {
                        console.error('Error handler called but currentTarget is null');
                        return;
                      }
                      
                      console.error(`Error loading image: ${photo.id} from URL: ${photo.url}`);
                      console.log(`Attempted URL: ${getPhotoUrl(photo.url)}`);
                      
                      // Extract the base filename, regardless of the URL format
                      let filename = photo.url;
                      if (photo.url.includes('/')) {
                        filename = photo.url.split('/').pop() || '';
                      }
                      
                      try {
                        // Try with the standard R2 CloudFlare storage URL first
                        const cloudflareUrl = `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${import.meta.env.VITE_R2_BUCKET_NAME}/${filename}`;
                        console.log(`Trying CloudFlare URL: ${cloudflareUrl}`);
                        e.currentTarget.src = cloudflareUrl;
                        
                        // If the first fallback fails, try the R2.dev format
                        e.currentTarget.onerror = (e2) => {
                          if (!e.currentTarget) return;
                          
                          const r2DevUrl = `https://${import.meta.env.VITE_R2_BUCKET_NAME}.${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.dev/${filename}`;
                          console.log(`Trying R2.dev URL: ${r2DevUrl}`);
                          e.currentTarget.src = r2DevUrl;
                          
                          // Finally, use the placeholder if all else fails
                          e.currentTarget.onerror = (e3) => {
                            if (!e.currentTarget) return;
                            
                            console.log('All fallbacks failed, using placeholder');
                            e.currentTarget.src = "/placeholder.jpg";
                            e.currentTarget.onerror = null; // Prevent infinite loops
                          };
                        };
                      } catch (err) {
                        console.error('Error during fallback image loading:', err);
                        try {
                          if (e.currentTarget) {
                            e.currentTarget.src = "/placeholder.jpg";
                            e.currentTarget.onerror = null;
                          }
                        } catch (finalErr) {
                          console.error('Critical error setting placeholder:', finalErr);
                        }
                      }
                    }}
                    title={`ID: ${photo.id}\nURL: ${photo.url}\nClique para ampliar`}
                  />
                </div>
                
                {/* Selection indicator */}
                {selectedPhotos.has(photo.id) && (
                  <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                    <Check className="h-5 w-5" />
                  </div>
                )}
                
                {/* Filename */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-sm truncate">
                  {photo.filename}
                </div>
              </div>
              <CardContent className="p-3 text-center">
                <Button 
                  variant={selectedPhotos.has(photo.id) ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  disabled={isFinalized}
                >
                  {selectedPhotos.has(photo.id) ? (
                    <>
                      <Check className="mr-1 h-4 w-4" /> Selected
                    </>
                  ) : (
                    "Select Photo"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Selection</DialogTitle>
            <DialogDescription>
              Are you sure you want to finalize your photo selection?
              After finalizing, you won't be able to change the selected photos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="font-medium">
              You have selected {selectedPhotos.size} of {project.photos.length} available photos.
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={finalizeSelection}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                "Yes, finalize selection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para visualização da imagem em tamanho completo */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-screen-lg w-full p-1 bg-black/90 border-gray-800">
          <DialogTitle className="sr-only">Visualização de Imagem</DialogTitle>
          <DialogDescription className="sr-only">
            Visualize a foto em tamanho completo e navegue pela galeria do projeto
          </DialogDescription>
          {/* Botão de fechar */}
          <div className="absolute right-2 top-2 z-10">
            <button
              onClick={() => setImageModalOpen(false)}
              className="rounded-full bg-black/70 text-white p-2 hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Botão de navegação anterior */}
          {project.photos.length > 1 && (
            <button
              onClick={goToPrevPhoto}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 rounded-full bg-black/70 text-white p-2 hover:bg-black"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          
          {/* Botão de navegação próxima */}
          {project.photos.length > 1 && (
            <button
              onClick={goToNextPhoto}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full bg-black/70 text-white p-2 hover:bg-black"
              aria-label="Próxima foto"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          
          {/* Conteúdo do Modal - Estrutura Flexível */}
          <div className="flex flex-col items-center h-full pt-4">
            {/* Container da Imagem */}
            <div className="flex-1 w-full flex items-center justify-center max-h-[65vh] overflow-hidden mb-4">
              {currentImageUrl && (
                <img
                  src={currentImageUrl}
                  alt="Foto em tamanho completo"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    if (!e.currentTarget) {
                      console.error('Error handler called but currentTarget is null');
                      return;
                    }
                    
                    console.error(`Error loading modal image from URL: ${currentImageUrl}`);
                    
                    // Extract the base filename, regardless of the URL format
                    let filename = currentImageUrl;
                    if (currentImageUrl.includes('/')) {
                      filename = currentImageUrl.split('/').pop() || '';
                    }
                    
                    try {
                      // Try with the standard R2 CloudFlare storage URL first
                      const cloudflareUrl = `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${import.meta.env.VITE_R2_BUCKET_NAME}/${filename}`;
                      console.log(`Trying CloudFlare URL: ${cloudflareUrl}`);
                      e.currentTarget.src = cloudflareUrl;
                      
                      // If the first fallback fails, try the R2.dev format
                      e.currentTarget.onerror = (e2) => {
                        if (!e.currentTarget) return;
                        
                        const r2DevUrl = `https://${import.meta.env.VITE_R2_BUCKET_NAME}.${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.dev/${filename}`;
                        console.log(`Trying R2.dev URL: ${r2DevUrl}`);
                        e.currentTarget.src = r2DevUrl;
                        
                        // Finally, use the placeholder if all else fails
                        e.currentTarget.onerror = (e3) => {
                          if (!e.currentTarget) return;
                          
                          console.log('All fallbacks failed, using placeholder');
                          e.currentTarget.src = "/placeholder.jpg";
                          e.currentTarget.onerror = null; // Prevent infinite loops
                        };
                      };
                    } catch (err) {
                      console.error('Error during fallback image loading:', err);
                      try {
                        if (e.currentTarget) {
                          e.currentTarget.src = "/placeholder.jpg";
                          e.currentTarget.onerror = null;
                        }
                      } catch (finalErr) {
                        console.error('Critical error setting placeholder:', finalErr);
                      }
                    }
                  }}
                />
              )}
            </div>
            
            {/* Botão de seleção dentro do modal - Posicionado mais abaixo e longe da imagem */}
            {project.photos[currentPhotoIndex] && (
              <div className="w-full flex justify-center py-6">
                <Button 
                  variant={selectedPhotos.has(project.photos[currentPhotoIndex].id) ? "default" : "outline"}
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePhotoSelection(project.photos[currentPhotoIndex].id);
                  }}
                  disabled={isFinalized}
                  className={`px-8 py-6 text-lg font-medium rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    selectedPhotos.has(project.photos[currentPhotoIndex].id) 
                      ? "bg-primary hover:bg-primary/90 text-white ring-4 ring-primary/20" 
                      : "bg-white text-gray-800 hover:bg-gray-100 border-2 border-primary/80"
                  }`}
                >
                  {selectedPhotos.has(project.photos[currentPhotoIndex].id) ? (
                    <>
                      <Check className="mr-2 h-5 w-5" /> Selected
                    </>
                  ) : (
                    "Select Photo"
                  )}
                </Button>
              </div>
            )}
          </div>
          
          {/* Contador de fotos - Aprimorado com fundo para melhor visibilidade */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
            {currentPhotoIndex + 1} / {project.photos.length}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}