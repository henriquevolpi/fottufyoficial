import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle,
  ArrowRight,
  Zap
} from 'lucide-react';

export default function LandingAdsPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
            Faça seus clientes escolherem fotos mais rápido, comprarem mais e te respeitarem como profissional.
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            O problema não é o cliente demorar pra escolher fotos.<br />
            <span className="font-semibold text-slate-900">O problema é deixar ele escolher sem um Caminho de Escolha.</span>
          </p>

          <Button 
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transform transition-all hover:scale-105"
            onClick={() => navigate('/auth')}
          >
            <Zap className="mr-2 h-5 w-5" />
            Criar meu Caminho de Escolha
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* O erro do mercado */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 text-center">
            Por que Drive e WhatsApp não funcionam?
          </h2>
          
          <p className="text-lg text-slate-600 text-center leading-relaxed">
            Porque essas ferramentas apenas <strong>entregam arquivos</strong>.<br />
            Elas não conduzem decisão.
          </p>
          
          <p className="text-lg text-slate-600 text-center mt-4 leading-relaxed">
            Quando o cliente recebe todas as fotos soltas, ele se perde, demora para escolher e raramente compra fotos extras.
          </p>
        </div>
      </section>

      {/* O Caminho de Escolha */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 text-center">
            O Caminho de Escolha
          </h2>
          
          <p className="text-lg text-slate-600 text-center leading-relaxed">
            A Fottufy não é apenas uma galeria de fotos.<br />
            Ela cria um <strong className="text-purple-600">Caminho de Escolha</strong> que guia o cliente passo a passo, sem confusão e sem o fotógrafo precisar explicar nada.
          </p>
          
          <p className="text-lg text-slate-600 text-center mt-4 leading-relaxed">
            Com esse caminho, o cliente decide mais rápido, compra com menos resistência e passa a respeitar o processo profissional do fotógrafo.
          </p>
        </div>
      </section>

      {/* Não é milagre, é processo */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 text-center">
            Parece milagre. Na prática, é processo.
          </h2>
          
          <p className="text-lg text-slate-600 text-center leading-relaxed">
            Os clientes não mudam.<br />
            <strong>O que muda é o ambiente de decisão.</strong>
          </p>
          
          <p className="text-lg text-slate-600 text-center mt-4 leading-relaxed">
            Quando existe um Caminho de Escolha, o cliente entende o que fazer, escolhe melhor e finaliza mais rápido.<br />
            A Fottufy faz isso automaticamente.
          </p>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-10 text-center">
            O que muda quando você usa a Fottufy
          </h2>
          
          <div className="space-y-4">
            {[
              'Clientes escolhem fotos mais rápido',
              'Mais vendas de fotos extras sem insistir',
              'Menos mensagens e menos retrabalho',
              'Processo profissional do começo ao fim',
              'Mais controle para o fotógrafo'
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                <span className="text-lg text-slate-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparação */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-10 text-center">
            A diferença é clara
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Drive / WhatsApp */}
            <div className="bg-white p-6 rounded-xl border-2 border-slate-200">
              <h3 className="text-xl font-bold text-slate-400 mb-6 text-center">Drive / WhatsApp</h3>
              <div className="space-y-4">
                {[
                  'Cliente perdido',
                  'Escolha sem limite',
                  'Processo amador',
                  'Baixa percepção de valor'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <span className="text-slate-500">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fottufy */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border-2 border-purple-200 shadow-lg">
              <h3 className="text-xl font-bold text-purple-600 mb-6 text-center">Fottufy</h3>
              <div className="space-y-4">
                {[
                  'Caminho de Escolha claro',
                  'Escolha guiada',
                  'Processo profissional',
                  'Maior percepção de valor'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Pronto para transformar sua entrega?
          </h2>
          
          <p className="text-lg text-white/80 mb-8">
            Comece agora e veja seus clientes escolherem fotos do jeito certo.
          </p>

          <Button 
            size="lg"
            className="bg-white text-purple-600 hover:bg-slate-100 px-10 py-6 text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl transform transition-all hover:scale-105"
            onClick={() => navigate('/auth')}
          >
            Criar meu Caminho de Escolha
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer mínimo */}
      <footer className="py-6 px-4 text-center text-slate-400 text-sm">
        <p>Fottufy - A plataforma dos fotógrafos profissionais</p>
      </footer>
    </div>
  );
}
