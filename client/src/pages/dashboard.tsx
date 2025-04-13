import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Camera, 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  PlusCircle, 
  Search, 
  Filter, 
  ArrowUpRight
} from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Dados fictícios para projetos
const PROJETOS_EXEMPLO = [
  {
    id: 1,
    nome: "Casamento Rodrigo e Ana",
    cliente: "Rodrigo Silva",
    data: "2023-04-15",
    status: "pendente",
    fotos: 124,
    selecionadas: 0
  },
  {
    id: 2,
    nome: "Aniversário de 15 anos - Maria",
    cliente: "Família Souza",
    data: "2023-03-22",
    status: "revisado",
    fotos: 86,
    selecionadas: 32
  },
  {
    id: 3,
    nome: "Ensaio Corporativo - Tech Inc",
    cliente: "Tech Incorporated",
    data: "2023-02-08",
    status: "finalizado",
    fotos: 45,
    selecionadas: 18
  },
  {
    id: 4,
    nome: "Evento de Lançamento - Natura",
    cliente: "Natura Cosméticos",
    data: "2023-01-30",
    status: "arquivado",
    fotos: 93,
    selecionadas: 40
  }
];

// Componente de card para projetos recentes
function ProjetoCard({ projeto }: { projeto: any }) {
  const [, setLocation] = useLocation();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente": return "bg-yellow-100 text-yellow-800";
      case "revisado": return "bg-blue-100 text-blue-800";
      case "finalizado": return "bg-green-100 text-green-800";
      case "arquivado": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">{projeto.nome}</CardTitle>
            <CardDescription className="text-sm mt-1">{projeto.cliente}</CardDescription>
          </div>
          <Badge className={getStatusColor(projeto.status)}>
            {projeto.status.charAt(0).toUpperCase() + projeto.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center text-sm text-gray-500 mt-2">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{formatarData(projeto.data)}</span>
        </div>
        <div className="flex justify-between mt-3">
          <div className="flex items-center text-sm">
            <Camera className="h-4 w-4 mr-1 text-gray-500" />
            <span>{projeto.fotos} fotos</span>
          </div>
          <div className="flex items-center text-sm">
            <FileText className="h-4 w-4 mr-1 text-gray-500" />
            <span>{projeto.selecionadas} selecionadas</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs"
          onClick={() => setLocation(`/project/${projeto.id}`)}
        >
          Ver Detalhes
          <ArrowUpRight className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// Componente de estatísticas
function Estatisticas() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Projetos Ativos</p>
              <h3 className="text-2xl font-bold mt-1">12</h3>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Fotos Este Mês</p>
              <h3 className="text-2xl font-bold mt-1">1.284</h3>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <Camera className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Clientes</p>
              <h3 className="text-2xl font-bold mt-1">36</h3>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Tempo Médio</p>
              <h3 className="text-2xl font-bold mt-1">3.2 dias</h3>
            </div>
            <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Página principal do Dashboard
export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [projetos, setProjetos] = useState<any[]>([]);
  
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
      
      // Simular carregamento de projetos
      setTimeout(() => {
        setProjetos(PROJETOS_EXEMPLO);
        setIsLoading(false);
      }, 800);
      
    } catch (e) {
      console.error("Erro ao obter usuário:", e);
      setIsLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setLocation("/login");
  };
  
  const filteredProjetos = projetos.filter(
    projeto => projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
               projeto.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              PhotoFlow
            </h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-right">
                <p className="text-gray-900 font-medium">{user?.name}</p>
                <p className="text-gray-500">{user?.email}</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
              Dashboard
            </h2>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Button 
              className="inline-flex items-center"
              onClick={() => setLocation("/upload")}
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Novo Projeto
            </Button>
          </div>
        </div>
        
        <Estatisticas />
        
        <Tabs defaultValue="todos" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <TabsList className="mb-4 sm:mb-0">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
              <TabsTrigger value="revisados">Revisados</TabsTrigger>
              <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
            </TabsList>
            
            <div className="flex w-full sm:w-auto space-x-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Buscar projetos..."
                  className="pl-8 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <TabsContent value="todos">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="p-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-2/4 mt-2" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-end">
                      <Skeleton className="h-8 w-24" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : filteredProjetos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjetos.map((projeto) => (
                  <ProjetoCard key={projeto.id} projeto={projeto} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  Nenhum projeto encontrado
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Não encontramos projetos correspondentes à sua busca.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setSearchTerm("")}>
                    Limpar filtros
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pendentes">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projetos
                .filter(projeto => projeto.status === "pendente")
                .filter(projeto => 
                  projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  projeto.cliente.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((projeto) => (
                  <ProjetoCard key={projeto.id} projeto={projeto} />
                ))
              }
            </div>
          </TabsContent>
          
          <TabsContent value="revisados">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projetos
                .filter(projeto => projeto.status === "revisado")
                .filter(projeto => 
                  projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  projeto.cliente.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((projeto) => (
                  <ProjetoCard key={projeto.id} projeto={projeto} />
                ))
              }
            </div>
          </TabsContent>
          
          <TabsContent value="arquivados">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projetos
                .filter(projeto => projeto.status === "arquivado")
                .filter(projeto => 
                  projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  projeto.cliente.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((projeto) => (
                  <ProjetoCard key={projeto.id} projeto={projeto} />
                ))
              }
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2023 PhotoFlow. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
