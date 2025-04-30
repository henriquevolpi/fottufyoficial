import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import PhotoCard from "@/components/photo-card";
import { Project } from "@shared/schema";
import { Check, Edit, ArrowLeftCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${id}`],
  });

  // Initialize selected photos from project data if available
  useEffect(() => {
    if (project?.selectedPhotos && project.selectedPhotos.length > 0) {
      setSelectedPhotos(project.selectedPhotos);
      
      // If the project has status 'reviewed', it's already finalized
      if (project.status === 'reviewed') {
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
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setLocation(`/project/${id}/edit`)}
          >
            <Edit className="h-4 w-4" />
            Editar Galeria
          </Button>
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
    </div>
  );
}
