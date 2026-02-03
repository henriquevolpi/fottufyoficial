import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  Loader2, 
  CheckCircle, 
  Camera,
  Sparkles,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SubscriptionSuccessPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const verifySession = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      if (!sessionId) {
        console.log('[Success] Sem session_id, redirecionando para dashboard');
        setLocation('/dashboard');
        return;
      }

      if (!user) {
        console.log('[Success] Usuário não autenticado, mostrando tela de login');
        setStatus('pending');
        return;
      }

      try {
        console.log('[Success] Verificando sessão:', sessionId);
        const response = await apiRequest("GET", `/api/stripe/checkout-session/${sessionId}`);
        const data = await response.json();
        console.log('[Success] Resposta da API:', data);

        if (data.success) {
          setPlanInfo(data);
          setStatus('success');
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        } else if (data.status === 'unpaid' || data.status === 'open') {
          setStatus('pending');
        } else {
          setStatus('error');
        }
      } catch (error: any) {
        console.error("[Success] Erro ao verificar sessão:", error);
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          console.log('[Success] Erro 401, mostrando tela de login');
          setStatus('pending');
        } else {
          setStatus('error');
        }
      }
    };

    if (!authLoading) {
      verifySession();
    }
  }, [authLoading, user, retryCount]);

  const handleRetry = () => {
    setStatus('loading');
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    if (status === 'pending' && user) {
      const interval = setInterval(() => {
        console.log('[Success] Auto-retry para verificar status');
        setRetryCount(prev => prev + 1);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [status, user]);

  if (authLoading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Confirmando seu pagamento...</p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto py-16 px-4 max-w-2xl">
          <Card className="shadow-2xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-center text-white">
              <div className="w-20 h-20 mx-auto mb-6 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12" />
              </div>
              <h1 className="text-3xl font-bold mb-2">
                Pagamento Recebido!
              </h1>
              <p className="text-blue-100">
                {user ? 'Seu plano está sendo ativado' : 'Faça login para ativar seu plano'}
              </p>
            </div>

            <CardContent className="p-8">
              <div className="text-center mb-8">
                {user ? (
                  <>
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando sua assinatura...
                    </div>
                    
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Aguarde um momento
                    </h2>
                    <p className="text-gray-600">
                      Seu pagamento foi confirmado pelo Stripe. Estamos ativando seu plano agora. 
                      Isso pode levar alguns segundos.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                      <CheckCircle className="h-4 w-4" />
                      Pagamento confirmado!
                    </div>
                    
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Faça login para ativar seu plano
                    </h2>
                    <p className="text-gray-600">
                      Seu pagamento foi recebido com sucesso. Faça login na sua conta para 
                      ativar automaticamente seu novo plano.
                    </p>
                  </>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-green-800 text-sm">
                  <strong>Seu pagamento foi confirmado!</strong> {user 
                    ? 'Aguarde enquanto ativamos seu plano.' 
                    : 'Clique em "Fazer Login" abaixo para acessar sua conta e ativar seu plano automaticamente.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <>
                    <Button 
                      onClick={handleRetry}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-lg py-6"
                    >
                      <RefreshCw className="mr-2 h-5 w-5" />
                      Verificar Novamente
                    </Button>
                    <Link href="/dashboard" className="flex-1">
                      <Button variant="outline" className="w-full text-lg py-6">
                        Ir para Dashboard
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth" className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-lg py-6">
                        <Camera className="mr-2 h-5 w-5" />
                        Fazer Login
                      </Button>
                    </Link>
                    <Link href="/dashboard" className="flex-1">
                      <Button variant="outline" className="w-full text-lg py-6">
                        Ir para Dashboard
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-gray-500 text-sm mt-8">
            {user 
              ? 'Se você completou o pagamento, seu plano será ativado em instantes.'
              : 'Após fazer login, seu plano será ativado automaticamente.'}
            <br />
            Caso precise de ajuda, entre em contato com nosso suporte.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="max-w-md mx-auto shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">!</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Algo deu errado
            </h1>
            <p className="text-gray-600 mb-6">
              Não conseguimos confirmar seu pagamento. Se você foi cobrado, entre em contato conosco.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleRetry} variant="outline" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
              <Link href="/subscription">
                <Button className="w-full">
                  Voltar para planos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planNames: Record<string, string> = {
    'basico': 'Básico',
    'fotografo': 'Fotógrafo',
    'estudio': 'Estúdio'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto py-16 px-4 max-w-2xl">
        <Card className="shadow-2xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center text-white">
            <div className="w-20 h-20 mx-auto mb-6 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              Pagamento Confirmado!
            </h1>
            <p className="text-green-100">
              Bem-vindo ao Fottufy Premium
            </p>
          </div>

          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                Plano {planNames[planInfo?.planType] || planInfo?.planType}
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Sua assinatura está ativa!
              </h2>
              <p className="text-gray-600">
                Você agora tem acesso a todos os recursos do seu plano.
              </p>
            </div>

            <Link href="/dashboard" className="block">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-lg py-6">
                <ArrowRight className="mr-2 h-5 w-5" />
                Ir para Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-sm mt-8">
          Um recibo foi enviado para seu email. 
          <br />
          Você pode gerenciar sua assinatura a qualquer momento no painel.
        </p>
      </div>
    </div>
  );
}
