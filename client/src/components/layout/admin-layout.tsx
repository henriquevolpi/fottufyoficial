import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid,
  Users,
  Settings,
  BarChart3,
  LogOut,
  Folder
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

  // Redirect to dashboard if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      console.log("Non-admin user detected, redirecting to dashboard:", user);
      setLocation("/dashboard");
    } else if (!user) {
      console.log("No user detected, redirecting to auth");
      setLocation("/auth");
    } else {
      console.log("Admin user confirmed:", user);
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col bg-gradient-to-b from-purple-800 to-indigo-900 text-white">
        <div className="p-4 border-b border-purple-700">
          <h2 className="text-xl font-bold">Admin Panel</h2>
          <p className="text-sm text-purple-200">StudioFlix Photography</p>
        </div>
        
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            <li>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-white hover:bg-purple-700 hover:text-white"
                onClick={() => setLocation("/admin")}
              >
                <Users className="mr-2 h-4 w-4" />
                User Management
              </Button>
            </li>
            
            <li>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-white hover:bg-purple-700 hover:text-white"
                onClick={() => setLocation("/admin/projects")}
              >
                <Folder className="mr-2 h-4 w-4" />
                Projects
              </Button>
            </li>
            <li>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-white hover:bg-purple-700 hover:text-white"
                onClick={() => setLocation("/admin/settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </li>
            <li>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-white hover:bg-purple-700 hover:text-white"
                onClick={() => setLocation("/admin/stats")}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Statistics
              </Button>
            </li>
          </ul>
        </nav>
        
        <div className="p-4 border-t border-purple-700">
          <Button 
            variant="outline" 
            className="w-full border-purple-400 text-white hover:bg-purple-700 hover:border-purple-300"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
      
      {/* Mobile sidebar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-2">
        <div className="flex justify-around">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-purple-700"
            onClick={() => setLocation("/admin")}
          >
            <Users className="h-6 w-6" />
          </Button>
          <Button 
            variant="ghost" 
            className="text-white hover:bg-purple-700"
            onClick={() => setLocation("/admin/projects")}
          >
            <Folder className="h-6 w-6" />
          </Button>
          <Button 
            variant="ghost" 
            className="text-white hover:bg-purple-700"
            onClick={() => setLocation("/admin/settings")}
          >
            <Settings className="h-6 w-6" />
          </Button>
          <Button 
            variant="ghost" 
            className="text-white hover:bg-purple-700"
            onClick={() => setLocation("/admin/stats")}
          >
            <BarChart3 className="h-6 w-6" />
          </Button>
          <Button 
            variant="ghost" 
            className="text-white hover:bg-purple-700"
            onClick={handleLogout}
          >
            <LogOut className="h-6 w-6" />
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </div>
    </div>
  );
}