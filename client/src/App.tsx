import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Project from "@/pages/project";
import ProjectView from "@/pages/project-view";
import ProjectEdit from "@/pages/project-edit";
import Admin from "@/pages/admin";
import AuthPage from "@/pages/auth-page";
import SubscriptionPage from "@/pages/subscription";
import Checkout from "@/pages/checkout";
import DebugPage from "@/pages/debug";
import LandingPage from "@/pages/landing";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { ProtectedRoute } from "@/lib/protected-route";
import AdminLayout from "@/components/layout/admin-layout";

function RootRedirect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    console.log("RootRedirect - Autenticado:", !!user, "Usuário:", user);
    if (user) {
      if (user.role === "admin") {
        console.log("Redirecionando para /admin");
        setLocation("/admin");
      } else {
        console.log("Redirecionando para /dashboard");
        setLocation("/dashboard");
      }
    } else {
      console.log("Redirecionando para /auth");
      setLocation("/auth");
    }
  }, [user, setLocation]);
  
  return null;
}

function ProjectViewPublicRoute({ params }: { params: { id: string }}) {
  // Componente de rota pública que permite acesso direto à visualização do projeto
  return <ProjectView params={params} />;
}

// Importar a página de preços
import PricingPage from "@/pages/pricing";

function Router() {
  const [location] = useLocation();
  
  // Esta função verifica a URL atual e mapeia-a para o componente apropriado
  const renderRouteForLocation = () => {
    const url = new URL(window.location.href);
    const path = url.pathname;
    const params = url.searchParams;
    
    console.log("Renderizando rota para:", path, "com parâmetros:", Object.fromEntries(params.entries()));
    
    // Rotas públicas
    if (path === "/") {
      return <LandingPage />;
    }
    
    if (path === "/home") {
      return <LandingPage />;
    }
    
    if (path === "/auth") {
      return <AuthPage />;
    }
    
    if (path === "/pricing" || path === "/planos") {
      return <PricingPage />;
    }
    
    if (path === "/debug") {
      return <DebugPage />;
    }
    
    // Rota de visualização pública de projeto
    if (path.startsWith("/project-view/")) {
      const id = path.split("/").pop();
      if (id) {
        return <ProjectViewPublicRoute params={{ id }} />;
      }
    }
    
    // Rotas protegidas - usamos ProtectedRoute para lidar com a autenticação
    if (path === "/dashboard") {
      return <ProtectedRoute path="/dashboard" component={Dashboard} />;
    }
    
    if (path === "/upload") {
      return <ProtectedRoute path="/upload" component={Upload} />;
    }
    
    if (path === "/subscription") {
      return <ProtectedRoute path="/subscription" component={SubscriptionPage} />;
    }
    
    if (path === "/checkout") {
      return <ProtectedRoute path="/checkout" component={Checkout} />;
    }
    
    if (path === "/admin") {
      return <ProtectedRoute path="/admin" component={Admin} adminOnly={true} />;
    }
    
    // Rotas de projeto protegidas
    if (path.match(/^\/project\/\d+$/)) {
      return <ProtectedRoute path={path} component={Project} />;
    }
    
    if (path.match(/^\/project\/\d+\/edit$/)) {
      return <ProtectedRoute path={path} component={ProjectEdit} />;
    }
    
    // Se nenhuma rota corresponder, exibir página 404
    return <NotFound />;
  };
  
  return renderRouteForLocation();
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
