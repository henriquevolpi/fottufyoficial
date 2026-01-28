import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Sparkles, Camera, CheckCircle2, Images, Shield, Heart, Zap } from "lucide-react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const redirect = searchParams.get('redirect') || '/dashboard';
  const plan = searchParams.get('plan');
  const showAdminLogin = searchParams.get('admin') === 'true';
  const redirectUrl = plan ? `${redirect}?plan=${plan}` : redirect;
  
  const referralCode = searchParams.get('ref');
  const [referrerName, setReferrerName] = useState<string | null>(null);
  
  useEffect(() => {
    if (referralCode && referralCode.length >= 6) {
      fetch(`/api/referral/validate/${referralCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid && data.referrerName) {
            setReferrerName(data.referrerName);
            setActiveTab("register");
          }
        })
        .catch(() => {});
    }
  }, [referralCode]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const handleLogin = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const handleRegister = (values: RegisterFormValues) => {
    const { confirmPassword, ...registerData } = values;
    const dataWithReferral = referralCode 
      ? { ...registerData, referralCode: referralCode.toUpperCase() }
      : registerData;
    registerMutation.mutate(dataWithReferral);
  };

  const handleAdminLogin = () => {
    loginForm.setValue("email", "admin@studio.com");
    loginForm.setValue("password", "admin123");
    loginMutation.mutate({ email: "admin@studio.com", password: "admin123" });
  };

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setLocation('/admin');
      } else {
        setLocation(redirectUrl);
      }
    }
  }, [user, redirectUrl, setLocation]);

  if (user) {
    return null;
  }

  const features = [
    {
      icon: Images,
      title: "Galerias Ilimitadas",
      description: "Organize suas fotos em projetos lindos e profissionais"
    },
    {
      icon: Heart,
      title: "Seleção Fácil",
      description: "Seus clientes escolhem as fotos favoritas com um clique"
    },
    {
      icon: Shield,
      title: "Fotos Protegidas",
      description: "Marca d'água automática para proteger seu trabalho"
    },
    {
      icon: Zap,
      title: "Super Rápido",
      description: "Upload e entrega em segundos, não horas"
    }
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 font-sans">
      {/* Animated gradient orbs */}
      <motion.div
        animate={{ 
          x: activeTab === 'login' ? [-20, 20, -20] : [20, -20, 20],
          y: activeTab === 'login' ? [0, 30, 0] : [30, 0, 30],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-gradient-to-br from-violet-600/40 via-fuchsia-500/30 to-pink-500/20 blur-3xl"
      />
      <motion.div
        animate={{ 
          x: activeTab === 'login' ? [20, -20, 20] : [-20, 20, -20],
          y: activeTab === 'login' ? [30, 0, 30] : [0, 30, 0],
          scale: [1.1, 1, 1.1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-emerald-500/20 blur-3xl"
      />
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-fuchsia-500/20 to-violet-600/20 blur-3xl"
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Main container - flex col on mobile, row on desktop */}
      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        
        {/* Login/Register Form Section */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            {/* Glassmorphism card */}
            <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-purple-900/30 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 via-transparent to-white/5 pointer-events-none" />
              
              <div className="relative p-6 sm:p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div 
                    className="relative inline-block mb-4"
                    whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl blur-lg opacity-50" />
                    <div className="relative bg-gradient-to-br from-violet-500 to-fuchsia-600 p-3 rounded-2xl">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </motion.div>
                  
                  <motion.h1 
                    key={activeTab}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2"
                  >
                    {activeTab === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}
                  </motion.h1>
                  <motion.p 
                    key={`desc-${activeTab}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-white/60 text-sm sm:text-base"
                  >
                    {activeTab === 'login' 
                      ? 'Entre na sua conta Fottufy' 
                      : 'Comece sua jornada fotográfica'}
                  </motion.p>
                </div>

                {/* Tab switcher */}
                <div className="relative flex p-1 bg-white/5 rounded-2xl mb-8">
                  <motion.div
                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl shadow-lg"
                    animate={{ left: activeTab === 'login' ? '4px' : 'calc(50% + 4px)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                  {["login", "register"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative z-10 flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-colors duration-200 ${
                        activeTab === tab 
                          ? "text-white" 
                          : "text-white/50 hover:text-white/70"
                      }`}
                    >
                      {tab === "login" ? "Entrar" : "Cadastrar"}
                    </button>
                  ))}
                </div>

                {/* Forms */}
                <div className="min-h-[280px]">
                  {activeTab === "login" ? (
                    <motion.div 
                      key="login" 
                      initial={{ opacity: 0, x: -20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                          <FormField control={loginForm.control} name="email" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/80 font-semibold text-sm">Email</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="seu@email.com" 
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-violet-400 focus:ring-violet-400/20 rounded-xl h-12"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-pink-400" />
                            </FormItem>
                          )} />
                          <FormField control={loginForm.control} name="password" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/80 font-semibold text-sm">Senha</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Sua senha" 
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-violet-400 focus:ring-violet-400/20 rounded-xl h-12"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-pink-400" />
                            </FormItem>
                          )} />
                          <div className="text-sm text-right">
                            <Link href="/forgot-password" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
                              Esqueceu a senha?
                            </Link>
                          </div>
                          <Button 
                            type="submit" 
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-base font-bold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] border-0" 
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? (
                              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Entrando...</>
                            ) : (
                              <><Sparkles className="mr-2 h-5 w-5" /> Entrar</>
                            )}
                          </Button>
                          {showAdminLogin && (
                            <div className="pt-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full h-12 rounded-xl bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white font-semibold" 
                                onClick={handleAdminLogin} 
                                disabled={loginMutation.isPending}
                              >
                                {loginMutation.isPending ? "Acessando..." : "Acessar como Admin"}
                              </Button>
                            </div>
                          )}
                        </form>
                      </Form>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="register" 
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {referrerName && (
                        <div className="mb-4 p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl">
                          <p className="text-green-300 text-sm font-medium text-center">
                            🎉 Você foi convidado por <span className="font-bold">{referrerName}</span>!
                          </p>
                        </div>
                      )}
                      <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-3">
                          <FormField control={registerForm.control} name="name" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/80 font-semibold text-sm">Nome Completo</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Seu nome" 
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-violet-400 focus:ring-violet-400/20 rounded-xl h-11"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-pink-400" />
                            </FormItem>
                          )} />
                          <FormField control={registerForm.control} name="email" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/80 font-semibold text-sm">Email</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="seu@email.com" 
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-violet-400 focus:ring-violet-400/20 rounded-xl h-11"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-pink-400" />
                            </FormItem>
                          )} />
                          <FormField control={registerForm.control} name="phone" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/80 font-semibold text-sm">Telefone</FormLabel>
                              <FormControl>
                                <div className="auth-phone-input">
                                  <PhoneInput 
                                    country={'br'} 
                                    inputClass="!w-full !bg-white/10 !border-white/20 !text-white !rounded-xl !h-11" 
                                    buttonClass="!bg-white/10 !border-white/20 !rounded-l-xl"
                                    dropdownClass="!bg-slate-800 !text-white"
                                    value={field.value} 
                                    onChange={(phone) => field.onChange(phone ? `+${phone}` : '')} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-pink-400" />
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-3">
                            <FormField control={registerForm.control} name="password" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white/80 font-semibold text-sm">Senha</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="password" 
                                    placeholder="Min. 6 caracteres" 
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-violet-400 focus:ring-violet-400/20 rounded-xl h-11 text-sm"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage className="text-pink-400 text-xs" />
                              </FormItem>
                            )} />
                            <FormField control={registerForm.control} name="confirmPassword" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white/80 font-semibold text-sm">Confirmar</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="password" 
                                    placeholder="Repita a senha" 
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-violet-400 focus:ring-violet-400/20 rounded-xl h-11 text-sm"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage className="text-pink-400 text-xs" />
                              </FormItem>
                            )} />
                          </div>
                          <Button 
                            type="submit" 
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-base font-bold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] border-0 mt-2" 
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? (
                              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Criando conta...</>
                            ) : (
                              <><Sparkles className="mr-2 h-5 w-5" /> Criar Conta</>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </motion.div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                  <p className="text-white/40 text-sm">
                    {activeTab === 'login' ? (
                      <>Não tem conta? <button onClick={() => setActiveTab('register')} className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">Cadastre-se grátis</button></>
                    ) : (
                      <>Já tem conta? <button onClick={() => setActiveTab('login')} className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">Fazer login</button></>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom text - only on mobile, hidden on desktop */}
            <p className="text-center text-white/30 text-xs mt-6 lg:hidden">
              Fottufy - Plataforma de Seleção de Fotos
            </p>
          </motion.div>
        </div>

        {/* Info Section - Below on mobile, side on desktop */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8 pb-8 lg:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="w-full max-w-md lg:max-w-lg"
          >
            {/* White info card */}
            <div className="bg-white rounded-3xl shadow-2xl shadow-purple-900/20 overflow-hidden">
              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 px-4 py-2 rounded-full mb-4">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    <span className="text-sm font-semibold text-violet-700">Seleção de Fotos Simplificada</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-3">
                    O jeito mais fácil de entregar fotos
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    A Fottufy é a plataforma que fotógrafos usam para criar galerias profissionais, 
                    proteger suas fotos com marca d'água e deixar seus clientes escolherem as favoritas.
                  </p>
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-violet-50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{feature.title}</h3>
                        <p className="text-slate-500 text-xs leading-relaxed">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Teste grátis</span>
                  </div>
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Sem cartão de crédito</span>
                  </div>
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Cancele quando quiser</span>
                  </div>
                </div>
              </div>

              {/* Bottom gradient bar */}
              <div className="h-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
            </div>

            {/* Bottom text - only on desktop */}
            <p className="text-center text-white/30 text-xs mt-6 hidden lg:block">
              Fottufy - A plataforma de seleção de fotos mais fácil do mundo
            </p>
          </motion.div>
        </div>
      </div>

      {/* Custom styles for phone input */}
      <style>{`
        .auth-phone-input .react-tel-input .form-control {
          background: rgba(255,255,255,0.1) !important;
          border-color: rgba(255,255,255,0.2) !important;
          color: white !important;
        }
        .auth-phone-input .react-tel-input .flag-dropdown {
          background: rgba(255,255,255,0.1) !important;
          border-color: rgba(255,255,255,0.2) !important;
        }
        .auth-phone-input .react-tel-input .selected-flag:hover,
        .auth-phone-input .react-tel-input .selected-flag:focus {
          background: rgba(255,255,255,0.15) !important;
        }
        .auth-phone-input .react-tel-input .country-list {
          background: rgb(30, 41, 59) !important;
          color: white !important;
        }
        .auth-phone-input .react-tel-input .country-list .country:hover {
          background: rgba(139, 92, 246, 0.3) !important;
        }
        .auth-phone-input .react-tel-input .country-list .country.highlight {
          background: rgba(139, 92, 246, 0.4) !important;
        }
      `}</style>
    </main>
  );
}
