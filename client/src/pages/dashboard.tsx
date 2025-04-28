import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  Link,
  RotateCcw,
  CreditCard,
  Settings
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
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
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
function ProjectCard({ project, onDelete }: { project: any, onDelete?: (id: number) => void }) {
  // Note: We're using parameter renaming (projeto: project) to transition from Portuguese to English
  // while maintaining backward compatibility
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState(project?.status || "pending");
  const [showSelectionsModal, setShowSelectionsModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "revisado": return "bg-blue-100 text-blue-800";
      case "reviewed": return "bg-blue-100 text-blue-800";
      case "finalizado": return "bg-green-100 text-green-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
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
  
  const handleViewSelections = () => {
    setShowSelectionsModal(true);
  };
  
  const handleDeleteProject = async () => {
    try {
      setIsDeleting(true);
      
      // Call the parent component's delete handler
      // This will trigger the API call and handle all the state updates
      if (onDelete) {
        onDelete(project.id);
      }
      
      // Show success notification
      toast({
        title: "Project deleted",
        description: `Project "${project.nome}" was successfully deleted.`,
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error deleting",
        description: "Could not delete the project. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">{project?.name || project?.nome || "Untitled Project"}</CardTitle>
            <CardDescription className="text-sm mt-1">{project?.clientName || project?.cliente || "Unknown Client"}</CardDescription>
          </div>
          <Badge className={getStatusColor(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
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
      <CardFooter className="p-4 pt-0 flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          {/* Delete project button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Excluir
            <X className="h-3 w-3 ml-1" />
          </Button>
          
          {/* View selections button - available for projects with selections */}
          {(project.selectedPhotos?.length > 0 || project.selecionadas > 0) && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={handleViewSelections}
            >
              Ver Seleções
              <FileText className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs"
            onClick={() => setLocation(`/project/${project.id}`)}
          >
            Ver Detalhes
            <ArrowUpRight className="h-3 w-3 ml-1" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-blue-600"
            onClick={(e) => {
              e.stopPropagation();
              // Copy link for the client
              const clientUrl = `${window.location.origin}/project-view/${project.id}`;
              console.log("Copying client link:", clientUrl);
              navigator.clipboard.writeText(clientUrl);
              toast({
                title: "Link copiado",
                description: "Link do cliente copiado para a área de transferência.",
              });
            }}
          >
            Link do Cliente
            <Link className="h-3 w-3 ml-1" />
          </Button>
          

          
          {(status === "pendente" || status === "revisado") && (
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800"
              onClick={handleEditGallery}
            >
              Editar Galeria
            </Button>
          )}
        </div>
      </CardFooter>
      
      {/* Delete confirmation modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Projeto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o projeto "{project?.name || project?.nome || 'Sem título'}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isDeleting}
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
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Fotos Selecionadas - {project?.name || project?.nome || 'Sem título'}</DialogTitle>
            <DialogDescription>
              O cliente selecionou {project?.selectedPhotos?.length || project?.selecionadas || 0} de {project?.photos?.length || project?.fotos || 0} fotos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-4">
            {/* Handle both old and new API response formats */}
            {project.photos && project.photos.filter((photo: any) => photo.selected).map((photo: any) => (
              <div key={photo.id} className="relative rounded-md overflow-hidden aspect-square">
                <img 
                  src={photo.url} 
                  alt={photo.filename}
                  className="w-full h-full object-cover" 
                />
                <div className="absolute bottom-2 left-2 right-2 bg-black/50 text-white text-xs p-2 rounded">
                  {photo.filename}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowSelectionsModal(false)}>
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
    clientEmail: z.string().email("Invalid email"),
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
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    
    // Generate thumbnails for preview
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnails((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
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
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('projectName', data.projectName);
      formData.append('clientName', data.clientName);
      formData.append('clientEmail', data.clientEmail);
      formData.append('data', data.data);
      
      // Add photographer ID from the user context
      if (user && user.id) {
        formData.append('photographerId', user.id.toString());
      }
      
      // Append each file to FormData
      selectedFiles.forEach((file) => {
        formData.append('photos', file);
      });
      
      // Use XMLHttpRequest para monitorar o progresso do upload
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Configurar o callback de progresso
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
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
        description: `O projeto "${data.projectName}" foi criado com ${selectedFiles.length} fotos.`,
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do projeto e faça upload das fotos.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Projeto</FormLabel>
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
                  <FormLabel>Email do Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="cliente@exemplo.com" {...field} />
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
                Fotos do Projeto
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
                    Clique ou arraste fotos para upload
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
                {/* Added max-height and overflow-y-auto for scrolling when many photos are selected */}
                <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ${thumbnails.length > 8 ? 'max-h-[250px] overflow-y-auto pr-2' : ''}`}>
                  {thumbnails.map((thumbnail, i) => (
                    <div key={i} className="group relative rounded-md overflow-hidden h-24">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${thumbnail})` }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          type="button"
                          onClick={() => removeFile(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-2">
                        <p className="text-white text-xs truncate">{selectedFiles[i].name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Barra de progresso de upload */}
            {isUploading && (
              <div className="w-full flex flex-col gap-2 mt-4">
                <div className="h-2 bg-gray-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-in-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  Enviando fotos... {uploadProgress}%
                </div>
              </div>
            )}
            
            <DialogFooter className="sticky bottom-0 pt-4 mt-4 bg-white border-t z-10">
              <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading}>
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          <CardTitle className="text-lg flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-purple-500" />
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
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setLocation("/subscription")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Gerenciar Assinatura
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
  
  // State for upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
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
    const photoCount = projectToDelete?.fotos || 0;
    
    // Make API call to delete the project
    apiRequest('DELETE', `/api/projects/${id}`)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to delete project');
    })
    .then(data => {
      console.log('Project deleted successfully:', data);
      
      // Remove project from state
      setProjects(prevProjects => prevProjects.filter(project => project.id !== id));
      
      // Update filtered projects as well
      setFilteredProjects(prevProjects => prevProjects.filter(project => project.id !== id));
      
      // Update user-specific localStorage to reflect deletion
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
      
      // Refresh the user data and stats to update the upload count
      import('@/lib/queryClient').then(({ queryClient }) => {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      });
      
      toast({
        title: "Project deleted",
        description: `Project has been deleted successfully. ${photoCount} photos were removed from your usage.`,
      });
    })
    .catch(error => {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
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
          filtered = filtered.filter(
            project =>
              project.nome.toLowerCase().includes(query) ||
              project.cliente.toLowerCase().includes(query) ||
              project.emailCliente.toLowerCase().includes(query)
          );
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
      case "pending": return "pending";
      case "reviewed": return "reviewed";
      case "completed": return "completed";
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
      filtered = filtered.filter(
        project => 
          project.nome.toLowerCase().includes(query) ||
          project.cliente.toLowerCase().includes(query) ||
          project.emailCliente.toLowerCase().includes(query)
      );
    }
    
    setFilteredProjects(filtered);
  }, [currentTab, searchQuery, projects]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto py-4 px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Fottufy</h1>
            
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setUploadModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                New Project
              </Button>
              
              <div className="flex items-center border-l pl-4 ml-2">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  <span className="text-gray-700 font-medium">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{user?.name || "User"}</p>
                  <p className="text-gray-500">{user?.email}</p>
                </div>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto py-8 px-4">
        {/* Banner Image */}
        <div className="w-full mb-8 bg-white rounded-xl shadow-md overflow-hidden">
          <img 
            src="/bannerdash.png" 
            alt="Dashboard Banner" 
            className="w-full h-auto object-cover" 
          />
        </div>
        
        <Statistics setLocation={setLocation} />
        
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-gray-900">My Projects</h2>
            
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
            <TabsList className="mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
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
                  <Button onClick={() => setUploadModalOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create New Project
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onDelete={handleDeleteProject}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            {["pending", "reviewed", "completed"].map(tab => (
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
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
      
      {/* Modal for uploading new projects */}
      <UploadModal 
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleProjectCreated}
      />
    </div>
  );
}