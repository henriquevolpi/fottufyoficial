import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Settings, 
  BarChart3, 
  LogOut, 
  Folder,
  Camera // Novo ícone para o título, mais relacionado à fotografia
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

// Array de links para deixar o código mais limpo e fácil de manter
const navLinks = [
  { href: "/admin", label: "Gerenciar Usuários", icon: Users },
  { href: "/admin/projects", label: "Projetos", icon: Folder },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [pathname, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

  // A lógica funcional permanece exatamente a mesma
  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/dashboard");
    } else if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setLocation("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-black">
      {/* ===== Sidebar para Desktop ===== */}
      <aside className="hidden md:flex w-64 flex-col bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white">
        {/* Cabeçalho */}
        <div className="p-6 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Admin Panel</h2>
            <p className="text-xs text-blue-200">Fottufy</p>
          </div>
        </div>

        {/* Navegação Principal */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Button
                key={link.href}
                variant="ghost"
                className={`w-full justify-start h-11 transition-all duration-200 ${
                  isActive
                    ? "bg-white/10 text-white font-semibold backdrop-blur-sm border border-white/20" // Efeito "Frosted Glass" para o link ativo
                    : "text-blue-200 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => setLocation(link.href)}
              >
                <link.icon className="mr-3 h-5 w-5" />
                {link.label}
              </Button>
            );
          })}
        </nav>

        {/* Seção do Usuário e Logout */}
        <div className="p-4 mt-auto">
          <Button variant="ghost" className="w-full justify-start items-center p-2 text-left h-auto" onClick={handleLogout}>
             <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold mr-3">
                {user?.email?.charAt(0).toUpperCase()}
             </div>
             <div className="flex-1">
                <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                <div className="flex items-center text-xs text-red-300 hover:text-red-200 transition-colors">
                  <LogOut className="mr-1.5 h-3 w-3" />
                  Sair da Conta
                </div>
             </div>
          </Button>
        </div>
      </aside>

      {/* ===== Barra de Navegação para Mobile ===== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-r from-blue-700 to-indigo-900 p-2 shadow-t-2xl">
        <div className="flex justify-around items-center">
          {navLinks.map(link => {
             const isActive = pathname === link.href;
             return (
              <Button 
                key={`mobile-${link.href}`}
                variant="ghost" 
                size="icon"
                className={`h-12 w-12 rounded-full transition-all duration-200 ${
                    isActive ? 'bg-white/10 text-white backdrop-blur-sm' : 'text-blue-200'
                }`}
                onClick={() => setLocation(link.href)}
              >
                <link.icon className="h-6 w-6" />
              </Button>
             )
          })}
           <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-blue-200" onClick={handleLogout}>
            <LogOut className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* ===== Conteúdo Principal ===== */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
}