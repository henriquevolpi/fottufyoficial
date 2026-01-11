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
  Users, 
  Crown,
  Sparkles,
  Shield,
  Clock,
  HeartHandshake
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SubscriptionPage() {
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
      url: "https://pay.hotmart.com/K99608926Q?off=z0pxaesy&checkoutMode=6",
      popular: false
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
        "Perfeito para fotógrafos que atendem vários clientes na semana",
        "Suporte prioritário"
      ],
      url: "https://pay.hotmart.com/K99608926Q?off=tpfhcllk&checkoutMode=6",
      popular: true
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
      url: "https://pay.hotmart.com/K99608926Q?off=xtuh4ji0&checkoutMode=6",
      popular: false
    }
  ];

  const yearlyPlans = [
    {
      name: "Básico Anual",
      price: "R$14,90",
      period: "/mês",
      icon: <Camera className="h-8 w-8" />,
      color: "from-blue-500 to-blue-600",
      borderColor: "border-blue-200",
      badge: "Economia 25%",
      features: [
        "Até 6.000 fotos por mês",
        "Galerias ilimitadas", 
        "Faturamento anual",
        "Suporte preferencial"
      ],
      url: "https://pay.hotmart.com/K99608926Q?off=qrud9ui2&checkoutMode=6",
      popular: false
    },
    {
      name: "Fotógrafo Anual",
      price: "R$24,90",
      period: "/mês",
      icon: <Zap className="h-8 w-8" />,
      color: "from-purple-500 to-purple-600",
      borderColor: "border-purple-400",
      badge: "Melhor Valor",
      features: [
        "Até 17.000 fotos por mês",
        "Galerias ilimitadas",
        "Faturamento anual",
        "Suporte VIP"
      ],
      url: "https://pay.hotmart.com/K99608926Q?off=9w3ya3rl&checkoutMode=6",
      popular: true
    },
    {
      name: "Estúdio Anual",
      price: "R$39,90",
      period: "/mês",
      icon: <Crown className="h-8 w-8" />,
      color: "from-amber-500 to-amber-600",
      borderColor: "border-amber-200",
      badge: "Business Anual",
      features: [
        "Até 40.000 fotos por mês",
        "Galerias ilimitadas",
        "Faturamento anual",
        "Gerente de conta"
      ],
      url: "https://pay.hotmart.com/K99608926Q?off=rh54m382&checkoutMode=6",
      popular: false
    }
  ];

  const plans = billingCycle === "monthly" ? monthlyPlans : yearlyPlans;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-blue-50 border-blue-200">
              <ArrowLeft className="h-4 w-4" />
              Voltar para a Dashboard
            </Button>
          </Link>
        </div>
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Planos e Assinaturas
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Escolha o plano ideal para{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              impulsionar
            </span>{' '}
            seu negócio de fotografia
          </h1>

          {/* Billing Switcher */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <Tabs 
              value={billingCycle} 
              onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")}
              className="w-full max-w-[400px]"
            >
              <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 rounded-xl h-14">
                <TabsTrigger 
                  value="monthly" 
                  className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm h-12"
                >
                  Mensal
                </TabsTrigger>
                <TabsTrigger 
                  value="yearly" 
                  className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm h-12"
                >
                  Anual (Economize)
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {billingCycle === "yearly" && (
              <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 animate-bounce">
                Economize até 25% no plano anual!
              </Badge>
            )}
          </div>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Todos os planos incluem galerias ilimitadas, links personalizados e suporte especializado. 
            Escolha o que melhor atende ao volume do seu trabalho.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Segurança garantida</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Cancele a qualquer momento</span>
            </div>
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-purple-500" />
              <span>Suporte brasileiro</span>
            </div>
          </div>
        </div>
        
        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <Card 
              key={`${billingCycle}-${index}`} 
              className={`relative flex flex-col shadow-xl hover:shadow-2xl transition-all duration-300 border-2 ${plan.borderColor} group hover:scale-105 ${plan.popular ? 'transform scale-105' : ''}`}
            >
              {/* Badge for popular/premium plans */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className={`bg-gradient-to-r ${plan.color} text-white px-4 py-2 text-sm font-semibold shadow-lg`}>
                    <Star className="h-3 w-3 mr-1" />
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-4 text-center relative">
                {/* Icon with gradient background */}
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
                <a href={plan.url} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button 
                    className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-semibold text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-1`}
                  >
                    <Users className="mr-2 h-5 w-5" />
                    Assinar Agora
                  </Button>
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {/* Features Grid */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              O que você ganha em todos os planos
            </h2>
            <p className="text-lg text-gray-600">
              Recursos essenciais inclusos em qualquer assinatura
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center group">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Galerias Ilimitadas</h3>
              <p className="text-sm text-gray-600">Crie quantas galerias precisar</p>
            </div>
            
            <div className="text-center group">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Segurança Total</h3>
              <p className="text-sm text-gray-600">Suas fotos protegidas na nuvem</p>
            </div>
            
            <div className="text-center group">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Upload Rápido</h3>
              <p className="text-sm text-gray-600">Centenas de fotos em segundos</p>
            </div>
            
            <div className="text-center group">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Suporte Nacional</h3>
              <p className="text-sm text-gray-600">Atendimento em português</p>
            </div>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perguntas Frequentes
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Posso cancelar a qualquer momento?</h3>
              <p className="text-gray-600 text-sm">Sim! Não há fidelidade. Cancele quando quiser direto no painel.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Meus clientes precisam pagar?</h3>
              <p className="text-gray-600 text-sm">Não! Seus clientes acessam e escolhem as fotos gratuitamente.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Posso mudar de plano depois?</h3>
              <p className="text-gray-600 text-sm">Claro! Faça upgrade ou downgrade a qualquer momento.</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Tem limite de uploads?</h3>
              <p className="text-gray-600 text-sm">Sim dependendo do plano, porém ao apagar galerias e fotos de um cliente, o mesmo limite volta no mesmo instante!.</p>
            </div>
          </div>
        </div>
        
        {/* Final CTA */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para revolucionar seu trabalho?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de fotógrafos que já escolheram a Fottufy para 
            entregar fotos de forma profissional e eficiente.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-xl"
            >
              <Camera className="mr-2 h-5 w-5" />
              Começar agora
            </Button>
          </div>
          <p className="text-blue-200 text-sm mt-6">
            Todos os planos • Cancele quando quiser • Suporte incluído
          </p>
        </div>
      </div>
    </div>
  );
}