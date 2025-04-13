import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { Home, Images, Plus, Settings, Users, LogOut, CreditCard } from "lucide-react";
import UserMenu from "@/components/user-menu";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  const sidebarItems: SidebarItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <Home className="mr-3 h-6 w-6" />,
    },
    {
      title: "My Projects",
      href: "/dashboard",
      icon: <Images className="mr-3 h-6 w-6" />,
    },
    {
      title: "New Project",
      href: "/upload",
      icon: <Plus className="mr-3 h-6 w-6" />,
    },
    {
      title: "Assinaturas",
      href: "/subscription",
      icon: <CreditCard className="mr-3 h-6 w-6" />,
    },
    {
      title: "Users",
      href: "/admin",
      icon: <Users className="mr-3 h-6 w-6" />,
      adminOnly: true,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="mr-3 h-6 w-6" />,
    },
  ];

  const isAdmin = user?.role === "admin";
  const filteredItems = sidebarItems.filter(item => !item.adminOnly || (item.adminOnly && isAdmin));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-gray-800">
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
            <h1 className="text-xl font-bold text-white">PhotoSelect</h1>
          </div>
          <div className="h-0 flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {filteredItems.map((item) => (
                <Link 
                  key={item.title} 
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    location === item.href
                      ? "bg-gray-900 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  )}
                >
                  {React.cloneElement(item.icon as React.ReactElement, {
                    className: cn(
                      (item.icon as React.ReactElement).props.className,
                      location === item.href
                        ? "text-gray-300"
                        : "text-gray-400 group-hover:text-gray-300"
                    ),
                  })}
                  {item.title}
                </Link>
              ))}
              
              <button
                onClick={logout}
                className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <LogOut className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Sign Out
              </button>
            </nav>
            
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Mobile header and content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 flex items-center justify-between">
          <button className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500">
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">PhotoSelect</h1>
          </div>
          <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-4">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : "?"}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
