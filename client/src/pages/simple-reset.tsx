import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Esquema de validação
const resetPasswordSchema = z.object({
  email: z.string().email("Digite um email válido"),
  newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function SimpleResetPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configurar o formulário com valores padrão
  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  // Função de submissão do formulário
  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsSubmitting(true);

      // Enviar requisição para resetar a senha de forma simplificada
      const response = await apiRequest("POST", "/api/password/reset-simple", {
        email: data.email,
        newPassword: data.newPassword
      });

      if (response.ok) {
        const result = await response.json();
        
        // Exibir mensagem de sucesso
        toast({
          title: "Senha redefinida com sucesso",
          description: "Você pode fazer login com sua nova senha agora.",
          variant: "default",
        });

        // Redirecionar para a página de login após 2 segundos
        setTimeout(() => {
          setLocation("/auth");
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao redefinir senha");
      }
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      
      toast({
        title: "Falha na redefinição de senha",
        description: error instanceof Error ? error.message : "Verifique seu email e tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Redefinir sua senha</CardTitle>
          <CardDescription>
            Digite seu email e a nova senha para recuperar sua conta
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="seu.email@exemplo.com" 
                        type="email"
                        autoComplete="email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite sua nova senha" 
                        type="password"
                        autoComplete="new-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirme a nova senha</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite novamente sua nova senha" 
                        type="password"
                        autoComplete="new-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processando..." : "Redefinir Senha"}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Lembrou sua senha? <Link href="/auth" className="font-medium text-blue-600 hover:text-blue-500">Voltar para o login</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}