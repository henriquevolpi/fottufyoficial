import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ImageIcon,
  KeyIcon,
  Loader2,
  Mail,
  PencilIcon,
  Phone,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  UsersIcon,
  XCircleIcon,
  LinkIcon,
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

// Função para formatar telefone de forma resumida
const formatPhoneNumber = (phone: string | null): string => {
  if (!phone) {
    return "-";
  }
  
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove código do país brasileiro (+55) se presente
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    cleaned = cleaned.slice(2);
  }
  
  // Verifica se o número resultante é válido (10 ou 11 dígitos)
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return "-";
  }
  
  // Se tiver 11 dígitos (com DDD), formata como (XX) XXXXX-XXXX
  if (cleaned.length === 11) {
    const ddd = cleaned.slice(0, 2);
    const firstPart = cleaned.slice(2, 7);
    const secondPart = cleaned.slice(7);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }
  
  // Se tiver 10 dígitos (com DDD), formata como (XX) XXXX-XXXX
  if (cleaned.length === 10) {
    const ddd = cleaned.slice(0, 2);
    const firstPart = cleaned.slice(2, 6);
    const secondPart = cleaned.slice(6);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }
  
  // Se chegou aqui, retorna o número limpo ou traço
  return "-";
};

// Função helper para verificar se há telefone válido
const hasValidPhone = (phone: string | null): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10;
};

// Função para gerar link do WhatsApp
const generateWhatsAppLink = (phone: string | null): string => {
  if (!phone) return "#";
  
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove código do país brasileiro (+55) se presente
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    cleaned = cleaned.slice(2);
  }
  
  // Se não tiver 10 ou 11 dígitos, retorna link vazio
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return "#";
  }
  
  // Adiciona código do país brasileiro para o WhatsApp
  const whatsappNumber = `55${cleaned}`;
  
  return `https://wa.me/${whatsappNumber}`;
};

