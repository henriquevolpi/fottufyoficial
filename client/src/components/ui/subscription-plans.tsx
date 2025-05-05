import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface Plan {
  name: string;
  type: string;
  price: number;
  uploadLimit: number;
  description: string;
  current?: boolean;
}

interface UserSubscriptionStats {
  uploadLimit: number;
  usedUploads: number;
  remainingUploads: number;
  planType: string;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
}

interface SubscriptionData {
  plans: {
    FREE: Plan;
    BASIC: Plan;
    STANDARD: Plan;
    PROFESSIONAL: Plan;
    BASIC_V2?: Plan;
    STANDARD_V2?: Plan;
    PROFESSIONAL_V2?: Plan;
  };
  userStats: UserSubscriptionStats;
}

export default function SubscriptionPlans() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Get subscription plans with correct typing
  const { data: subscriptionData, isLoading, error, refetch } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription/plans"],
    enabled: !!user,
    // Use explicit fetcher that normalizes response data
    queryFn: async ({ queryKey }) => {
      const url = queryKey[0] as string;
      const response = await apiRequest("GET", url);
      if (!response.ok) {
        throw new Error('Failed to fetch subscription plans');
      }
      
      const data = await response.json();
      
      // Normalize plan data to handle Portuguese/English mismatches
      if (data.userStats) {
        // Normalize plan type to uppercase for consistency
        data.userStats.planType = data.userStats.planType.toUpperCase();
        if (data.userStats.planType === 'GRATUITO') data.userStats.planType = 'FREE';
        if (data.userStats.planType === 'BÁSICO' || data.userStats.planType === 'BASICO') data.userStats.planType = 'BASIC';
        if (data.userStats.planType === 'PADRÃO' || data.userStats.planType === 'PADRAO') data.userStats.planType = 'STANDARD';
        if (data.userStats.planType === 'PROFISSIONAL') data.userStats.planType = 'PROFESSIONAL';
      }
      
      // Mark the current plan
      if (data.plans && data.userStats) {
        // Reset current flag for all plans
        Object.values(data.plans).forEach((plan: any) => {
          plan.current = false;
        });
        
        // Set current flag for user's plan
        const userPlanKey = data.userStats.planType;
        if (data.plans[userPlanKey]) {
          data.plans[userPlanKey].current = true;
        }
      }
      
      return data;
    }
  });
  
  // Mutation para atualizar o plano de assinatura (apenas para plano gratuito)
  const upgradeMutation = useMutation({
    mutationFn: async (planType: string) => {
      const res = await apiRequest("POST", "/api/subscription/upgrade", { planType });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Assinatura atualizada",
        description: "Seu plano foi atualizado com sucesso!",
      });
      // Atualizar os dados de assinatura após a mudança
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/plans"] });
      // Atualizar os dados do usuário
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar assinatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleUpgrade = (planType: string, price: number) => {
    // Se for o plano gratuito, fazemos a atualização direta
    if (price === 0) {
      upgradeMutation.mutate(planType);
    } else {
      // Para planos pagos, redirecionamos para a página de checkout
      setLocation(`/checkout?plan=${planType}`);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="w-8 h-8 border-4 border-t-primary border-b-transparent border-l-transparent border-r-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (error || !subscriptionData) {
    return (
      <div className="text-center p-8">
        <h3 className="font-semibold text-lg">Erro ao carregar planos</h3>
        <p className="text-muted-foreground">
          Não foi possível carregar os planos de assinatura. Tente novamente mais tarde.
        </p>
      </div>
    );
  }
  
  const { plans, userStats } = subscriptionData;
  
  // A API já está retornando apenas os planos V2 (FREE, BASIC_V2, STANDARD_V2, PROFESSIONAL_V2)
  // e, para usuários com planos antigos, incluindo o plano atual como uma opção
  // Convertemos o objeto de planos para um array para uso no mapeamento
  const plansToDisplay = Object.entries(plans);
  
  // Identificamos o plano atual do usuário para destacá-lo na interface
  const currentPlanType = userStats.planType.toUpperCase();
  
  return (
    <div className="space-y-6">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Planos e Assinaturas</h2>
          <p className="text-muted-foreground">
            Escolha o plano que melhor atende às suas necessidades.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            refetch();
            toast({
              title: "Estatísticas atualizadas",
              description: "Os dados de assinatura foram atualizados.",
            });
          }}
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </Button>
      </div>
      
      {/* Estatísticas do usuário */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans[userStats.planType.toUpperCase() as keyof typeof plans]?.name || "Gratuito"}
            </div>
            <p className="text-xs text-muted-foreground">
              Status: {userStats.subscriptionStatus === "active" ? "Ativo" : "Inativo"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uploads Restantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats.uploadLimit < 0 ? "Ilimitado" : userStats.remainingUploads}
            </div>
            <p className="text-xs text-muted-foreground">
              {userStats.uploadLimit < 0 
                ? "Sem limite de uploads" 
                : `De ${userStats.uploadLimit} disponíveis`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uploads Utilizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.usedUploads}</div>
            <p className="text-xs text-muted-foreground">
              {userStats.uploadLimit < 0 
                ? "Plano ilimitado" 
                : `${Math.round((userStats.usedUploads / Math.max(1, userStats.uploadLimit)) * 100)}% do limite`}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Lista de planos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {plansToDisplay.map(([key, plan]) => (
          <Card key={key} className={plan.current ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{plan.name}</CardTitle>
                {plan.current && (
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    Atual
                  </Badge>
                )}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold">
                {plan.price === 0 ? "Gratuito" : `R$${plan.price}`}
                {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  {plan.uploadLimit >= 999999 
                    ? "Uploads ilimitados" 
                    : `${plan.uploadLimit.toLocaleString()} uploads por conta`}
                </li>
                {key === "FREE" ? (
                  <li className="flex items-center text-muted-foreground">
                    <X className="h-4 w-4 mr-2 text-red-500" />
                    Apenas para testes
                  </li>
                ) : (
                  <li className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Suporte prioritário
                  </li>
                )}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                variant={plan.current ? "outline" : "default"}
                disabled={plan.current || upgradeMutation.isPending}
                onClick={() => handleUpgrade(plan.type, plan.price)}
              >
                {plan.current 
                  ? "Plano Atual" 
                  : plan.price === 0 
                    ? "Usar Plano Gratuito" 
                    : "Fazer Upgrade"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}