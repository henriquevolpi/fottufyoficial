import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// Esquema para validação do formulário
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "A senha atual é obrigatória"),
    newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "A confirmação de senha é obrigatória"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

// Tipagem para o formulário
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// Props para o componente
interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

// Componente Modal de alteração de senha
export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configuração do formulário com validação
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Função para enviar o formulário
  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      setIsSubmitting(true);

      // Enviar a requisição para alterar a senha
      const response = await apiRequest("POST", "/api/user/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      // Verificar se a resposta foi bem-sucedida
      if (response.ok) {
        const data = await response.json();
        
        // Mostrar mensagem de sucesso
        toast({
          title: "Senha alterada com sucesso",
          description: "Sua senha foi alterada com sucesso.",
        });
        
        // Resetar o formulário e fechar o modal
        form.reset();
        onClose();
      } else {
        // Tratar erros específicos
        const errorData = await response.json();
        if (response.status === 400) {
          // Senha atual incorreta
          form.setError("currentPassword", {
            type: "manual",
            message: errorData.message || "Senha atual incorreta",
          });
        } else {
          // Outros erros
          toast({
            title: "Erro ao alterar senha",
            description: errorData.message || "Ocorreu um erro ao alterar sua senha. Por favor, tente novamente.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para fechar o modal e resetar o formulário
  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
          <DialogDescription>
            Preencha o formulário abaixo para alterar sua senha.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha Atual</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Digite sua senha atual"
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
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Digite sua nova senha"
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
                  <FormLabel>Confirmar Nova Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirme sua nova senha"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  "Alterar Senha"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}