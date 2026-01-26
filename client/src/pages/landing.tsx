import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  CheckCircle, 
  Clock, 
  Globe, 
  Heart, 
  Image, 
  Link2, 
  Mail, 
  MessageSquare, 
  MousePointer, 
  Shield, 
  Smartphone, 
  Star, 
  Zap,
  ArrowRight,
  Play,
  Users,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Camera className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Fottufy
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#como-funciona" className="text-gray-600 hover:text-blue-600 transition-colors">Como Funciona</a>
              <a href="#recursos" className="text-gray-600 hover:text-blue-600 transition-colors">Recursos</a>
              <a href="#precos" className="text-gray-600 hover:text-blue-600 transition-colors">Preços</a>
              <a href="#depoimentos" className="text-gray-600 hover:text-blue-600 transition-colors">Depoimentos</a>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Entrar
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 bg-white relative overflow-hidden">
        {/* Background Decorative Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[120px] animate-pulse delay-700"></div>
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-pink-100/40 rounded-full blur-[80px]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-sm font-medium mb-8 shadow-sm animate-bounce">
              <Sparkles className="h-4 w-4" />
              <span>A galeria preferida dos fotógrafos de elite</span>
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black text-slate-900 mb-8 tracking-tight leading-[0.9]">
              FOTTUFY<br />
              <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent italic">
                Sua marca, sua entrega.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              Envie fotos, selecione favoritos e entregue projetos com uma experiência visual que passa <span className="text-purple-600 font-medium">total confiança</span> e profissionalismo.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-20">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-10 py-8 text-xl font-bold rounded-2xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transform transition-all hover:scale-105 group"
                onClick={() => navigate('/auth')}
              >
                <Zap className="mr-2 h-6 w-6 fill-white" />
                COMEÇAR AGORA, É GRÁTIS!
                <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">Plataforma Oficial</p>
            </div>

            {/* Hero Visual - Inspirado no Design Youze */}
            <div className="relative max-w-6xl mx-auto">
              <div className="relative bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-white overflow-hidden transition-all duration-700 hover:shadow-[0_60px_120px_rgba(139,92,246,0.15)] group/container">
                {/* Header Estilo App Moderno */}
                <div className="bg-white/50 px-8 py-6 flex items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
                      <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
                      <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
                    </div>
                    <div className="h-4 w-px bg-slate-200 mx-2"></div>
                    <div className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                      fottufy.app/live-preview
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                </div>

                {/* Conteúdo da Galeria Estilizado */}
                <div className="relative p-6 md:p-16 bg-gradient-to-br from-white via-slate-50 to-purple-50/30">
                  <div className="flex flex-col items-center mb-16">
                    <h3 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4 text-center">
                      SELEÇÃO <span className="text-purple-600">PREMIUM</span>
                    </h3>
                    <p className="text-slate-400 font-medium tracking-[0.3em] uppercase text-sm text-center">Wedding Collection • 2026</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8">
                    {[
                      { id: 1, selected: true, color: 'from-purple-100 to-blue-100' },
                      { id: 2, selected: false, color: 'from-blue-100 to-pink-100' },
                      { id: 3, selected: true, color: 'from-pink-100 to-purple-100' },
                      { id: 4, selected: true, color: 'from-purple-100 to-amber-100' }
                    ].map((item) => (
                      <div 
                        key={item.id} 
                        className="group relative aspect-[4/5] rounded-[32px] overflow-hidden bg-white shadow-xl transition-all duration-500 hover:-translate-y-2"
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-40 group-hover:opacity-60 transition-opacity`}></div>
                        <div className="absolute inset-0 flex items-center justify-center rotate-[-15deg] opacity-10 group-hover:opacity-20 transition-opacity">
                          <span className="text-2xl font-black text-slate-900 select-none">FOTTUFY</span>
                        </div>
                        
                        {/* Botão de Seleção Flutuante */}
                        <div className={`absolute bottom-6 right-6 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${item.selected ? 'bg-purple-600 text-white scale-110 rotate-12' : 'bg-white/90 text-slate-400 hover:text-purple-600'}`}>
                          <Heart className={`h-6 w-6 ${item.selected ? 'fill-current' : ''}`} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Floating Dashboard Elements */}
                  <div className="absolute top-20 right-[-20px] hidden lg:block w-64 p-6 bg-white rounded-3xl shadow-2xl border border-slate-100 animate-in slide-in-from-right duration-1000">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conversão</p>
                        <p className="text-xl font-black text-slate-900">+88%</p>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-[88%] bg-green-500 rounded-full"></div>
                    </div>
                  </div>

                  <div className="absolute bottom-20 left-[-20px] hidden lg:block w-64 p-6 bg-white rounded-3xl shadow-2xl border border-slate-100 animate-in slide-in-from-left duration-1000">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acesso Mobile</p>
                        <p className="text-xl font-black text-slate-900">100% OK</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-slate-400 font-bold tracking-[0.2em] uppercase text-xs mb-12">Empresas que confiam na nossa tecnologia</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="text-3xl font-black text-slate-900 tracking-tighter">PhotoStudio</div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter">FotoMagic</div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter">ClickArt</div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter">LensCraft</div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-32 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
              A JORNADA DA <span className="text-purple-600">ENTREGA PERFEITA</span>
            </h2>
            <p className="text-xl text-slate-500 max-w-3xl mx-auto font-light">
              Do primeiro clique à satisfação total do seu cliente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Upload Inteligente", icon: Zap, color: "bg-purple-100 text-purple-600", desc: "Arraste centenas de fotos. Nosso sistema processa e otimiza tudo em segundos." },
              { step: "02", title: "Link Exclusivo", icon: Link2, color: "bg-blue-100 text-blue-600", desc: "Envie um link personalizado que respira a identidade da sua marca." },
              { step: "03", title: "Seleção Intuitiva", icon: Heart, color: "bg-pink-100 text-pink-600", desc: "Seu cliente escolhe as fotos favoritas com um clique, de qualquer lugar." },
              { step: "04", title: "Projeto Finalizado", icon: CheckCircle, color: "bg-green-100 text-green-600", desc: "Receba a lista pronta e entregue o trabalho finalizado com elegância." }
            ].map((item, idx) => (
              <div key={idx} className="group relative">
                <div className="bg-white rounded-[40px] p-10 shadow-sm border border-slate-100 h-full transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden">
                  <div className="absolute top-[-20px] right-[-20px] text-8xl font-black text-slate-50 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    {item.step}
                  </div>
                  <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mb-8 shadow-inner`}>
                    <item.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-black mb-4 text-slate-900 tracking-tight">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed font-light">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
              TECNOLOGIA PARA <span className="text-blue-600">ELITE</span>
            </h2>
            <p className="text-xl text-slate-500 max-w-3xl mx-auto font-light">
              Tudo o que você precisa para escalar seu negócio de fotografia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Design Imersivo", icon: Smartphone, color: "bg-blue-50 text-blue-600", desc: "Experiência mobile-first que encanta o cliente no primeiro segundo." },
              { title: "Velocidade Real", icon: Clock, color: "bg-amber-50 text-amber-600", desc: "Uploads paralelos e processamento ultra-rápido sem travamentos." },
              { title: "Proteção Total", icon: Shield, color: "bg-purple-50 text-purple-600", desc: "Marca d'água automática e dinâmica para proteger sua arte." },
              { title: "Personalização", icon: Globe, color: "bg-indigo-50 text-indigo-600", desc: "Domínio próprio e links que reforçam o poder da sua marca." },
              { title: "Insights de IA", icon: TrendingUp, color: "bg-green-50 text-green-600", desc: "Saiba o que seu cliente mais gosta antes mesmo dele te falar." },
              { title: "Notificações", icon: Mail, color: "bg-pink-50 text-pink-600", desc: "Avisos em tempo real de acessos e seleções finalizadas." }
            ].map((item, idx) => (
              <Card key={idx} className="bg-white border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 rounded-[32px] overflow-hidden group">
                <CardContent className="p-10">
                  <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 shadow-sm`}>
                    <item.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-black mb-3 text-slate-900 tracking-tight">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed font-light">
                    {item.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section id="depoimentos" className="py-32 bg-slate-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.1),transparent)]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
              QUEM USA, <span className="text-purple-400">EVOLUI</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto font-light">
              Histórias de sucesso de fotógrafos que transformaram sua entrega
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Maria Clara", role: "Casamentos", initials: "MC", color: "from-blue-500 to-purple-600", text: "Antes eu perdia horas explicando como baixar fotos. Agora meus clientes fazem tudo sozinhos e ainda me elogiam pelo design!" },
              { name: "Ricardo Santos", role: "Eventos", initials: "RS", color: "from-purple-500 to-pink-600", text: "A proteção com marca d'água me deu a segurança que eu precisava para subir o nível dos meus pacotes premium." },
              { name: "Ana Flávia", role: "Newborn", initials: "AF", color: "from-pink-500 to-amber-600", text: "Aumentei minha produtividade absurdamente. O sistema de seleção é o mais rápido que já testei no mercado brasileiro." }
            ].map((item, idx) => (
              <Card key={idx} className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl rounded-[40px] overflow-hidden group">
                <CardContent className="p-10">
                  <div className="flex mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 text-amber-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-200 text-lg leading-relaxed mb-8 font-light italic">
                    "{item.text}"
                  </p>
                  <div className="flex items-center">
                    <div className={`w-14 h-14 bg-gradient-to-r ${item.color} rounded-2xl flex items-center justify-center mr-4 shadow-xl`}>
                      <span className="text-white font-black text-lg">{item.initials}</span>
                    </div>
                    <div>
                      <p className="font-black text-white text-lg tracking-tight">{item.name}</p>
                      <p className="text-sm text-slate-400 font-bold tracking-wider uppercase">{item.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Estatísticas */}
      <section className="py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { val: "5k+", label: "Fotógrafos", color: "text-purple-600" },
              { val: "2M+", label: "Fotos", color: "text-blue-600" },
              { val: "98%", label: "Sucesso", color: "text-pink-600" },
              { val: "24/7", label: "Suporte", color: "text-amber-600" }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className={`text-5xl md:text-7xl font-black ${item.color} mb-2 tracking-tighter`}>{item.val}</div>
                <div className="text-slate-400 font-bold tracking-[0.3em] uppercase text-xs">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preços */}
      <section id="precos" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
              PLANOS PARA <span className="text-purple-600">CRESCER</span>
            </h2>
            <p className="text-xl text-slate-500 max-w-3xl mx-auto font-light">
              Comece agora e escale conforme seu sucesso aumenta
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { name: "Gratuito", price: "0", features: ["Até 10 fotos", "1 galeria", "Suporte email"], cta: "COMEÇAR GRÁTIS", popular: false },
              { name: "Básico", price: "27", features: ["Até 500 fotos", "Galerias ilimitadas", "Marca d'água"], cta: "SELECIONAR", popular: false },
              { name: "Fotógrafo", price: "57", features: ["Até 2.000 fotos", "Download em alta", "Suporte VIP"], cta: "MAIS VENDIDO", popular: true },
              { name: "Estúdio", price: "97", features: ["Espaço ilimitado", "Domínio próprio", "Marca branca"], cta: "SELECIONAR", popular: false }
            ].map((plan, idx) => (
              <Card key={idx} className={`relative bg-white border-none shadow-2xl rounded-[40px] overflow-hidden transition-all duration-500 hover:-translate-y-4 ${plan.popular ? 'ring-4 ring-purple-500/20' : ''}`}>
                {plan.popular && (
                  <div className="bg-purple-600 text-white text-[10px] font-black tracking-[0.2em] uppercase py-2 text-center">
                    MAIS POPULAR
                  </div>
                )}
                <CardContent className="p-10 text-center">
                  <h3 className="text-2xl font-black mb-4 text-slate-900 tracking-tight">{plan.name}</h3>
                  <div className="flex justify-center items-baseline gap-1 mb-8">
                    <span className="text-xl font-bold text-slate-400">R$</span>
                    <span className="text-5xl font-black text-slate-900">{plan.price}</span>
                    <span className="text-slate-400 font-medium">/mês</span>
                  </div>
                  <ul className="space-y-4 mb-10 text-left">
                    {plan.features.map((feat, fidx) => (
                      <li key={fidx} className="flex items-center gap-3 text-slate-600">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-sm">{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={plan.popular ? "default" : "outline"} 
                    className={`w-full py-6 rounded-2xl font-black text-xs tracking-widest ${plan.popular ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-200 hover:bg-slate-50'}`}
                    onClick={() => navigate('/auth')}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
                  <div className="text-4xl font-bold mb-2 text-blue-600">R$ 19,90</div>
                  <div className="text-gray-500">por mês</div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Até 6.000 fotos</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Galerias ilimitadas</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Links personalizados</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Suporte prioritário</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => navigate('/auth')}
                >
                  Escolher plano
                </Button>
              </CardContent>
            </Card>

            {/* Plano Padrão - Mais Popular */}
            <Card className="border-2 border-purple-400 shadow-xl transform scale-105 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-purple-600 text-white px-4 py-1 text-sm">
                  Mais Popular
                </Badge>
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Padrão</h3>
                  <div className="text-4xl font-bold mb-2 text-purple-600">R$ 29,90</div>
                  <div className="text-gray-500">por mês</div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Até 15.000 fotos</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Galerias ilimitadas</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Links personalizados</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Relatórios avançados</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Suporte VIP</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => navigate('/auth')}
                >
                  Escolher plano
                </Button>
              </CardContent>
            </Card>

            {/* Plano Premium */}
            <Card className="border-2 border-yellow-200 shadow-lg">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Premium</h3>
                  <div className="text-4xl font-bold mb-2 text-yellow-600">R$ 49,90</div>
                  <div className="text-gray-500">por mês</div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Até 35.000 fotos</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Tudo do Padrão</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>API personalizada</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Gerente dedicado</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                  onClick={() => navigate('/auth')}
                >
                  Escolher plano
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600">
              Cancele a qualquer momento, com um simples botão
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Perguntas Frequentes
            </h2>
            <p className="text-xl text-gray-600">
              Tire suas dúvidas sobre a Fottufy
            </p>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-3">Como meus clientes acessam as fotos?</h3>
                <p className="text-gray-600">
                  Você envia um link personalizado por WhatsApp, e-mail ou SMS. Seus clientes clicam no link e 
                  acessam a galeria direto no navegador, sem precisar instalar nada.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-3">As fotos ficam seguras?</h3>
                <p className="text-gray-600">
                  Sim! Utilizamos criptografia de ponta e armazenamento em nuvem seguro. Apenas pessoas com o 
                  link podem acessar as fotos. Você pode remover a galeria a qualquer momento.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-3">Posso personalizar as galerias?</h3>
                <p className="text-gray-600">
                  Sim! Você pode personalizar o nome da galeria, adicionar sua marca e escolher cores. 
                  Nos planos pagos, também pode usar seu próprio domínio.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-3">Como funciona a proteção das fotos?</h3>
                <p className="text-gray-600">
                  Suas fotos ficam protegidas com marca d'água personalizada. Os clientes podem visualizar e selecionar facilmente, 
                  mas não conseguem copiar ou salvar as imagens. Máxima proteção para seu trabalho!
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-3">Como cancelo minha assinatura?</h3>
                <p className="text-gray-600">
                  Você pode cancelar a qualquer momento direto no painel de controle. Não há fidelidade nem multas. 
                  Suas galerias ficam ativas até o final do período pago.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Pronto para transformar seu negócio?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a mais de 5.000 fotógrafos que já aumentaram suas vendas e 
            melhoraram a experiência dos clientes com a Fottufy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-xl"
              onClick={() => navigate('/auth')}
            >
              <Camera className="mr-2 h-5 w-5" />
              Começar gratuitamente
            </Button>
          </div>
          <p className="text-blue-100 text-sm mt-6">
            Não mande mais a seleção por drive ou whatsapp, use a Fottufy!
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center">
              <Camera className="h-6 w-6 text-blue-400 mr-2" />
              <span className="text-xl font-bold">Fottufy</span>
            </div>
            
            <div className="text-gray-400 text-sm">
              <p>&copy; {new Date().getFullYear()} Fottufy. Todos os direitos reservados.</p>
            </div>
            
            <div className="flex space-x-6 text-gray-400 text-sm">
              <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
              <a href="#precos" className="hover:text-white transition-colors">Preços</a>
              <a href="/login" className="hover:text-white transition-colors">Login</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}