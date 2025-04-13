import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import UserTable from "@/components/admin/user-table";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";
import { UserPlus } from "lucide-react";

export default function Admin() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const getFilterButtonClass = (status: string) => {
    return statusFilter === status
      ? "px-3 py-2 font-medium text-sm rounded-md bg-primary-100 text-primary-800"
      : "px-3 py-2 font-medium text-sm rounded-md text-gray-600 hover:bg-gray-100";
  };

  return (
    <Sidebar>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Status filters */}
          <div className="mt-6 flex space-x-2">
            <button
              className={getFilterButtonClass("all")}
              onClick={() => setStatusFilter("all")}
            >
              All Users
            </button>
            <button
              className={getFilterButtonClass("active")}
              onClick={() => setStatusFilter("active")}
            >
              Active
            </button>
            <button
              className={getFilterButtonClass("suspended")}
              onClick={() => setStatusFilter("suspended")}
            >
              Suspended
            </button>
            <button
              className={getFilterButtonClass("canceled")}
              onClick={() => setStatusFilter("canceled")}
            >
              Canceled
            </button>
          </div>
          
          {isLoading ? (
            <div className="mt-8 bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg p-6">
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">Loading users...</p>
              </div>
            </div>
          ) : (
            <UserTable users={users} filter={statusFilter} />
          )}
        </div>
      </div>
    </Sidebar>
  );
}
