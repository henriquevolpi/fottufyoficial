import React, { useEffect, useState, useRef, useCallback } from "react";
import PromotionalBanner from "@/components/PromotionalBanner";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { 
  BarChart, 
  Camera, 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  PlusCircle, 
  Search, 
  Filter, 
  ArrowUpRight,
  Loader2,
  X,
  Link as LinkIcon,
  RotateCcw,
  CreditCard,
  Settings,
  Key,
  HelpCircle,
  Shield,
  ShieldOff,
  MessageSquare,
  MessageCircle,
  Eye,
  Check,
  Image as ImageIcon
} from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { CopyNamesButton } from "@/components/copy-names-button";
import { compressMultipleImages } from "@/lib/imageCompression";
import { PhotoComment } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Dados fictícios para projetos
const PROJETOS_EXEMPLO = [
  {
    id: 1,
    nome: "Casamento Rodrigo e Ana",
    cliente: "Rodrigo Silva",
    emailCliente: "rodrigo.silva@example.com",
    data: "2023-04-15",
    status: "pendente",
    fotos: 3,
    selecionadas: 0,
    fotografoId: 1,
    photos: [
      {
        id: "photo-1",
        url: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "casal-1.jpg",
        selected: false
      },
      {
        id: "photo-2",
        url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "casal-2.jpg",
        selected: false
      },
      {
        id: "photo-3",
        url: "https://images.unsplash.com/photo-1546032996-6dfacbacbf3f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "casal-3.jpg",
        selected: false
      }
    ]
  },
  {
    id: 2,
    nome: "Aniversário de 15 anos - Maria",
    cliente: "Família Souza",
    emailCliente: "souza.familia@example.com",
    data: "2023-03-22",
    status: "revisado",
    fotos: 3,
    selecionadas: 2,
    fotografoId: 1,
    photos: [
      {
        id: "photo-4",
        url: "https://images.unsplash.com/photo-1551972578-f3e955bf9887?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "aniversario-1.jpg",
        selected: true
      },
      {
        id: "photo-5",
        url: "https://images.unsplash.com/photo-1525373698358-041e3a460346?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "aniversario-2.jpg",
        selected: true
      },
      {
        id: "photo-6",
        url: "https://images.unsplash.com/photo-1533294452740-9da4c4f8a416?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "aniversario-3.jpg",
        selected: false
      }
    ]
  },
  {
    id: 3,
    nome: "Ensaio Corporativo - Tech Inc",
    cliente: "Tech Incorporated",
    emailCliente: "contato@techinc.example.com",
    data: "2023-02-08",
    status: "finalizado",
    fotos: 3,
    selecionadas: 2,
    fotografoId: 1,
    photos: [
      {
        id: "photo-7",
        url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "corporativo-1.jpg",
        selected: true
      },
      {
        id: "photo-8",
        url: "https://images.unsplash.com/photo-1573164574511-73c773193279?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "corporativo-2.jpg",
        selected: true
      },
      {
        id: "photo-9",
        url: "https://images.unsplash.com/photo-1551836022-aadb801c60e9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "corporativo-3.jpg",
        selected: false
      }
    ],
    finalizado: true
  },
  {
    id: 4,
    nome: "Evento de Lançamento - Natura",
    cliente: "Natura Cosméticos",
    emailCliente: "eventos@natura.example.com",
    data: "2023-01-30",
    status: "arquivado",
    fotos: 3,
    selecionadas: 3,
    fotografoId: 1,
    photos: [
      {
        id: "photo-10",
        url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "evento-1.jpg",
        selected: true
      },
      {
        id: "photo-11",
        url: "https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "evento-2.jpg",
        selected: true
      },
      {
        id: "photo-12",
        url: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        filename: "evento-3.jpg",
        selected: true
      }
    ],
    finalizado: true
  }
];

