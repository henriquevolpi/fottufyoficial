import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    try {
      // Obter usuário do localStorage
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        console.log("Dashboard carregado - usuário:", userData);
      } else {
        console.log("Nenhum usuário encontrado no localStorage");
      }
    } catch (e) {
      console.error("Erro ao obter usuário:", e);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
            Dashboard do Fotógrafo
          </h1>
          <p className="text-xl text-gray-500 mb-8">
            Bem-vindo(a) ao seu painel de controle, {user?.name || "fotógrafo"}.
          </p>
          
          <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Seus dados</h2>
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <p className="text-gray-700"><strong>ID:</strong> {user?.id}</p>
                <p className="text-gray-700"><strong>Nome:</strong> {user?.name}</p>
                <p className="text-gray-700"><strong>Email:</strong> {user?.email}</p>
                <p className="text-gray-700"><strong>Função:</strong> {user?.role}</p>
                <p className="text-gray-700"><strong>Status:</strong> {user?.status}</p>
              </div>
              
              <div className="flex justify-center gap-4 mt-8">
                <Button
                  onClick={() => setLocation("/upload")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Novo Projeto
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/login")}
                >
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
