import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/admin-layout";
import { format } from "date-fns";

// UI Components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  Folder,
  Image,
  Search,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectWithStats {
  id: number;
  publicId: string;
  name: string;
  clientName: string;
  photographerId: number;
  status: string;
  createdAt: string;
  photoCount: number;
  daysOld: number;
}

export default function AdminProjects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"photos_desc" | "photos_asc" | "date_desc" | "date_asc">("photos_desc");
  const [filterByPlan, setFilterByPlan] = useState<"all" | "free" | "paid">("all");
  const { toast } = useToast();

  // Fetch projects data
  const { data: projects, isLoading, error } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/admin/projects"],
  });

  // Filter and sort projects based on search term, plan filter, and sort order
  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];
    
    // Apply search filter
    let filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.publicId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.id.toString().includes(searchTerm)
    );

    // Apply plan filter
    if (filterByPlan !== "all") {
      if (filterByPlan === "free") {
        filtered = filtered.filter(project => project.userPlanType === "free");
      } else if (filterByPlan === "paid") {
        filtered = filtered.filter(project => 
          project.userPlanType && project.userPlanType !== "free"
        );
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "photos_desc":
          return b.photoCount - a.photoCount;
        case "photos_asc":
          return a.photoCount - b.photoCount;
        case "date_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, searchTerm, filterByPlan, sortBy]);

  // Calculate statistics
  const totalProjects = projects?.length || 0;
  const totalPhotos = projects?.reduce((sum, project) => sum + project.photoCount, 0) || 0;
  const avgPhotosPerProject = totalProjects > 0 ? Math.round(totalPhotos / totalProjects) : 0;
  const oldestProject = projects?.reduce((oldest, project) => 
    project.daysOld > oldest.daysOld ? project : oldest, 
    projects[0]
  );

  // Calculate plan statistics
  const freeAccounts = projects?.filter(p => p.userPlanType === "free").length || 0;
  const paidAccounts = projects?.filter(p => p.userPlanType && p.userPlanType !== "free").length || 0;

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Helper function to format days old
  const formatDaysOld = (days: number) => {
    if (days === 1) return "1 day";
    if (days < 30) return `${days} days`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return months === 1 ? "1 month" : `${months} months`;
    }
    const years = Math.floor(days / 365);
    return years === 1 ? "1 year" : `${years} years`;
  };

  // Function to get plan badge
  const getPlanBadge = (planType: string) => {
    const planMap = {
      'free': { color: 'bg-gray-100 text-gray-800', label: 'Free' },
      'basic_v2': { color: 'bg-blue-100 text-blue-800', label: 'Basic' },
      'standard_v2': { color: 'bg-purple-100 text-purple-800', label: 'Standard' },
      'professional': { color: 'bg-yellow-100 text-yellow-800', label: 'Pro' },
      'professional_v2': { color: 'bg-orange-100 text-orange-800', label: 'Pro V2' }
    };
    
    const planInfo = planMap[planType as keyof typeof planMap] || { 
      color: 'bg-gray-100 text-gray-800', 
      label: planType || 'Unknown' 
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${planInfo.color}`}>
        {planInfo.label}
      </span>
    );
  };

  // Function to get user status badge
  const getUserStatusBadge = (userStatus: string) => {
    const statusMap = {
      'active': { color: 'bg-green-100 text-green-800', label: 'Active' },
      'inactive': { color: 'bg-red-100 text-red-800', label: 'Inactive' },
      'suspended': { color: 'bg-orange-100 text-orange-800', label: 'Suspended' },
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' }
    };
    
    const statusInfo = statusMap[userStatus as keyof typeof statusMap] || { 
      color: 'bg-gray-100 text-gray-800', 
      label: userStatus || 'Unknown' 
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Move toast to useEffect to prevent re-render loop
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error loading projects",
        description: "Failed to load projects data. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Debug removed - system working correctly

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Projects Management</h1>
          <p className="text-gray-600 mt-2">
            Monitor all photography projects, photo counts, and project age
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-16" /> : totalProjects}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-16" /> : totalPhotos.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Photos/Project</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-16" /> : avgPhotosPerProject}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Oldest Project</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : oldestProject ? (
                  formatDaysOld(oldestProject.daysOld)
                ) : (
                  "N/A"
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search & Filters</CardTitle>
            <CardDescription>
              Search by project name, email, or project ID. Filter and sort projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Sort by Photos */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photos_desc">More Photos First</SelectItem>
                  <SelectItem value="photos_asc">Less Photos First</SelectItem>
                  <SelectItem value="date_desc">Newest First</SelectItem>
                  <SelectItem value="date_asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter by Plan */}
              <Select value={filterByPlan} onValueChange={(value: any) => setFilterByPlan(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by plan..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="free">Free Accounts ({freeAccounts})</SelectItem>
                  <SelectItem value="paid">Paid Accounts ({paidAccounts})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>Projects List</CardTitle>
            <CardDescription>
              {isLoading 
                ? "Loading projects..." 
                : `Showing ${filteredAndSortedProjects.length} of ${totalProjects} projects`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project ID</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Account Email</TableHead>
                    <TableHead>Plan Type</TableHead>
                    <TableHead>Account Status</TableHead>
                    <TableHead>Photos</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredAndSortedProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        {searchTerm ? "No projects found matching your search." : "No projects found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-mono text-sm">
                          {project.projectViewId || `project-view/${project.id}`}
                        </TableCell>
                        <TableCell className="font-medium">
                          {project.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {project.userEmail || "No email"}
                        </TableCell>
                        <TableCell>
                          {getPlanBadge(project.userPlanType)}
                        </TableCell>
                        <TableCell>
                          {getUserStatusBadge(project.userStatus)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Image className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{project.photoCount.toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>{formatDaysOld(project.daysOld)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {format(new Date(project.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}