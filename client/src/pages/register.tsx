import { useState } from "react";
import { useLocation } from "wouter";
import { RegisterForm, registerSchema } from "@/components/ui/auth-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (values: RegisterFormValues) => {
    try {
      setIsLoading(true);
      
      // Register user
      await apiRequest("POST", "/api/register", {
        name: values.name,
        email: values.email,
        password: values.password,
      });
      
      toast({
        title: "Registro realizado com sucesso",
        description: "Você já pode entrar com suas credenciais.",
      });
      
      // Redirect to login
      setLocation("/login");
    } catch (error) {
      console.error("Erro no registro:", error);
      toast({
        title: "Falha no registro",
        description: "Não foi possível criar a conta. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLogin = () => {
    setLocation("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <RegisterForm 
        onSubmit={handleRegister} 
        isLoading={isLoading} 
        onSwitchToLogin={handleSwitchToLogin} 
      />
    </div>
  );
}
