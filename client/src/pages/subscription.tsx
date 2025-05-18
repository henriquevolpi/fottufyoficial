import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubscriptionPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  const plans = [
    {
      name: "Plano Básico",
      price: "R$19,90/mês",
      features: [
        "Até 6.000 fotos por mês",
        "Galerias ilimitadas",
        "Ideal para quem está começando",
        "Acesso imediato e suporte"
      ],
      url: "https://pay.hotmart.com/K99608926Q?off=z0pxaesy&checkoutMode=6"
    },
    {
      name: "Plano Fotógrafo",
      price: "R$29,90/mês",
      features: [
        "Até 15.000 fotos por mês",
        "Galerias ilimitadas",
        "Perfeito para fotógrafos que atendem vários clientes na semana",
        "Suporte prioritário"
      ],
      url: "https://pay.hotmart.com/K99608926Q?off=tpfhcllk&checkoutMode=6"
    },
    {
      name: "Plano Estúdio",
      price: "R$49,90/mês",
      features: [
        "Até 35.000 fotos por mês",
        "Galerias ilimitadas",
        "Indicado para estúdios ou grandes equipes",
        "Suporte prioritário"
      ],
      url: "https://pay.hotmart.com/K99608926Q?off=xtuh4ji0&checkoutMode=6"
    }
  ];
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a Dashboard
          </Button>
        </Link>
      </div>
      
      <div className="space-y-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Planos e Assinaturas</h2>
          <p className="text-muted-foreground">
            Escolha o plano que melhor atende às suas necessidades.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <Card key={index} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 border-t-4 border-t-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold text-primary">{plan.name}</CardTitle>
                <CardDescription className="text-3xl font-bold mt-2">
                  {plan.price}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow pt-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <svg className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-foreground text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-4">
                <a href={plan.url} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-medium text-lg py-6">
                    Assinar Agora
                  </Button>
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="mt-10 text-center">
          <p className="text-muted-foreground">Cancele a qualquer momento</p>
        </div>
      </div>
    </div>
  );
}