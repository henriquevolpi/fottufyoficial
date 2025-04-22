import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const [, navigate] = useLocation();
  
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
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
      </div>
    </div>
  );
}