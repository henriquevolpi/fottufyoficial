import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const [, navigate] = useLocation();
  
  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4">
      <div className="max-w-4xl w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="/fottufy logo.png" 
            alt="Fottufy Logo" 
            className="h-16 md:h-20"
          />
        </div>
        
        {/* Heading */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
          A forma mais rápida e simples de seus clientes selecionarem fotos. Ganhe mais com menos esforço.
        </h1>
        
        {/* Subheading */}
        <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
          Sem complicações, sem WhatsApp, sem bagunça. Você envia a galeria, o cliente escolhe. Pronto.
        </p>
        
        {/* CTA Button */}
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-7 text-xl font-semibold rounded-md shadow-lg transform transition-transform hover:scale-105"
          onClick={() => navigate('/auth')}
        >
          Começar agora
        </Button>
        
        {/* Additional content could go here */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Rápido e Simples</h3>
            <p className="text-gray-600">Crie galerias de fotos em segundos e compartilhe com seus clientes através de um link único.</p>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Escolha Facilitada</h3>
            <p className="text-gray-600">Seus clientes selecionam as fotos de forma intuitiva, sem precisar de instruções complexas.</p>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Organização Total</h3>
            <p className="text-gray-600">Mantenha todos os seus projetos organizados em um único lugar, com acesso fácil a qualquer momento.</p>
          </div>
        </div>
        
        {/* Gallery Mockup Section */}
        <div className="mt-32 max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Design simples e moderno para fotógrafos
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Nossa plataforma foi feita para ser leve, intuitiva e sem complicações. Você envia, o cliente escolhe. Tudo no tempo dele, sem precisar explicar nada.
          </p>
          <div className="flex justify-center mb-16">
            <img 
              src="/fottufy ex1.jpg" 
              alt="Interface da Fottufy" 
              className="w-full max-w-4xl rounded-lg shadow-xl"
            />
          </div>
        </div>
        
        {/* Testimonials Section */}
        <div className="mt-32 py-16 bg-gray-50 rounded-xl max-w-6xl mx-auto">
          <div className="px-4 sm:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Clientes que estão vendendo mais usando a Fottufy
            </h2>
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
              Veja como fotógrafos de todo o Brasil estão aumentando as vendas e melhorando a experiência do cliente com a Fottufy.
            </p>
            <div className="flex justify-center mb-10">
              <img 
                src="/fottufy-ex2.svg" 
                alt="Depoimentos de clientes" 
                className="w-full max-w-4xl rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
        
        {/* Pricing Section */}
        <div className="mt-32 max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Planos
          </h2>
          <p className="text-xl text-gray-600 mb-16 max-w-3xl mx-auto">
            Escolha o plano ideal para o seu volume de fotos
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="text-2xl font-bold mb-2 text-blue-600">📷 R$14,90</div>
              <div className="text-lg text-gray-500 mb-6">por 6.000 imagens</div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Galerias ilimitadas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Suporte incluso</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Links personalizados</span>
                </li>
              </ul>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => navigate('/auth')}
              >
                Escolher plano
              </Button>
            </div>
            
            {/* Standard Plan */}
            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-blue-400 hover:shadow-xl transition-shadow duration-300 transform scale-105">
              <div className="text-2xl font-bold mb-2 text-blue-600">🏆 R$29,90</div>
              <div className="text-lg text-gray-500 mb-6">por 15.000 imagens</div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Galerias ilimitadas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Suporte incluso</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Links personalizados</span>
                </li>
              </ul>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => navigate('/auth')}
              >
                Escolher plano
              </Button>
            </div>
            
            {/* Premium Plan */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="text-2xl font-bold mb-2 text-blue-600">📸 R$49,90</div>
              <div className="text-lg text-gray-500 mb-6">por 35.000 imagens</div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Galerias ilimitadas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Suporte incluso</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Links personalizados</span>
                </li>
              </ul>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => navigate('/auth')}
              >
                Escolher plano
              </Button>
            </div>
          </div>
        </div>
        
        {/* Footer CTA */}
        <div className="mt-32 mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            Pronto para transformar a sua forma de trabalhar?
          </h2>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-6 text-xl font-semibold rounded-md shadow-lg"
            onClick={() => navigate('/auth')}
          >
            Começar agora
          </Button>
        </div>
      </div>
    </div>
  );
}