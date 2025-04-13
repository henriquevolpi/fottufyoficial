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
  RotateCcw
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
function ProjetoCard({ projeto }: { projeto: any }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState(projeto.status);
  
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
      <CardFooter className="p-4 pt-0 flex flex-wrap gap-2 justify-end">
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
      </CardFooter>
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
      
      // Em uma aplicação real, esta parte seria uma chamada à API
      // Aqui vamos simular armazenando no localStorage
      
      // Criar um novo ID baseado no timestamp atual
      const newProjectId = Date.now();
      
      // Simular URLs para as fotos (em um servidor real, estas seriam URLs reais após upload)
      const projectPhotos = selectedFiles.map((file, index) => ({
        id: `photo-${newProjectId}-${index}`,
        filename: file.name,
        url: thumbnails[index], // Em um app real, esta seria a URL do servidor
        selected: false
      }));
      
      // Criar objeto do projeto
      const newProject = {
        id: newProjectId,
        nome: values.nome,
        cliente: values.clienteNome,
        emailCliente: values.clienteEmail,
        data: new Date().toISOString(),
        status: "pendente",
        fotos: projectPhotos.length,
        selecionadas: 0,
        fotografoId: 1, // Aqui seria o ID do usuário logado
        photos: projectPhotos
      };
      
      // Obter projetos existentes ou iniciar array vazio
      const existingProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      
      // Adicionar novo projeto
      const updatedProjects = [...existingProjects, newProject];
      
      // Salvar no localStorage
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      
      // Exibir notificação de sucesso
      toast({
        title: "Projeto criado com sucesso!",
        description: `Projeto "${values.nome}" criado com ${projectPhotos.length} fotos.`,
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Clientes</p>
              <h3 className="text-2xl font-bold mt-1">36</h3>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Tempo Médio</p>
              <h3 className="text-2xl font-bold mt-1">3.2 dias</h3>
            </div>
            <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
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
        // Não temos projetos salvos, inicializar com exemplos
        console.log("Não há projetos salvos. Inicializando com exemplos.");
        localStorage.setItem('projects', JSON.stringify(PROJETOS_EXEMPLO));
        
        setTimeout(() => {
          setProjetos(PROJETOS_EXEMPLO);
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
  
  const filteredProjetos = projetos.filter(
    projeto => projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
               projeto.cliente.toLowerCase().includes(searchTerm.toLowerCase())
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
                Sair
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
              Novo Projeto
            </Button>
          </div>
        </div>
        
        <Estatisticas />
        
        <Tabs defaultValue="todos" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <TabsList className="mb-4 sm:mb-0">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
              <TabsTrigger value="revisados">Revisados</TabsTrigger>
              <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
            </TabsList>
            
            <div className="flex w-full sm:w-auto space-x-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Buscar projetos..."
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
                  <ProjetoCard key={projeto.id} projeto={projeto} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  Nenhum projeto encontrado
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Não encontramos projetos correspondentes à sua busca.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setSearchTerm("")}>
                    Limpar filtros
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pendentes">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projetos
                .filter(projeto => projeto.status === "pendente")
                .filter(projeto => 
                  projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  projeto.cliente.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((projeto) => (
                  <ProjetoCard key={projeto.id} projeto={projeto} />
                ))
              }
            </div>
          </TabsContent>
          
          <TabsContent value="revisados">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projetos
                .filter(projeto => projeto.status === "revisado")
                .filter(projeto => 
                  projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  projeto.cliente.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((projeto) => (
                  <ProjetoCard key={projeto.id} projeto={projeto} />
                ))
              }
            </div>
          </TabsContent>
          
          <TabsContent value="arquivados">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projetos
                .filter(projeto => projeto.status === "arquivado")
                .filter(projeto => 
                  projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  projeto.cliente.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((projeto) => (
                  <ProjetoCard key={projeto.id} projeto={projeto} />
                ))
              }
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2023 PhotoFlow. Todos os direitos reservados.
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
