import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: async (data: any) => {
      // If data is wrapped in a user object, extract it
      const userData = data.user || data;
      
      // Primeiro salve os dados básicos do usuário
      queryClient.setQueryData(["/api/user"], userData);
      
      // Agora faça uma nova requisição para obter dados atualizados
      try {
        const freshUserResponse = await apiRequest("GET", "/api/user");
        if (freshUserResponse.ok) {
          const freshUserData = await freshUserResponse.json();
          // Atualize com os dados mais recentes
          queryClient.setQueryData(["/api/user"], freshUserData);
        }
      } catch (error) {
        console.log("Erro ao obter dados atualizados do usuário:", error);
        // Já temos os dados básicos salvos, então continuamos
      }
      
      // Invalidate e refetch imediatamente as consultas relacionadas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/plans"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      ]);
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a), ${userData.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      // Usar a mesma função que o login, garantindo que credentials: "include" seja usado
      const res = await apiRequest("POST", "/api/register", credentials);
      console.log("Resposta do registro:", res.status, res.statusText);
      
      // Verificar se temos cookies de sessão recebidos
      const cookies = document.cookie;
      console.log("Cookies após registro:", cookies);
      
      return await res.json();
    },
    onSuccess: async (data: any) => {
      // Extrair dados do usuário completos que agora são enviados do servidor
      const userData = data.user || data;
      console.log("Dados do usuário recebidos após registro:", userData);
      
      // Atualizar o cache com os dados completos do usuário
      queryClient.setQueryData(["/api/user"], userData);
      
      // Ainda fazer uma requisição para confirmar que a sessão foi estabelecida corretamente
      try {
        console.log("Verificando sessão após registro...");
        const freshUserResponse = await apiRequest("GET", "/api/user");
        console.log("Resposta da verificação de sessão:", freshUserResponse.status);
        
        if (freshUserResponse.ok) {
          const freshUserData = await freshUserResponse.json();
          console.log("Sessão verificada com sucesso, dados atualizados:", freshUserData);
          queryClient.setQueryData(["/api/user"], freshUserData);
        } else {
          console.error("Sessão não estabelecida corretamente após registro");
        }
      } catch (error) {
        console.error("Erro ao verificar sessão após registro:", error);
        // Continuar mesmo com erro, pois os dados básicos já foram salvos
      }
      
      // Invalidate e refetch imediatamente as consultas relacionadas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/plans"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      ]);
      
      toast({
        title: "Registro realizado com sucesso",
        description: `Bem-vindo(a), ${userData.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no registro",
        description: error.message || "Não foi possível criar sua conta",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado da sua conta.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao realizar logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}