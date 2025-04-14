import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
            {projeto.photos.filter(photo => photo.selected).map((photo) => (
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

// Componente de Modal para Upload de Novos Projetos
function UploadModal({
  open,
  onClose,
  onProjectCreated
}: {
  open: boolean;
  onClose: () => void;
  onProjectCreated?: (newProject: any) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Schema do formulário
  const formSchema = z.object({
    nome: z.string().min(3, "Nome do projeto deve ter pelo menos 3 caracteres"),
    clienteNome: z.string().min(2, "Nome do cliente deve ter pelo menos 2 caracteres"),
    clienteEmail: z.string().email("E-mail inválido"),
  });
  
  // Formulário para dados do projeto
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      clienteNome: "",
      clienteEmail: ""
    }
  });
  
  // Limpar formulário ao fechar
  useEffect(() => {
    if (!open) {
      form.reset();
      setSelectedFiles([]);
      setThumbnails(prev => {
        // Limpar URLs de objeto
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
      setIsDragging(false);
    }
  }, [open, form]);

  // Manipuladores de evento para drag & drop
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      setSelectedFiles(prev => [...prev, ...imageFiles]);
      
      // Criar thumbnails
      const newThumbnails = imageFiles.map(file => URL.createObjectURL(file));
      setThumbnails(prev => [...prev, ...newThumbnails]);
    }
  }, []);

  // Manipulador para seleção de arquivos pelo input file
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      setSelectedFiles(prev => [...prev, ...imageFiles]);
      
      // Criar thumbnails
      const newThumbnails = imageFiles.map(file => URL.createObjectURL(file));
      setThumbnails(prev => [...prev, ...newThumbnails]);
    }
  };
  
  // Remover um arquivo específico
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Revogar URL e remover
    URL.revokeObjectURL(thumbnails[index]);
    setThumbnails(prev => prev.filter((_, i) => i !== index));
  };

  // Enviar formulário
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione pelo menos uma foto para upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Preparar as fotos para o upload com sample URLs persistentes
      // Usar URLs de imagens públicas que são acessíveis de qualquer lugar para demo
      const projectPhotos = selectedFiles.map((file, index) => {
        // Gerar URLs persistentes baseados em serviços públicos de imagens
        const publicUrls = [
          'https://source.unsplash.com/random/800x600/?wedding',
          'https://source.unsplash.com/random/800x600/?portrait', 
          'https://source.unsplash.com/random/800x600/?family',
          'https://source.unsplash.com/random/800x600/?landscape',
          'https://source.unsplash.com/random/800x600/?nature',
          'https://source.unsplash.com/random/800x600/?architecture'
        ];
        
        // Usar um URL persistente baseado no índice (com loop para garantir que sempre haverá um URL)
        const persistentUrl = publicUrls[index % publicUrls.length];
        
        return {
          filename: file.name,
          url: persistentUrl, // URL persistente que qualquer um pode acessar
        };
      });
      
      // Obter o ID do usuário logado (ou usar 1 como fallback)
      const user = JSON.parse(localStorage.getItem('user') || '{"id": 1}');
      
      // Preparar dados do projeto para a API
      const projectData = {
        name: values.nome,
        clientName: values.clienteNome,
        clientEmail: values.clienteEmail,
        photographerId: user.id,
        photos: projectPhotos
      };
      
      console.log("Enviando projeto para a API:", projectData);
      
      // Enviar para a API
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
        credentials: 'include' // Importante para enviar cookies
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro da API:", errorData);
        throw new Error(errorData.message || "Erro ao criar projeto");
      }
      
      // Obter o projeto criado com o ID gerado pelo backend
      const newProject = await response.json();
      console.log("Projeto criado com sucesso na API:", newProject);
      
      // Adaptar o formato para o frontend
      const adaptedProject = {
        id: newProject.id,
        nome: newProject.name,
        cliente: newProject.clientName,
        emailCliente: newProject.clientEmail,
        data: newProject.createdAt || new Date().toISOString(),
        status: newProject.status || "pendente",
        fotos: newProject.photos ? newProject.photos.length : 0,
        selecionadas: 0,
        fotografoId: newProject.photographerId,
        photos: newProject.photos ? newProject.photos.map((p: any) => ({
          id: p.id,
          filename: p.filename,
          url: p.url,
          selected: false
        })) : []
      };
      
      // Armazenar também no localStorage para compatibilidade
      const existingProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      const updatedProjects = [...existingProjects, adaptedProject];
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      
      // Gerar link público para compartilhamento
      const projectLink = `${window.location.origin}/project-view/${newProject.id}`;
      console.log("Link para compartilhamento criado:", projectLink);
      
      // Exibir notificação de sucesso com instruções para copiar o link
      toast({
        title: "Projeto criado com sucesso!",
        description: `Projeto "${values.nome}" criado com ID ${newProject.id}. Você pode compartilhar o link com o cliente.`,
        duration: 5000,
      });
      
      // Fechar modal
      onClose();
      
      // Atualizar a lista de projetos atualizando o estado (melhor que reload da página)
      if (onProjectCreated) {
        onProjectCreated(newProject);
      }
      
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      toast({
        title: "Erro ao criar projeto",
        description: "Ocorreu um erro ao tentar criar o projeto. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do projeto e faça upload das fotos.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Projeto</FormLabel>
                    <FormControl>
                      <Input placeholder="Casamento João e Maria" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="clienteNome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="clienteEmail"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>E-mail do Cliente</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="cliente@exemplo.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <FormLabel htmlFor="photos">Fotos</FormLabel>
              <div
                className={`mt-2 border-2 border-dashed rounded-md ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border'
                } relative`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  id="photos"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
                
                <div className="py-8 text-center">
                  <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Selecionar Arquivos
                    </Button>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ou arraste e solte imagens aqui
                  </p>
                </div>
              </div>
            </div>
            
            {selectedFiles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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

// Componente de estatísticas
function Estatisticas() {
  const [, setLocation] = useLocation();
  const [user] = useState<any>(() => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      console.error("Erro ao carregar usuário do localStorage:", e);
      return null;
    }
  });
  
  // Formatar tipo de plano para exibição
  const getPlanDisplayInfo = (planType: string) => {
    switch(planType) {
      case 'basic': return { name: 'Básico', color: 'bg-blue-100', textColor: 'text-blue-600' };
      case 'standard': return { name: 'Padrão', color: 'bg-green-100', textColor: 'text-green-600' };
      case 'professional': return { name: 'Profissional', color: 'bg-purple-100', textColor: 'text-purple-600' };
      default: return { name: 'Gratuito', color: 'bg-gray-100', textColor: 'text-gray-600' };
    }
  };
  
  const planInfo = user?.subscription?.plan 
    ? getPlanDisplayInfo(user.subscription.plan) 
    : { name: 'Gratuito', color: 'bg-gray-100', textColor: 'text-gray-600' };
  
  // Calcular uso de armazenamento
  const getUsagePercentage = () => {
    if (!user?.subscription?.uploadLimit) return 0;
    
    // Handle unlimited plan
    if (user.subscription.uploadLimit === -1) return 0;
    
    const used = user.uploadUsage || 0;
    const limit = user.subscription.uploadLimit;
    return Math.min(Math.round((used / limit) * 100), 100);
  };
  
  const usagePercentage = getUsagePercentage();
  const isUnlimited = user?.subscription?.uploadLimit === -1;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Projetos Ativos</p>
              <h3 className="text-2xl font-bold mt-1">12</h3>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Fotos Este Mês</p>
              <h3 className="text-2xl font-bold mt-1">1.284</h3>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <Camera className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-500">Plano Atual</p>
                <h3 className="text-xl font-bold mt-1">{planInfo.name}</h3>
              </div>
              <div className={`h-12 w-12 ${planInfo.color} rounded-full flex items-center justify-center`}>
                <CreditCard className={`h-6 w-6 ${planInfo.textColor}`} />
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-auto"
              onClick={() => setLocation('/subscription')}
            >
              <Settings className="h-4 w-4 mr-1" />
              Gerenciar Assinatura
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="w-full">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-500">Uso de Upload</p>
                  <p className="text-sm font-medium">
                    {isUnlimited ? (
                      <Badge className="bg-purple-100 text-purple-600 hover:bg-purple-100">Ilimitado</Badge>
                    ) : (
                      `${usagePercentage}%`
                    )}
                  </p>
                </div>
                {!isUnlimited && (
                  <Progress 
                    value={usagePercentage} 
                    className="h-2 mt-2"
                    color={usagePercentage > 90 ? "bg-red-500" : ""}
                  />
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {isUnlimited ? (
                    "Your plan allows unlimited uploads"
                  ) : (
                    `${user?.uploadUsage || 0} of ${user?.subscription?.uploadLimit || 0} photos`
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Página principal do Dashboard
export default function Dashboard() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Verificar se há parâmetros de assinatura na URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscriptionStatus = params.get('subscription_status');
    const planType = params.get('plan');
    
    if (subscriptionStatus === 'success' && planType) {
      // Mostrar notificação de assinatura confirmada
      const planName = getPlanName(planType);
      
      toast({
        title: "✅ Assinatura confirmada!",
        description: `Seu plano ${planName} está ativo agora.`,
        duration: 5000,
      });
      
      // Limpar parâmetros da URL sem recarregar a página
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [toast]);
  
  // Obter nome do plano baseado no tipo
  const getPlanName = (planType: string) => {
    switch(planType) {
      case 'basic': return 'Básico';
      case 'standard': return 'Padrão';
      case 'professional': return 'Profissional';
      default: return planType;
    }
  };
  
  useEffect(() => {
    try {
      // Obter usuário do localStorage
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        console.log("Dashboard carregado - usuário:", userData);
      } else {
        console.log("Nenhum usuário encontrado no localStorage");
      }
      
      // Carregar projetos existentes ou inicializar com exemplos
      const projetosStr = localStorage.getItem('projects');
      
      if (projetosStr) {
        // Já temos projetos salvos, vamos usá-los
        const projetosSalvos = JSON.parse(projetosStr);
        console.log("Projetos carregados do localStorage:", projetosSalvos.length);
        
        setTimeout(() => {
          setProjetos(projetosSalvos);
          setIsLoading(false);
        }, 600);
      } else {
        // Não temos projetos salvos, inicializar com array vazio
        console.log("Não há projetos salvos. Iniciando com dashboard vazio.");
        localStorage.setItem('projects', JSON.stringify([]));
        
        setTimeout(() => {
          setProjetos([]);
          setIsLoading(false);
        }, 600);
      }
      
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro ao carregar os projetos. Por favor, recarregue a página.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [toast]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setLocation("/login");
  };
  
  // Handler para exclusão de projeto
  const handleDeleteProject = (id: number) => {
    // Remover o projeto do estado
    setProjetos(prevProjetos => prevProjetos.filter(projeto => projeto.id !== id));
    
    // Remover também do localStorage, se existir
    try {
      const storedProjects = localStorage.getItem('projects');
      if (storedProjects) {
        const parsedProjects = JSON.parse(storedProjects);
        const updatedProjects = parsedProjects.filter((project: any) => project.id !== id);
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
      }
    } catch (error) {
      console.error('Erro ao remover projeto do localStorage:', error);
    }
  };
  
  const filteredProjetos = projetos.filter(
    projeto => {
      // Verificar se os campos existem antes de acessá-los (compatibilidade com backend/frontend)
      const projectName = projeto.nome || projeto.name || '';
      const clientName = projeto.cliente || projeto.clientName || '';
      
      return projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             clientName.toLowerCase().includes(searchTerm.toLowerCase());
    }
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              PhotoFlow
            </h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-right">
                <p className="text-gray-900 font-medium">{user?.name}</p>
                <p className="text-gray-500">{user?.email}</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
              Dashboard
            </h2>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Button 
              className="inline-flex items-center"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              New Project
            </Button>
          </div>
        </div>
        
        <Estatisticas />
        
        <Tabs defaultValue="todos" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <TabsList className="mb-4 sm:mb-0">
              <TabsTrigger value="todos">All</TabsTrigger>
              <TabsTrigger value="pendentes">Pending</TabsTrigger>
              <TabsTrigger value="revisados">Reviewed</TabsTrigger>
              <TabsTrigger value="arquivados">Archived</TabsTrigger>
            </TabsList>
            
            <div className="flex w-full sm:w-auto space-x-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  className="pl-8 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <TabsContent value="todos">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="p-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-2/4 mt-2" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-end">
                      <Skeleton className="h-8 w-24" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : filteredProjetos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjetos.map((projeto) => (
                  <ProjetoCard 
                    key={projeto.id} 
                    projeto={projeto} 
                    onDelete={handleDeleteProject}
                  />
                ))}
              </div>
            ) : searchTerm ? (
              <div className="text-center py-12">
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  No projects found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  We couldn't find any projects matching your search.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setSearchTerm("")}>
                    Clear filters
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Camera className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No projects yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Click the "New Project" button above to create your first gallery.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setIsUploadModalOpen(true)}>
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Create First Project
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pendentes">
            {projetos.filter(projeto => projeto.status === "pendente").length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projetos
                  .filter(projeto => projeto.status === "pendente")
                  .filter(projeto => {
                    // Verificar se os campos existem antes de acessá-los (compatibilidade)
                    const projectName = projeto.nome || projeto.name || '';
                    const clientName = projeto.cliente || projeto.clientName || '';
                    
                    return projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          clientName.toLowerCase().includes(searchTerm.toLowerCase());
                  })
                  .map((projeto) => (
                    <ProjetoCard 
                      key={projeto.id} 
                      projeto={projeto} 
                      onDelete={handleDeleteProject}
                    />
                  ))
                }
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  No pending projects
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create a new project to get started.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setIsUploadModalOpen(true)}>
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Create Project
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="revisados">
            {projetos.filter(projeto => projeto.status === "revisado").length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projetos
                  .filter(projeto => projeto.status === "revisado")
                  .filter(projeto => {
                    // Verificar se os campos existem antes de acessá-los (compatibilidade)
                    const projectName = projeto.nome || projeto.name || '';
                    const clientName = projeto.cliente || projeto.clientName || '';
                    
                    return projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          clientName.toLowerCase().includes(searchTerm.toLowerCase());
                  })
                  .map((projeto) => (
                    <ProjetoCard 
                      key={projeto.id} 
                      projeto={projeto} 
                      onDelete={handleDeleteProject}
                    />
                  ))
                }
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  No reviewed projects
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Projects will appear here after clients have made their selections.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setIsUploadModalOpen(true)}>
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Create Project
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="arquivados">
            {projetos.filter(projeto => projeto.status === "arquivado").length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projetos
                  .filter(projeto => projeto.status === "arquivado")
                  .filter(projeto => {
                    // Verificar se os campos existem antes de acessá-los (compatibilidade)
                    const projectName = projeto.nome || projeto.name || '';
                    const clientName = projeto.cliente || projeto.clientName || '';
                    
                    return projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          clientName.toLowerCase().includes(searchTerm.toLowerCase());
                  })
                  .map((projeto) => (
                    <ProjetoCard 
                      key={projeto.id} 
                      projeto={projeto} 
                      onDelete={handleDeleteProject}
                    />
                  ))
                }
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  No archived projects
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Completed projects that you archive will appear here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2023 PhotoFlow. All rights reserved.
          </p>
        </div>
      </footer>
      
      {/* Modal de Upload de Projeto */}
      <UploadModal 
        open={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onProjectCreated={(newProject) => {
          // Adicionar o novo projeto à lista de projetos existentes
          setProjetos(prevProjetos => [...prevProjetos, newProject]);
        }}
      />
    </div>
  );
}
