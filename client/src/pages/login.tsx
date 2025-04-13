import { useState } from "react";
import { useLocation } from "wouter";
import { LoginForm, loginSchema } from "@/components/ui/auth-form";
import { z } from "zod";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      await login(values.email, values.password);
      
      // Redirect is handled in the auth provider
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm 
        onSubmit={handleLogin} 
        isLoading={isLoading} 
        onSwitchToRegister={handleSwitchToRegister} 
      />
    </div>
  );
}