// Component for project cards
function ProjectCard({ project, onDelete, onViewComments }: { project: any, onDelete?: (id: number) => void, onViewComments?: (id: string) => void }) {
  // Note: We're using parameter renaming (projeto: project) to transition from Portuguese to English
  // while maintaining backward compatibility
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState(project?.status || "pending");
  const [showSelectionsModal, setShowSelectionsModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTogglingWatermark, setIsTogglingWatermark] = useState(false);
  const [modalProject, setModalProject] = useState(project);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "revisado": return "bg-blue-100 text-blue-800";
      case "reviewed": return "bg-blue-100 text-blue-800";
      case "finalizado": return "bg-green-100 text-green-800";
      case "completed": return "bg-green-100 text-green-800";
      case "Completed": return "bg-green-100 text-green-800";
      case "arquivado": return "bg-gray-100 text-gray-800";
      case "archived": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case "pendente": return "Pendente";
      case "pending": return "Pendente";
      case "revisado": return "Revisado";
      case "reviewed": return "Revisado";
      case "finalizado": return "Finalizado";
      case "completed": return "Finalizado";
      case "Completed": return "Finalizado";
      case "arquivado": return "Arquivado";
      case "archived": return "Arquivado";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US');
  };
  

  
  const handleEditGallery = () => {
    // Simulation - in a real app, would redirect to an edit page
    toast({
      title: "Edit gallery",
      description: `Opening project "${project.nome}" gallery for editing.`,
    });
    
    // Redirect to a project edit page
    setLocation(`/project/${project.id}/edit`);
  };
  
  const handleViewSelections = async () => {
    try {
      // Fetch the complete project data with photos
      const response = await fetch(`/api/projects/${project.id}`);
      if (response.ok) {
        const projectData = await response.json();
        setModalProject(projectData);
      } else {
        setModalProject(project);
      }
      setShowSelectionsModal(true);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setModalProject(project);
      setShowSelectionsModal(true); // Still open modal even if fetch fails
    }
  };
  
  const handleDeleteProject = async () => {
    try {
      setIsDeleting(true);
      
      // Immediately call the parent component's delete handler for optimistic UI update
      if (onDelete) {
        onDelete(project.id);
      }
      
      // Close the modal immediately
      setShowDeleteConfirm(false);
      
      // Show informative message about deletion process
      const photoCount = project?.photos?.length || project?.fotos || 0;
      toast({
        title: "Projeto deletado!",
        description: `Aguarde alguns minutos enquanto removemos todos os ${photoCount} arquivos do servidor.`,
        duration: 8000, // Show for 8 seconds
      });
      
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar o projeto. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleWatermark = async () => {
    try {
      setIsTogglingWatermark(true);
      
      const newWatermarkValue = !project.showWatermark;
      
      await apiRequest('PATCH', `/api/projects/${project.id}/watermark`, {
        showWatermark: newWatermarkValue
      });
      
      // Update local state
      project.showWatermark = newWatermarkValue;
      
      toast({
        title: "Marca d'água atualizada",
        description: `Marca d'água ${newWatermarkValue ? 'ativada' : 'desativada'} para este projeto.`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    } catch (error) {
      console.error('Error toggling watermark:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a configuração da marca d'água.",
        variant: "destructive"
      });
    } finally {
      setIsTogglingWatermark(false);
    }
  };
  
  return (
        <Card className="overflow-hidden hover:shadow-[0_4px_15px_0_rgba(30,58,138,0.70)] transition-shadow">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="tracking-tight font-bold text-[24px]">{project?.name || project?.nome || "Untitled Project"}</CardTitle>
            <CardDescription className="text-sm mt-1">{project?.clientName || project?.cliente || "Unknown Client"}</CardDescription>
          </div>
          <Badge className={getStatusColor(status)}>
            {getStatusDisplayName(status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center text-sm text-gray-500 mt-2">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{formatDate(project?.data || new Date().toISOString())}</span>
        </div>
        <div className="flex justify-between mt-3">
          <div className="flex items-center text-sm">
            <Camera className="h-4 w-4 mr-1 text-gray-500" />
            <span>{project?.photos?.length || project?.fotos || 0} photos</span>
          </div>
          <div className="flex items-center text-sm">
            <FileText className="h-4 w-4 mr-1 text-gray-500" />
            <span>{project?.selectedPhotos?.length || project?.selecionadas || 0} selected</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col sm:flex-row gap-2 justify-between">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Comments button - moved to first position */}
          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-full px-4 py-2 font-medium transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onViewComments?.(project.id);
            }}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Comentários
          </Button>
          
          {/* View selections button - available for projects with selections */}
          {(project.selectedPhotos?.length > 0 || project.selecionadas > 0) && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs text-green-600 bg-green-50 hover:bg-green-100 rounded-full px-4 py-2 font-medium transition-colors"
              onClick={handleViewSelections}
            >
              <FileText className="h-3 w-3 mr-1" />
              Ver Seleções
            </Button>
          )}
          
          {/* Watermark toggle button */}
          <Button 
            variant="ghost" 
            size="sm"
            className={`text-xs rounded-full px-4 py-2 font-medium transition-colors ${project.showWatermark !== false 
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
              : 'text-gray-500 bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={handleToggleWatermark}
            disabled={isTogglingWatermark}
            title={`Marca d'água ${project.showWatermark !== false ? 'ativada' : 'desativada'}`}
          >
            {isTogglingWatermark ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ...
              </>
            ) : (
              <>
                {project.showWatermark !== false ? (
                  <Shield className="h-3 w-3 mr-1" />
                ) : (
                  <ShieldOff className="h-3 w-3 mr-1" />
                )}
                Marca d'água
              </>
            )}
          </Button>
          
          {/* Delete project button - moved to last position and made smaller */}
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 bg-red-50 hover:bg-red-100 rounded-full p-1 transition-colors"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Excluir"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs flex-grow sm:flex-grow-0"
            onClick={() => setLocation(`/project/${project.id}`)}
          >
            Ver Detalhes
            <ArrowUpRight className="h-3 w-3 ml-1" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={`
              text-xs text-white font-bold shadow-sm flex-grow sm:flex-grow-0 rounded-md transition-colors
              bg-gradient-to-r from-[#2563eb] to-[#93c5fd]
              hover:from-[#3b82f6] hover:to-[#60a5fa]
            `}
            onClick={(e) => {
              e.stopPropagation();
              const clientUrl = `${window.location.origin}/project-view/${project.id}`;
              navigator.clipboard.writeText(clientUrl);
              toast({
                title: "Link copiado",
                description: "Link do cliente copiado para a área de transferência.",
              });
            }}
          >
            Link do Cliente
            <LinkIcon className="h-3 w-3 ml-1 text-white" />
          </Button>
          


        </div>
      </CardFooter>
      
      {/* Delete confirmation modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Excluir Projeto</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Tem certeza que deseja excluir o projeto "{project?.name || project?.nome || 'Sem título'}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Projeto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View selections modal */}
      <Dialog open={showSelectionsModal} onOpenChange={setShowSelectionsModal}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[900px] mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
              <DialogTitle
                className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent"
              >
                Fotos Selecionadas - {modalProject?.name || modalProject?.nome || 'Sem título'}
              </DialogTitle>
              <DialogDescription className="text-base mt-1">
              O cliente selecionou {modalProject?.selectedPhotos?.length || modalProject?.selecionadas || 0} de {modalProject?.photos?.length || modalProject?.fotos || 0} fotos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-60 overflow-y-auto my-4 border rounded-md bg-gray-50 p-4">
            {(() => {
              if (!modalProject?.photos || modalProject.photos.length === 0) {
                return <p className="text-gray-500 text-center">Nenhuma foto encontrada</p>;
              }
              
              // Get selected photos - check multiple possible ways the data might be structured
              let selectedPhotos = [];
              
              // Method 1: Filter by photo.selected property
              selectedPhotos = modalProject.photos.filter((photo: any) => photo.selected === true);
              
              // Method 2: If no selected photos found but we have selectedPhotos array, use that
              if (selectedPhotos.length === 0 && modalProject.selectedPhotos && modalProject.selectedPhotos.length > 0) {
                selectedPhotos = modalProject.photos.filter((photo: any) => 
                  modalProject.selectedPhotos.includes(photo.id)
                );
              }
              
              // Method 3: If still no results, check for selected photos by status
              if (selectedPhotos.length === 0 && modalProject.status === 'completed') {
                // For completed projects, all photos with selected=true or selected=1
                selectedPhotos = modalProject.photos.filter((photo: any) => 
                  photo.selected === true || photo.selected === 1 || photo.selected === "1"
                );
              }
              
              if (selectedPhotos.length === 0) {
                return <p className="text-gray-500 text-center">Nenhuma foto selecionada pelo cliente</p>;
              }
              
              return (
                <div className="space-y-1">
                  {selectedPhotos.map((photo: any) => (
                    <div key={photo.id} className="text-sm font-mono text-gray-800 select-all">
                      {photo.originalName || photo.filename || 'Arquivo sem nome'}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            {(() => {
              // Get selected photos for the copy button
              let selectedPhotos = [];
              
              if (modalProject?.photos) {
                selectedPhotos = modalProject.photos.filter((photo: any) => photo.selected === true);
                
                if (selectedPhotos.length === 0 && modalProject.selectedPhotos && modalProject.selectedPhotos.length > 0) {
                  selectedPhotos = modalProject.photos.filter((photo: any) => 
                    modalProject.selectedPhotos.some((sp: any) => sp.id === photo.id)
                  );
                }
                
                if (selectedPhotos.length === 0 && modalProject.status === 'completed') {
                  selectedPhotos = modalProject.photos.filter((photo: any) => 
                    photo.selected === true || photo.selected === 1 || photo.selected === "1"
                  );
                }
              }

              return selectedPhotos.length > 0 ? (
                <CopyNamesButton
                  selectedPhotos={selectedPhotos}
                  size="default"
                  variant="outline"
                  className="w-full sm:w-auto"
                />
              ) : null;
            })()}
            
            <Button onClick={() => setShowSelectionsModal(false)} className="w-full sm:w-auto">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Componente para o modal de upload
function UploadModal({
  open,
  onClose,
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (data: any) => void;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { toast } = useToast();
  const { user } = useAuth();
  
  const uploadSchema = z.object({
    projectName: z.string().min(3, "Project name is required"),
    clientName: z.string().min(3, "Client name is required"),
    clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
    data: z.string().min(1, "Date is required"),
  });
  
  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      projectName: "",
      clientName: "",
      clientEmail: "",
      data: new Date().toISOString().split('T')[0],
    },
  });
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const newFiles = Array.from(event.target.files);
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    
    // Verificar arquivos acima de 2MB
    const oversizedFiles = newFiles.filter(file => file.size > MAX_FILE_SIZE);
    const validFiles = newFiles.filter(file => file.size <= MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      toast({
        title: "Arquivos muito grandes",
        description: `Envie apenas fotos abaixo de 2MB. Arquivos rejeitados: ${fileNames}`,
        variant: "destructive",
      });
      
      if (validFiles.length === 0) {
        return;
      }
    }
    
    setSelectedFiles((prev) => [...prev, ...validFiles]);
    
    // Não geramos mais thumbnails, apenas registramos a quantidade de arquivos
    // para manter a contagem correta e permitir a remoção de arquivos
    setThumbnails(prev => [...prev, ...Array(validFiles.length).fill("placeholder")]);
  };
  
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setThumbnails((prev) => prev.filter((_, i) => i !== index));
  };
  
  const onSubmit = async (data: z.infer<typeof uploadSchema>) => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione ao menos uma foto para o projeto.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // ETAPA 1: Redimensionar imagens no front-end antes do upload
      console.log(`[Frontend Dashboard] Iniciando redimensionamento de ${selectedFiles.length} imagens antes do upload`);
      
      setUploadProgress(5); // 5% - iniciando processamento
      
      const compressedFiles = await compressMultipleImages(
        selectedFiles,
        {
          maxWidthOrHeight: 970, // Largura máxima padronizada
          quality: 0.9, // Qualidade padronizada
          useWebWorker: true,
        },
        (processed, total) => {
          // Atualizar progresso da compressão (5% a 25%)
          const compressionProgress = 5 + (processed / total) * 20;
          setUploadProgress(Math.round(compressionProgress));
        }
      );

      console.log(`[Frontend Dashboard] Redimensionamento concluído: ${compressedFiles.length} imagens processadas`);
      setUploadProgress(25); // 25% - compressão concluída
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('projectName', data.projectName);
      formData.append('clientName', data.clientName);
      formData.append('clientEmail', data.clientEmail || '');
      formData.append('data', data.data);

      
      // Add photographer ID from the user context
      if (user && user.id) {
        formData.append('photographerId', user.id.toString());
      }
      
      // Append compressed files to FormData
      compressedFiles.forEach((file) => {
        formData.append('photos', file);
      });
      
      // Use XMLHttpRequest para monitorar o progresso do upload
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Configuração melhorada do callback de progresso com boot inicial e impulso
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            // Começar a partir de 25% já que a compressão foi concluída
            // Para uploads grandes, começamos com 25% para feedback visual imediato
            let nextProgress = 25;
            
            // Se o upload já começou de verdade (mais de 3% carregado)
            if (event.loaded > 0.03 * event.total) {
              // Calcular percentual atual com um pequeno boost para uploads grandes
              // A fórmula abaixo mapeia o progresso real de upload para 25%-95%
              const boost = compressedFiles.length > 50 ? 1.25 : 1;
              const rawPercent = 25 + ((event.loaded / event.total) * 70 * boost);
              
              // Limitar o boost a 95% para garantir que não chegue a 100% antes do tempo
              nextProgress = Math.min(Math.round(rawPercent), 95);
            } else if (event.loaded > 0) {
              // Se estamos no início (menos de 3%), mas já começou, forçar entre 25-35%
              nextProgress = Math.max(25, Math.min(35, Math.round(25 + (event.loaded / event.total) * 300)));
            }
            
            // Para arquivos maiores que 10MB, aumentar o impulso inicial
            const totalSize = compressedFiles.reduce((acc, file) => acc + file.size, 0);
            const averageFileSize = totalSize / compressedFiles.length;
            
            if (averageFileSize > 10 * 1024 * 1024 && nextProgress < 10) {
              nextProgress = 10; // Começar em 10% para arquivos grandes
            }
            
            // Para mais de 100 arquivos, comportamento especial
            if (compressedFiles.length > 100) {
              // Progredir mais rápido no início para feedback visual
              if (event.loaded < 0.1 * event.total) {
                nextProgress = Math.max(nextProgress, 30);
              }
            }
            
            // Manter a barra em movimento para arquivos muito grandes
            const currentProgress = uploadProgress;
            if (nextProgress <= currentProgress && event.loaded > event.total * 0.1) {
              // Se parece travado mas o upload está progredindo, incrementar manualmente
              nextProgress = currentProgress + 1;
            }
            
            // Limitar a 98% até receber a resposta completa
            nextProgress = Math.min(nextProgress, 98);
            
            // Quando o upload realmente terminar no XHR, começar simulação do processamento no servidor
            if (event.loaded === event.total && nextProgress >= 90) {
              // Simular processamento no servidor com intervalos
              const simulateProcessing = () => {
                setUploadProgress(prev => {
                  if (prev < 98) {
                    return prev + 1;
                  }
                  return prev;
                });
              };
              
              // Incrementos mais frequentes para manter a barra em movimento
              const processingInterval = setInterval(simulateProcessing, 300);
              
              // Limpar o intervalo quando a resposta for recebida
              xhr.addEventListener('load', () => {
                clearInterval(processingInterval);
                // Definir como 100% quando realmente estiver completo
                setTimeout(() => setUploadProgress(100), 500);
              });
            }
            
            // Atualizar o progresso
            setUploadProgress(nextProgress);
          }
        };
        
        // Configurar callbacks de conclusão
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Erro ao processar resposta do servidor'));
            }
          } else {
            reject(new Error('Erro ao criar projeto'));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Erro de conexão ao enviar o projeto'));
        };
        
        // Enviar a requisição
        xhr.open('POST', '/api/projects');
        xhr.send(formData);
      });
      
      console.log("Project created:", result);
      
      // Format project data to match expected structure in the dashboard
      const formattedProject = {
        ...result,
        nome: result.name,                  // Map API field "name" to UI field "nome"
        cliente: result.clientName,         // Map API field "clientName" to UI field "cliente"
        emailCliente: result.clientEmail,   // Map API field "clientEmail" to UI field "emailCliente"
        fotos: result.photos ? result.photos.length : 0,  // Set photo count based on photos array length
        selecionadas: result.selectedPhotos ? result.selectedPhotos.length : 0  // Selected photos count
      };
      
      // Show success notification
      toast({
        title: "Projeto criado com sucesso",
        description: `O projeto "${data.projectName}" foi criado com ${compressedFiles.length} fotos redimensionadas.`,
      });
      
      // Call onUpload callback with the properly formatted project
      onUpload(formattedProject);
      
      // Reset form and close modal
      setSelectedFiles([]);
      setThumbnails([]);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error during upload:", error);
      toast({
        title: "Erro ao criar projeto",
        description: "Ocorreu um erro durante o upload. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-pink-500 to-rose-400 font-bold text-2xl">
              Criar Novo Projeto
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm mt-1 bg-yellow-200 text-black font-semibold px-2 py-1 rounded-sm">
            Aceitamos fotos apenas abaixo de 2mb cada, para conforto dos clientes ❤️ / Envie no máximo lotes de 400 fotos, para evitar erros no upload 📸
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Galeria</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Casamento de João e Maria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="clientEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email do Cliente (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="cliente@exemplo.com (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data do Evento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Fotos do Projeto (jpeg, png, webp, até 2mb cada)
              </label>
              <div className="border border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:bg-gray-50 transition relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Camera className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Clique ou arraste fotos para upload :)
                  </p>
                  <p className="text-xs text-gray-400">
                    (Formatos aceitos: JPG, PNG, WEBP)
                  </p>
                </div>
              </div>
            </div>
            
            {thumbnails.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">
                  {thumbnails.length} foto(s) selecionada(s)
                </h4>
                {/* Lista simples de nomes de arquivos sem miniaturas */}
                <div className="border rounded-md max-h-[260px] overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between py-2 px-3 border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-2 overflow-hidden">
                        <Camera className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <p className="text-sm truncate">{file.name}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Barra de progresso de upload melhorada */}
            {isUploading && (
              <div className="w-full flex flex-col gap-2 mt-4">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-in-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600 mt-1 px-1">
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processando {thumbnails.length} fotos</span>
                  </div>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  {uploadProgress < 30 ? (
                    "Preparando arquivos para upload..."
                  ) : uploadProgress < 70 ? (
                    "Enviando fotos para o servidor..."
                  ) : uploadProgress < 90 ? (
                    "Processando imagens no servidor..."
                  ) : (
                    "Finalizando o processamento..."
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1 text-center">
                  Por favor, não feche ou atualize a página durante o upload
                </div>
              </div>
            )}
            
            <DialogFooter className="sticky bottom-0 pt-4 mt-4 bg-white border-t z-10 flex flex-col sm:flex-row gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isUploading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isUploading}
                className="w-full sm:w-auto"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Criar Projeto"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Dashboard statistics component
function Statistics({ setLocation }: { setLocation: (path: string) => void }) {
  // Statistics data
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/user/stats"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Current user plan and stats data
  const userQuery = useQuery<any>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Calculate percentage based on real user data
  const calculatePlanInfo = () => {
    // Always ensure we have real data from API
    const user = userQuery.data;
    const stats = data;
    
    // Special case for new accounts or missing data - show free plan with 0 usage
    if (!user) {
      return {
        planType: "free",
        uploadLimit: 50,
        usedUploads: 0,
        percentageUsed: 0
      };
    }
    
    // Convert Portuguese plan names to English for consistency
    let planType = (user.planType || "free").toLowerCase();
    if (planType === "gratuito") planType = "free";
    if (planType === "basico" || planType === "básico") planType = "basic"; 
    if (planType === "padrao" || planType === "padrão") planType = "standard";
    if (planType === "ilimitado") planType = "unlimited";
    if (planType === "profissional") planType = "professional";
    
    // Default values if we don't have stats yet
    let uploadLimit = user.uploadLimit || 50;
    let usedUploads = user.usedUploads || 0;
    
    // Override with stats-specific values if available
    if (stats && stats.planInfo) {
      // Use the more accurate values from the stats endpoint
      uploadLimit = stats.planInfo.uploadLimit || uploadLimit;
      usedUploads = stats.planInfo.usedUploads || usedUploads;
    }
    
    // For new accounts, ensure we display real-time correct data
    if (planType === "free" && !("planType" in user)) {
      uploadLimit = 50;
      usedUploads = 0;
    }
    
    // Calculate percentage with safety check for divide-by-zero
    const percentageUsed = uploadLimit > 0 ? Math.round((usedUploads / uploadLimit) * 100) : 0;
    
    return {
      planType: planType,
      uploadLimit: uploadLimit,
      usedUploads: usedUploads,
      percentageUsed: percentageUsed
    };
  };
  
  // Get real-time plan info or provide sensible defaults for new accounts
  const planInfo = calculatePlanInfo() || {
    planType: "free",
    uploadLimit: 50,
    usedUploads: 0,
    percentageUsed: 0
  };
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
      {/* Active projects card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <BarChart className="h-5 w-5 mr-2 text-blue-500" />
            Projetos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-16" />
          ) : (
            <>
              <div className="text-3xl font-bold">
                {data?.activeProjects || 0}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Projetos em andamento
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Monthly uploads card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Camera className="h-5 w-5 mr-2 text-green-500" />
            Uploads Mensais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-16" />
          ) : (
            <>
              <div className="text-3xl font-bold">
                {data?.photosThisMonth || 0}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Fotos enviadas este mês
              </p>
            </>
          )}
        </CardContent>
      </Card>


      


      {/* Upload usage card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-1xl flex items-center font-bold">
            <CreditCard className="h-6 w-6 mr-3 text-purple-500" />
            Plano: {planInfo.planType.charAt(0).toUpperCase() + planInfo.planType.slice(1)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-500">Uso de Uploads</span>
            <span className="text-sm font-medium">
              {planInfo.usedUploads} / {planInfo.planType === "unlimited" ? "∞" : planInfo.uploadLimit}
            </span>
          </div>
          <Progress value={planInfo.planType === "unlimited" ? 0 : planInfo.percentageUsed} className="h-2" />
          <p className="text-xs text-gray-500 mt-2">
            {planInfo.planType === "unlimited" 
              ? "Plano com uploads ilimitados" 
              : `${planInfo.percentageUsed}% do limite de uploads utilizado`}
          </p>
        </CardContent>
        <CardFooter className="pl-4 pb-4 pt-4 bg-transparent flex items-center">
          <Button 
            size="md"
            className="text-base font-normal px-7 py-2 rounded-full flex items-center
              bg-white border-2 border-blue-600 text-blue-600
              hover:bg-blue-50 hover:border-blue-700 hover:text-blue-700
              shadow-none transition-all duration-150"
            onClick={() => setLocation("/subscription")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Ver Planos de Assinatura
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Main Dashboard component
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  
  // State for managing projects
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // State for modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Query for project comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery<PhotoComment[]>({
    queryKey: [`/api/projects/${selectedProjectId}/comments`],
    enabled: !!selectedProjectId && commentsModalOpen,
  });

  // Mutation to mark comments as viewed
  const markCommentsAsViewedMutation = useMutation({
    mutationFn: async (commentIds: string[]) => {
      const response = await apiRequest("POST", "/api/comments/mark-viewed", { commentIds });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProjectId}/comments`] });
    },
  });

  // Handler to open comments modal
  const handleViewComments = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCommentsModalOpen(true);
  };
  
  // Carregar projetos
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        
        // Always fetch from API to ensure we only see current user's projects
        const response = await fetch('/api/projects');
        
        if (!response.ok) {
          throw new Error("Error loading projects");
        }
        
        const data = await response.json();
        console.log("Projects loaded from API:", data.length);
        
        // Save to localStorage with user-specific key to avoid mixing projects between users
        if (user && user.id) {
          localStorage.setItem(`projects_user_${user.id}`, JSON.stringify(data));
        }
        
        setProjects(data);
        setFilteredProjects(data);
      } catch (e) {
        console.error("Error loading data:", e);
        toast({
          title: "Error loading data",
          description: "An error occurred while loading projects. Please refresh the page.",
          variant: "destructive",
        });
        
        // Fallback to empty projects array if API call fails
        setProjects([]);
        setFilteredProjects([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch if user is authenticated
    if (user && user.id) {
      fetchProjects();
    } else {
      // If no user, reset projects
      setProjects([]);
      setFilteredProjects([]);
      setIsLoading(false);
    }
  }, [toast, user]);
  
  const handleLogout = () => {
    // First remove user data from localStorage
    localStorage.removeItem("user");
    
    // Clear both the old and new format of project data
    localStorage.removeItem("projects");
    
    // Also remove user-specific project data if there's a user
    if (user && user.id) {
      localStorage.removeItem(`projects_user_${user.id}`);
    }
    
    // Then trigger the logout mutation to clear the auth state
    logoutMutation.mutate();
    
    // Redirect to auth page after logout
    setLocation("/auth");
  };
  
  // Handler for project deletion
  const handleDeleteProject = (id: number) => {
    // Find the project to be deleted to get its photo count
    const projectToDelete = projects.find(project => project.id === id);
    const photoCount = projectToDelete?.fotos || projectToDelete?.photos?.length || 0;
    
    // OPTIMISTIC UPDATE: Remove project from UI immediately
    setProjects(prevProjects => prevProjects.filter(project => project.id !== id));
    setFilteredProjects(prevProjects => prevProjects.filter(project => project.id !== id));
    
    // Update user-specific localStorage to reflect deletion immediately
    try {
      if (user && user.id) {
        const storageKey = `projects_user_${user.id}`;
        const storedProjects = localStorage.getItem(storageKey);
        if (storedProjects) {
          const parsedProjects = JSON.parse(storedProjects);
          const updatedProjects = parsedProjects.filter((p: any) => p.id !== id);
          localStorage.setItem(storageKey, JSON.stringify(updatedProjects));
        }
      }
    } catch (storageError) {
      console.error('Error updating localStorage:', storageError);
    }
    
    // Make API call to delete the project in the background
    apiRequest('DELETE', `/api/projects/${id}`)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to delete project');
    })
    .then(data => {
      console.log('Project deleted successfully on server:', data);
      
      // Refresh the user data and stats to update the upload count
      import('@/lib/queryClient').then(({ queryClient }) => {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      });
    })
    .catch(error => {
      console.error('Error deleting project on server:', error);
      
      // ROLLBACK: If server deletion fails, restore the project to the UI
      if (projectToDelete) {
        setProjects(prevProjects => [...prevProjects, projectToDelete]);
        setFilteredProjects(prevProjects => [...prevProjects, projectToDelete]);
        
        // Restore to localStorage as well
        try {
          if (user && user.id) {
            const storageKey = `projects_user_${user.id}`;
            const storedProjects = localStorage.getItem(storageKey);
            if (storedProjects) {
              const parsedProjects = JSON.parse(storedProjects);
              const updatedProjects = [...parsedProjects, projectToDelete];
              localStorage.setItem(storageKey, JSON.stringify(updatedProjects));
            }
          }
        } catch (storageError) {
          console.error('Error restoring localStorage:', storageError);
        }
        
        toast({
          title: "Erro ao deletar",
          description: "Não foi possível deletar o projeto no servidor. O projeto foi restaurado.",
          variant: "destructive",
        });
      }
    });
  };
  
  // Handler for project creation
  const handleProjectCreated = async (newProject: any) => {
    console.log("Project created, ensuring complete data...");
    
    try {
      // Use a more reliable approach to get the complete project data
      // First, prepare the formatted project with whatever data we have now
      const initialFormattedProject = {
        ...newProject,
        id: newProject.id,
        nome: newProject.name || newProject.nome,
        cliente: newProject.clientName || newProject.cliente,
        emailCliente: newProject.clientEmail || newProject.emailCliente,
        fotos: newProject.photos ? newProject.photos.length : (newProject.fotos || 0),
        selecionadas: newProject.selectedPhotos ? newProject.selectedPhotos.length : (newProject.selecionadas || 0),
        status: newProject.status || "pending"
      };
      
      // Immediately add this to the projects list for a responsive UI experience
      const initialUpdatedProjects = [initialFormattedProject, ...projects.filter(p => p.id !== initialFormattedProject.id)];
      setProjects(initialUpdatedProjects);
      
      // Also update filtered projects right away
      if (currentTab === "all" || initialFormattedProject.status === getStatusFilter(currentTab)) {
        setFilteredProjects([initialFormattedProject, ...filteredProjects.filter(p => p.id !== initialFormattedProject.id)]);
      }
      
      // Now make a separate call to get the complete and accurate data
      // Use a longer delay to ensure the server has fully processed everything
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(`/api/projects/${newProject.id}`);
      
      if (!response.ok) {
        console.warn("Could not fetch complete project data, using initial data");
        return; // Already added the initial project data above
      }
      
      // Get the complete and accurate project data
      const completeProject = await response.json();
      console.log("Complete project data fetched:", completeProject);
      
      // Format for dashboard display with complete data
      const completeFormattedProject = {
        ...completeProject,
        nome: completeProject.name,
        cliente: completeProject.clientName,
        emailCliente: completeProject.clientEmail,
        fotos: completeProject.photos ? completeProject.photos.length : 0,
        selecionadas: completeProject.selectedPhotos ? completeProject.selectedPhotos.length : 0
      };
      
      // Update the projects state with the complete data
      const finalUpdatedProjects = [completeFormattedProject, ...projects.filter(p => p.id !== completeFormattedProject.id)];
      setProjects(finalUpdatedProjects);
      
      // Final update to filtered projects based on current tab and complete data
      if (currentTab === "all" || completeFormattedProject.status === getStatusFilter(currentTab)) {
        setFilteredProjects([completeFormattedProject, ...filteredProjects.filter(p => p.id !== completeFormattedProject.id)]);
      }
      
      // Update user-specific localStorage with the complete data
      if (user && user.id) {
        const storageKey = `projects_user_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(finalUpdatedProjects));
      }
      
      // Force a refresh of the entire projects list to ensure everything is in sync
      const refreshResponse = await fetch('/api/projects');
      if (refreshResponse.ok) {
        const refreshedProjects = await refreshResponse.json();
        
        // Format the refreshed data
        const formattedProjects = refreshedProjects.map((project: any) => ({
          ...project,
          nome: project.name,
          cliente: project.clientName,
          emailCliente: project.clientEmail,
          fotos: project.photos ? project.photos.length : 0,
          selecionadas: project.selectedPhotos ? project.selectedPhotos.length : 0
        }));
        
        // Update project states with the freshest data
        setProjects(formattedProjects);
        
        // Apply current filtering
        let filtered = formattedProjects;
        if (currentTab !== "all") {
          const statusFilter = getStatusFilter(currentTab);
          filtered = formattedProjects.filter(
            project => project.status === statusFilter
          );
        }
        
        // Apply search filter if any
        if (searchQuery && searchQuery.length > 0) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(project => {
            // Verificar nome/name - aceitar ambos os formatos
            const projectName = project.nome || project.name || '';
            const clientName = project.cliente || project.clientName || '';
            const clientEmail = project.emailCliente || project.clientEmail || '';
            
            return (
              projectName.toString().toLowerCase().includes(query) ||
              clientName.toString().toLowerCase().includes(query) ||
              clientEmail.toString().toLowerCase().includes(query)
            );
          });
        }
        
        setFilteredProjects(filtered);
      }
    } catch (error) {
      console.error("Error in project creation handling:", error);
      // We've already added the initial project data, so user still sees something,
      // but let's inform them about the issue
      toast({
        title: "Project Created",
        description: "Project was created but some details may be incomplete. Refresh the page to see the latest data.",
        variant: "default"
      });
    }
  };
  
  // Function to convert the current tab to a status filter
  const getStatusFilter = (tab: string) => {
    switch (tab) {
      case "pending": return "pendente";
      case "reviewed": return "revisado";
      case "completed": return "finalizado";
      default: return "";
    }
  };
  
  // Filter projects by tab and search query
  useEffect(() => {
    let filtered = [...projects];
    
    // Apply tab filter
    if (currentTab !== "all") {
      const statusFilter = getStatusFilter(currentTab);
      filtered = filtered.filter(project => project.status === statusFilter);
    }
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => {
        // Verificar nome/name - aceitar ambos os formatos
        const projectName = project.nome || project.name || '';
        const clientName = project.cliente || project.clientName || '';
        const clientEmail = project.emailCliente || project.clientEmail || '';
        
        return (
          projectName.toString().toLowerCase().includes(query) ||
          clientName.toString().toLowerCase().includes(query) ||
          clientEmail.toString().toLowerCase().includes(query)
        );
      });
    }
    
    setFilteredProjects(filtered);
  }, [currentTab, searchQuery, projects]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto py-4 px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold m-0 p-0">
                <span className="text-blue-600">Fottu</span>
                <span className="text-gray-900">fy</span>
              </h1>
              <img
                src="/fottufinho.webp"
                alt="Fottufinho Mascote"
                className="h-7 w-7 rounded-full"
                style={{marginTop: '-2px'}}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <Button
                onClick={() => setUploadModalOpen(true)}
                className={`
                  w-full sm:w-auto
                  flex items-center justify-center
                  bg-gradient-to-r from-rose-600 via-pink-500 to-rose-400
                  text-white font-bold
                  rounded-full shadow-md
                  px-6 py-2
                  transition-all duration-200
                  hover:from-rose-700 hover:via-pink-600 hover:to-rose-500
                  hover:scale-[1.04]
                  focus:outline-none focus:ring-2 focus:ring-rose-400
                  text-base
                `}
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Novo Projeto
              </Button>
              
              <div className="flex items-center border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 pl-0 sm:pl-4 mt-2 sm:mt-0 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 shrink-0">
                  <span className="text-gray-700 font-medium">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </span>
                </div>
                <div className="flex-grow mr-2">
                  <p className="font-medium truncate">{user?.name || "User"}</p>
                  <p className="text-gray-500 text-sm truncate">{user?.email}</p>
                </div>
                <Button variant="outline" onClick={handleLogout} size="sm" className="shrink-0">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto py-8 px-4">
        {/* Banner Image */}
        <div className="w-full mb-8 bg-white rounded-xl shadow-md overflow-hidden p-0">
          <img 
            src="/bannerdash2.jpg" 
            alt="Dashboard Banner" 
            className="w-full h-auto object-cover" 
          />
        </div>

        {/* Aviso de novidades */}
        <div className="mt-6 mb-4 px-5 py-4 bg-gray-50 rounded-xl shadow flex items-start gap-4">
          <svg className="w-6 h-6 text-blue-500 mt-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m0-4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
          </svg>
          <div>
            <p className="font-semibold mb-1 text-lg bg-gradient-to-r from-blue-900 via-blue-500 to-blue-400 bg-clip-text text-transparent">
              Estamos Sempre buscando melhorar!
            </p>
            <p className="text-base bg-gradient-to-r from-blue-700 via-blue-400 to-blue-800 bg-clip-text text-transparent">
              Ajude-nos a crescer recomendando a Fottufy a um amigo fotógrafo! ❤️
            </p>
          </div>
        </div>

        {/* Promotional Banner - only shown for free users */}
        {user?.planType === 'free' && <PromotionalBanner />}
        
        <Statistics setLocation={setLocation} />
        
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-900 via-blue-600 to-blue-300 bg-clip-text text-transparent">
              Meus projetos
            </h2>
            
            <div className="flex items-center w-full sm:w-auto gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search projects..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Button variant="outline" size="icon" className="shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="mb-6 flex w-full scrollbar-none bg-transparent text-lg">
                <TabsTrigger value="all" className="flex-shrink-0 text-lg">Todos</TabsTrigger>
                <TabsTrigger value="pending" className="flex-shrink-0 text-lg">Pendentes</TabsTrigger>
                <TabsTrigger value="reviewed" className="flex-shrink-0 text-lg">Revisados</TabsTrigger>
                <TabsTrigger value="completed" className="flex-shrink-0 text-lg">Finalizados</TabsTrigger>
            </TabsList>
            
            {/* Duplicate Novo Projeto button centered below tabs */}
            <div className="flex justify-center mb-6">
              <Button
                onClick={() => setUploadModalOpen(true)}
                className={`
                  w-full sm:w-auto
                  flex items-center justify-center
                  bg-gradient-to-r from-rose-600 via-pink-500 to-rose-400
                  text-white font-bold
                  rounded-full shadow-md
                  px-6 py-2
                  transition-all duration-200
                  hover:from-rose-700 hover:via-pink-600 hover:to-rose-500
                  hover:scale-[1.04]
                  focus:outline-none focus:ring-2 focus:ring-rose-400
                  text-base
                `}
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Novo Projeto
              </Button>
            </div>
            
            <TabsContent value="all" className="mt-0">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array(6).fill(null).map((_, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader className="p-4">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <Skeleton className="h-4 w-1/3 mb-2" />
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Skeleton className="h-8 w-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg">
                  <Camera className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No projects found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery 
                      ? "Try adjusting your filters or search terms" 
                      : "Start by creating your first photo project"
                    }
                  </p>

                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onDelete={handleDeleteProject}
                      onViewComments={handleViewComments}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            {["pending", "reviewed", "completed", "Completed"].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array(3).fill(null).map((_, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="p-4">
                          <Skeleton className="h-6 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <Skeleton className="h-4 w-1/3 mb-2" />
                          <div className="flex justify-between">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-4 w-1/4" />
                          </div>
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                          <Skeleton className="h-8 w-full" />
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded-lg">
                    <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      No {getStatusFilter(tab)} projects
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Projects will appear here when they are marked as {getStatusFilter(tab)}.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                      <ProjectCard 
                        key={project.id} 
                        project={project} 
                        onDelete={handleDeleteProject}
                        onViewComments={handleViewComments}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
      
      {/* Seção de redefinição de senha discreta no rodapé */}
      <div className="border-t pt-4 pb-8 mt-8">
        <div className="container max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Fottufy. Todos os direitos reservados.
            </div>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-sm text-primary hover:text-primary/80 flex items-center p-0 h-auto"
                onClick={() => setChangePasswordModalOpen(true)}
              >
                <Key className="h-3.5 w-3.5 mr-1" />
                Alterar minha senha
              </Button>
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-muted-foreground/80 flex items-center">
                <HelpCircle className="h-3.5 w-3.5 mr-1" />
                Esqueceu sua senha?
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal for uploading new projects */}
      <UploadModal 
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleProjectCreated}
      />

      {/* Modal for changing password */}
      <ChangePasswordModal
        open={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />

      {/* Comments Modal */}
              <Dialog open={commentsModalOpen} onOpenChange={setCommentsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle
                      className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent"
                    >
                      Comentários do Projeto
                    </DialogTitle>
                    <DialogDescription className="text-base mt-1">
              Visualize e gerencie comentários dos clientes nas fotos
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {commentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Carregando comentários...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum comentário ainda</h3>
                <p className="text-gray-500">
                  Os comentários dos clientes aparecerão aqui quando eles interagirem com as fotos.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Cliente</p>
                          <p className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      {!comment.isViewed && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Novo
                        </span>
                      )}
                    </div>
                    
                    {comment.photoId && comment.photoUrl && (
                      <div className="flex items-start space-x-3 mb-3 p-3 bg-white rounded border">
                        <div className="flex-shrink-0">
                          <img 
                            src={comment.photoUrl} 
                            alt={comment.photoOriginalName || comment.photoFilename || 'Foto'} 
                            className="w-16 h-16 object-cover rounded border"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {comment.photoOriginalName || comment.photoFilename || 'Arquivo sem nome'}
                          </p>
                          <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                            "{comment.comment}"
                          </p>
                        </div>
                      </div>
                    )}

                    {!comment.photoId && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                          {comment.comment}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCommentsModalOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}