import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Check, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  ArrowLeftCircle 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [finalizationSuccess, setFinalizationSuccess] = useState(false);
  
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
        
        // Tenta buscar do backend primeiro
        try {
          // Melhorado para usar o ID original da URL, não apenas números
          console.log('Buscando projeto com ID original:', projectId);
          const response = await fetch(`/api/projects/${projectId}`);
          
          if (response.ok) {
            const projectData = await response.json();
            console.log('Projeto carregado da API:', projectData);
            const adaptedProject = adaptProject(projectData);
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
        
        // Aqui fazemos a busca pelo ID original (string ou número)
        const foundProject = projects.find(p => {
          // Comparamos o ID diretamente ou como string
          return p.id.toString() === projectId || p.id === parseInt(projectId);
        });
        
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
  }, [projectId, toast]);
  
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
      const projectIndex = projects.findIndex(p => p.id === project.id);
      
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
                <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Seleção finalizada
                </Badge>
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
          {project.photos.map((photo) => (
            <Card
              key={photo.id}
              className={`overflow-hidden group cursor-pointer transition ${
                isFinalized ? 'opacity-80' : 'hover:shadow-md'
              } ${selectedPhotos.has(photo.id) ? 'ring-2 ring-primary' : ''}`}
              onClick={() => togglePhotoSelection(photo.id)}
            >
              <div className="relative h-64">
                <div 
                  className="absolute inset-0 bg-cover bg-center" 
                  style={{ backgroundImage: `url(${photo.url})` }}
                />
                
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
                      <Check className="mr-1 h-4 w-4" /> Selecionada
                    </>
                  ) : (
                    "Selecionar Foto"
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
            <DialogTitle>Finalizar seleção</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja finalizar sua seleção de fotos? 
              Após finalizar, não será possível alterar as fotos selecionadas.
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
    </div>
  );
}