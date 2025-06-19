import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import React, { useEffect } from "react";
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
import CreatePassword from "@/pages/create-password";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import AdminLayout from "@/components/layout/admin-layout";
import { UploadProtectionProvider } from "@/hooks/use-upload-protection";
import { UploadProtectionSystem } from "@/components/upload-protection-system";
import PricingPage from "@/pages/pricing";
import TestR2 from "@/pages/test-r2";
import TestImageUpload from "@/pages/test-image-upload";
import TestCompression from "@/pages/test-compression";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import SimpleResetPage from "@/pages/simple-reset";

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

function PasswordHandler() {
  // Component for handling password reset tokens in the URL
  const urlSearch = window.location.search;
  const params = new URLSearchParams(urlSearch);
  const resetToken = params.get('reset-password');
  const createToken = params.get('create-password');
  
  useEffect(() => {
    if (resetToken) {
      window.history.replaceState({}, document.title, '/');
      window.location.href = `/reset-password?token=${resetToken}`;
    } else if (createToken) {
      window.history.replaceState({}, document.title, '/');
      window.location.href = `/create-password?token=${createToken}`;
    }
  }, [resetToken, createToken]);
  
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth">
        {() => <AuthPage />}
      </Route>
      <Route path="/forgot-password">
        {() => <ForgotPasswordPage />}
      </Route>
      <Route path="/reset-password">
        {() => <ResetPasswordPage />}
      </Route>
      <Route path="/reset-password/:token">
        {(params) => <ResetPasswordPage token={params.token} />}
      </Route>
      <Route path="/simple-reset">
        {() => <SimpleResetPage />}
      </Route>
      <Route path="/create-password">
        {() => <CreatePassword />}
      </Route>
      <Route path="/create-password/:token">
        {(params) => <CreatePassword token={params.token} />}
      </Route>
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
      <Route path="/planos">
        {() => <PricingPage />}
      </Route>
      <Route path="/pricing">
        {() => <PricingPage />}
      </Route>
      <Route path="/debug">
        {() => <DebugPage />}
      </Route>
      <Route path="/test-r2">
        {() => <TestR2 />}
      </Route>
      <Route path="/test-image-upload">
        {() => <TestImageUpload />}
      </Route>
      <Route path="/test-compression">
        {() => <TestCompression />}
      </Route>
      <Route path="/home">
        {() => <LandingPage />}
      </Route>
      <Route path="/">
        {() => (
          <>
            <PasswordHandler />
            <LandingPage />
          </>
        )}
      </Route>
      <Route>
        {() => <NotFound />}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UploadProtectionProvider>
          <Router />
          <Toaster />
          <UploadProtectionSystem />
        </UploadProtectionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
