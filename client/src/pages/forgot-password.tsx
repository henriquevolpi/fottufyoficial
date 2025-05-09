import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Loader2, AlertCircle, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Schema de validação
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email é obrigatório" })
    .email({ message: "Email inválido" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Setup do formulário com react-hook-form
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Mutation para enviar o pedido de redefinição
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormValues) => {
      const res = await apiRequest("POST", "/api/password/forgot", data);
      return await res.json();
    },
    onSuccess: () => {
      setStatus("success");
      form.reset();
    },
    onError: (error: any) => {
      setStatus("error");
      setErrorMessage(error.message || "Ocorreu um erro ao processar sua solicitação");
    },
  });

  const onSubmit = (data: ForgotPasswordFormValues) => {
    setStatus("idle");
    forgotPasswordMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Recuperar senha</CardTitle>
          <CardDescription className="text-center">
            Digite seu email para receber um link de redefinição de senha
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
                      <Input placeholder="seu-email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {status === "success" && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Se este email estiver cadastrado, você receberá instruções para redefinir sua senha.
                  </AlertDescription>
                </Alert>
              )}

              {status === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Enviar link de recuperação"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            Lembrou sua senha?{" "}
            <Link href="/auth" className="text-primary underline hover:text-primary/80">
              Voltar para login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}