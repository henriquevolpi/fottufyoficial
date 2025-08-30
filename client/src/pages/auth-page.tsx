import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { motion } from "framer-motion";

// Esquemas de validação (sem alterações)
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

  // Lógica funcional (sem alterações)
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const redirect = searchParams.get('redirect') || '/dashboard';
  const plan = searchParams.get('plan');
  const showAdminLogin = searchParams.get('admin') === 'true';
  const redirectUrl = plan ? `${redirect}?plan=${plan}` : redirect;

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
    registerMutation.mutate(registerData);
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

  // ===== INÍCIO DA NOVA ESTRUTURA VISUAL "AURA DINÂMICA" =====
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-100 p-4 font-sans">
      {/* Auras de fundo dinâmicas */}
      <motion.div
        animate={{ x: activeTab === 'login' ? -100 : 100, scale: activeTab === 'login' ? 1 : 1.2 }}
        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-violet-300/50 blur-3xl"
      />
      <motion.div
        animate={{ y: activeTab === 'login' ? 50 : -50, scale: activeTab === 'login' ? 1.2 : 1 }}
        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-sky-300/50 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "circOut" }}
        whileHover={{ scale: 1.015, transition: { duration: 0.3 } }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/60 p-6 backdrop-blur-xl sm:p-8 border border-white/50 shadow-2xl rounded-2xl">
          <div className="text-center mb-8">
            <img src="/fottufinho.webp" alt="Mascote Fottufinho" className="w-16 h-16 mx-auto mb-2" draggable={false} />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {activeTab === 'login' ? 'Fottufy - Boas Vindas' : 'Crie sua Conta'}
            </h1>
            <p className="mt-1 text-gray-600">
              {activeTab === 'login' ? 'Sua plataforma Oficial de Seleção de Fotos para Fotografia' : 'Rápido e fácil, vamos começar!'}
            </p>
          </div>

          <div className="flex justify-center gap-6 border-b border-gray-200">
              {["login", "register"].map((tab) => (
              <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative p-0 pb-3 text-base font-medium transition-colors ${
                  activeTab === tab ? "text-blue-600" : "text-gray-400 hover:text-gray-700"
                  }`}
              >
                  {tab === "login" ? "Entrar" : "Cadastrar"}
                  {activeTab === tab && (
                  <motion.div 
                      className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500" 
                      layoutId="underline" 
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                  )}
              </button>
              ))}
          </div>

          <div className="pt-8">
            {activeTab === "login" ? (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField control={loginForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={loginForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" placeholder="Sua senha" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="text-sm text-right">
                      <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-700">Esqueceu a senha?</Link>
                    </div>
                    <Button type="submit" className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 active:scale-95" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</> : "Entrar"}
                    </Button>
                    {showAdminLogin && (
                      <div className="pt-4"><Button type="button" variant="outline" className="w-full h-11" onClick={handleAdminLogin} disabled={loginMutation.isPending}>
                          {loginMutation.isPending ? "Acessando..." : "Acessar como Admin"}
                      </Button></div>
                    )}
                  </form>
                </Form>
              </motion.div>
            ) : (
              <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <FormField control={registerForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={registerForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={registerForm.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Telefone</FormLabel><FormControl><PhoneInput country={'br'} inputClass="!w-full" value={field.value} onChange={(phone) => field.onChange(phone ? `+${phone}` : '')} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={registerForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel>Crie uma senha</FormLabel><FormControl><Input type="password" placeholder="Mínimo de 6 caracteres" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={registerForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem><FormLabel>Confirme a senha</FormLabel><FormControl><Input type="password" placeholder="Repita a senha criada" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 active:scale-95" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cadastrando...</> : "Criar Conta"}
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  );
}