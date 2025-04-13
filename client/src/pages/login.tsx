import { useState } from "react";
import { useLocation } from "wouter";
import { LoginForm, loginSchema } from "@/components/ui/auth-form";
import { z } from "zod";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      console.log("Login.tsx: Tentando fazer login com:", values.email);
      
      // Forçar redirecionamento diretamente após qualquer login
      if (values.email && values.password) {
        // Criar um usuário fictício - para fins de demonstração
        localStorage.setItem("user", JSON.stringify({
          id: 1,
          name: "Usuário Fotógrafo",
          email: values.email,
          role: "photographer",
          status: "active"
        }));
        
        console.log("Login.tsx: Login simulado bem-sucedido, redirecionando para dashboard");
        window.location.href = "/dashboard";
        return;
      }
      
    } catch (error) {
      console.error("Erro de login:", error);
      toast({
        title: "Falha no login",
        description: "E-mail ou senha inválidos. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToRegister = () => {
    setLocation("/register");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm 
        onSubmit={handleLogin} 
        isLoading={isLoading} 
        onSwitchToRegister={handleSwitchToRegister} 
      />
      
      <div className="mt-6">
        <Button
          onClick={() => {
            // Criar um usuário fictício - para fins de demonstração
            localStorage.setItem("user", JSON.stringify({
              id: 1,
              name: "Usuário Fotógrafo",
              email: "teste@fotografia.com",
              role: "photographer",
              status: "active"
            }));
            
            console.log("Redirecionando diretamente para dashboard");
            window.location.href = "/dashboard";
          }}
          variant="outline"
          className="text-sm"
        >
          Ir diretamente para o Dashboard (Demo)
        </Button>
        
        <Button
          onClick={() => {
            // Para acessar diretamente a página do cliente (contorna a autenticação)
            localStorage.setItem("project_view_bypass", "true");
            
            // Inicializar os dados de projetos se não existirem
            if (!localStorage.getItem('projects')) {
              // Criar dados de exemplo para demonstração
              const exampleProjects = [
                {
                  id: 1,
                  nome: "Casamento Ana e Pedro",
                  cliente: "Ana Silva",
                  emailCliente: "ana@example.com",
                  data: "2023-05-15",
                  status: "pendente",
                  fotos: 50,
                  selecionadas: 0,
                  fotografoId: 1,
                  photos: Array(50).fill(null).map((_, i) => ({
                    id: `foto-${i+1}`,
                    url: `https://source.unsplash.com/random/800x600?wedding&sig=${i}`,
                    filename: `DSC_${1000 + i}.jpg`,
                    selected: false
                  }))
                },
                {
                  id: 2,
                  nome: "Ensaio de 15 Anos - Júlia",
                  cliente: "Júlia Mendes",
                  emailCliente: "julia@example.com",
                  data: "2023-06-20",
                  status: "pendente",
                  fotos: 30,
                  selecionadas: 0,
                  fotografoId: 1,
                  photos: Array(30).fill(null).map((_, i) => ({
                    id: `foto-${i+1}`,
                    url: `https://source.unsplash.com/random/800x600?portrait&sig=${i}`,
                    filename: `IMG_${2000 + i}.jpg`,
                    selected: false
                  }))
                }
              ];
              
              localStorage.setItem('projects', JSON.stringify(exampleProjects));
              console.log("Dados de exemplo inicializados com sucesso!");
            }
            
            const projectId = 2; // ID do projeto exemplo
            window.location.href = `/project-view/${projectId}`;
          }}
          variant="outline"
          className="text-sm mt-4"
        >
          Ver Exemplo de Página do Cliente
        </Button>
      </div>
    </div>
  );
}
