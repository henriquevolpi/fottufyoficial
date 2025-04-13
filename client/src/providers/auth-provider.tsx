import React, { createContext, useState, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check for stored user on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      console.log("Tentando fazer login com:", email);
      const response = await apiRequest("POST", "/api/login", { email, password });
      const data = await response.json();
      
      if (!data.user) {
        console.error("Usuário não encontrado na resposta:", data);
        throw new Error("Resposta inválida do servidor");
      }
      
      console.log("Login bem-sucedido:", data.user);
      setUser(data.user);
      setIsAuthenticated(true);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === "admin") {
        console.log("Redirecionando para /admin");
        setLocation("/admin");
      } else {
        console.log("Redirecionando para /dashboard");
        setLocation("/dashboard");
      }
      
      return data.user;
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
    setLocation("/login");
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
