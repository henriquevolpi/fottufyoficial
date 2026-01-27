import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import PhotoCard from "@/components/photo-card";
import { Project } from "@shared/schema";
import { Check, Edit, ArrowLeftCircle, FileText, MessageCircle, Eye, Loader2, ArrowUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CopyNamesButton } from "@/components/copy-names-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSelectedFilenamesDialog, setShowSelectedFilenamesDialog] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const { data: project, isLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${id}`],
  });

  // Comments query and mutations
  const { data: commentsData = [], isLoading: commentsLoading } = useQuery({
    queryKey: [`/api/projects/${id}/comments`],
    enabled: showCommentsModal && !!id,
  });

  const markCommentsAsViewedMutation = useMutation({
    mutationFn: async (commentIds: string[]) => {
      const response = await apiRequest("POST", "/api/comments/mark-viewed", { commentIds });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/comments`] });
      toast({
        title: "Comentários marcados como visualizados",
        description: "Os comentários foram atualizados com sucesso.",
      });
    },
  });

  // Initialize selected photos from project data if available
  useEffect(() => {
    if (project?.selectedPhotos && project.selectedPhotos.length > 0) {
      setSelectedPhotos(project.selectedPhotos);
      
      // If the project has status 'Completed', it's already finalized
      if (project.status === 'Completed') {
        setIsFinalized(true);
      }
    }
  }, [project]);

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

  const togglePhotoSelection = (photoId: string) => {
    if (isFinalized) return;

    if (selectedPhotos.includes(photoId)) {
      setSelectedPhotos(prev => prev.filter(id => id !== photoId));
    } else {
      setSelectedPhotos(prev => [...prev, photoId]);
    }
  };

  const handleFinalizeSelection = async () => {
    try {
      setIsSubmitting(true);
      await apiRequest("PATCH", `/api/projects/${id}/finalize`, {
        selectedPhotos
      });

      setIsFinalized(true);
      setFinalizeDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to finalize your selection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 animate-pulse"></div>
          <p className="text-lg text-white/70 font-medium">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
        <div className="text-center backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
          <h1 className="text-3xl font-black text-white">Projeto Não Encontrado</h1>
          <p className="mt-3 text-lg text-white/60">
            O projeto que você procura não existe ou foi removido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation bar with glassmorphism */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 w-fit text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all duration-300"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeftCircle className="h-5 w-5" />
            <span className="hidden sm:inline font-semibold">Voltar para Dashboard</span>
            <span className="sm:hidden font-semibold">Voltar</span>
          </Button>
          
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-400/30 text-white hover:from-purple-500/30 hover:to-pink-500/30 rounded-2xl font-bold flex-shrink-0 transition-all duration-300"
              onClick={() => setShowCommentsModal(true)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              <span>Comentários</span>
            </Button>
            
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 flex-shrink-0 bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 rounded-2xl font-semibold transition-all duration-300"
              onClick={() => setLocation(`/project/${id}/edit`)}
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Editar Galeria</span>
              <span className="sm:hidden">Editar</span>
            </Button>
          </div>
        </div>
        
        {/* Hero header with gradient */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-block mb-4">
            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-400/30 backdrop-blur-xl">
              Galeria de Fotos
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent leading-tight">
            {project.name}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-white/60 sm:mt-5 px-4">
            {isFinalized
              ? "Obrigado por fazer sua seleção."
              : "Selecione as fotos que você gostaria de manter clicando nelas."}
          </p>
          
          {/* Stats bar */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <div className="inline-flex items-center px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                <Check className="h-4 w-4 text-white" />
              </div>
              <span className="font-black text-xl">{selectedPhotos.length}</span>
              <span className="mx-2 text-white/50">de</span>
              <span className="font-black text-xl">{project.photos?.length || 0}</span>
              <span className="ml-2 text-white/70 hidden sm:inline">selecionadas</span>
            </div>
            
            {selectedPhotos.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center flex-shrink-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-blue-400/30 text-white hover:from-blue-500/30 hover:to-cyan-500/30 rounded-2xl font-semibold transition-all duration-300"
                onClick={() => setShowSelectedFilenamesDialog(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Ver fotos selecionadas</span>
                <span className="sm:hidden">Ver selecionadas</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Gallery grid with modern spacing */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {project.photos && project.photos.map((photo, index) => (
            <div 
              key={photo.id} 
              className="transform transition-all duration-300 hover:scale-[1.02]"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <PhotoCard
                id={photo.id}
                url={photo.url}
                filename={photo.filename}
                originalName={photo.originalName}
                isSelected={selectedPhotos.includes(photo.id)}
                onToggleSelect={togglePhotoSelection}
                disabled={isFinalized}
              />
            </div>
          ))}
        </div>
        
        {/* Floating finalize button with gradient */}
        {!isFinalized && (
          <div className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-40">
            <Button
              onClick={handleFinalizeSelection}
              disabled={selectedPhotos.length === 0 || isSubmitting}
              className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin" />
              ) : (
                <Check className="h-7 w-7 sm:h-8 sm:w-8" />
              )}
            </Button>
          </div>
        )}

        {/* Scroll to top button */}
        {showScrollToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-24 right-4 sm:bottom-32 sm:right-8 z-30 md:hidden w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-300"
            aria-label="Voltar ao topo"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* Finalized message modal */}
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 border border-white/20 backdrop-blur-xl rounded-3xl">
          <DialogHeader>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
              <Check className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black text-white text-center">Seleção Finalizada!</DialogTitle>
            <DialogDescription className="text-white/60 text-center">
              Obrigado por fazer sua seleção. Seu fotógrafo foi notificado e processará as fotos selecionadas. Você selecionou {selectedPhotos.length} de {project.photos?.length || 0} fotos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              onClick={() => setFinalizeDialogOpen(false)}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white font-bold rounded-2xl hover:opacity-90 transition-all duration-300"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Selected Photos Filenames Dialog */}
      <Dialog open={showSelectedFilenamesDialog} onOpenChange={setShowSelectedFilenamesDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 border border-white/20 backdrop-blur-xl rounded-3xl">
          <DialogHeader>
            <div className="inline-block mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-400/30">
                {selectedPhotos.length} selecionadas
              </span>
            </div>
            <DialogTitle className="text-2xl font-black text-white">Fotos Selecionadas</DialogTitle>
            <DialogDescription className="text-white/60">
              Lista de arquivos selecionados neste projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto my-4">
            <div className="space-y-2">
              {(Array.isArray(project.photos) && project.photos.length > 0) ? (
                project.photos
                  .filter(photo => selectedPhotos.includes(photo.id))
                  .map(photo => (
                    <div key={photo.id} className="p-3 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl flex items-center hover:bg-white/15 transition-all duration-300">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500/30 to-pink-500/30 flex items-center justify-center mr-3">
                        <FileText className="w-4 h-4 text-purple-300" />
                      </div>
                      <span className="text-sm font-medium text-white/80">{photo.originalName || photo.filename}</span>
                    </div>
                  ))
              ) : (
                <div className="p-4 text-center text-white/50">
                  Nenhuma foto selecionada.
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {selectedPhotos.length > 0 && (
              <CopyNamesButton
                selectedPhotos={project.photos.filter(photo => selectedPhotos.includes(photo.id))}
                size="default"
                variant="outline"
                className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
              />
            )}
            <Button 
              onClick={() => setShowSelectedFilenamesDialog(false)}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white font-bold rounded-xl hover:opacity-90 transition-all duration-300"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Comments Modal with Photo Thumbnails */}
      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[900px] mx-auto max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 border border-white/20 backdrop-blur-xl rounded-3xl">
          <DialogHeader>
            <div className="inline-block mb-2 w-fit">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-400/30">
                Comentários
              </span>
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              {project?.name}
            </DialogTitle>
            <DialogDescription className="text-white/60 text-sm mt-1">
              Comentários dos clientes organizados por foto com miniaturas para referência visual.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto my-4">
            {commentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-purple-400" />
                <span className="text-white/70">Carregando comentários...</span>
              </div>
            ) : commentsData.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-white/30" />
                </div>
                <p className="text-lg font-bold text-white/70 mb-2">Nenhum comentário ainda</p>
                <p className="text-white/50">Os comentários dos clientes aparecerão aqui quando forem enviados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  commentsData.reduce((acc: Record<string, any[]>, comment: any) => {
                    if (!acc[comment.photoId]) {
                      acc[comment.photoId] = [];
                    }
                    acc[comment.photoId].push(comment);
                    return acc;
                  }, {})
                ).map(([photoId, photoComments]: [string, any[]]) => (
                  <div key={photoId} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-start gap-4 mb-4">
                      {photoComments[0]?.photoUrl && (
                        <div className="flex-shrink-0">
                          <img
                            src={photoComments[0].photoUrl}
                            alt={photoComments[0].photoOriginalName || photoComments[0].photoFilename || 'Foto'}
                            className="w-20 h-20 object-cover rounded-xl border border-white/20"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <h4 className="font-bold text-base text-white mb-1">
                          {photoComments[0]?.photoOriginalName || photoComments[0]?.photoFilename || 'Foto sem nome'}
                        </h4>
                        <p className="text-sm text-white/50">
                          {photoComments.length} comentário{photoComments.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {photoComments.map((comment: any) => (
                        <div
                          key={comment.id}
                          className={`p-4 rounded-xl border ${
                            !comment.isViewed 
                              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30' 
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-white">
                                {comment.clientName || "Cliente"}
                              </span>
                              {!comment.isViewed && (
                                <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                                  Novo
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-white/40">
                              {new Date(comment.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-white/70 leading-relaxed">
                            {comment.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-6">
            <Button 
              onClick={() => setShowCommentsModal(false)} 
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white font-bold rounded-xl hover:opacity-90 transition-all duration-300"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
