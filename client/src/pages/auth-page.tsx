import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

// Esquemas de validação
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string()
    .min(1, "Telefone é obrigatório"),
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
  
  // Processar parâmetros de URL para redirecionamento pós-login
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const redirect = searchParams.get('redirect') || '/dashboard';
  const plan = searchParams.get('plan'); // Capturar o tipo de plano se existir
  const showAdminLogin = searchParams.get('admin') === 'true'; // Check if admin=true is in URL
  
  // Construir a URL de redirecionamento com parâmetros adequados
  const redirectUrl = plan ? `${redirect}?plan=${plan}` : redirect;

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleLogin = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const handleRegister = (values: RegisterFormValues) => {
    const { confirmPassword, ...registerData } = values;
    registerMutation.mutate(registerData);
  };
  
  // Handler for admin login button
  const handleAdminLogin = () => {
    // Fill and submit the login form with admin credentials
    loginForm.setValue("email", "admin@studio.com");
    loginForm.setValue("password", "admin123");
    
    // Submit the form with admin credentials
    loginMutation.mutate({
      email: "admin@studio.com",
      password: "admin123"
    });
  };

  // Efeito para lidar com o redirecionamento após o login bem-sucedido
  useEffect(() => {
    if (user) {
      // If the user is an admin, redirect to the admin panel
      if (user.role === 'admin') {
        console.log('Redirecting admin user to admin panel');
        setLocation('/admin');
      } else {
        // Otherwise redirect to the specified URL or dashboard
        console.log('Redirecting regular user to:', redirectUrl);
        setLocation(redirectUrl);
      }
    }
  }, [user, redirectUrl, setLocation]);
  
  // Redirecionar se já estiver autenticado
  if (user) {
    return null; // Retornamos null enquanto o efeito de redirecionamento está sendo processado
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 gap-0">
      {/* Formulário de autenticação */}
      <div className="flex flex-col justify-center items-center p-6 bg-background">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary">Fottufy</h1>
            <p className="text-muted-foreground mt-2">
              Plataforma de Gerenciamento para fotógrafos profissionais
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "login" ? "Entrar na sua conta" : "Criar uma nova conta"}
              </CardTitle>
              <CardDescription>
                {activeTab === "login" 
                  ? "Acesse sua conta para gerenciar seus projetos fotográficos"
                  : "Cadastre-se para começar a gerenciar seus projetos fotográficos"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="register">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="seu@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="******" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="text-sm text-right">
                        <Link href="/forgot-password" className="text-primary hover:underline">
                          Esqueci minha senha
                        </Link>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Entrando...
                          </>
                        ) : (
                          "Entrar"
                        )}
                      </Button>
                      
                      {/* Admin login button - only visible when ?admin=true is in URL */}
                      {showAdminLogin && (
                        <div className="mt-5 pt-5 border-t border-muted">
                          <Button 
                            type="button"
                            variant="outline"
                            className="w-full bg-purple-50 border-purple-200 hover:bg-purple-100"
                            onClick={handleAdminLogin}
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Acessando...
                              </>
                            ) : (
                              "Acessar como Admin"
                            )}
                          </Button>
                        </div>
                      )}
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu nome" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="seu@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone com código do país</FormLabel>
                            <FormControl>
                              <PhoneInput
                                country={'br'}
                                enableSearch={true}
                                inputProps={{
                                  name: field.name,
                                  required: true,
                                }}
                                placeholder=""
                                countryCodeEditable={false}
                                containerClass="w-full"
                                inputClass="!w-full"
                                buttonClass="!bg-transparent"
                                value={field.value}
                                onChange={(phone) => {
                                  // Simplificar para prevenir potenciais erros
                                  // Garantir que o formato tenha o prefixo +
                                  if (phone) {
                                    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
                                    field.onChange(formattedPhone);
                                  } else {
                                    field.onChange('');
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="******" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="******" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cadastrando...
                          </>
                        ) : (
                          "Cadastrar"
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hero section */}
      <div className="hidden md:flex bg-gradient-to-r from-primary to-primary/80 text-white p-12 flex-col justify-center">
        <div className="max-w-lg">
          <h2 className="text-4xl font-bold mb-6">
            Gerenciamento simplificado para fotógrafos profissionais
          </h2>
          <p className="text-lg mb-8">
            Com o StudioFlow, você pode gerenciar projetos fotográficos, compartilhar galerias com clientes
            e receber seleções de fotos de forma rápida e intuitiva.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">Compartilhamento de galerias</h3>
                <p>Envie links personalizados para que seus clientes visualizem os projetos</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">Seleção de fotos</h3>
                <p>Clientes podem escolher suas fotos favoritas diretamente na plataforma</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-3"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">Métricas e relatórios</h3>
                <p>Acompanhe o desempenho dos seus projetos e interações com clientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}