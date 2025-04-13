import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function PricingPage() {
  const [, setLocation] = useLocation();
  
  const handleSubscribe = (planType: string) => {
    // Redirecionar para a página de login com redirecionamento para checkout após login
    setLocation(`/auth?redirect=/checkout&plan=${planType}`);
  };
  
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Planos e Preços</h1>
        <p className="text-xl text-muted-foreground">
          Escolha o plano ideal para suas necessidades fotográficas. Todos os planos incluem acesso completo a todas as funcionalidades.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Plano Básico */}
        <Card className="border-primary/20 hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle>Básico</CardTitle>
            <CardDescription>Ideal para fotógrafos iniciantes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold">
              R$15<span className="text-base font-normal text-muted-foreground">/mês</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                1.500 uploads por conta
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Compartilhamento com clientes
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Seleção de fotos pelos clientes
              </li>
              <li className="flex items-center">
                <X className="h-4 w-4 mr-2 text-red-500" />
                Suporte prioritário
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => handleSubscribe('basic')}>
              Assinar Plano
            </Button>
          </CardFooter>
        </Card>
        
        {/* Plano Padrão */}
        <Card className="border-primary shadow-md relative before:absolute before:h-1 before:bg-primary before:inset-x-0 before:top-0 before:rounded-t-lg">
          <div className="absolute -top-4 left-0 right-0 flex justify-center">
            <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">MAIS POPULAR</span>
          </div>
          <CardHeader>
            <CardTitle>Padrão</CardTitle>
            <CardDescription>Para profissionais em crescimento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold">
              R$35<span className="text-base font-normal text-muted-foreground">/mês</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                5.000 uploads por conta
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Compartilhamento com clientes
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Seleção de fotos pelos clientes
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Suporte prioritário
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => handleSubscribe('standard')}>
              Assinar Plano
            </Button>
          </CardFooter>
        </Card>
        
        {/* Plano Profissional */}
        <Card className="border-primary/20 hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle>Profissional</CardTitle>
            <CardDescription>Para estúdios e profissionais de alto volume</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold">
              R$120<span className="text-base font-normal text-muted-foreground">/mês</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Uploads ilimitados
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Compartilhamento com clientes
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Seleção de fotos pelos clientes
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Suporte prioritário 24/7
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => handleSubscribe('professional')}>
              Assinar Plano
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="text-center mt-12">
        <h2 className="text-2xl font-bold mb-3">Perguntas Frequentes</h2>
        <div className="max-w-3xl mx-auto space-y-6 text-left">
          <div>
            <h3 className="font-semibold mb-1">O que acontece se eu exceder meu limite de uploads?</h3>
            <p className="text-muted-foreground">
              Quando você atingir seu limite de uploads, será necessário fazer upgrade para um plano superior ou aguardar o próximo período de faturamento.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Posso mudar de plano a qualquer momento?</h3>
            <p className="text-muted-foreground">
              Sim, você pode fazer upgrade do seu plano a qualquer momento. O valor será proporcional ao tempo restante do seu período atual.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Como funciona o compartilhamento com clientes?</h3>
            <p className="text-muted-foreground">
              Você receberá um link único para compartilhar com seus clientes. Eles poderão visualizar e selecionar as fotos que desejam sem precisar criar uma conta.
            </p>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-12">
        <p className="text-muted-foreground">
          Já possui uma conta? <Link href="/auth"><span className="text-primary hover:underline cursor-pointer">Faça login</span></Link>
        </p>
      </div>
    </div>
  );
}