export default function Admin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  
  // Componente para visualizar assinaturas vencidas
  const ExpiredSubscriptionsPreviewButton = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchPreview = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/expired-subscriptions-preview', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Falha ao buscar preview das assinaturas vencidas');
        }
        
        const data = await response.json();
        setPreviewData(data);
        setIsDialogOpen(true);
        
      } catch (error) {
        toast({
          title: "Erro",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <>
        <Button
          onClick={fetchPreview}
          variant="outline"
          disabled={isLoading}
          className="text-orange-700 border-orange-300 hover:bg-orange-100"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <SearchIcon className="h-4 w-4 mr-2" />
          )}
          Visualizar Candidatos
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                Assinaturas Vencidas Sem Pagamento ({previewData?.count || 0})
              </DialogTitle>
              <DialogDescription>
                Usuários identificados para possível downgrade automático
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {previewData?.users?.map((user: any, index: number) => (
                  <div key={index} className="bg-orange-50 p-3 rounded border border-orange-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{user.email}</p>
                        <p className="text-sm text-gray-600">{user.name} • Plano: {user.planType}</p>
                        {user.isManualActivation && (
                          <p className="text-xs text-blue-600">Ativação manual detectada</p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-orange-600 font-medium">{user.daysSinceExpiry} dias vencido</p>
                        {user.subscriptionEndDate && (
                          <p className="text-gray-500">Venceu: {new Date(user.subscriptionEndDate).toLocaleDateString('pt-BR')}</p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">Status: {user.subscriptionStatus}</p>
                      </div>
                    </div>
                    {user.lastEvent && (
                      <div className="mt-2 text-xs text-gray-600">
                        Último evento: {user.lastEvent.type} em {new Date(user.lastEvent.timestamp).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                )) || (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Nenhum usuário encontrado para downgrade</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  // Componente para processar assinaturas vencidas
  const ExpiredSubscriptionsProcessButton = ({ onProcessComplete }: { onProcessComplete: () => void }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const processExpiredSubscriptions = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest('POST', '/api/admin/process-expired-subscriptions', {});
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Falha ao processar assinaturas vencidas');
        }
        
        const result = await response.json();
        
        toast({
          title: "Processamento Concluído",
          description: result.message,
          duration: 5000
        });

        // Refresh analytics data
        onProcessComplete();
        setConfirmDialogOpen(false);
        
      } catch (error) {
        toast({
          title: "Erro",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <>
        <Button
          onClick={() => setConfirmDialogOpen(true)}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <XCircleIcon className="h-4 w-4 mr-2" />
          )}
          Processar Downgrades
        </Button>

        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Processamento de Downgrades</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá converter automaticamente para plano "free" todos os usuários com:
                <br/>
                • Assinaturas vencidas (IMEDIATO - sem tolerância)
                <br/>
                • Sem registro de pagamento recente
                <br/>
                • Não são ativações manuais recentes
                <br/><br/>
                <strong>Esta ação não pode ser desfeita automaticamente.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={processExpiredSubscriptions}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Confirmar Processamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };
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
    planType: "free",
    accessDays: undefined as number | undefined,
    billingPeriod: "monthly" as "monthly" | "yearly"
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

  // Dynamic Subscription Plans Query (replaces hardcoded SUBSCRIPTION_PLANS)
  const {
    data: dynamicPlans = [],
    isLoading: isLoadingPlans
  } = useQuery<Array<{type: string, name: string, price: number, uploadLimit: number, description: string}>>({
    queryKey: ['/api/admin/subscription-plans'],
    queryFn: async () => {
      const response = await fetch('/api/admin/subscription-plans', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch subscription plans');
      return response.json();
    }
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
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update plan",
        variant: "destructive"
      });
    }
  };
  
  // Handle setting access time
  // Handle updating billing period (for portfolio access)
  const handleSetBillingPeriod = async () => {
    if (!editingUser) return;
    
    try {
      const response = await apiRequest("POST", "/api/admin/set-billing-period", {
        email: editingUser.email,
        billingPeriod: editForm.billingPeriod
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update billing period");
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      toast({
        title: "Período de Cobrança Atualizado",
        description: editForm.billingPeriod === 'yearly' 
          ? `${editingUser.name} agora tem acesso ao recurso de Portfólio Online.`
          : `${editingUser.name} não tem mais acesso ao recurso de Portfólio Online.`
      });
      
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar período de cobrança",
        variant: "destructive"
      });
    }
  };

  const handleSetAccessTime = async () => {
    if (!editingUser || !editForm.accessDays) return;
    
    try {
      const response = await apiRequest("POST", "/api/admin/set-access-time", {
        email: editingUser.email,
        days: editForm.accessDays
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update access time");
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      const expirationDate = new Date(Date.now() + editForm.accessDays * 24 * 60 * 60 * 1000);
      
      toast({
        title: "Tempo de Acesso Atualizado",
        description: `${editingUser.name} agora tem ${editForm.accessDays} dias de acesso (expira em ${expirationDate.toLocaleDateString('pt-BR')}).`
      });
      
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar tempo de acesso",
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

  const handleResendWelcomeEmail = async (user: any) => {
    try {
      const response = await apiRequest("POST", `/api/users/${user.id}/resend-welcome-email`, {});
      
      toast({
        title: "Email enviado",
        description: `Email de acesso reenviado para ${user.email}`,
      });
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao reenviar email de acesso. Tente novamente.",
        variant: "destructive",
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
            <TabsList className="grid w-full md:w-auto grid-cols-1 md:grid-cols-5">
              <TabsTrigger value="users" className="flex items-center">
                <UsersIcon className="h-4 w-4 mr-2" />
                Users Management
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center">
                <BarChart className="h-4 w-4 mr-2" />
                Subscriptions
              </TabsTrigger>
              <TabsTrigger value="hotmart" className="flex items-center">
                <KeyIcon className="h-4 w-4 mr-2" />
                Hotmart
              </TabsTrigger>
              <TabsTrigger value="banner" className="flex items-center">
                <ImageIcon className="h-4 w-4 mr-2" />
                Banner
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
                  
                  {isLoadingPlanCounts || isLoadingPlans
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
                    : dynamicPlans.map((plan) => (
                          <Card 
                            key={plan.type} 
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
                          <TableHead>Phone</TableHead>
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
                            <TableCell colSpan={7} className="h-24 text-center text-gray-500">
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
                              <TableCell className="text-sm text-gray-500">
                                {hasValidPhone(user.phone) ? (
                                  <a
                                    href={generateWhatsAppLink(user.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 text-green-600 hover:text-green-800 hover:underline transition-colors cursor-pointer"
                                    data-testid={`phone-link-${user.id}`}
                                    title={`Abrir WhatsApp para ${formatPhoneNumber(user.phone)}`}
                                  >
                                    <Phone className="h-4 w-4" />
                                    <span data-testid={`phone-${user.id}`}>
                                      {formatPhoneNumber(user.phone)}
                                    </span>
                                  </a>
                                ) : (
                                  <span data-testid={`phone-${user.id}`} className="text-gray-400">
                                    -
                                  </span>
                                )}
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
                                        planType: user.planType,
                                        billingPeriod: (user.billingPeriod as "monthly" | "yearly") || "monthly"
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
                            {((subscriptionAnalytics.analytics.activeSubscriptions / subscriptionAnalytics.analytics.totalUsers) * 100).toFixed(1)}% dos usuários
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-red-50 border-red-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-red-700">Assinaturas Expiradas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-900">
                            {subscriptionAnalytics.analytics.expiredSubscriptions}
                          </div>
                          <p className="text-xs text-red-600 mt-1">
                            Precisam atenção imediata
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-yellow-50 border-yellow-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-yellow-700">Cancelamentos Pendentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-yellow-900">
                            {subscriptionAnalytics.analytics.pendingCancellations}
                          </div>
                          <p className="text-xs text-yellow-600 mt-1">
                            Processamento imediato
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-orange-50 border-orange-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-orange-700">Expirações Críticas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-900">
                            {subscriptionAnalytics.analytics.criticalExpirations}
                          </div>
                          <p className="text-xs text-orange-600 mt-1">
                            Expiram em 7 dias
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-indigo-50 border-indigo-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-indigo-700">Problemas de Pagamento</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-indigo-900">
                            {subscriptionAnalytics.analytics.usersWithPaymentIssues || subscriptionAnalytics.analytics.paidUsersWithoutPayment}
                          </div>
                          <p className="text-xs text-indigo-600 mt-1">
                            Verificação necessária
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-emerald-50 border-emerald-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-emerald-700">Pagamentos Recentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-emerald-900">
                            {subscriptionAnalytics.analytics.recentPayments || 0}
                          </div>
                          <p className="text-xs text-emerald-600 mt-1">
                            Últimos 7 dias
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-cyan-50 border-cyan-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-cyan-700">Ativações Manuais</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-cyan-900">
                            {subscriptionAnalytics.analytics.manualActivations || 0}
                          </div>
                          <p className="text-xs text-cyan-600 mt-1">
                            Ativadas pelo admin
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-rose-50 border-rose-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-rose-700">Muito Atrasadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-rose-900">
                            {subscriptionAnalytics.analytics.overdueSubscriptions || 0}
                          </div>
                          <p className="text-xs text-rose-600 mt-1">
                            Vencidas há +7 dias
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Plan Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Distribuição de Planos</CardTitle>
                          <CardDescription>Breakdown atual dos planos de assinatura</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(subscriptionAnalytics.analytics.planDistribution).map(([plan, count]) => (
                              <div key={plan} className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-gray-900">{count}</div>
                                <div className="text-sm text-gray-600 capitalize">{plan.replace('_', ' ')}</div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Métricas de Saúde</CardTitle>
                          <CardDescription>Indicadores de performance do sistema</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {subscriptionAnalytics.summary?.healthMetrics && (
                              <>
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                  <span className="text-sm font-medium text-green-700">Taxa de Sucesso</span>
                                  <span className="text-lg font-bold text-green-900">
                                    {subscriptionAnalytics.summary.healthMetrics.paymentSuccessRate}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                                  <span className="text-sm font-medium text-red-700">Taxa de Problemas</span>
                                  <span className="text-lg font-bold text-red-900">
                                    {subscriptionAnalytics.summary.healthMetrics.issueRate}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                  <span className="text-sm font-medium text-blue-700">Crescimento Mensal</span>
                                  <span className="text-lg font-bold text-blue-900">
                                    {subscriptionAnalytics.summary.healthMetrics.monthlyGrowth}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Listas Detalhadas de Usuários */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Listas Detalhadas por Status</CardTitle>
                        <CardDescription>Visualizar usuários específicos com problemas de pagamento e webhook real</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Assinaturas Expiradas */}
                          {subscriptionAnalytics.usersByCategory.expired?.length > 0 && (
                            <div className="border border-red-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-red-700">Assinaturas Expiradas ({subscriptionAnalytics.usersByCategory.expired.length})</h3>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200">
                                      Ver Todos
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[80vh]">
                                    <DialogHeader>
                                      <DialogTitle>Assinaturas Expiradas ({subscriptionAnalytics.usersByCategory.expired.length})</DialogTitle>
                                      <DialogDescription>
                                        Usuários com assinaturas vencidas que precisam de atenção imediata
                                      </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="h-96">
                                      <div className="space-y-2">
                                        {subscriptionAnalytics.usersByCategory.expired.map((user: any, index: number) => (
                                          <div key={index} className="bg-red-50 p-3 rounded border border-red-100">
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <p className="font-medium text-gray-900">{user.email}</p>
                                                <p className="text-sm text-gray-600">{user.name} • Plano: {user.planType}</p>
                                              </div>
                                              <div className="text-right text-sm">
                                                <p className="text-red-600 font-medium">{user.daysExpired} dias expirado</p>
                                                {user.subscriptionEndDate && (
                                                  <p className="text-gray-500">Venceu: {new Date(user.subscriptionEndDate).toLocaleDateString('pt-BR')}</p>
                                                )}
                                              </div>
                                            </div>
                                            {user.lastEvent && (
                                              <div className="mt-2 text-xs text-gray-600">
                                                Último evento: {user.lastEvent.type} 
                                                {user.daysSinceLastPayment && ` (${user.daysSinceLastPayment} dias atrás)`}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </ScrollArea>
                                  </DialogContent>
                                </Dialog>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {subscriptionAnalytics.usersByCategory.expired.slice(0, 5).map((user, index) => (
                                  <div key={index} className="bg-red-50 p-3 rounded border border-red-100">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium text-gray-900">{user.email}</p>
                                        <p className="text-sm text-gray-600">{user.name} • Plano: {user.planType}</p>
                                      </div>
                                      <div className="text-right text-sm">
                                        <p className="text-red-600 font-medium">{user.daysExpired} dias expirado</p>
                                        {user.subscriptionEndDate && (
                                          <p className="text-gray-500">Venceu: {new Date(user.subscriptionEndDate).toLocaleDateString('pt-BR')}</p>
                                        )}
                                      </div>
                                    </div>
                                    {user.lastEvent && (
                                      <div className="mt-2 text-xs text-gray-600">
                                        Último evento: {user.lastEvent.type} 
                                        {user.daysSinceLastPayment && ` (${user.daysSinceLastPayment} dias atrás)`}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Problemas de Pagamento */}
                          {subscriptionAnalytics.usersByCategory.paidWithoutPayment?.length > 0 && (
                            <div className="border border-purple-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-purple-700">Problemas de Pagamento ({subscriptionAnalytics.usersByCategory.paidWithoutPayment.length})</h3>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="text-purple-600 border-purple-200">
                                      Ver Todos
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[80vh]">
                                    <DialogHeader>
                                      <DialogTitle>Problemas de Pagamento ({subscriptionAnalytics.usersByCategory.paidWithoutPayment.length})</DialogTitle>
                                      <DialogDescription>
                                        Usuários com planos ativos mas sem registro de pagamento via webhook
                                      </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="h-96">
                                      <div className="space-y-2">
                                        {subscriptionAnalytics.usersByCategory.paidWithoutPayment.map((user: any, index: number) => (
                                          <div key={index} className="bg-purple-50 p-3 rounded border border-purple-100">
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <p className="font-medium text-gray-900">{user.email}</p>
                                                <p className="text-sm text-gray-600">{user.name} • Plano: {user.planType}</p>
                                              </div>
                                              <div className="text-right text-sm">
                                                <p className="text-purple-600 font-medium">{user.subscriptionStatus}</p>
                                                {user.isManualActivation && (
                                                  <p className="text-orange-600 text-xs">Ativação Manual</p>
                                                )}
                                              </div>
                                            </div>
                                            {user.issueDetails && (
                                              <div className="mt-2 text-xs text-purple-700 bg-purple-100 p-2 rounded">
                                                {user.issueDetails}
                                              </div>
                                            )}
                                            {user.lastEvent && (
                                              <div className="mt-1 text-xs text-gray-600">
                                                Último webhook: {user.lastEvent.type}
                                                {user.daysSinceLastEvent && ` (${user.daysSinceLastEvent} dias)`}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </ScrollArea>
                                  </DialogContent>
                                </Dialog>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {subscriptionAnalytics.usersByCategory.paidWithoutPayment.slice(0, 5).map((user, index) => (
                                  <div key={index} className="bg-purple-50 p-3 rounded border border-purple-100">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium text-gray-900">{user.email}</p>
                                        <p className="text-sm text-gray-600">{user.name} • Plano: {user.planType}</p>
                                      </div>
                                      <div className="text-right text-sm">
                                        <p className="text-purple-600 font-medium">{user.subscriptionStatus}</p>
                                        {user.isManualActivation && (
                                          <p className="text-orange-600 text-xs">Ativação Manual</p>
                                        )}
                                      </div>
                                    </div>
                                    {user.issueDetails && (
                                      <div className="mt-2 text-xs text-purple-700 bg-purple-100 p-2 rounded">
                                        {user.issueDetails}
                                      </div>
                                    )}
                                    {user.lastEvent && (
                                      <div className="mt-1 text-xs text-gray-600">
                                        Último webhook: {user.lastEvent.type}
                                        {user.daysSinceLastEvent && ` (${user.daysSinceLastEvent} dias)`}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Pagamentos Recentes */}
                          {subscriptionAnalytics.usersByCategory.recentPayments?.length > 0 && (
                            <div className="border border-green-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-green-700">Pagamentos Recentes ({subscriptionAnalytics.usersByCategory.recentPayments.length})</h3>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="text-green-600 border-green-200">
                                      Ver Todos
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[80vh]">
                                    <DialogHeader>
                                      <DialogTitle>Pagamentos Recentes ({subscriptionAnalytics.usersByCategory.recentPayments?.length || 0})</DialogTitle>
                                      <DialogDescription>
                                        Usuários que realizaram pagamentos nos últimos 7 dias
                                      </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="h-96">
                                      <div className="space-y-2">
                                        {subscriptionAnalytics.usersByCategory.recentPayments?.map((user: any, index: number) => (
                                          <div key={index} className="bg-green-50 p-3 rounded border border-green-100">
                                            <div className="flex justify-between items-center">
                                              <div>
                                                <p className="font-medium text-gray-900">{user.email}</p>
                                                <p className="text-sm text-gray-600">{user.planType} • {user.eventType}</p>
                                              </div>
                                              <div className="text-right text-sm">
                                                <p className="text-green-600 font-medium">{user.daysAgo} dias atrás</p>
                                                <p className="text-gray-500 text-xs">{new Date(user.paymentDate).toLocaleDateString('pt-BR')}</p>
                                              </div>
                                            </div>
                                          </div>
                                        )) || <p className="text-gray-500 text-center py-4">Nenhum pagamento recente encontrado</p>}
                                      </div>
                                    </ScrollArea>
                                  </DialogContent>
                                </Dialog>
                              </div>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {subscriptionAnalytics.usersByCategory.recentPayments.slice(0, 3).map((user, index) => (
                                  <div key={index} className="bg-green-50 p-3 rounded border border-green-100">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-medium text-gray-900">{user.email}</p>
                                        <p className="text-sm text-gray-600">{user.planType} • {user.eventType}</p>
                                      </div>
                                      <div className="text-right text-sm">
                                        <p className="text-green-600 font-medium">{user.daysAgo} dias atrás</p>
                                        <p className="text-gray-500 text-xs">{new Date(user.paymentDate).toLocaleDateString('pt-BR')}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Ativações Manuais */}
                          {subscriptionAnalytics.usersByCategory.manualActivations?.length > 0 && (
                            <div className="border border-cyan-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-cyan-700">Ativações Manuais pelo Admin ({subscriptionAnalytics.usersByCategory.manualActivations.length})</h3>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="text-cyan-600 border-cyan-200">
                                      Ver Todos
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[80vh]">
                                    <DialogHeader>
                                      <DialogTitle>Ativações Manuais ({subscriptionAnalytics.usersByCategory.manualActivations?.length || 0})</DialogTitle>
                                      <DialogDescription>
                                        Usuários ativados manualmente pelo administrador do sistema
                                      </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="h-96">
                                      <div className="space-y-2">
                                        {subscriptionAnalytics.usersByCategory.manualActivations?.map((user: any, index: number) => (
                                          <div key={index} className="bg-cyan-50 p-3 rounded border border-cyan-100">
                                            <div className="flex justify-between items-center">
                                              <div>
                                                <p className="font-medium text-gray-900">{user.email}</p>
                                                <p className="text-sm text-gray-600">{user.planType}</p>
                                              </div>
                                              <div className="text-right text-sm">
                                                <p className="text-cyan-600 font-medium">{user.daysActive} dias ativo</p>
                                                <p className="text-gray-500 text-xs">Por: {user.manualActivationBy}</p>
                                              </div>
                                            </div>
                                          </div>
                                        )) || <p className="text-gray-500 text-center py-4">Nenhuma ativação manual encontrada</p>}
                                      </div>
                                    </ScrollArea>
                                  </DialogContent>
                                </Dialog>
                              </div>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {subscriptionAnalytics.usersByCategory.manualActivations.slice(0, 3).map((user, index) => (
                                  <div key={index} className="bg-cyan-50 p-3 rounded border border-cyan-100">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-medium text-gray-900">{user.email}</p>
                                        <p className="text-sm text-gray-600">{user.planType}</p>
                                      </div>
                                      <div className="text-right text-sm">
                                        <p className="text-cyan-600 font-medium">{user.daysActive} dias ativo</p>
                                        <p className="text-gray-500 text-xs">Por: {user.manualActivationBy}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Painel de Verificação de Assinaturas Vencidas */}
                    <Card className="bg-orange-50 border-orange-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-orange-700">Verificação de Assinaturas Vencidas</CardTitle>
                        <CardDescription className="text-orange-600">
                          Identificar clientes com assinaturas vencidas sem pagamento detectado para downgrade automático
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg p-4 border border-orange-200">
                            <h4 className="font-medium text-orange-800 mb-2">Critérios de Verificação:</h4>
                            <ul className="text-sm text-orange-700 space-y-1">
                              <li>• Usuários em planos pagos (não "free")</li>
                              <li>• Data de vencimento já passou (IMEDIATO - sem tolerância)</li>
                              <li>• Não há registro de pagamento recente via webhook</li>
                              <li>• Não são ativações manuais recentes (últimos 30 dias)</li>
                            </ul>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-3">
                            <ExpiredSubscriptionsPreviewButton />
                          </div>
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
            
            <TabsContent value="hotmart" className="space-y-4">
              <HotmartOffersManagement />
            </TabsContent>

            <TabsContent value="banner" className="space-y-4">
              <BannerManagement />
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
                      {dynamicPlans.map((plan) => {
                        const count = users.filter(user => user.planType === plan.type).length;
                        const percentage = users.length > 0 ? (count / users.length) * 100 : 0;
                        
                        return (
                          <div key={plan.type} className="space-y-2">
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
                  {dynamicPlans.map((plan) => (
                    <SelectItem key={plan.type} value={plan.type}>{plan.name}</SelectItem>
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
                  {dynamicPlans.map((plan) => (
                    <SelectItem key={plan.type} value={plan.type}>
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
        <DialogContent className="max-w-md">
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
                    {dynamicPlans.map((plan) => (
                      <SelectItem key={plan.type} value={plan.type}>
                        {plan.name} ({plan.uploadLimit} uploads)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Tempo de Acesso</Label>
                <Select 
                  value={editForm.accessDays?.toString() || ""} 
                  onValueChange={(value) => setEditForm({...editForm, accessDays: value ? parseInt(value) : undefined})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dias (1 mês)</SelectItem>
                    <SelectItem value="60">60 dias (2 meses)</SelectItem>
                    <SelectItem value="90">90 dias (3 meses)</SelectItem>
                    <SelectItem value="180">180 dias (6 meses)</SelectItem>
                    <SelectItem value="365">365 dias (1 ano)</SelectItem>
                  </SelectContent>
                </Select>
                {editForm.accessDays && (
                  <p className="text-xs text-gray-500">
                    Expira em: {new Date(Date.now() + editForm.accessDays * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Período de Cobrança (Recurso Portfólio)</Label>
                <Select 
                  value={editForm.billingPeriod} 
                  onValueChange={(value: "monthly" | "yearly") => setEditForm({...editForm, billingPeriod: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal (sem acesso ao portfólio)</SelectItem>
                    <SelectItem value="yearly">Anual (com acesso ao portfólio)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {editForm.billingPeriod === 'yearly' 
                    ? '✅ Usuário terá acesso ao recurso de Portfólio Online' 
                    : '❌ Usuário não terá acesso ao recurso de Portfólio Online'}
                </p>
              </div>
              
              <div className="space-y-4 pt-4">
                {/* Email Button */}
                <div className="w-full">
                  <Button 
                    variant="outline" 
                    onClick={() => editingUser && handleResendWelcomeEmail(editingUser)}
                    className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Welcome Email
                  </Button>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleToggleUserStatus}
                      disabled={editForm.status === editingUser.status}
                      className="flex-1"
                    >
                      Update Status
                    </Button>
                    
                    <Button 
                      onClick={handleSetPlan}
                      disabled={editForm.planType === editingUser.planType}
                      className="flex-1"
                    >
                      Update Plan
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={handleSetAccessTime}
                    disabled={!editForm.accessDays}
                    className="w-full"
                  >
                    Definir Tempo de Acesso
                  </Button>
                  
                  <Button 
                    onClick={handleSetBillingPeriod}
                    disabled={editForm.billingPeriod === (editingUser?.billingPeriod || 'monthly')}
                    className="w-full bg-amber-500 hover:bg-amber-600"
                  >
                    {editForm.billingPeriod === 'yearly' ? 'Liberar Portfólio' : 'Remover Portfólio'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setEditUserDialogOpen(false)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
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

/**
 * Componente para gerenciar ofertas da Hotmart
 * Permite adicionar, editar, ativar/desativar ofertas sem precisar modificar o código
 */
interface HotmartOffer {
  id: number;
  offerCode: string;
  planType: "basic_v2" | "standard_v2" | "professional_v2";
  billingPeriod: "monthly" | "yearly";
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function HotmartOffersManagement() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingOffer, setEditingOffer] = useState<HotmartOffer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<HotmartOffer | null>(null);
  const [showInactiveOffers, setShowInactiveOffers] = useState(false);
  const [formData, setFormData] = useState({
    offerCode: "",
    planType: "basic_v2" as "basic_v2" | "standard_v2" | "professional_v2",
    billingPeriod: "monthly" as "monthly" | "yearly",
    description: "",
    isActive: true
  });

  // Buscar ofertas
  const { data: offers = [], isLoading, refetch } = useQuery<HotmartOffer[]>({
    queryKey: ["/api/admin/hotmart/offers"],
  });

  // Mutation para criar oferta
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/admin/hotmart/offers", data);
    },
    onSuccess: () => {
      toast({
        title: "Oferta criada",
        description: "A oferta foi criada com sucesso!",
      });
      refetch();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar oferta",
        description: error.message || "Ocorreu um erro ao criar a oferta",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar oferta
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      return await apiRequest("PUT", `/api/admin/hotmart/offers/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Oferta atualizada",
        description: "A oferta foi atualizada com sucesso!",
      });
      refetch();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar oferta",
        description: error.message || "Ocorreu um erro ao atualizar a oferta",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar oferta (soft ou hard delete)
  const deleteMutation = useMutation({
    mutationFn: async ({ id, permanent }: { id: number; permanent: boolean }) => {
      const url = permanent 
        ? `/api/admin/hotmart/offers/${id}?permanent=true`
        : `/api/admin/hotmart/offers/${id}`;
      return await apiRequest("DELETE", url, {});
    },
    onSuccess: (_, variables) => {
      const action = variables.permanent ? "excluída permanentemente" : "desativada";
      toast({
        title: `Oferta ${action}`,
        description: `A oferta foi ${action} com sucesso!`,
      });
      setDeleteDialogOpen(false);
      setOfferToDelete(null);
      refetch();
    },
    onError: (error: any, variables) => {
      const action = variables.permanent ? "excluir" : "desativar";
      toast({
        title: `Erro ao ${action} oferta`,
        description: error.message || `Ocorreu um erro ao ${action} a oferta`,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      offerCode: "",
      planType: "basic_v2",
      billingPeriod: "monthly",
      description: "",
      isActive: true,
    });
    setIsCreating(false);
    setEditingOffer(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOffer) {
      updateMutation.mutate({ id: editingOffer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (offer: HotmartOffer) => {
    setEditingOffer(offer);
    setFormData({
      offerCode: offer.offerCode,
      planType: offer.planType,
      billingPeriod: offer.billingPeriod || "monthly",
      description: offer.description || "",
      isActive: offer.isActive,
    });
    setIsCreating(true);
  };

  const getPlanName = (planType: string) => {
    const planMap: Record<string, string> = {
      basic_v2: "Básico (6.000 fotos)",
      standard_v2: "Standard (17.000 fotos)",
      professional_v2: "Professional (40.000 fotos)",
    };
    return planMap[planType] || planType;
  };

  return (
    <div className="space-y-6">
      {/* Header com botão de nova oferta */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Gerenciar Ofertas da Hotmart</h2>
            <p className="text-gray-600">
              Configure os códigos de ofertas da Hotmart e seus respectivos planos sem precisar modificar o código
            </p>
          </div>
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Nova Oferta
            </Button>
          )}
        </div>

        {/* Formulário de criação/edição */}
        {isCreating && (
          <form onSubmit={handleSubmit} className="mt-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium mb-4">
              {editingOffer ? "Editar Oferta" : "Nova Oferta"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="offerCode">Código da Oferta *</Label>
                <Input
                  id="offerCode"
                  value={formData.offerCode}
                  onChange={(e) => setFormData({ ...formData, offerCode: e.target.value })}
                  placeholder="ex: ro76q5uz"
                  required
                  data-testid="input-offer-code"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Código único da oferta conforme Hotmart
                </p>
              </div>

              <div>
                <Label htmlFor="planType">Plano Associado *</Label>
                <Select
                  value={formData.planType}
                  onValueChange={(value: any) => setFormData({ ...formData, planType: value })}
                >
                  <SelectTrigger data-testid="select-plan-type">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic_v2">Básico (6.000 fotos)</SelectItem>
                    <SelectItem value="standard_v2">Standard (17.000 fotos)</SelectItem>
                    <SelectItem value="professional_v2">Professional (40.000 fotos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="billingPeriod">Período de Cobrança *</Label>
                <Select
                  value={formData.billingPeriod}
                  onValueChange={(value: any) => setFormData({ ...formData, billingPeriod: value })}
                >
                  <SelectTrigger data-testid="select-billing-period">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal (30 dias)</SelectItem>
                    <SelectItem value="yearly">Anual (365 dias)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ex: Plano Básico Mensal - R$14,90"
                  data-testid="input-description"
                />
              </div>

              <div className="md:col-span-2 flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-is-active"
                />
                <Label htmlFor="isActive">Oferta ativa</Label>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-offer"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>{editingOffer ? "Atualizar" : "Criar"} Oferta</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Tabela de ofertas */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Ofertas Cadastradas</h3>
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactiveOffers}
              onCheckedChange={setShowInactiveOffers}
              data-testid="switch-show-inactive"
            />
            <Label htmlFor="show-inactive" className="cursor-pointer">
              Mostrar inativas
            </Label>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma oferta cadastrada ainda</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers
                .filter((offer: any) => showInactiveOffers || offer.isActive)
                .map((offer: any) => (
                <TableRow key={offer.id} data-testid={`row-offer-${offer.id}`}>
                  <TableCell className="font-mono font-medium">{offer.offerCode}</TableCell>
                  <TableCell>{getPlanName(offer.planType)}</TableCell>
                  <TableCell>
                    {offer.billingPeriod === "yearly" ? (
                      <Badge className="bg-purple-100 text-purple-800">Anual (365d)</Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800">Mensal (30d)</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {offer.description || "-"}
                  </TableCell>
                  <TableCell>
                    {offer.isActive ? (
                      <Badge className="bg-green-100 text-green-800">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(offer)}
                        data-testid={`button-edit-${offer.id}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOfferToDelete(offer);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${offer.id}`}
                      >
                        <Trash2Icon className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ou Desativar Oferta?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você tem duas opções para remover a oferta <strong className="font-mono">{offerToDelete?.offerCode}</strong>:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Desativar:</strong> A oferta fica inativa mas permanece no banco de dados (recomendado)</li>
                <li><strong>Excluir permanentemente:</strong> A oferta é removida 100% do banco de dados (não pode ser desfeito)</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                if (offerToDelete) {
                  deleteMutation.mutate({ id: offerToDelete.id, permanent: false });
                }
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-deactivate"
            >
              Apenas Desativar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (offerToDelete) {
                  deleteMutation.mutate({ id: offerToDelete.id, permanent: true });
                }
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-permanent-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Permanentemente"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Componente para gerenciar o banner do dashboard
 */
interface BannerConfig {
  imageUrl: string;
  linkUrl: string;
  altText: string;
  isActive: boolean;
}

function BannerManagement() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<BannerConfig>({
    imageUrl: "",
    linkUrl: "",
    altText: "Banner do Dashboard",
    isActive: false
  });

  const { data: bannerData, isLoading, refetch } = useQuery<BannerConfig>({
    queryKey: ["/api/admin/banner"],
  });

  useEffect(() => {
    if (bannerData) {
      setFormData({
        imageUrl: bannerData.imageUrl || "",
        linkUrl: bannerData.linkUrl || "",
        altText: bannerData.altText || "Banner do Dashboard",
        isActive: bannerData.isActive ?? false
      });
    }
  }, [bannerData]);

  const updateMutation = useMutation({
    mutationFn: async (data: BannerConfig) => {
      return await apiRequest("PUT", "/api/admin/banner", data);
    },
    onSuccess: () => {
      toast({
        title: "Banner atualizado",
        description: "As configurações do banner foram salvas com sucesso!",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o banner",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem (JPG, PNG, etc)",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await fetch('/api/admin/banner/upload', {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Falha no upload');
      }

      const result = await response.json();
      setFormData(prev => ({ ...prev, imageUrl: result.imageUrl }));
      
      toast({
        title: "Upload concluído",
        description: "A imagem foi enviada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a imagem",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium">Banner do Dashboard</h3>
            <p className="text-sm text-gray-500">Configure o banner que aparece na área do fotógrafo</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="banner-active"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              data-testid="switch-banner-active"
            />
            <Label htmlFor="banner-active" className="cursor-pointer">
              {formData.isActive ? (
                <Badge className="bg-green-100 text-green-800">Ativo</Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
            </Label>
          </div>
        </div>

        <div className="grid gap-6">
          <div>
            <Label className="mb-2 block">Imagem do Banner</Label>
            <div className="space-y-4">
              {formData.imageUrl && (
                <div className="relative rounded-lg overflow-hidden border bg-gray-50">
                  <img 
                    src={formData.imageUrl} 
                    alt={formData.altText}
                    className="w-full h-auto max-h-64 object-contain"
                  />
                </div>
              )}
              
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    data-testid="input-banner-image"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={uploading}
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <UploadIcon className="h-4 w-4 mr-2" />
                          Enviar Imagem
                        </>
                      )}
                    </span>
                  </Button>
                </label>

                <span className="text-sm text-gray-500">ou</span>

                <Input
                  placeholder="Cole a URL da imagem"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="flex-1"
                  data-testid="input-banner-url"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="banner-link" className="mb-2 block">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Link do Banner (opcional)
              </div>
            </Label>
            <Input
              id="banner-link"
              placeholder="https://exemplo.com/promocao"
              value={formData.linkUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
              data-testid="input-banner-link"
            />
            <p className="text-sm text-gray-500 mt-1">
              Se preenchido, o banner será clicável e abrirá este link em nova aba
            </p>
          </div>

          <div>
            <Label htmlFor="banner-alt" className="mb-2 block">Texto alternativo (acessibilidade)</Label>
            <Input
              id="banner-alt"
              placeholder="Descrição da imagem"
              value={formData.altText}
              onChange={(e) => setFormData(prev => ({ ...prev, altText: e.target.value }))}
              data-testid="input-banner-alt"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-6 border-t">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save-banner"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Configurações"
            )}
          </Button>
        </div>
      </div>

      {formData.imageUrl && formData.isActive && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Preview do Banner</h4>
          <div className="border rounded-lg overflow-hidden">
            {formData.linkUrl ? (
              <a href={formData.linkUrl} target="_blank" rel="noopener noreferrer" className="block cursor-pointer hover:opacity-90 transition-opacity">
                <img 
                  src={formData.imageUrl} 
                  alt={formData.altText}
                  className="w-full h-auto"
                />
              </a>
            ) : (
              <img 
                src={formData.imageUrl} 
                alt={formData.altText}
                className="w-full h-auto"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
