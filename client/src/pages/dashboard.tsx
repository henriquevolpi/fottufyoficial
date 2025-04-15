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
import { getQueryFn, apiRequest } from "@/lib/queryClient";
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

// Componente de card para projetos recentes
function ProjetoCard({ projeto, onDelete }: { projeto: any, onDelete?: (id: number) => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState(projeto.status);
  const [showSelectionsModal, setShowSelectionsModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente": return "bg-yellow-100 text-yellow-800";
      case "revisado": return "bg-blue-100 text-blue-800";
      case "finalizado": return "bg-green-100 text-green-800";
      case "arquivado": return "bg-gray-100 text-gray-800";
      case "reaberto": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
  };
  
  const handleReabrirProjeto = () => {
    // Simular reabertura do projeto
    toast({
      title: "Projeto reaberto",
      description: `O projeto "${projeto.nome}" foi reaberto com sucesso.`,
    });
    
    // Em um app real, faríamos uma chamada API para atualizar o status
    projeto.status = "reaberto";
    setStatus("reaberto");
  };
  
  const handleEditarGaleria = () => {
    // Simulação - em uma aplicação real, redirecionaria para uma página de edição
    toast({
      title: "Edição de galeria",
      description: `Abrindo galeria do projeto "${projeto.nome}" para edição.`,
    });
    
    // Redirecionar para uma página fictícia de edição de galeria
    setLocation(`/project/${projeto.id}/edit`);
  };
  
  const handleVerSelecoes = () => {
    setShowSelectionsModal(true);
  };
  
  const handleDeleteProject = async () => {
    try {
      setIsDeleting(true);
      
      // Solução 1: Excluir do localStorage diretamente
      // Este método garantirá que o projeto seja removido independentemente de como o backend responde
      try {
        const storedProjects = localStorage.getItem('projects');
        if (storedProjects) {
          const parsedProjects = JSON.parse(storedProjects);
          const updatedProjects = parsedProjects.filter((p: any) => p.id !== projeto.id);
          localStorage.setItem('projects', JSON.stringify(updatedProjects));
        }
      } catch (storageError) {
        console.error('Erro ao remover do localStorage:', storageError);
      }
      
      // Solução 2: Tentar excluir também via API
      try {
        await fetch(`/api/projects/${projeto.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        // Mesmo se a API falhar, continuamos com a exclusão local
      } catch (apiError) {
        console.warn('API de exclusão falhou, mas o projeto foi removido localmente:', apiError);
      }
      
      // Exibir notificação de sucesso
      toast({
        title: "Projeto excluído",
        description: `O projeto "${projeto.nome}" foi excluído com sucesso.`,
      });
      
      // Chamar callback para atualizar a lista de projetos
      if (onDelete) {
        onDelete(projeto.id);
      }
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o projeto. Tente novamente mais tarde.",
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
            <CardTitle className="text-lg font-bold">{projeto.nome}</CardTitle>
            <CardDescription className="text-sm mt-1">{projeto.cliente}</CardDescription>
          </div>
          <Badge className={getStatusColor(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center text-sm text-gray-500 mt-2">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{formatarData(projeto.data)}</span>
        </div>
        <div className="flex justify-between mt-3">
          <div className="flex items-center text-sm">
            <Camera className="h-4 w-4 mr-1 text-gray-500" />
            <span>{projeto.fotos} fotos</span>
          </div>
          <div className="flex items-center text-sm">
            <FileText className="h-4 w-4 mr-1 text-gray-500" />
            <span>{projeto.selecionadas} selecionadas</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          {/* Botão de excluir projeto */}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Excluir
            <X className="h-3 w-3 ml-1" />
          </Button>
          
          {/* Botão de ver seleções - disponível para projetos com seleções */}
          {projeto.selecionadas > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={handleVerSelecoes}
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
            onClick={() => setLocation(`/project/${projeto.id}`)}
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
              // Copiar o link para o cliente
              const clientUrl = `${window.location.origin}/project-view/${projeto.id}`;
              console.log("Copiando link do cliente:", clientUrl);
              navigator.clipboard.writeText(clientUrl);
              toast({
                title: "Link copiado",
                description: "Link para o cliente copiado para a área de transferência.",
              });
            }}
          >
            Link do Cliente
            <Link className="h-3 w-3 ml-1" />
          </Button>
          
          {status === "arquivado" && (
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800"
              onClick={handleReabrirProjeto}
            >
              Reabrir Projeto
              <RotateCcw className="h-3 w-3 ml-1" />
            </Button>
          )}
          
          {(status === "pendente" || status === "revisado" || status === "reaberto") && (
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800"
              onClick={handleEditarGaleria}
            >
              Editar Galeria
            </Button>
          )}
        </div>
      </CardFooter>
      
      {/* Modal para confirmar exclusão do projeto */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Projeto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o projeto "{projeto.nome}"? Esta ação não pode ser desfeita.
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
      
      {/* Modal para visualizar seleções */}
      <Dialog open={showSelectionsModal} onOpenChange={setShowSelectionsModal}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Fotos Selecionadas - {projeto.nome}</DialogTitle>
            <DialogDescription>
              O cliente selecionou {projeto.selecionadas} de {projeto.fotos} fotos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-4">
            {projeto.photos.filter((photo: any) => photo.selected).map((photo: any) => (
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
      
      // Make API request with FormData
      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Erro ao criar projeto");
      }
      
      const result = await response.json();
      console.log("Projeto criado:", result);
      
      // Show success notification
      toast({
        title: "Project created successfully",
        description: `Project "${data.projectName}" was created with ${selectedFiles.length} photos.`,
      });
      
      // Call onUpload callback with the created project
      onUpload(result);
      
      // Reset form and close modal
      setSelectedFiles([]);
      setThumbnails([]);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error during upload:", error);
      toast({
        title: "Error creating project",
        description: "An error occurred during the upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Fill in the project details and upload the photos.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: John and Mary's Wedding" {...field} />
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
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: John Smith" {...field} />
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
                  <FormLabel>Client Email</FormLabel>
                  <FormControl>
                    <Input placeholder="client@example.com" {...field} />
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
                  <FormLabel>Event Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Project Photos
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
                    Click or drag photos to upload
                  </p>
                  <p className="text-xs text-gray-400">
                    (Accepted formats: JPG, PNG, WEBP)
                  </p>
                </div>
              </div>
            </div>
            
            {thumbnails.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">
                  {thumbnails.length} photo(s) selected
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Create Project"
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
function Statistics() {
  // Statistics data
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/user/stats"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Current user plan
  const userQuery = useQuery<any>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  const planInfo = userQuery.data?.planInfo || {
    planType: "free",
    uploadLimit: 50,
    usedUploads: 23,
    percentageUsed: 46
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Active projects card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <BarChart className="h-5 w-5 mr-2 text-blue-500" />
            Active Projects
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
                Projects in progress
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
            Monthly Uploads
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
                Photos uploaded this month
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
            Plan: {planInfo.planType.charAt(0).toUpperCase() + planInfo.planType.slice(1)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-500">Upload Usage</span>
            <span className="text-sm font-medium">
              {planInfo.usedUploads} / {planInfo.planType === "unlimited" ? "∞" : planInfo.uploadLimit}
            </span>
          </div>
          <Progress value={planInfo.planType === "unlimited" ? 0 : planInfo.percentageUsed} className="h-2" />
          <p className="text-xs text-gray-500 mt-2">
            {planInfo.planType === "unlimited" 
              ? "Plan with unlimited uploads" 
              : `${planInfo.percentageUsed}% of upload limit used`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Dashboard component
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  
  // Estado para gerenciar projetos
  const [projetos, setProjetos] = useState<any[]>([]);
  const [filteredProjetos, setFilteredProjetos] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado para o modal de upload
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Carregar projetos
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        
        // Try to get from localStorage first
        let storedProjects = localStorage.getItem('projects');
        if (storedProjects) {
          const parsedProjects = JSON.parse(storedProjects);
          if (parsedProjects.length > 0) {
            console.log("Projetos carregados do localStorage:", parsedProjects.length);
            setProjetos(parsedProjects);
            setFilteredProjetos(parsedProjects);
            setIsLoading(false);
            return;
          }
        }
        
        // If not in localStorage, fetch from API
        const response = await fetch('/api/projects');
        
        if (!response.ok) {
          throw new Error("Erro ao carregar projetos");
        }
        
        const data = await response.json();
        console.log("Projetos carregados da API:", data.length);
        
        // Save to localStorage for future use
        localStorage.setItem('projects', JSON.stringify(data));
        
        setProjetos(data);
        setFilteredProjetos(data);
      } catch (e) {
        console.error("Error loading data:", e);
        toast({
          title: "Error loading data",
          description: "An error occurred while loading projects. Please refresh the page.",
          variant: "destructive",
        });
        
        // Fallback to example projects if API call fails
        setProjetos(PROJETOS_EXEMPLO);
        setFilteredProjetos(PROJETOS_EXEMPLO);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjects();
  }, [toast]);
  
  const handleLogout = () => {
    // First remove from localStorage for backwards compatibility
    localStorage.removeItem("user");
    localStorage.removeItem("projects");
    
    // Then trigger the logout mutation to clear the auth state
    logoutMutation.mutate();
    
    // Redirect to auth page after logout
    setLocation("/auth");
  };
  
  // Handler para exclusão de projeto
  const handleDeleteProject = (id: number) => {
    // Remover o projeto do estado
    setProjetos(prevProjetos => prevProjetos.filter(projeto => projeto.id !== id));
    
    // Atualizar projetos filtrados também
    setFilteredProjetos(prevProjetos => prevProjetos.filter(projeto => projeto.id !== id));
  };
  
  // Handler para criação de projeto
  const handleProjectCreated = (newProject: any) => {
    const updatedProjetos = [newProject, ...projetos];
    setProjetos(updatedProjetos);
    
    // Atualizar projetos filtrados com base na aba atual
    if (currentTab === "all" || newProject.status === getStatusFilter(currentTab)) {
      setFilteredProjetos([newProject, ...filteredProjetos]);
    }
    
    // Atualizar localStorage
    localStorage.setItem('projects', JSON.stringify(updatedProjetos));
  };
  
  // Função para converter a aba atual em um filtro de status
  const getStatusFilter = (tab: string) => {
    switch (tab) {
      case "pending": return "pendente";
      case "reviewed": return "revisado";
      case "completed": return "finalizado";
      case "archived": return "arquivado";
      default: return "";
    }
  };
  
  // Filter projects by tab and search query
  useEffect(() => {
    let filtered = [...projetos];
    
    // Apply tab filter
    if (currentTab !== "all") {
      const statusFilter = getStatusFilter(currentTab);
      filtered = filtered.filter(projeto => projeto.status === statusFilter);
    }
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        projeto => 
          projeto.nome.toLowerCase().includes(query) ||
          projeto.cliente.toLowerCase().includes(query) ||
          projeto.emailCliente.toLowerCase().includes(query)
      );
    }
    
    setFilteredProjetos(filtered);
  }, [currentTab, searchQuery, projetos]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto py-4 px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">PhotoFlow</h1>
            
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
                  <p className="font-medium">{user?.name || "Usuário"}</p>
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
        <Statistics />
        
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
              <TabsTrigger value="archived">Archived</TabsTrigger>
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
              ) : filteredProjetos.length === 0 ? (
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
                  {filteredProjetos.map((projeto) => (
                    <ProjetoCard 
                      key={projeto.id} 
                      projeto={projeto} 
                      onDelete={handleDeleteProject}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            {["pending", "reviewed", "completed", "archived"].map(tab => (
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
                ) : filteredProjetos.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded-lg">
                    <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      Nenhum projeto {getStatusFilter(tab)}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Os projetos aparecerão aqui quando forem marcados como {getStatusFilter(tab)}.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjetos.map((projeto) => (
                      <ProjetoCard 
                        key={projeto.id} 
                        projeto={projeto} 
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
      
      {/* Modal para upload de novos projetos */}
      <UploadModal 
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleProjectCreated}
      />
    </div>
  );
}