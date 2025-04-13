import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Project from "@/pages/project";
import Admin from "@/pages/admin";
import { useAuth } from "./providers/auth-provider";
import { useEffect } from "react";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    console.log("ProtectedRoute - isAuthenticated:", isAuthenticated, "user:", user);
    
    if (!isAuthenticated) {
      console.log("ProtectedRoute - Usuário não autenticado, redirecionando para /login");
      setLocation("/login");
      return;
    }

    if (adminOnly && user?.role !== "admin") {
      console.log("ProtectedRoute - Usuário não é admin, redirecionando para /dashboard");
      setLocation("/dashboard");
      return;
    }

    if (user?.status !== "active" && !adminOnly) {
      console.log("ProtectedRoute - Usuário não está ativo, redirecionando para /login");
      setLocation("/login");
      return;
    }
    
    console.log("ProtectedRoute - Usuário autorizado a acessar esta rota");
  }, [isAuthenticated, user, adminOnly, setLocation]);

  if (!isAuthenticated) return null;
  if (adminOnly && user?.role !== "admin") return null;
  if (user?.status !== "active" && !adminOnly) return null;

  return <Component />;
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    console.log("RootRedirect - Autenticado:", isAuthenticated, "Usuário:", user);
    if (isAuthenticated) {
      if (user?.role === "admin") {
        console.log("Redirecionando para /admin");
        setLocation("/admin");
      } else {
        console.log("Redirecionando para /dashboard");
        setLocation("/dashboard");
      }
    } else {
      console.log("Redirecionando para /login");
      setLocation("/login");
    }
  }, [isAuthenticated, user, setLocation]);
  
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/upload" component={Upload} />
      <Route path="/project/:id" component={Project} />
      <Route path="/admin">
        {() => <ProtectedRoute component={Admin} adminOnly={true} />}
      </Route>
      <Route path="/">
        {() => <RootRedirect />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
