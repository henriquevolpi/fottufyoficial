import { useEffect, useState } from "react";
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
import { ArrowLeftCircle, Loader2, Save } from "lucide-react";
import { Project } from "@shared/schema";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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
    </div>
  );
}