import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle,
  ArrowRight,
  Zap,
  TrendingUp,
  Clock,
  DollarSign,
  Camera,
  Crown,
  Sparkles,
  ShoppingCart,
  MessageCircle,
  Award
} from 'lucide-react';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export default function LandingAdsPage() {
  const [, navigate] = useLocation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    // Meta Pixel Code - Injected in <head> as per Facebook requirements
    const FB_PIXEL_ID = '903015070818153';
    
    // Check if pixel already exists to avoid duplicates
    if (window.fbq) {
      window.fbq('track', 'PageView');
      return;
    }

    // Create and inject the pixel script into <head>
    const script = document.createElement('script');
    script.id = 'facebook-pixel';
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${FB_PIXEL_ID}');
      fbq('track', 'PageView');
    `;
    
    // Insert at the beginning of <head> as Facebook recommends
    document.head.insertBefore(script, document.head.firstChild);

    // Cleanup on unmount
    return () => {
      const existingScript = document.getElementById('facebook-pixel');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const monthlyPlans = [
    {
      name: "Plano Básico",
      planType: "basico",
      price: "R$19,90",
      period: "/mês",
      icon: <Camera className="h-7 w-7" />,
      color: "from-blue-500 to-blue-600",
      features: [
        "Até 6.000 fotos por mês",
        "Galerias ilimitadas", 
        "Ideal para quem está começando"
      ],
      popular: false
    },
    {
      name: "Plano Fotógrafo",
      planType: "fotografo",
      price: "R$29,90",
      period: "/mês",
      icon: <Zap className="h-7 w-7" />,
      color: "from-purple-500 to-purple-600",
      badge: "Mais Popular",
      features: [
        "Até 17.000 fotos por mês",
        "Galerias ilimitadas",
        "Para fotógrafos ativos"
      ],
      popular: true
    },
    {
      name: "Plano Estúdio",
      planType: "estudio",
      price: "R$49,90",
      period: "/mês",
      icon: <Crown className="h-7 w-7" />,
      color: "from-amber-500 to-amber-600",
      badge: "Premium",
      features: [
        "Até 40.000 fotos por mês",
        "Galerias ilimitadas",
        "Para estúdios e equipes"
      ],
      popular: false
    }
  ];

  const yearlyPlans = [
    {
      name: "Básico Anual",
      planType: "basico",
      price: "R$12,92",
      period: "/mês",
      icon: <Camera className="h-7 w-7" />,
      color: "from-blue-500 to-blue-600",
      badge: "35% OFF",
      features: [
        "Até 6.000 fotos por mês",
        "Galerias ilimitadas", 
        "Portfólio Online Exclusivo"
      ],
      popular: false
    },
    {
      name: "Fotógrafo Anual",
      planType: "fotografo",
      price: "R$19,59",
      period: "/mês",
      icon: <Zap className="h-7 w-7" />,
      color: "from-purple-500 to-purple-600",
      badge: "Melhor Valor",
      features: [
        "Até 17.000 fotos por mês",
        "Galerias ilimitadas",
        "Portfólio Online Exclusivo"
      ],
      popular: true
    },
    {
      name: "Estúdio Anual",
      planType: "estudio",
      price: "R$30,75",
      period: "/mês",
      icon: <Crown className="h-7 w-7" />,
      color: "from-amber-500 to-amber-600",
      badge: "Premium",
      features: [
        "Até 40.000 fotos por mês",
        "Galerias ilimitadas",
        "Portfólio Online Exclusivo"
      ],
      popular: false
    }
  ];

  const plans = billingCycle === "monthly" ? monthlyPlans : yearlyPlans;

  const handleCTA = () => {
    window.fbq('track', 'Lead');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Badge className="mb-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 px-4 py-2 text-sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Plataforma usada por +500 fotógrafos
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 leading-tight">
            Faça seus clientes escolherem fotos{' '}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              mais rápido
            </span>{' '}
            e comprarem{' '}
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              mais fotos extras
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            O problema não é o cliente demorar pra escolher fotos.<br />
            <span className="text-white font-semibold">O problema é deixar ele escolher sem um Caminho de Escolha.</span>
          </p>

          <Button 
            size="lg"
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-10 py-7 text-xl font-bold rounded-2xl shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 transform transition-all hover:scale-105"
            onClick={handleCTA}
          >
            <Zap className="mr-2 h-6 w-6" />
            Criar meu Caminho de Escolha
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
          
          <p className="mt-4 text-slate-400 text-sm">Teste grátis por 7 dias. Sem compromisso.</p>
        </div>
      </section>

      {/* Estatísticas de Destaque */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white/5 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <TrendingUp className="h-8 w-8 text-green-400" />, value: "+35%", label: "Mais vendas de extras" },
              { icon: <Clock className="h-8 w-8 text-blue-400" />, value: "3x", label: "Mais rápido na escolha" },
              { icon: <MessageCircle className="h-8 w-8 text-purple-400" />, value: "-70%", label: "Menos mensagens" },
              { icon: <Award className="h-8 w-8 text-amber-400" />, value: "100%", label: "Profissionalismo" }
            ].map((stat, index) => (
              <div key={index} className="text-center p-4">
                <div className="flex justify-center mb-2">{stat.icon}</div>
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O erro do mercado */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8">
            Por que <span className="text-red-400">Drive e WhatsApp</span> não funcionam?
          </h2>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <p className="text-xl text-slate-300 text-center leading-relaxed mb-6">
              Porque essas ferramentas apenas <strong className="text-white">entregam arquivos</strong>.<br />
              Elas <span className="text-red-400 font-semibold">não conduzem decisão</span>.
            </p>
            
            <p className="text-lg text-slate-400 text-center">
              Quando o cliente recebe todas as fotos soltas, ele se perde, demora para escolher e <strong className="text-white">raramente compra fotos extras</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* O Caminho de Escolha */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-900/50 to-blue-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
              O diferencial da Fottufy
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              O <span className="text-purple-400">Caminho de Escolha</span>
            </h2>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20">
            <p className="text-xl text-slate-200 text-center leading-relaxed mb-6">
              A Fottufy não é apenas uma galeria de fotos.<br />
              Ela cria um <strong className="text-purple-400">Caminho de Escolha</strong> que guia o cliente passo a passo.
            </p>
            
            <div className="grid sm:grid-cols-3 gap-6 mt-8">
              {[
                { icon: <ShoppingCart className="h-6 w-6" />, title: "Mais vendas", desc: "Cliente vê valor e compra extras" },
                { icon: <Clock className="h-6 w-6" />, title: "Mais rápido", desc: "Decisão em minutos, não dias" },
                { icon: <Award className="h-6 w-6" />, title: "Mais respeito", desc: "Processo profissional" }
              ].map((item, index) => (
                <div key={index} className="text-center p-4 bg-white/5 rounded-xl">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 mb-3">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios Destacados */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            O que muda quando você usa a Fottufy
          </h2>
          <p className="text-slate-400 text-center mb-12 text-lg">
            Veja como fotógrafos estão transformando suas entregas
          </p>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: <DollarSign className="h-6 w-6 text-green-400" />, text: "Venda em média 35% mais fotos extras", highlight: true },
              { icon: <Clock className="h-6 w-6 text-blue-400" />, text: "Clientes escolhem 3x mais rápido" },
              { icon: <MessageCircle className="h-6 w-6 text-purple-400" />, text: "70% menos mensagens e retrabalho" },
              { icon: <Award className="h-6 w-6 text-amber-400" />, text: "Processo 100% profissional" },
              { icon: <Zap className="h-6 w-6 text-pink-400" />, text: "Entrega automatizada e bonita" },
              { icon: <CheckCircle className="h-6 w-6 text-emerald-400" />, text: "Controle total do fotógrafo" }
            ].map((benefit, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-4 p-5 rounded-xl border transition-all ${
                  benefit.highlight 
                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex-shrink-0">{benefit.icon}</div>
                <span className={`text-lg ${benefit.highlight ? 'text-green-300 font-semibold' : 'text-slate-200'}`}>
                  {benefit.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparação */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            A diferença é <span className="text-purple-400">clara</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Drive / WhatsApp */}
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
              <h3 className="text-xl font-bold text-slate-400 mb-6 text-center">Drive / WhatsApp</h3>
              <div className="space-y-4">
                {[
                  'Cliente perdido e confuso',
                  'Escolha sem limite de tempo',
                  'Processo amador',
                  'Baixa percepção de valor',
                  'Poucas vendas de extras'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <span className="text-slate-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fottufy */}
            <div className="bg-gradient-to-br from-purple-900/80 to-blue-900/80 p-8 rounded-2xl border border-purple-500/30 shadow-xl shadow-purple-500/10">
              <h3 className="text-xl font-bold text-purple-400 mb-6 text-center">Fottufy</h3>
              <div className="space-y-4">
                {[
                  'Caminho de Escolha claro',
                  'Escolha guiada e rápida',
                  'Processo 100% profissional',
                  'Alta percepção de valor',
                  'Mais vendas de fotos extras'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span className="text-white font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Preços */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-purple-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Escolha seu plano
            </h2>
            <p className="text-slate-400 text-lg mb-8">
              Comece hoje e transforme suas entregas
            </p>
            
            <Tabs defaultValue="monthly" className="w-fit mx-auto">
              <TabsList className="bg-white/10 border border-white/20">
                <TabsTrigger 
                  value="monthly" 
                  onClick={() => setBillingCycle("monthly")}
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  Mensal
                </TabsTrigger>
                <TabsTrigger 
                  value="yearly" 
                  onClick={() => setBillingCycle("yearly")}
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  Anual <span className="ml-1 text-green-400 text-xs">-35%</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative bg-white/5 backdrop-blur-sm border-2 transition-all hover:scale-105 ${
                  plan.popular 
                    ? 'border-purple-500 shadow-xl shadow-purple-500/20' 
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                {plan.badge && (
                  <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
                      : 'bg-slate-600'
                  } text-white border-0`}>
                    {plan.badge}
                  </Badge>
                )}
                
                <CardHeader className="text-center pt-8">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r ${plan.color} text-white mx-auto mb-4`}>
                    {plan.icon}
                  </div>
                  <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4 pb-8">
                  {plan.features.map((feature, fIndex) => (
                    <div key={fIndex} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </div>
                  ))}
                  
                  <Button 
                    className={`w-full mt-6 py-6 font-bold ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                    onClick={handleCTA}
                  >
                    Começar agora
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <p className="text-center text-slate-400 mt-8 text-sm">
            Todos os planos incluem 7 dias de teste grátis. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Pronto para vender mais fotos?
          </h2>
          
          <p className="text-xl text-white/80 mb-8">
            Comece agora e veja seus clientes escolherem fotos do jeito certo.
          </p>

          <Button 
            size="lg"
            className="bg-white text-purple-600 hover:bg-slate-100 px-12 py-7 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-white/30 transform transition-all hover:scale-105"
            onClick={handleCTA}
          >
            Criar meu Caminho de Escolha
            <ArrowRight className="ml-3 h-6 w-6" />
          </Button>
          
          <p className="mt-4 text-white/60 text-sm">
            Mais de 500 fotógrafos já usam. Teste grátis por 7 dias.
          </p>
        </div>
      </section>

      {/* Footer mínimo */}
      <footer className="py-8 px-4 text-center bg-slate-900 border-t border-white/10">
        <p className="text-slate-500 text-sm">Fottufy - A plataforma dos fotógrafos profissionais</p>
      </footer>

      {/* Facebook Pixel noscript fallback */}
      <noscript>
        <img 
          height="1" 
          width="1" 
          style={{ display: 'none' }}
          src="https://www.facebook.com/tr?id=903015070818153&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>
    </div>
  );
}
