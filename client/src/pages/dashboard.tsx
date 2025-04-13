import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import ProjectCard from "@/components/project-card";
import UploadModal from "@/components/upload-modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { Project } from "@shared/schema";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Filter projects based on selected status
  const filteredProjects = filter === "all"
    ? projects
    : projects.filter(project => project.status === filter);

  const getFilterButtonClass = (status: string) => {
    return filter === status
      ? "px-3 py-2 font-medium text-sm rounded-md bg-primary-100 text-primary-800"
      : "px-3 py-2 font-medium text-sm rounded-md text-gray-600 hover:bg-gray-100";
  };

  return (
    <Sidebar>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Project
          </Button>
        </div>

        {/* Project filters */}
        <div className="mt-6 flex space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            className={getFilterButtonClass("all")}
            onClick={() => setFilter("all")}
          >
            All Projects
          </button>
          <button
            className={getFilterButtonClass("pending")}
            onClick={() => setFilter("pending")}
          >
            Pending
          </button>
          <button
            className={getFilterButtonClass("reviewed")}
            onClick={() => setFilter("reviewed")}
          >
            Reviewed
          </button>
          <button
            className={getFilterButtonClass("reopened")}
            onClick={() => setFilter("reopened")}
          >
            Reopened
          </button>
          <button
            className={getFilterButtonClass("archived")}
            onClick={() => setFilter("archived")}
          >
            Archived
          </button>
        </div>

        {/* Projects grid */}
        {isLoading ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg h-64 animate-pulse">
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-400">Loading...</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {filteredProjects.length === 0 ? (
              <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
                <div className="p-8 flex flex-col items-center justify-center">
                  <p className="text-gray-500 mb-4">No projects found.</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsUploadModalOpen(true)}
                  >
                    Create Your First Project
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <UploadModal 
        open={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </Sidebar>
  );
}
