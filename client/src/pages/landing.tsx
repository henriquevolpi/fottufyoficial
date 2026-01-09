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
            <div className="relative max-w-5xl mx-auto">
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 flex items-center">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="flex-1 text-center text-sm text-gray-600">
                    fottufy.com/suagaleria
                  </div>
                </div>
                <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                  <h3 className="text-2xl font-bold mb-6 text-center">Casamento Ana & Pedro</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg relative overflow-hidden group cursor-pointer">
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200"></div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Heart className="h-5 w-5 text-white" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Image className="h-8 w-8 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-center">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Heart className="mr-2 h-4 w-4" />
                      Solicitar Selecionadas (12)
                    </Button>
                  </div>
                </div>
              </div>
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