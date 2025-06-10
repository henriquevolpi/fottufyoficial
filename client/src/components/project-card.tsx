import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Archive, RefreshCw } from "lucide-react";
import { Project } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const { toast } = useToast();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  
  // Format date - handle both createdAt or data (compatibility)
  const dateValue = project.createdAt || (project as any).data;
  const formattedDate = new Date(dateValue).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Status badge color - handle both English and Portuguese statuses
  const getBadgeVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    
    // English statuses
    if (statusLower === 'pending' || statusLower === 'pendente') return 'yellow';
    if (statusLower === 'reviewed' || statusLower === 'finalizado' || statusLower === 'revisado') return 'green';
    if (statusLower === 'reopened' || statusLower === 'reaberto') return 'blue';
    if (statusLower === 'archived' || statusLower === 'arquivado') return 'gray';
    
    return 'secondary';
  };
  
  // Copy public link to clipboard
  const copyLinkToClipboard = () => {
    try {
      // Get the current hostname dynamically - usar a rota pública project-view
      const url = `${window.location.origin}/project-view/${project.id}`;
      console.log("Copiando link do cliente:", url);
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado",
        description: "Link público do projeto copiado para a área de transferência.",
      });
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      toast({
        title: "Erro ao copiar link",
        description: "Não foi possível copiar o link para a área de transferência.",
        variant: "destructive",
      });
    }
  };
  
  // Archive project
  const archiveProject = async () => {
    try {
      setIsArchiving(true);
      await apiRequest('PATCH', `/api/projects/${project.id}/archive`, {});
      toast({
        title: "Project archived",
        description: "Project has been archived successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive the project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };
  
  // Reopen project
  const reopenProject = async () => {
    try {
      setIsReopening(true);
      await apiRequest('PATCH', `/api/projects/${project.id}/reopen`, {});
      toast({
        title: "Project reopened",
        description: "Project has been reopened successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reopen the project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReopening(false);
    }
  };
  
  const selectedCount = project.selectedPhotos ? project.selectedPhotos.length : 0;
  const totalPhotos = project.photos ? project.photos.length : 0;

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-5 sm:px-6 flex justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{project.name || (project as any).nome}</h3>
          <p className="mt-1 text-sm text-gray-500">
            Created on {formattedDate}
          </p>
        </div>
        <Badge 
          variant={getBadgeVariant(project.status) as any} 
          className="capitalize"
        >
          {project.status}
        </Badge>
      </div>
      <CardContent className="px-4 py-0 pb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Client</dt>
            <dd className="mt-1 text-sm text-gray-900">{project.clientName || (project as any).cliente}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{project.clientEmail || (project as any).emailCliente}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Total Photos</dt>
            <dd className="mt-1 text-sm text-gray-900">{totalPhotos}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Selected</dt>
            <dd className="mt-1 text-sm text-gray-900">{selectedCount} / {totalPhotos}</dd>
          </div>
        </div>
      </CardContent>
      <div className="px-4 py-4 sm:px-6 flex justify-between border-t">
        <Button 
          variant="secondary"
          size="sm"
          className="text-primary-700 bg-primary-100 hover:bg-primary-200"
          onClick={copyLinkToClipboard}
        >
          <Copy className="h-4 w-4 mr-1" />
          Copy Link
        </Button>
        
        {project.status === 'revisado' || project.status === 'arquivado' ? (
          <Button 
            variant="secondary"
            size="sm"
            className="text-blue-700 bg-blue-100 hover:bg-blue-200"
            onClick={reopenProject}
            disabled={isReopening}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isReopening ? 'animate-spin' : ''}`} />
            Reopen
          </Button>
        ) : (
          <Button 
            variant="secondary"
            size="sm"
            className="text-gray-700 bg-gray-100 hover:bg-gray-200"
            onClick={archiveProject}
            disabled={isArchiving}
          >
            <Archive className="h-4 w-4 mr-1" />
            Archive
          </Button>
        )}
      </div>
    </Card>
  );
}
