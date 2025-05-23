import React, { useEffect, useState } from 'react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Carregamos o Stripe fora do componente para evitar recriar o objeto Stripe em cada renderização
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Chave pública do Stripe não encontrada. Defina VITE_STRIPE_PUBLIC_KEY nas variáveis de ambiente.');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Componente do formulário de pagamento
const CheckoutForm = ({ planType }: { planType: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'initial' | 'processing' | 'success' | 'error'>('initial');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/subscription',
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Falha no Pagamento",
          description: error.message || "Ocorreu um erro ao processar seu pagamento.",
          variant: "destructive",
        });
        setPaymentStatus('error');
      } else {
        // O pagamento foi concluído com sucesso, atualize o plano no backend
        const response = await apiRequest("POST", "/api/subscription/upgrade", { planType });
        const data = await response.json();
        
        toast({
          title: "Pagamento Concluído",
          description: "Seu plano foi atualizado com sucesso!",
        });
        
        setPaymentStatus('success');
        
        // Após alguns segundos, redirecione para o dashboard com parâmetro de sucesso
        setTimeout(() => {
          setLocation('/dashboard?subscription_status=success&plan=' + planType);
        }, 2000);
      }
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      toast({
        title: "Erro no Pagamento",
        description: "Ocorreu um erro ao processar seu pagamento. Tente novamente mais tarde.",
        variant: "destructive",
      });
      setPaymentStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-2xl font-bold">Pagamento Concluído!</h2>
        <p className="text-center text-muted-foreground">
          Seu plano foi atualizado com sucesso. Você será redirecionado em alguns segundos.
        </p>
        <Button asChild>
          <Link href={`/dashboard?subscription_status=success&plan=${planType}`}>Ir para o Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando
          </>
        ) : (
          'Confirmar Pagamento'
        )}
      </Button>
    </form>
  );
};

// Componente principal de checkout
export default function Checkout() {
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  const planType = searchParams.get('plan') || 'basic';
  const [clientSecret, setClientSecret] = useState("");
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Vamos obter o nome do plano para exibição inicial
  // O preço real será determinado pelo backend, garantindo consistência
  const getInitialPlanName = (type: string) => {
    const planKey = type.toLowerCase();
    if (planKey.includes('basic')) return 'Básico';
    if (planKey.includes('standard')) return 'Padrão';
    if (planKey.includes('professional')) return 'Profissional';
    return 'Plano Selecionado';
  };
  
  const [planInfo, setPlanInfo] = useState({
    name: getInitialPlanName(planType),
    price: 0 // O preço real será obtido após criar o PaymentIntent
  });

  useEffect(() => {
    // Redirecionar para login se não estiver autenticado
    if (!isLoading && !user) {
      toast({
        title: "Acesso Negado",
        description: "Você precisa fazer login para acessar esta página.",
        variant: "destructive",
      });
      setLocation('/auth');
      return;
    }
    
    // Criar PaymentIntent assim que a página carregar
    if (user) {
      apiRequest("POST", "/api/create-payment-intent", { planType })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
          
          // Extrair informações do plano da descrição do PaymentIntent (se disponível)
          if (data.planName && data.planPrice) {
            setPlanInfo({
              name: data.planName,
              price: parseFloat(data.planPrice)
            });
          }
        })
        .catch(err => {
          console.error('Erro ao criar intent de pagamento:', err);
          toast({
            title: "Erro de Pagamento",
            description: "Não foi possível iniciar o processo de pagamento. Tente novamente mais tarde.",
            variant: "destructive",
          });
        });
    }
  }, [user, isLoading, planType, setLocation, toast]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // O useEffect redirecionará para a página de login
  }

  if (!clientSecret) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <Button variant="outline" asChild className="mb-6">
              <Link href="/subscription">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Assinaturas
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Preparando Pagamento</h1>
            <p className="text-muted-foreground">Estamos configurando sua sessão de pagamento...</p>
          </div>
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // Configuração do Stripe Elements
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      labels: 'floating' as const,
    },
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-6">
            <Link href="/subscription">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Assinaturas
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Checkout - Plano {planInfo.name}</h1>
          <p className="text-muted-foreground">Complete seu pagamento para ativar seu novo plano de assinatura.</p>
        </div>
        
        <div className="bg-muted p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Plano {planInfo.name}</p>
              <p className="text-sm text-muted-foreground">Assinatura mensal</p>
            </div>
            <p className="font-bold">R${planInfo.price.toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
        
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm planType={planType} />
        </Elements>
        
        <p className="text-sm text-muted-foreground mt-6 text-center">
          Seus dados de pagamento são processados de forma segura pelo Stripe.
        </p>
      </div>
    </div>
  );
}