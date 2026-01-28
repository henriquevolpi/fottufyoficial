import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle, 
  Star, 
  Zap, 
  Camera, 
  Crown,
  Sparkles,
  Shield,
  QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SubscriptionPixPage() {
  const { user, isLoading } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }

  const monthlyPlans = [
    {
      name: "Plano Básico",
      price: "R$19,90",
      period: "/mês",
      icon: <Camera className="h-8 w-8" />,
      color: "from-blue-500 to-blue-600",
      borderColor: "border-blue-200",
      badge: null,
      features: [
        "Até 6.000 fotos por mês",
        "Galerias ilimitadas", 
        "Ideal para quem está começando",
        "Acesso imediato e suporte"
      ],
      popular: false,
      hotmartUrl: "https://pay.hotmart.com/K99608926Q?off=6fm4k0j3"
    },
    {
      name: "Plano Fotógrafo",
      price: "R$29,90",
      period: "/mês",
      icon: <Zap className="h-8 w-8" />,
      color: "from-purple-500 to-purple-600",
      borderColor: "border-purple-400",
      badge: "Mais Popular",
      features: [
        "Até 17.000 fotos por mês",
        "Galerias ilimitadas",
        "Perfeito para fotógrafos que atendem vários clientes",
        "Suporte prioritário"
      ],
      popular: true,
      hotmartUrl: "https://pay.hotmart.com/K99608926Q?off=hjb8gqn7"
    },
    {
      name: "Plano Estúdio",
      price: "R$49,90",
      period: "/mês",
      icon: <Crown className="h-8 w-8" />,
      color: "from-amber-500 to-amber-600",
      borderColor: "border-amber-200",
      badge: "Premium",
      features: [
        "Até 40.000 fotos por mês",
        "Galerias ilimitadas",
        "Indicado para estúdios ou grandes equipes",
        "Suporte prioritário"
      ],
      popular: false,
      hotmartUrl: "https://pay.hotmart.com/K99608926Q?off=suf6vkf6"
    }
  ];

  const yearlyPlans = [
    {
      name: "Básico Anual",
      price: "R$12,92",
      period: "/mês",
      icon: <Camera className="h-8 w-8" />,
      color: "from-blue-500 to-blue-600",
      borderColor: "border-blue-200",
      badge: "Economia 35%",
      features: [
        "Até 6.000 fotos por mês",
        "Galerias ilimitadas", 
        "Faturamento anual (R$155/ano)",
        "Suporte preferencial"
      ],
      popular: false,
      hotmartUrl: "https://pay.hotmart.com/K99608926Q?off=6fm4k0j3"
    },
    {
      name: "Fotógrafo Anual",
      price: "R$19,59",
      period: "/mês",
      icon: <Zap className="h-8 w-8" />,
      color: "from-purple-500 to-purple-600",
      borderColor: "border-purple-400",
      badge: "Melhor Valor",
      features: [
        "Até 17.000 fotos por mês",
        "Galerias ilimitadas",
        "Faturamento anual (R$235/ano)",
        "Suporte VIP"
      ],
      popular: true,
      hotmartUrl: "https://pay.hotmart.com/K99608926Q?off=hjb8gqn7"
    },
    {
      name: "Estúdio Anual",
      price: "R$30,75",
      period: "/mês",
      icon: <Crown className="h-8 w-8" />,
      color: "from-amber-500 to-amber-600",
      borderColor: "border-amber-200",
      badge: "Business Anual",
      features: [
        "Até 40.000 fotos por mês",
        "Galerias ilimitadas",
        "Faturamento anual (R$369/ano)",
        "Gerente de conta"
      ],
      popular: false,
      hotmartUrl: "https://pay.hotmart.com/K99608926Q?off=suf6vkf6"
    }
  ];

  const plans = billingCycle === "monthly" ? monthlyPlans : yearlyPlans;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/subscription">
            <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-green-50 border-green-200">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Cartão
            </Button>
          </Link>
        </div>
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <QrCode className="h-4 w-4" />
            Pagamento via PIX
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Pague com{' '}
            <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              PIX
            </span>{' '}
            e tenha acesso instantâneo
          </h1>

          <div className="flex flex-col items-center gap-4 mb-8">
            <Tabs 
              value={billingCycle} 
              onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")}
              className="w-full max-w-[400px]"
            >
              <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 rounded-xl h-14">
                <TabsTrigger 
                  value="monthly" 
                  className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm h-12"
                >
                  Mensal
                </TabsTrigger>
                <TabsTrigger 
                  value="yearly" 
                  className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm h-12"
                >
                  Anual (Economize)
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {billingCycle === "yearly" && (
              <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 animate-bounce">
                Economize até 35% no plano anual!
              </Badge>
            )}
          </div>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Pagamento rápido e seguro via PIX. Processado pela Hotmart, uma das maiores plataformas de pagamento do Brasil.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Pagamento 100% seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-green-500" />
              <span>PIX instantâneo</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-500" />
              <span>Acesso liberado na hora</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <Card 
              key={`${billingCycle}-${index}`} 
              className={`relative flex flex-col shadow-xl hover:shadow-2xl transition-all duration-300 border-2 ${plan.borderColor} group hover:scale-105 ${plan.popular ? 'transform scale-105' : ''}`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className={`bg-gradient-to-r ${plan.color} text-white px-4 py-2 text-sm font-semibold shadow-lg`}>
                    <Star className="h-3 w-3 mr-1" />
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-4 text-center relative">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${plan.color} flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
                  {plan.icon}
                </div>
                
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </CardTitle>
                
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-4xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                    {plan.price}
                  </span>
                  <span className="text-lg text-gray-500 font-medium">
                    {plan.period}
                  </span>
                </div>
                {billingCycle === "yearly" && (
                  <div className="text-xs text-gray-600 font-medium mt-1">
                    pagamento anual
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="flex-grow px-6 pb-6">
                <ul className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <span className="text-gray-700 leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="pt-6 px-6 pb-6">
                <Button 
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-1"
                  onClick={() => window.open(plan.hotmartUrl, '_blank')}
                >
                  <QrCode className="mr-2 h-5 w-5" />
                  Pagar com PIX
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Como funciona o pagamento via PIX?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Escolha seu plano</h3>
              <p className="text-sm text-gray-600">Clique em "Pagar com PIX" no plano desejado</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Escaneie o QR Code</h3>
              <p className="text-sm text-gray-600">Use o app do seu banco para pagar instantaneamente</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Acesso liberado!</h3>
              <p className="text-sm text-gray-600">Seu plano é ativado automaticamente em minutos</p>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Prefere pagar com cartão de crédito?{' '}
            <Link href="/subscription" className="text-blue-600 hover:underline font-medium">
              Clique aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
