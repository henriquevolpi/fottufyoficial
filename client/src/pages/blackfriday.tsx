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
  Shield,
  Clock,
  HeartHandshake,
  Flame,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BlackFridayPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  const plans = [
    {
      name: "Plano Básico",
      originalPrice: "R$238,80",
      price: "R$143",
      period: "/ano",
      icon: <Camera className="h-8 w-8" />,
      color: "from-yellow-500 to-orange-500",
      borderColor: "border-yellow-500/50",
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
      originalPrice: "R$358,80",
      price: "R$215",
      period: "/ano",
      icon: <Zap className="h-8 w-8" />,
      color: "from-yellow-400 to-yellow-600",
      borderColor: "border-yellow-400",
      features: [
        "Até 17.000 fotos por mês",
        "Galerias ilimitadas",
        "Perfeito para fotógrafos ativos",
        "Suporte prioritário"
      ],
      url: "https://pay.hotmart.com/K99608926Q?off=tpfhcllk&checkoutMode=6",
      popular: true
    },
    {
      name: "Plano Estúdio",
      originalPrice: "R$598,80",
      price: "R$359",
      period: "/ano",
      icon: <Crown className="h-8 w-8" />,
      color: "from-orange-500 to-red-500",
      borderColor: "border-orange-500/50",
      features: [
        "Até 40.000 fotos por mês",
        "Galerias ilimitadas",
        "Indicado para estúdios ou equipes",
        "Suporte prioritário"
      ],
      url: "https://pay.hotmart.com/K99608926Q?off=xtuh4ji0&checkoutMode=6",
      popular: false
    }
  ];
  
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Voltar para a Dashboard
            </Button>
          </Link>
        </div>
        
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-6 py-3 rounded-full text-lg font-bold mb-6 animate-pulse">
            <Flame className="h-5 w-5" />
            BLACK FRIDAY 2024
            <Flame className="h-5 w-5" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            <span className="text-yellow-400">40% OFF</span> em todos os planos anuais
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Aproveite esta oferta exclusiva e garanta um ano inteiro de acesso com super desconto. 
            Oferta por tempo limitado!
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-yellow-500" />
              <span>40% de desconto</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span>Planos anuais</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-yellow-500" />
              <span>Acesso imediato</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative flex flex-col bg-gray-900 border-2 ${plan.borderColor} shadow-2xl hover:shadow-yellow-500/20 transition-all duration-300 group hover:scale-105 ${plan.popular ? 'transform scale-105' : ''}`}
              data-testid={`card-plan-${index}`}
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 text-sm font-bold shadow-lg">
                  <Tag className="h-3 w-3 mr-1" />
                  40% OFF
                </Badge>
              </div>
              
              {plan.popular && (
                <div className="absolute -top-4 -right-4 z-10">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-3 py-2 text-xs font-bold shadow-lg">
                    <Star className="h-3 w-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-4 text-center relative pt-8">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${plan.color} flex items-center justify-center text-black shadow-lg group-hover:shadow-xl transition-shadow`}>
                  {plan.icon}
                </div>
                
                <CardTitle className="text-2xl font-bold text-white mb-2">
                  {plan.name}
                </CardTitle>
                
                <div className="space-y-1">
                  <div className="text-gray-500 line-through text-lg">
                    {plan.originalPrice}/ano
                  </div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-4xl font-black bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                      {plan.price}
                    </span>
                    <span className="text-lg text-gray-400 font-medium">
                      {plan.period}
                    </span>
                  </div>
                  <div className="text-yellow-400 text-sm font-semibold">
                    Pagamento único anual
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-grow px-6 pb-6">
                <ul className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                        <CheckCircle className="h-5 w-5 text-yellow-500" />
                      </div>
                      <span className="text-gray-300 leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="pt-6 px-6 pb-6">
                <a href={plan.url} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button 
                    className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-black font-bold text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-1`}
                    data-testid={`button-subscribe-${index}`}
                  >
                    <Flame className="mr-2 h-5 w-5" />
                    Garantir Desconto
                  </Button>
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="bg-gray-900 rounded-3xl border border-gray-800 p-8 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              O que você ganha em todos os planos
            </h2>
            <p className="text-lg text-gray-400">
              Recursos essenciais inclusos em qualquer assinatura
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center group">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-white mb-2">Galerias Ilimitadas</h3>
              <p className="text-sm text-gray-400">Crie quantas galerias precisar</p>
            </div>
            
            <div className="text-center group">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-white mb-2">Segurança Total</h3>
              <p className="text-sm text-gray-400">Suas fotos protegidas na nuvem</p>
            </div>
            
            <div className="text-center group">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-white mb-2">Upload Rápido</h3>
              <p className="text-sm text-gray-400">Centenas de fotos em segundos</p>
            </div>
            
            <div className="text-center group">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-white mb-2">Suporte Nacional</h3>
              <p className="text-sm text-gray-400">Atendimento em português</p>
            </div>
          </div>
        </div>
        
        <div className="text-center bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl p-12 text-black">
          <div className="inline-flex items-center gap-2 bg-black/20 text-black px-4 py-2 rounded-full text-sm font-bold mb-6">
            <Clock className="h-4 w-4" />
            OFERTA POR TEMPO LIMITADO
          </div>
          
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Não perca essa oportunidade!
          </h2>
          <p className="text-xl text-black/80 mb-8 max-w-2xl mx-auto">
            Garanta 40% de desconto no plano anual e economize o ano todo. 
            Oferta válida apenas durante a Black Friday!
          </p>
          
          <p className="text-black/60 text-sm mt-6">
            Planos anuais • Acesso imediato • Suporte incluído
          </p>
        </div>
      </div>
    </div>
  );
}
