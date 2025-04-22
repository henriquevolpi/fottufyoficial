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
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/upload" component={Upload} />
      <ProtectedRoute path="/project/:id" component={Project} />
      <ProtectedRoute path="/project/:id/edit" component={ProjectEdit} />
      <Route path="/project-view/:id">
        {(params) => <ProjectViewPublicRoute params={params} />}
      </Route>
      <ProtectedRoute path="/subscription" component={SubscriptionPage} />
      <ProtectedRoute path="/checkout" component={Checkout} />
      <ProtectedRoute path="/admin" component={Admin} adminOnly={true} />
      <Route path="/planos" component={PricingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/debug" component={DebugPage} />
      <Route path="/home" component={LandingPage} />
      <Route path="/">
        {() => {
          // Check for query parameters indicating login flow
          const url = new URL(window.location.href);
          const hasLoginParams = url.searchParams.has('admin');
          
          if (hasLoginParams) {
            return <RootRedirect />;
          } else {
            return <LandingPage />;
          }
        }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
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
