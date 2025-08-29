import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User, SUBSCRIPTION_PLANS } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/layout/admin-layout";
import { format } from "date-fns";

// UI Components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  CalendarIcon,
  CheckCircleIcon,
  CircleSlashIcon,
  Clock,
  FilterIcon,
  KeyIcon,
  Loader2,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminUserFilters {
  planType?: string;
  status?: string;
  isDelinquent?: boolean;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
}

export default function Admin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<{type: string, callback: () => void} | null>(null);
  const [confirmDialogMessage, setConfirmDialogMessage] = useState("");
  
  // User Filters
  const [filters, setFilters] = useState<AdminUserFilters>({});
  const [tempFilters, setTempFilters] = useState<AdminUserFilters>({});
  
  // New User Form
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "123456", // Default temporary password
    role: "photographer",
    planType: "free"
  });
  
  // Edit User Form
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    status: "active",
    planType: "free"
  });

  // Reset Password Form
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  
  // API Queries
  const { 
    data: users = [], 
    isLoading: isLoadingUsers,
    refetch: refetchUsers
  } = useQuery<User[]>({
    queryKey: ['/api/admin/users', filters],
    queryFn: async () => {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.planType) queryParams.append("planType", filters.planType);
      if (filters.status) queryParams.append("status", filters.status);
      if (filters.isDelinquent) queryParams.append("isDelinquent", "true");
      if (filters.startDate) queryParams.append("startDate", filters.startDate.toISOString());
      if (filters.endDate) queryParams.append("endDate", filters.endDate.toISOString());
      
      const url = `/api/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    }
  });
  
  // Get counts of users by plan
  const { 
    data: planCounts = {}, 
    isLoading: isLoadingPlanCounts
  } = useQuery<Record<string, number>>({
    queryKey: ['/api/admin/users/counts-by-plan'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users/counts-by-plan');
      if (!response.ok) {
        throw new Error('Failed to fetch plan counts');
      }
      return response.json();
    }
  });
  
  // Subscription Analytics Query
  const {
    data: subscriptionAnalytics,
    isLoading: isLoadingAnalytics,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['/api/admin/subscriptions/analytics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/subscriptions/analytics');
      if (!response.ok) throw new Error('Failed to fetch subscription analytics');
      return response.json();
    },
    enabled: activeTab === 'subscriptions'
  });
  
  // Atualiza o estado temporário quando o filtro por plano muda através dos cards
  const updateTempFiltersFromPlanClick = (planType?: string) => {
    setTempFilters({...filters, planType});
  }
  
  // Filtered Users (by search query)
  const filteredUsers = filters.searchQuery && filters.searchQuery.trim() !== ""
    ? users.filter(user => {
        const query = filters.searchQuery?.toLowerCase() || "";
        return (
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
        );
      })
    : users;
  
  // Handle adding a new user
  const handleAddUser = async () => {
    try {
      const response = await apiRequest("POST", "/api/admin/add-user", newUser);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add user");
      }
      
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      toast({
        title: "User Added",
        description: `${newUser.name} has been added successfully.`
      });
      
      setAddUserDialogOpen(false);
      setNewUser({
        name: "",
        email: "",
        password: "123456",
        role: "photographer",
        planType: "free"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add user",
        variant: "destructive"
      });
    }
  };
  
  // Handle setting a user's plan
  const handleSetPlan = async () => {
    if (!editingUser) return;
    
    try {
      const response = await apiRequest("POST", "/api/admin/set-plan", {
        email: editingUser.email,
        planType: editForm.planType
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update plan");
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      toast({
        title: "Plan Updated",
        description: `${editingUser.name}'s plan has been updated to ${editForm.planType}.`
      });
      
      setEditUserDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update plan",
        variant: "destructive"
      });
    }
  };
  
  // Handle toggling a user's status
  const handleToggleUserStatus = async () => {
    if (!editingUser) return;
    
    try {
      const response = await apiRequest("POST", "/api/admin/toggle-user", {
        email: editingUser.email,
        status: editForm.status
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      toast({
        title: "Status Updated",
        description: `${editingUser.name}'s status has been updated to ${editForm.status}.`
      });
      
      setEditUserDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive"
      });
    }
  };
  
  // Handle resetting user password
  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;
    
    try {
      const response = await apiRequest("POST", "/api/admin/reset-user-password", {
        email: resetPasswordUser.email,
        newPassword: newPassword
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }
      
      toast({
        title: "Password Reset",
        description: `Password has been reset for ${resetPasswordUser.name}.`
      });
      
      setResetPasswordDialogOpen(false);
      setNewPassword("");
      setResetPasswordUser(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive"
      });
    }
  };

  // Handle deleting a user
  const handleDeleteUser = (user: User) => {
    setEditingUser(user);
    setConfirmDialogMessage(`Are you sure you want to delete ${user.name}? This action cannot be undone.`);
    setConfirmDialogAction({
      type: "delete",
      callback: async () => {
        try {
          const response = await apiRequest("DELETE", `/api/users/${user.id}`, {});
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to delete user");
          }
          
          queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
          
          toast({
            title: "User Deleted",
            description: `${user.name} has been deleted successfully.`
          });
          
          setConfirmDialogOpen(false);
        } catch (error) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to delete user",
            variant: "destructive"
          });
        }
      }
    });
    setConfirmDialogOpen(true);
  };
  
  // Helper function to format dates
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM d, yyyy");
  };
  
  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "suspended":
        return <Badge className="bg-yellow-100 text-yellow-800">Suspended</Badge>;
      case "canceled":
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Helper function to get subscription badge
  const getSubscriptionBadge = (subscriptionStatus: string) => {
    switch (subscriptionStatus) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case "canceled":
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>;
      default:
        return <Badge>{subscriptionStatus}</Badge>;
    }
  };
  
  // Helper function to get plan badge
  const getPlanBadge = (planType: string) => {
    switch (planType) {
      case "free":
        return <Badge className="bg-gray-100 text-gray-800">Free</Badge>;
      case "basic":
        return <Badge className="bg-blue-100 text-blue-800">Basic</Badge>;
      case "standard":
        return <Badge className="bg-purple-100 text-purple-800">Standard</Badge>;
      case "professional":
        return <Badge className="bg-indigo-100 text-indigo-800">Professional</Badge>;
      default:
        return <Badge>{planType}</Badge>;
    }
  };
  
  return (
    <AdminLayout>
      <div className="flex flex-col min-h-screen">
        <header className="bg-white border-b shadow-sm">
          <div className="container mx-auto py-4 px-4 sm:px-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => setAddUserDialogOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 bg-gray-50">
        <div className="container mx-auto py-6 px-4 sm:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full md:w-auto grid-cols-1 md:grid-cols-3">
              <TabsTrigger value="users" className="flex items-center">
                <UsersIcon className="h-4 w-4 mr-2" />
                Users Management
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center">
                <BarChart className="h-4 w-4 mr-2" />
                Subscriptions
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                System Stats
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h2 className="text-xl font-semibold text-gray-900">Users</h2>
                  
                  <div className="flex items-center w-full sm:w-auto gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        placeholder="Search users..."
                        className="pl-10"
                        value={filters.searchQuery || ""}
                        onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
                      />
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => {
                        setTempFilters(filters);
                        setFilterDialogOpen(true);
                      }}
                      className="shrink-0"
                    >
                      <FilterIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Filtro de planos */}
                <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <Card 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${!filters.planType ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => {
                      setFilters({...filters, planType: undefined});
                      updateTempFiltersFromPlanClick(undefined);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Todos os Planos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{users.length}</div>
                      <div className="text-xs text-gray-500 mt-1">Todos os usuários</div>
                    </CardContent>
                  </Card>
                  
                  {isLoadingPlanCounts 
                    ? Array(4).fill(null).map((_, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-20" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-8 w-12 mb-1" />
                            <Skeleton className="h-3 w-24" />
                          </CardContent>
                        </Card>
                      ))
                    : Object.entries(SUBSCRIPTION_PLANS)
                        .sort(([,a], [,b]) => a.price > b.price ? 1 : -1)
                        .map(([key, plan]) => (
                          <Card 
                            key={key} 
                            className={`cursor-pointer hover:shadow-md transition-shadow ${filters.planType === plan.type ? 'ring-2 ring-primary' : ''}`}
                            onClick={() => {
                              setFilters({...filters, planType: plan.type});
                              updateTempFiltersFromPlanClick(plan.type);
                            }}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">{plan.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">{planCounts[plan.type] || 0}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {plan.price > 0 ? `R$ ${plan.price.toFixed(2)}` : 'Gratuito'}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                  }
                </div>
                
                {isLoadingUsers ? (
                  <div className="space-y-4">
                    {Array(5).fill(null).map((_, index) => (
                      <div key={index} className="flex items-center border-b pb-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="ml-4 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Subscription</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                              No users found. Try adjusting your filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                                    {user.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {user.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {user.email}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getPlanBadge(user.planType)}
                                <div className="text-xs text-gray-500 mt-1">
                                  Upload Limit: {user.uploadLimit || 0}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(user.status)}
                              </TableCell>
                              <TableCell>
                                {getSubscriptionBadge(user.subscriptionStatus)}
                                <div className="text-xs text-gray-500 mt-1">
                                  Ends: {formatDate(user.subscriptionEndDate)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {formatDate(user.createdAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setEditingUser(user);
                                      setEditForm({
                                        name: user.name,
                                        email: user.email,
                                        status: user.status,
                                        planType: user.planType
                                      });
                                      setEditUserDialogOpen(true);
                                    }}
                                  >
                                    <PencilIcon className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={() => {
                                      setResetPasswordUser(user);
                                      setNewPassword("");
                                      setResetPasswordDialogOpen(true);
                                    }}
                                  >
                                    <KeyIcon className="h-4 w-4 mr-1" />
                                    Reset Password
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleDeleteUser(user)}
                                  >
                                    <Trash2Icon className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="subscriptions" className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Subscription Analytics</h2>
                    <p className="text-gray-600">Monitor subscription status, payments, and user access</p>
                  </div>
                  <Button
                    onClick={() => refetchAnalytics()}
                    variant="outline"
                    size="sm"
                    disabled={isLoadingAnalytics}
                  >
                    {isLoadingAnalytics ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Refresh Data"
                    )}
                  </Button>
                </div>
                
                {isLoadingAnalytics ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[...Array(8)].map((_, i) => (
                        <Card key={i} className="p-4">
                          <Skeleton className="h-4 w-20 mb-2" />
                          <Skeleton className="h-8 w-16 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : subscriptionAnalytics ? (
                  <div className="space-y-6">
                    {/* Overview Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="bg-green-50 border-green-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-green-700">Active Subscriptions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-900">
                            {subscriptionAnalytics.analytics.activeSubscriptions}
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            {((subscriptionAnalytics.analytics.activeSubscriptions / subscriptionAnalytics.analytics.totalUsers) * 100).toFixed(1)}% of total users
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-red-50 border-red-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-red-700">Expired Subscriptions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-900">
                            {subscriptionAnalytics.analytics.expiredSubscriptions}
                          </div>
                          <p className="text-xs text-red-600 mt-1">
                            Require immediate attention
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-yellow-50 border-yellow-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-yellow-700">Pending Cancellations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-yellow-900">
                            {subscriptionAnalytics.analytics.pendingCancellations}
                          </div>
                          <p className="text-xs text-yellow-600 mt-1">
                            3-day grace period
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-orange-50 border-orange-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-orange-700">Critical Expirations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-900">
                            {subscriptionAnalytics.analytics.criticalExpirations}
                          </div>
                          <p className="text-xs text-orange-600 mt-1">
                            Expire within 7 days
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-blue-700">Upcoming Expirations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-900">
                            {subscriptionAnalytics.analytics.upcomingExpirations}
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            Expire within 30 days
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-purple-50 border-purple-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-purple-700">Paid Without Payment</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-purple-900">
                            {subscriptionAnalytics.analytics.paidUsersWithoutPayment}
                          </div>
                          <p className="text-xs text-purple-600 mt-1">
                            Access but no payment
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-green-50 border-green-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-green-700">This Month Payments</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-900">
                            {subscriptionAnalytics.analytics.monthlyPayments}
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            vs {subscriptionAnalytics.analytics.lastMonthPayments} last month
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gray-50 border-gray-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-gray-700">Free Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-900">
                            {subscriptionAnalytics.analytics.freeUsers}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Potential conversions
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Plan Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Plan Distribution</CardTitle>
                        <CardDescription>Current subscription plan breakdown</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                          {Object.entries(subscriptionAnalytics.analytics.planDistribution).map(([plan, count]) => (
                            <div key={plan} className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-2xl font-bold text-gray-900">{count}</div>
                              <div className="text-sm text-gray-600 capitalize">{plan.replace('_', ' ')}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                        <CardDescription>View detailed user lists by subscription status</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {subscriptionAnalytics.analytics.expiredSubscriptions > 0 && (
                            <Button 
                              variant="outline" 
                              className="h-auto p-4 flex flex-col items-start border-red-200 hover:bg-red-50"
                              onClick={() => {
                                // TODO: Navigate to expired users list
                                console.log('View expired subscriptions');
                              }}
                            >
                              <div className="font-semibold text-red-700">Expired Subscriptions</div>
                              <div className="text-sm text-red-600 mt-1">
                                {subscriptionAnalytics.analytics.expiredSubscriptions} users need attention
                              </div>
                            </Button>
                          )}
                          
                          {subscriptionAnalytics.analytics.pendingCancellations > 0 && (
                            <Button 
                              variant="outline" 
                              className="h-auto p-4 flex flex-col items-start border-yellow-200 hover:bg-yellow-50"
                              onClick={() => {
                                // TODO: Navigate to pending cancellations list
                                console.log('View pending cancellations');
                              }}
                            >
                              <div className="font-semibold text-yellow-700">Pending Cancellations</div>
                              <div className="text-sm text-yellow-600 mt-1">
                                {subscriptionAnalytics.analytics.pendingCancellations} users in grace period
                              </div>
                            </Button>
                          )}
                          
                          {subscriptionAnalytics.analytics.criticalExpirations > 0 && (
                            <Button 
                              variant="outline" 
                              className="h-auto p-4 flex flex-col items-start border-orange-200 hover:bg-orange-50"
                              onClick={() => {
                                // TODO: Navigate to critical expirations list
                                console.log('View critical expirations');
                              }}
                            >
                              <div className="font-semibold text-orange-700">Critical Expirations</div>
                              <div className="text-sm text-orange-600 mt-1">
                                {subscriptionAnalytics.analytics.criticalExpirations} expire within 7 days
                              </div>
                            </Button>
                          )}
                          
                          {subscriptionAnalytics.analytics.paidUsersWithoutPayment > 0 && (
                            <Button 
                              variant="outline" 
                              className="h-auto p-4 flex flex-col items-start border-purple-200 hover:bg-purple-50"
                              onClick={() => {
                                // TODO: Navigate to paid without payment list
                                console.log('View paid without payment');
                              }}
                            >
                              <div className="font-semibold text-purple-700">Access Without Payment</div>
                              <div className="text-sm text-purple-600 mt-1">
                                {subscriptionAnalytics.analytics.paidUsersWithoutPayment} need verification
                              </div>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Unable to load subscription analytics</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gray-500 text-sm font-normal">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.length}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gray-500 text-sm font-normal">Active Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users.filter(user => user.status === "active").length}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gray-500 text-sm font-normal">Paid Subscriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users.filter(user => 
                        user.subscriptionStatus === "active" && 
                        user.planType !== "free"
                      ).length}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gray-500 text-sm font-normal">New This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users.filter(user => {
                        const date = new Date(user.createdAt);
                        const now = new Date();
                        return date.getMonth() === now.getMonth() && 
                               date.getFullYear() === now.getFullYear();
                      }).length}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Users by Subscription Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => {
                        const count = users.filter(user => user.planType === plan.type).length;
                        const percentage = users.length > 0 ? (count / users.length) * 100 : 0;
                        
                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">{plan.name}</span>
                              <span className="text-sm text-gray-500">{count} users ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className="bg-primary h-2.5 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Users by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {["active", "suspended", "canceled"].map((status) => {
                        const count = users.filter(user => user.status === status).length;
                        const percentage = users.length > 0 ? (count / users.length) * 100 : 0;
                        
                        return (
                          <div key={status} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium capitalize">{status}</span>
                              <span className="text-sm text-gray-500">{count} users ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  status === "active" ? "bg-green-500" :
                                  status === "suspended" ? "bg-yellow-500" :
                                  "bg-red-500"
                                }`} 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Users</DialogTitle>
            <DialogDescription>
              Set filters to narrow down the users list.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Select 
                value={tempFilters.planType || ""} 
                onValueChange={(value) => setTempFilters({...tempFilters, planType: value || undefined})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Plans</SelectItem>
                  {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                    <SelectItem key={key} value={plan.type}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>User Status</Label>
              <Select 
                value={tempFilters.status || ""} 
                onValueChange={(value) => setTempFilters({...tempFilters, status: value || undefined})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                checked={tempFilters.isDelinquent || false}
                onCheckedChange={(checked) => 
                  setTempFilters({...tempFilters, isDelinquent: checked || undefined})
                }
              />
              <Label>Show only delinquent accounts</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Created After</Label>
                <DatePicker 
                  date={tempFilters.startDate} 
                  setDate={(date) => setTempFilters({...tempFilters, startDate: date || undefined})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Created Before</Label>
                <DatePicker 
                  date={tempFilters.endDate} 
                  setDate={(date) => setTempFilters({...tempFilters, endDate: date || undefined})} 
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setTempFilters({});
                setFilters({});
                setFilterDialogOpen(false);
              }}
            >
              Reset Filters
            </Button>
            <Button onClick={() => {
              setFilters(tempFilters);
              setFilterDialogOpen(false);
            }}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with the following details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                placeholder="Enter user's full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="Enter user's email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <Input
                id="password"
                type="text"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                placeholder="Enter temporary password"
              />
              <p className="text-xs text-gray-500">User will be prompted to change this on first login.</p>
            </div>
            
            <div className="space-y-2">
              <Label>User Role</Label>
              <Select 
                value={newUser.role} 
                onValueChange={(value) => setNewUser({...newUser, role: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photographer">Photographer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Select 
                value={newUser.planType} 
                onValueChange={(value) => setNewUser({...newUser, planType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                    <SelectItem key={key} value={plan.type}>
                      {plan.name} ({plan.uploadLimit} uploads)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAddUserDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddUser}
              disabled={!newUser.name || !newUser.email || !newUser.password}
            >
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and subscription details.
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="Enter user's full name"
                  disabled // For this simple version, we're only editing status and plan
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  placeholder="Enter user's email address"
                  disabled // For this simple version, we're only editing status and plan
                />
              </div>
              
              <div className="space-y-2">
                <Label>Account Status</Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(value) => setEditForm({...editForm, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Subscription Plan</Label>
                <Select 
                  value={editForm.planType} 
                  onValueChange={(value) => setEditForm({...editForm, planType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                      <SelectItem key={key} value={plan.type}>
                        {plan.name} ({plan.uploadLimit} uploads)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4 pt-4">
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setEditUserDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  
                  <div className="space-x-2">
                    <Button 
                      onClick={handleToggleUserStatus}
                      disabled={editForm.status === editingUser.status}
                    >
                      Update Status
                    </Button>
                    
                    <Button 
                      onClick={handleSetPlan}
                      disabled={editForm.planType === editingUser.planType}
                    >
                      Update Plan
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Reset password for {resetPasswordUser?.name} ({resetPasswordUser?.email})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
              />
              <p className="text-xs text-gray-500">
                The user will be able to login immediately with this new password.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setResetPasswordDialogOpen(false);
                setNewPassword("");
                setResetPasswordUser(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword.length < 6}
            >
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (confirmDialogAction) {
                  confirmDialogAction.callback();
                }
              }}
              className={confirmDialogAction?.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AdminLayout>
  );
}
