import { useState } from "react";
import { useLocation } from "wouter";
import { LoginForm, loginSchema } from "@/components/ui/auth-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { loginMutation } = useAuth();
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
        <div className="flex space-x-2">
          <Button
            onClick={() => {
              // Criar um usuário fotógrafo - para fins de demonstração
              localStorage.setItem("user", JSON.stringify({
                id: 1,
                name: "Usuário Fotógrafo",
                email: "teste@fotografia.com",
                role: "photographer",
                status: "active"
              }));
              
              console.log("Redirecionando para dashboard");
              window.location.href = "/dashboard";
            }}
            variant="outline"
            className="text-sm"
          >
            Acessar como Fotógrafo
          </Button>
          
          <Button
            onClick={() => {
              // Criar um usuário admin - para fins de demonstração
              localStorage.setItem("user", JSON.stringify({
                id: 2,
                name: "Admin",
                email: "admin@fotografia.com",
                role: "admin",
                status: "active"
              }));
              
              console.log("Redirecionando para admin");
              window.location.href = "/admin";
            }}
            variant="outline"
            className="text-sm bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
          >
            Acessar como Admin
          </Button>
        </div>
        
        <div className="relative mt-6 rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <h3 className="text-sm font-semibold mb-2">Acesso para Clientes</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Se você é cliente e recebeu um link para visualizar suas fotos, clique no botão abaixo.
          </p>
          <Button
            onClick={() => {
              const projectId = 2; // ID do projeto exemplo
              window.location.href = `/project-view/${projectId}`;
            }}
            variant="default"
            className="w-full"
          >
            Acessar Galeria do Cliente
          </Button>
        </div>
      </div>
    </div>
  );
}
