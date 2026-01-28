import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Loader2, 
  CheckCircle, 
  Camera,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function SubscriptionSuccessPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [planInfo, setPlanInfo] = useState<any>(null);

  useEffect(() => {
    const verifySession = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      if (!sessionId) {
        setStatus('error');
        return;
      }

      try {
        const response = await apiRequest("GET", `/api/stripe/checkout-session/${sessionId}`);
        const data = await response.json();

        if (data.success) {
          setPlanInfo(data);
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        setStatus('error');
      }
    };

    if (!authLoading) {
      verifySession();
    }
  }, [authLoading]);

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
            <Link href="/subscription">
              <Button className="w-full">
                Tentar novamente
              </Button>
            </Link>
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

            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">O que você pode fazer agora:</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Criar galerias ilimitadas para seus clientes</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Fazer upload de fotos com seu novo limite</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Compartilhar links personalizados com clientes</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Acessar suporte prioritário</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-lg py-6">
                  <Camera className="mr-2 h-5 w-5" />
                  Ir para Dashboard
                </Button>
              </Link>
              <Link href="/project/new" className="flex-1">
                <Button variant="outline" className="w-full text-lg py-6">
                  Criar Nova Galeria
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
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
