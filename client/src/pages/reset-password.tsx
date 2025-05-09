import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Loader2, AlertCircle, Check, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Schema de validação
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
    confirmPassword: z
      .string()
      .min(6, { message: "A confirmação da senha é obrigatória" }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

type ResetPasswordPageProps = {
  token?: string;
};

export default function ResetPasswordPage({ token: propToken }: ResetPasswordPageProps = {}) {
  const [location, setLocation] = useLocation();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Verificar primeiro se o token foi passado como prop (para o caso de rota com parâmetro)
    if (propToken) {
      setToken(propToken);
      return;
    }
    
    // Verificar se existe um token salvo no localStorage (de uma página estática)
    const localStorageToken = window.localStorage.getItem('passwordResetToken');
    if (localStorageToken) {
      setToken(localStorageToken);
      // Limpar o token do localStorage após uso
      window.localStorage.removeItem('passwordResetToken');
      return;
    }
    
    // Se não, extrair token da query string
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setStatus("error");
      setErrorMessage("Token de redefinição não encontrado. Verifique se o link está correto ou solicite um novo.");
    }
  }, [propToken]);

  // Verificar se o token é válido
  const tokenQuery = useQuery({
    queryKey: ["verify-token", token],
    queryFn: async () => {
      if (!token) return { isValid: false };
      const res = await fetch(`/api/password/verify-token?token=${token}`);
      return await res.json();
    },
    enabled: !!token,
  });

  // Setup do formulário com react-hook-form
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Mutation para redefinir a senha
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const res = await apiRequest("POST", "/api/password/reset", data);
      return await res.json();
    },
    onSuccess: () => {
      setStatus("success");
      form.reset();
      
      // Redirecionar para a página de login após 3 segundos
      setTimeout(() => {
        setLocation("/auth");
      }, 3000);
    },
    onError: (error: any) => {
      setStatus("error");
      setErrorMessage(error.message || "Ocorreu um erro ao redefinir sua senha");
    },
  });

  const onSubmit = (data: ResetPasswordFormValues) => {
    if (!token) return;
    
    setStatus("idle");
    resetPasswordMutation.mutate({
      token,
      password: data.password,
    });
  };

  // Renderizar diferentes estados
  if (tokenQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Verificando token de redefinição...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenQuery.isError || (tokenQuery.data && !tokenQuery.data.isValid)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Token inválido</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertDescription>
                O link de redefinição de senha é inválido ou expirou. Solicite um novo link.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/forgot-password">
              <Button>Solicitar novo link</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Senha alterada com sucesso!</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Sua senha foi alterada com sucesso. Você será redirecionado para a página de login em instantes.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/auth">
              <Button>Ir para login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Formulário de redefinição de senha
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Criar nova senha</CardTitle>
          <CardDescription className="text-center">
            Digite sua nova senha para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
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
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {status === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Redefinir senha"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}