import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeftCircle, Loader2, Save, Upload, X, ImagePlus } from "lucide-react";
import { Project } from "@shared/schema";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useDropzone } from "react-dropzone";
import { nanoid } from "nanoid";

// Esquema para validação do formulário
const projectEditSchema = z.object({
  name: z.string().min(3, { message: "O nome do projeto deve ter pelo menos 3 caracteres" }),
  clientName: z.string().min(3, { message: "O nome do cliente deve ter pelo menos 3 caracteres" }),
  clientEmail: z.string().email({ message: "Email inválido" }),
  status: z.string(),
  reopenSelection: z.boolean().optional()
});

type ProjectEditFormValues = z.infer<typeof projectEditSchema>;

export default function ProjectEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Função para lidar com os arquivos selecionados via drag-n-drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filtrar apenas imagens
    const imageFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/')
    );
    
    if (imageFiles.length === 0) {
      toast({
        title: "Arquivos inválidos",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive"
      });
      return;
    }
    
    // Gerar URLs de preview para as imagens
    const newUrls = imageFiles.map(file => URL.createObjectURL(file));
    
    setNewPhotos(prev => [...prev, ...imageFiles]);
    setPhotoPreviewUrls(prev => [...prev, ...newUrls]);
  }, [toast]);
  
  // Configurar o dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    }
  });
  
  // Remover uma foto da lista de upload
  const removePhoto = (index: number) => {
    // Liberar URL de preview
    URL.revokeObjectURL(photoPreviewUrls[index]);
    
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };
  
  // Função para fazer upload das novas fotos para o projeto
  const uploadPhotos = async () => {
    if (!project || newPhotos.length === 0) return;
    
    try {
      setIsUploading(true);
      
      // Processar as fotos para upload (converter para URL base64 para simplificar)
      const processedPhotos = await Promise.all(
        newPhotos.map(async (file) => {
          // Gerar um ID único para a foto
          const photoId = nanoid();
          
          // Ler o arquivo como base64 para salvar no localStorage
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
          
          const url = await base64Promise;
          
          return {
            id: photoId,
            url: url,
            filename: file.name,
            selected: false
          };
        })
      );
      
      // Primeiro tentar usar a API
      try {
        // Em um sistema real, faríamos upload para o servidor usando FormData
        // Aqui, simulamos adicionando as fotos ao projeto existente
        const response = await fetch(`/api/projects/${project.id}/photos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ photos: processedPhotos }),
        });
        
        if (response.ok) {
          // Sucesso! Limpar as fotos carregadas
          clearPhotos();
          
          toast({
            title: "Fotos adicionadas com sucesso",
            description: `${processedPhotos.length} nova(s) foto(s) adicionada(s) ao projeto.`,
          });
          
          // Recarregar o projeto para mostrar as novas fotos
          setTimeout(() => {
            setLocation(`/project/${project.id}`);
          }, 1000);
          
          return;
        } else {
          console.error("Erro ao adicionar fotos:", await response.text());
          // Continuar com o fallback para localStorage
        }
      } catch (apiError) {
        console.error("Erro na API ao adicionar fotos:", apiError);
        // Continuar com fallback para localStorage
      }
      
      // Fallback: Atualizar no localStorage
      const storedProjects = localStorage.getItem('projects');
      if (!storedProjects) {
        throw new Error('Erro ao atualizar: projetos não encontrados');
      }
      
      const projects = JSON.parse(storedProjects);
      const projectIndex = projects.findIndex((p: any) => p.id === project.id);
      
      if (projectIndex === -1) {
        throw new Error('Erro ao atualizar: projeto não encontrado');
      }
      
      // Atualizar o projeto com as novas fotos
      const updatedProject = { ...projects[projectIndex] };
      
      // Garantir que o projeto tenha um array de fotos
      if (!updatedProject.photos) {
        updatedProject.photos = [];
      }
      
      // Adicionar as novas fotos ao projeto
      updatedProject.photos = [...updatedProject.photos, ...processedPhotos];
      
      // Atualizar o contador de fotos
      updatedProject.fotos = updatedProject.photos.length;
      
      // Salvar no localStorage
      projects[projectIndex] = updatedProject;
      localStorage.setItem('projects', JSON.stringify(projects));
      
      // Limpar as fotos carregadas
      clearPhotos();
      
      toast({
        title: "Fotos adicionadas com sucesso",
        description: `${processedPhotos.length} nova(s) foto(s) adicionada(s) ao projeto.`,
      });
      
      // Recarregar o projeto para mostrar as novas fotos
      setTimeout(() => {
        setLocation(`/project/${project.id}`);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao adicionar fotos:', error);
      toast({
        title: "Erro ao adicionar fotos",
        description: "Ocorreu um problema ao adicionar novas fotos ao projeto.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Limpar todas as fotos da lista de upload
  const clearPhotos = () => {
    // Liberar todas as URLs de preview
    photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    
    setNewPhotos([]);
    setPhotoPreviewUrls([]);
  };

  // Inicializar o formulário com react-hook-form
  const form = useForm<ProjectEditFormValues>({
    resolver: zodResolver(projectEditSchema),
    defaultValues: {
      name: "",
      clientName: "",
      clientEmail: "",
      status: "pending",
      reopenSelection: false
    }
  });

  // Carregar dados do projeto para edição
  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        
        if (!id) {
          throw new Error('ID do projeto não fornecido');
        }
        
        const projectId = parseInt(id);
        if (isNaN(projectId)) {
          throw new Error('ID do projeto inválido');
        }
        
        console.log('Carregando projeto para edição, ID:', projectId);
        
        // Tentar carregar do backend primeiro
        try {
          const response = await fetch(`/api/projects/${projectId}`);
          if (response.ok) {
            const projectData = await response.json();
            setProject(projectData);
            
            // Preencher o formulário com os dados do projeto
            form.reset({
              name: projectData.name,
              clientName: projectData.clientName,
              clientEmail: projectData.clientEmail,
              status: projectData.status || "pending",
              reopenSelection: false
            });
            return;
          } else {
            throw new Error(`Erro ao carregar projeto: ${response.statusText}`);
          }
        } catch (apiError) {
          console.error('Erro ao buscar da API:', apiError);
          // Tentar carregar do localStorage como fallback
        }
        
        // Tentar carregar do localStorage como fallback
        const storedProjects = localStorage.getItem('projects');
        if (!storedProjects) {
          throw new Error('Nenhum projeto encontrado');
        }
        
        const projects = JSON.parse(storedProjects);
        const foundProject = projects.find((p: any) => p.id === projectId);
        
        if (!foundProject) {
          throw new Error('Projeto não encontrado');
        }
        
        setProject(foundProject);
        
        // Preencher o formulário com os dados do projeto
        form.reset({
          name: foundProject.nome || foundProject.name,
          clientName: foundProject.cliente || foundProject.clientName,
          clientEmail: foundProject.emailCliente || foundProject.clientEmail,
          status: foundProject.status || "pending",
          reopenSelection: false
        });
        
      } catch (error) {
        console.error('Erro ao carregar projeto para edição:', error);
        toast({
          title: "Erro ao carregar projeto",
          description: "Não foi possível carregar os dados do projeto para edição.",
          variant: "destructive",
        });
        // Voltar para a página anterior após um breve delay
        setTimeout(() => {
          setLocation("/dashboard");
        }, 1500);
      } finally {
        setLoading(false);
      }
    };
    
    loadProject();
  }, [id, toast, setLocation, form]);
  
  // Salvar alterações do projeto
  const onSubmit = async (data: ProjectEditFormValues) => {
    if (!project) return;
    
    try {
      setSaving(true);
      
      // Dados para atualização
      const updateData = {
        name: data.name,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        status: data.status
      };
      
      // Tentar atualizar no backend primeiro
      try {
        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });
        
        if (response.ok) {
          // Se a opção de reabrir seleção estiver marcada, fazer uma requisição adicional
          if (data.reopenSelection) {
            await fetch(`/api/projects/${project.id}/reopen`, {
              method: 'PATCH',
            });
          }
          
          toast({
            title: "Projeto atualizado",
            description: "As alterações foram salvas com sucesso.",
          });
          
          // Voltar para a visualização do projeto
          setTimeout(() => {
            setLocation(`/project/${project.id}`);
          }, 1000);
          return;
        } else {
          console.error("Erro ao atualizar projeto:", await response.text());
          throw new Error("Não foi possível atualizar o projeto no servidor");
        }
      } catch (apiError) {
        console.error("Erro na API:", apiError);
        // Continuar com fallback para localStorage
      }
      
      // Fallback para localStorage
      const storedProjects = localStorage.getItem('projects');
      if (!storedProjects) {
        throw new Error('Erro ao atualizar: projetos não encontrados');
      }
      
      const projects = JSON.parse(storedProjects);
      const projectIndex = projects.findIndex((p: any) => p.id === project.id);
      
      if (projectIndex === -1) {
        throw new Error('Erro ao atualizar: projeto não encontrado');
      }
      
      // Atualizar o projeto com os novos dados
      const updatedProject = { ...projects[projectIndex] };
      
      // Mapear os campos do formulário para o formato do projeto
      updatedProject.nome = data.name;
      updatedProject.cliente = data.clientName;
      updatedProject.emailCliente = data.clientEmail;
      updatedProject.status = data.status;
      
      // Se a opção de reabrir seleção estiver marcada
      if (data.reopenSelection) {
        updatedProject.status = "reopened";
        updatedProject.finalizado = false;
        
        // Limpar as seleções existentes
        if (updatedProject.photos && Array.isArray(updatedProject.photos)) {
          updatedProject.photos = updatedProject.photos.map((photo: any) => ({
            ...photo,
            selected: false
          }));
        }
        updatedProject.selecionadas = 0;
      }
      
      // Salvar no localStorage
      projects[projectIndex] = updatedProject;
      localStorage.setItem('projects', JSON.stringify(projects));
      
      toast({
        title: "Projeto atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      
      // Voltar para a visualização do projeto
      setTimeout(() => {
        setLocation(`/project/${project.id}`);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um problema ao salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-gray-600">Carregando dados do projeto...</p>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold mb-2">Projeto não encontrado</h1>
          <p className="text-gray-600 mb-6">
            O projeto que você está tentando editar não existe ou foi removido.
          </p>
          <Button onClick={() => setLocation("/dashboard")}>
            Voltar para Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="mr-4"
          onClick={() => setLocation(`/project/${project.id}`)}
        >
          <ArrowLeftCircle className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">Editar Projeto</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Informações do Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Projeto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Casamento Ana e Pedro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Ana Silva" {...field} />
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
                        <Input placeholder="Ex: cliente@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status do Projeto</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="reviewed">Revisado</SelectItem>
                        <SelectItem value="archived">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reopenSelection"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Reabrir seleção de fotos</FormLabel>
                      <FormDescription>
                        Permite que o cliente faça uma nova seleção de fotos, descartando qualquer seleção anterior.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/project/${project.id}`)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Seção para adicionar novas fotos */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Adicionar Novas Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-2">
              <ImagePlus className="h-10 w-10 text-gray-400" />
              <h3 className="text-lg font-medium">
                {isDragActive ? "Solte as imagens aqui..." : "Arraste e solte as fotos aqui"}
              </h3>
              <p className="text-sm text-gray-500">
                ou clique para selecionar arquivos
              </p>
            </div>
          </div>
          
          {/* Previews das fotos selecionadas */}
          {photoPreviewUrls.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">Novas fotos selecionadas ({photoPreviewUrls.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {photoPreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square overflow-hidden rounded-md border bg-gray-50">
                      <img 
                        src={url} 
                        alt={`Preview ${index}`} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border hover:bg-red-50"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {newPhotos[index]?.name}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Botão para fazer upload */}
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={uploadPhotos}
                  disabled={isUploading || photoPreviewUrls.length === 0}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Adicionar Fotos ao Projeto
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}