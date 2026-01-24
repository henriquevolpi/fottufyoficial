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
      <section className="pt-20 pb-16 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-100">
              <Sparkles className="h-4 w-4 mr-1" />
              Nova forma de entregar fotos aos clientes
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Entregue fotos aos seus{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                clientes
              </span>{' '}
              de forma profissional
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Pare de enviar fotos por WhatsApp, Google Drive ou WeTransfer. 
              Crie galerias protegidas com seu logo onde clientes veem com mais conforto e segurança.
            </p>
            
            <div className="flex justify-center items-center mb-12">
              <Button 
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform transition-all hover:scale-105"
                onClick={() => navigate('/auth')}
              >
                <Camera className="mr-2 h-5 w-5" />
                Começar gratuitamente
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500 mb-16">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Sem instalação
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Funciona em qualquer dispositivo
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Suporte brasileiro
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative max-w-6xl mx-auto">
              <div className="relative bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-200 overflow-hidden transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.15)]">
                {/* Header da Barra do Navegador */}
                <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-gray-200/60">
                  <div className="flex space-x-1.5 md:space-x-2">
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-400 rounded-full shadow-inner"></div>
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-amber-400 rounded-full shadow-inner"></div>
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-400 rounded-full shadow-inner"></div>
                  </div>
                  <div className="flex-1 max-w-[150px] sm:max-w-md mx-2 md:mx-4 px-3 md:px-4 py-1.5 bg-white rounded-lg text-[10px] md:text-xs font-mono text-gray-400 border border-gray-200 truncate shadow-sm">
                    fottufy.com/galeria/casamento-ana-e-pedro
                  </div>
                  <div className="w-10 md:w-20"></div> {/* Spacer for balance */}
                </div>

                {/* Conteúdo da Galeria */}
                <div className="relative p-4 md:p-12 bg-white">
                  {/* Branding do Fotógrafo */}
                  <div className="flex flex-col items-center mb-8 md:mb-12 animate-in fade-in slide-in-from-top duration-1000">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white mb-3 md:mb-4 shadow-xl shadow-blue-500/20">
                      <Camera className="h-6 w-6 md:h-8 md:w-8" />
                    </div>
                    <h3 className="text-xl md:text-3xl font-light text-gray-900 tracking-widest uppercase mb-2 text-center">Casamento Ana & Pedro</h3>
                    <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-30"></div>
                  </div>

                  {/* Grid de Fotos Realista */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                    {[
                      { id: 1, selected: true, delay: '0ms' },
                      { id: 2, selected: false, delay: '100ms' },
                      { id: 3, selected: true, delay: '200ms' },
                      { id: 4, selected: true, delay: '300ms' },
                      { id: 5, selected: false, delay: '400ms' },
                      { id: 6, selected: true, delay: '500ms' },
                      { id: 7, selected: false, delay: '600ms' },
                      { id: 8, selected: true, delay: '700ms' }
                    ].map((item) => (
                      <div 
                        key={item.id} 
                        className={`group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] shadow-lg hover:shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4`}
                        style={{ animationDelay: item.delay }}
                      >
                        {/* Mock Image Content */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                          <Image className="h-8 w-8 md:h-10 md:w-10 text-gray-300 opacity-40" />
                          {/* Marca d'água Realista */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none rotate-[-30deg]">
                            <span className="text-gray-900/5 text-xs md:text-lg font-black tracking-[0.2em] uppercase whitespace-nowrap select-none">
                              Fottufy • Protegido
                            </span>
                          </div>
                        </div>

                        {/* Overlay Gradiente */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                        {/* Botão de Seleção (Coração) */}
                        <div className={`absolute top-2 right-2 md:top-4 md:right-4 p-1.5 md:p-2.5 rounded-full backdrop-blur-md transition-all duration-300 ${item.selected ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/40' : 'bg-white/40 text-gray-700 hover:bg-white/60 hover:text-red-500'}`}>
                          <Heart className={`h-4 w-4 md:h-5 md:w-5 ${item.selected ? 'fill-current' : ''}`} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Barra de Ação Flutuante */}
                  <div className="mt-8 md:mt-12 flex flex-col items-center gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-2.5 md:py-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50">
                      <div className="flex -space-x-2 md:-space-x-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden flex items-center justify-center shadow-sm">
                            <Image className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs md:text-sm font-medium text-gray-700">
                        <span className="text-blue-600 font-bold">12 fotos</span> selecionadas
                      </p>
                    </div>

                    <Button className="group bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-10 py-5 md:py-7 text-lg md:text-xl font-bold rounded-2xl shadow-[0_10px_40px_rgba(37,99,235,0.2)] hover:shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all duration-300 hover:-translate-y-1 w-full sm:w-auto">
                      Finalizar Seleção
                      <ArrowRight className="ml-2 md:ml-3 h-5 w-5 md:h-6 md:w-6 group-hover:translate-x-1 transition-transform" />
                    </Button>

                    <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-gray-400 text-[10px] md:text-xs font-medium uppercase tracking-widest text-center">
                      <span className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-blue-500" />
                        Marca d'água Ativa
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
                        Interface Mobile
                      </span>
                    </div>
                  </div>
                </div>

                {/* Efeito de Brilho */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
              </div>

              {/* Elementos Decorativos de Fundo */}
              <div className="absolute -top-12 -right-12 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-[80px] -z-10 animate-pulse"></div>
              <div className="absolute -bottom-12 -left-12 w-48 md:w-64 h-48 md:h-64 bg-indigo-500/5 rounded-full blur-[80px] -z-10 animate-pulse delay-700"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-500 mb-8">Mais de 5.000 fotógrafos já confiam na Fottufy</p>
            <div className="flex justify-center items-center space-x-12 grayscale opacity-60">
              <div className="text-2xl font-bold text-gray-400">PhotoStudio</div>
              <div className="text-2xl font-bold text-gray-400">FotoMagic</div>
              <div className="text-2xl font-bold text-gray-400">ClickArt</div>
              <div className="text-2xl font-bold text-gray-400">LensCraft</div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-20 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Como funciona a Fottufy?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Do upload à entrega final: uma jornada completa e profissional para seus projetos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 transform transition-transform group-hover:scale-110">
                <Zap className="h-10 w-10 text-white" />
              </div>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 h-full transition-shadow group-hover:shadow-md">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">1. Faça Upload</h3>
                <p className="text-gray-600 mb-6 text-sm lg:text-base">
                  Arraste e solte suas fotos na plataforma. Nosso sistema otimiza automaticamente para web.
                </p>
                <div className="text-xs lg:text-sm text-blue-600 font-medium">
                  ⚡ Upload em lote • 🔄 Processamento
                </div>
              </div>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 transform transition-transform group-hover:scale-110">
                <Link2 className="h-10 w-10 text-white" />
              </div>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 h-full transition-shadow group-hover:shadow-md">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">2. Compartilhe</h3>
                <p className="text-gray-600 mb-6 text-sm lg:text-base">
                  Envie o link personalizado para seu cliente por WhatsApp, e-mail ou SMS de forma rápida.
                </p>
                <div className="text-xs lg:text-sm text-purple-600 font-medium">
                  🔗 Link único • 📱 Mobile Ready
                </div>
              </div>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 transform transition-transform group-hover:scale-110">
                <Heart className="h-10 w-10 text-white" />
              </div>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 h-full transition-shadow group-hover:shadow-md">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">3. Seleção</h3>
                <p className="text-gray-600 mb-6 text-sm lg:text-base">
                  Seu cliente escolhe as favoritas com conforto e proteção de marca d'água.
                </p>
                <div className="text-xs lg:text-sm text-pink-600 font-medium">
                  ❤️ Favoritos • 🛡️ Proteção
                </div>
              </div>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 transform transition-transform group-hover:scale-110">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 h-full transition-shadow group-hover:shadow-md">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">4. Entrega Final</h3>
                <p className="text-gray-600 mb-6 text-sm lg:text-base">
                  Envie os arquivos finais editados diretamente pela Fottufy. Tudo em um só lugar!
                </p>
                <div className="text-xs lg:text-sm text-green-600 font-medium">
                  ✅ Projeto pronto • 📦 Download fácil
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Recursos pensados para proteger suas fotos e impressionar seus clientes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                  <Smartphone className="h-6 w-6 text-blue-600 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Design Responsivo</h3>
                <p className="text-gray-600">
                  Suas galerias ficam perfeitas em celular, tablet e desktop. Seus clientes acessam de qualquer lugar.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600 transition-colors">
                  <Clock className="h-6 w-6 text-green-600 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Upload Ultra-Rápido</h3>
                <p className="text-gray-600">
                  Tecnologia avançada para upload de centenas de fotos em poucos minutos. Sem travamentos.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors">
                  <Shield className="h-6 w-6 text-purple-600 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Proteção com Logo</h3>
                <p className="text-gray-600">
                  Suas fotos ficam protegidas com marca d'água personalizada. Clientes veem mas não conseguem copiar.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-yellow-600 transition-colors">
                  <Globe className="h-6 w-6 text-yellow-600 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Links Personalizados</h3>
                <p className="text-gray-600">
                  Crie links únicos e memoráveis para cada evento. Mais profissional para sua marca.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-red-600 transition-colors">
                  <TrendingUp className="h-6 w-6 text-red-600 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Relatórios Detalhados</h3>
                <p className="text-gray-600">
                  Veja quantas fotos foram visualizadas e selecionadas pelos clientes. Entenda o que seus clientes preferem.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
                  <Mail className="h-6 w-6 text-indigo-600 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Notificações Automáticas</h3>
                <p className="text-gray-600">
                  Receba avisos quando seus clientes acessarem e selecionarem fotos. Mantenha-se sempre informado.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section id="depoimentos" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              O que nossos clientes dizem
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Fottufy é facilidade e conforto na hora da seleção!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6">
                  "Antes eu enviava fotos pelo Google Drive e meus clientes copiavam tudo. 
                  Com a Fottufy, as fotos ficam protegidas com meu logo e eles só veem o que eu quero mostrar."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-bold">MC</span>
                  </div>
                  <div>
                    <p className="font-semibold">Maria Clara</p>
                    <p className="text-sm text-gray-500">Fotógrafa de Casamentos - SP</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6">
                  "Meus clientes ficaram impressionados com a galeria protegida. 
                  Eles veem as fotos mas não conseguem copiar. Minha marca está sempre visível!"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-bold">RS</span>
                  </div>
                  <div>
                    <p className="font-semibold">Ricardo Santos</p>
                    <p className="text-sm text-gray-500">Fotógrafo de Eventos - RJ</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6">
                  "Aumentei minha produtividade em 300%! As fotos ficam protegidas com minha marca e os clientes só veem as que eu quero. 
                  A Fottufy resolveu minha vida."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-bold">AF</span>
                  </div>
                  <div>
                    <p className="font-semibold">Ana Flávia</p>
                    <p className="text-sm text-gray-500">Fotógrafa Newborn - MG</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Estatísticas */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">5k+</div>
              <div className="text-gray-600">Fotógrafos ativos</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">2M+</div>
              <div className="text-gray-600">Fotos enviadas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">98%</div>
              <div className="text-gray-600">Satisfação</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">24/7</div>
              <div className="text-gray-600">Suporte</div>
            </div>
          </div>
        </div>
      </section>

      {/* Preços */}
      <section id="precos" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comece gratuitamente e escale conforme seu negócio cresce
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Plano Gratuito */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Gratuito</h3>
                  <div className="text-4xl font-bold mb-2">R$ 0</div>
                  <div className="text-gray-500">Para sempre</div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Até 10 fotos</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>1 galeria</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                    <span>Suporte por email</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/auth')}
                >
                  Começar grátis
                </Button>
              </CardContent>
            </Card>

            {/* Plano Básico */}
            <Card className="border-2 border-blue-200 shadow-lg">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Básico</h3>
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