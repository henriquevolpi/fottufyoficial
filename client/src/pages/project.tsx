import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import PhotoCard from "@/components/photo-card";
import { Project } from "@shared/schema";
import { Check, Edit, ArrowLeftCircle, FileText, MessageCircle, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Project Not Found</h1>
          <p className="mt-3 text-lg text-gray-600">
            The project you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back and Edit buttons */}
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeftCircle className="h-5 w-5" />
            Voltar para Dashboard
          </Button>
          
          <div className="flex items-center gap-2">
            {/* Comments button */}
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              onClick={() => setShowCommentsModal(true)}
            >
              Comentários
              <MessageCircle className="h-3 w-3 ml-1" />
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setLocation(`/project/${id}/edit`)}
            >
              <Edit className="h-4 w-4" />
              Editar Galeria
            </Button>
          </div>
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {project.name}
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            {isFinalized
              ? "Obrigado por fazer sua seleção."
              : "Selecione as fotos que você gostaria de manter clicando nelas."}
          </p>
          <div className="mt-4 flex items-center justify-center space-x-4">
            <div className="inline-flex items-center px-4 py-2 rounded-md bg-gray-100 text-gray-700">
              <span className="font-medium">{selectedPhotos.length}</span>
              <span className="mx-1">de</span>
              <span className="font-medium">{project.photos?.length || 0}</span>
              <span className="ml-1">selecionadas</span>
            </div>
            
            {selectedPhotos.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={() => setShowSelectedFilenamesDialog(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Ver fotos selecionadas
              </Button>
            )}

          </div>
        </div>
        
        {/* Gallery grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {project.photos && project.photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              id={photo.id}
              url={photo.url}
              filename={photo.filename}
              originalName={photo.originalName}
              isSelected={selectedPhotos.includes(photo.id)}
              onToggleSelect={togglePhotoSelection}
              disabled={isFinalized}
            />
          ))}
        </div>
        
        {/* Floating finalize button - only show if not finalized */}
        {!isFinalized && (
          <div className="fixed bottom-8 right-8">
            <Button
              onClick={handleFinalizeSelection}
              disabled={selectedPhotos.length === 0 || isSubmitting}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Check className="h-8 w-8" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Finalized message modal */}
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selection Finalized</DialogTitle>
            <DialogDescription>
              Thank you for making your selection. Your photographer has been notified and will process the selected photos. You've selected {selectedPhotos.length} out of {project.photos?.length || 0} photos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setFinalizeDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Selected Photos Filenames Dialog */}
      <Dialog open={showSelectedFilenamesDialog} onOpenChange={setShowSelectedFilenamesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fotos Selecionadas</DialogTitle>
            <DialogDescription>
              Lista de arquivos selecionados neste projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              {(Array.isArray(project.photos) && project.photos.length > 0) ? (
                project.photos
                  .filter(photo => selectedPhotos.includes(photo.id))
                  .map(photo => (
                    <div key={photo.id} className="p-2 bg-gray-50 rounded-sm flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-sm font-mono">{photo.originalName || photo.filename}</span>
                    </div>
                  ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  Nenhuma foto selecionada.
                </div>
              )}
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

      {/* Enhanced Comments Modal with Photo Thumbnails */}
      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[900px] mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Comentários do Projeto - {project?.name}</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Comentários dos clientes organizados por foto com miniaturas para referência visual.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto my-4">
            {commentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando comentários...</span>
              </div>
            ) : commentsData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum comentário ainda</p>
                <p>Os comentários dos clientes aparecerão aqui quando forem enviados.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Group comments by photo */}
                {Object.entries(
                  commentsData.reduce((acc: Record<string, any[]>, comment: any) => {
                    if (!acc[comment.photoId]) {
                      acc[comment.photoId] = [];
                    }
                    acc[comment.photoId].push(comment);
                    return acc;
                  }, {})
                ).map(([photoId, photoComments]: [string, any[]]) => (
                  <div key={photoId} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Photo thumbnail */}
                      {photoComments[0]?.photoUrl && (
                        <div className="flex-shrink-0">
                          <img
                            src={photoComments[0].photoUrl}
                            alt={photoComments[0].photoOriginalName || photoComments[0].photoFilename || 'Foto'}
                            className="w-20 h-20 object-cover rounded border"
                          />
                        </div>
                      )}
                      
                      {/* Photo info and actions */}
                      <div className="flex-1">
                        <h4 className="font-medium text-base text-gray-900 mb-1">
                          {photoComments[0]?.photoOriginalName || photoComments[0]?.photoFilename || 'Foto sem nome'}
                        </h4>
                        <p className="text-sm text-gray-500 mb-2">
                          {photoComments.length} comentário{photoComments.length !== 1 ? 's' : ''}
                        </p>
                        
                        {/* Mark as viewed button - only show if there are unviewed comments */}
                        {photoComments.some((c: any) => !c.isViewed) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              const unviewedIds = photoComments
                                .filter((c: any) => !c.isViewed)
                                .map((c: any) => c.id);
                              if (unviewedIds.length > 0) {
                                markCommentsAsViewedMutation.mutate(unviewedIds);
                              }
                            }}
                            disabled={markCommentsAsViewedMutation.isPending}
                          >
                            {markCommentsAsViewedMutation.isPending ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Marcando...
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Marcar como visto
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Comments list */}
                    <div className="space-y-3">
                      {photoComments.map((comment: any) => (
                        <div
                          key={comment.id}
                          className={`p-4 rounded-lg border ${
                            !comment.isViewed 
                              ? 'bg-blue-50 border-blue-200 shadow-sm' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-900">
                                {comment.clientName || "Cliente"}
                              </span>
                              {!comment.isViewed && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  Novo
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
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
            <Button onClick={() => setShowCommentsModal(false)} className="w-full sm:w-auto">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
