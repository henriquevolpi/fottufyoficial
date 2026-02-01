import { motion } from "framer-motion";
import { Link } from "wouter";
import { 
  Sparkles, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Zap, 
  ArrowLeft,
  CheckCircle2,
  Layout,
  MousePointer2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WhatsNew() {
  const improvements = [
    {
      id: 1,
      title: "Visual Moderno Repaginado",
      description: "Uma interface totalmente nova com glassmorphism, gradientes vibrantes e foco total na experiência do usuário.",
      icon: <Layout className="w-10 h-10 text-purple-500" />,
      visual: (
        <div className="relative w-full h-40 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
          {/* Mock Dashboard Preview */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center opacity-40 grayscale" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          
          <div className="relative p-3 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
              <div className="w-12 h-2 bg-white/10 rounded-full" />
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="aspect-square bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                  <div className="w-4 h-4 rounded bg-purple-500/20" />
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/20" />
              <div className="flex-1 h-3 bg-white/5 rounded-full" />
            </div>
          </div>
          
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-purple-500 text-[8px] font-black text-white rounded-md uppercase tracking-tighter">
            Premium UI
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Indicação de Amigos",
      description: "Recomende a Fottufy e ganhe +1.000 fotos extras no seu pacote por cada indicação bem-sucedida!",
      icon: <Users className="w-10 h-10 text-blue-500" />,
      visual: (
        <div className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
          <div className="flex -space-x-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-10 h-10 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white font-bold text-xs">
                U{i}
              </div>
            ))}
            <div className="w-10 h-10 rounded-full bg-green-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white">
              <Sparkles size={16} />
            </div>
          </div>
          <Badge className="bg-green-500 text-white border-0 font-black">+1.000 FOTOS</Badge>
        </div>
      )
    },
    {
      id: 3,
      title: "Fotos Extras (R$)",
      description: "Defina limites de fotos inclusas e cobre automaticamente por fotos excedentes. Transparência total para você e seu cliente.",
      icon: <DollarSign className="w-10 h-10 text-emerald-500" />,
      visual: (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 space-y-2">
          <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
            <span>Inclusas: 20</span>
            <span className="text-emerald-600">Extra: R$ 25,00</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-full" />
          </div>
          <div className="text-center font-black text-emerald-700 dark:text-emerald-400">Total: R$ 125,00</div>
        </div>
      )
    },
    {
      id: 4,
      title: "Mensagens Prontas",
      description: "Envie o link da galeria com uma mensagem profissional e personalizada em apenas um clique via WhatsApp.",
      icon: <MessageSquare className="w-10 h-10 text-purple-500" />,
      visual: (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="bg-white dark:bg-slate-900 p-2 rounded-lg text-[10px] text-slate-600 dark:text-slate-400 border border-slate-100 italic">
            "Olá! Suas fotos já estão prontas. Acesse o link abaixo para selecionar as suas favoritas..."
          </div>
          <Button size="sm" className="w-full h-8 bg-green-500 text-[10px] font-black uppercase">Enviar via WhatsApp</Button>
        </div>
      )
    },
    {
      id: 5,
      title: "Seleção Ultra-Rápida",
      description: "Galeria otimizada para dispositivos móveis, permitindo que seu cliente selecione fotos com velocidade e fluidez.",
      icon: <MousePointer2 className="w-10 h-10 text-pink-500" />,
      visual: (
        <div className="flex gap-2 justify-center">
          {[1, 2].map(i => (
            <div key={i} className="relative w-16 h-20 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden border-2 border-transparent hover:border-pink-500 transition-colors">
              {i === 1 && <div className="absolute top-1 right-1 bg-pink-500 text-white rounded-full p-0.5"><CheckCircle2 size={10} /></div>}
            </div>
          ))}
        </div>
      )
    },
    {
      id: 6,
      title: "Performance de Elite",
      description: "Otimizamos cada linha de código para garantir que a Fottufy seja a ferramenta mais rápida do seu fluxo de trabalho.",
      icon: <Zap className="w-10 h-10 text-yellow-500" />,
      visual: (
        <div className="flex items-center justify-center p-4">
          <div className="relative">
            <Zap className="w-16 h-16 text-yellow-500 animate-pulse" />
            <div className="absolute inset-0 bg-yellow-400/20 blur-xl animate-ping rounded-full" />
          </div>
          <div className="ml-4 font-black text-2xl text-slate-900 dark:text-white">99.9%</div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-8 rounded-full group">
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Voltar ao Painel
              </Button>
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-black uppercase tracking-widest"
          >
            ✨ Atualização Fevereiro 2026
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl sm:text-6xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight uppercase"
          >
            O que há de <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">Novo na Fottufy</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-slate-500 dark:text-slate-400 font-light max-w-2xl mx-auto"
          >
            Trabalhamos duro para transformar seu feedback em ferramentas poderosas. Confira as novidades que acabaram de chegar!
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {improvements.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] rounded-3xl overflow-hidden group">
                <CardContent className="p-8 space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20 transition-colors">
                    {item.icon}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {item.visual}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 p-10 bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 rounded-[3rem] text-center text-white space-y-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors" />
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-yellow-300 font-bold text-sm">
              <Sparkles className="w-4 h-4 animate-pulse" />
              Dê um upgrade no seu fluxo
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-tight max-w-3xl mx-auto">
              Seus clientes demoram para <span className="text-purple-400">fazer a seleção?</span>
            </h2>
            
            <p className="text-slate-300 font-light text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
              Esqueça Drive ou WhatsApp, isso não funciona mais! Venda mais, economize tempo e encante seus clientes com a <span className="font-black text-white">Fottufy</span>.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/subscription">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-black uppercase px-12 py-8 rounded-2xl shadow-2xl shadow-purple-500/40 hover:scale-105 transition-all">
                  Assinar Agora
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="lg" className="w-full sm:w-auto text-white hover:bg-white/10 font-bold uppercase px-8 py-8 rounded-2xl border border-white/10">
                  Voltar ao Painel
                </Button>
              </Link>
            </div>
            
            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest pt-4">
              A escolha número #1 dos fotógrafos de elite
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
