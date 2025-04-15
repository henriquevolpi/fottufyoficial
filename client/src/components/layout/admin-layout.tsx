import React from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Users, Home, BarChart, Settings } from "lucide-react";

interface AdminNavItemProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  active: boolean;
}

function AdminNavItem({ href, icon, title, active }: AdminNavItemProps) {
  return (
    <Link href={href}>
      <a
        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
          active
            ? "bg-purple-700 text-white"
            : "text-purple-100 hover:bg-purple-600 hover:text-white"
        }`}
      >
        {React.cloneElement(icon as React.ReactElement, {
          className: `mr-3 h-5 w-5 ${active ? "text-white" : "text-purple-300"}`,
        })}
        {title}
      </a>
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user || user.role !== "admin") {
    return null; // This should never happen due to the ProtectedRoute
  }

  const navItems = [
    {
      href: "/admin",
      icon: <Users />,
      title: "User Management",
    },
    {
      href: "/admin/stats",
      icon: <BarChart />,
      title: "System Stats",
    },
    {
      href: "/admin/settings",
      icon: <Settings />,
      title: "Admin Settings",
    },
    {
      href: "/dashboard",
      icon: <Home />,
      title: "Return to App",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Admin Sidebar */}
      <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64">
        <div className="flex flex-col flex-grow bg-purple-800 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-white">Admin Panel</span>
            </div>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navItems.map((item) => (
                <AdminNavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  title={item.title}
                  active={location === item.href}
                />
              ))}
            </nav>
          </div>
          <div className="px-3 mt-6 mb-4">
            <div className="bg-purple-700 rounded-md p-3 text-white">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs">{user.email}</p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => logoutMutation.mutate()}
              variant="ghost"
              className="w-full mt-2 text-purple-100 hover:bg-purple-700 hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="md:hidden sticky top-0 z-10 flex-shrink-0 flex bg-purple-800 p-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-white">Admin Panel</span>
            </div>
            <button className="ml-auto bg-purple-700 flex items-center justify-center p-2 rounded-md text-purple-200 hover:text-white hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-800 focus:ring-white">
              <span className="sr-only">Open menu</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
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