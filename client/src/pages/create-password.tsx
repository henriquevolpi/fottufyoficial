import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * Página para criar nova senha a partir de um token de redefinição
 * 
 * Fluxo:
 * 1. Verifica se o token na URL é válido (GET /api/password/verify-token)
 * 2. Se for válido, exibe o formulário para criar nova senha
 * 3. Envia a nova senha junto com o token (POST /api/password/reset)
 * 4. Redireciona para a página de login em caso de sucesso
 */
interface CreatePasswordProps {
  token?: string;
}

export default function CreatePassword({ token: propToken }: CreatePasswordProps = {}) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Estado do token e validação
  const [token, setToken] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(true);
  
  // Estado do formulário
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para exibição de mensagens
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  // Extrair token da URL ou usar o token passado como prop
  useEffect(() => {
    // Verificar primeiro se o token foi passado como prop (parâmetro de rota)
    if (propToken) {
      setToken(propToken);
      verifyToken(propToken);
      return;
    }
    
    // Se não houver token via prop, buscar da query string
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      verifyToken(tokenFromUrl);
    } else {
      setIsTokenValid(false);
      setIsValidating(false);
      setError('Token não encontrado. Verifique o link que você recebeu por e-mail.');
    }
  }, [propToken]);
  
  // Validar o token
  const verifyToken = async (tokenValue: string) => {
    try {
      setIsValidating(true);
      const response = await apiRequest('GET', `/api/password/verify-token?token=${tokenValue}`);
      const data = await response.json();
      
      if (response.ok && data.isValid) {
        setIsTokenValid(true);
      } else {
        setIsTokenValid(false);
        setError(data.message || 'Token inválido ou expirado. Solicite um novo link de redefinição de senha.');
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      setIsTokenValid(false);
      setError('Ocorreu um erro ao verificar o token. Tente novamente mais tarde.');
    } finally {
      setIsValidating(false);
    }
  };
  
  // Verificar se as senhas coincidem
  const passwordsMatch = () => {
    return password === passwordConfirm;
  };
  
  // Verificar se a senha atende aos requisitos mínimos
  const isPasswordValid = () => {
    return password.length >= 6;
  };
  
  // Enviar o formulário para criar a nova senha
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Resetar mensagens
    setError(null);
    
    // Validar formulário
    if (!passwordsMatch()) {
      setError('As senhas não coincidem.');
      return;
    }
    
    if (!isPasswordValid()) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    if (!token) {
      setError('Token não encontrado.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await apiRequest('POST', '/api/password/reset', {
        token,
        password
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(true);
        toast({
          title: 'Senha criada com sucesso!',
          description: 'Você pode fazer login agora com sua nova senha.',
          variant: 'default',
        });
        
        // Redirecionar para a página de login após 3 segundos
        setTimeout(() => {
          setLocation('/auth');
        }, 3000);
      } else {
        setError(data.message || 'Não foi possível criar a senha. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      setError('Ocorreu um erro ao criar a senha. Tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Renderizar conteúdo de acordo com o estado
  const renderContent = () => {
    // Verificando token
    if (isValidating) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
          <h3 className="text-lg font-medium">Verificando token...</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Estamos validando seu token de acesso.
          </p>
        </div>
      );
    }
    
    // Token inválido
    if (isTokenValid === false) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-12 w-12 mb-4 text-destructive" />
          <h3 className="text-lg font-medium">Link inválido ou expirado</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {error || 'O link que você usou é inválido ou já expirou.'}
          </p>
          <Button onClick={() => setLocation('/auth')}>
            Voltar para login
          </Button>
        </div>
      );
    }
    
    // Senha alterada com sucesso
    if (success) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <ShieldCheck className="h-12 w-12 mb-4 text-green-500" />
          <h3 className="text-xl font-medium">Senha criada com sucesso!</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Você será redirecionado para a página de login em alguns segundos.
          </p>
          <Button onClick={() => setLocation('/auth')}>
            Ir para login
          </Button>
        </div>
      );
    }
    
    // Formulário para criar senha
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <div className="relative">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Digite sua nova senha"
              className="pr-10"
              disabled={isSubmitting}
            />
            <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          {password && !isPasswordValid() && (
            <p className="text-xs text-destructive mt-1">
              A senha deve ter pelo menos 6 caracteres.
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">Confirme a senha</Label>
          <div className="relative">
            <Input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              placeholder="Digite a senha novamente"
              className="pr-10"
              disabled={isSubmitting}
            />
            <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          {passwordConfirm && !passwordsMatch() && (
            <p className="text-xs text-destructive mt-1">
              As senhas não coincidem.
            </p>
          )}
        </div>
        
        {error && (
          <div className="rounded-md bg-destructive/15 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : 'Criar senha'}
        </Button>
      </form>
    );
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Fottufy Logo" className="h-12" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {success ? 'Senha criada!' : 'Criar sua senha'}
          </CardTitle>
          <CardDescription className="text-center">
            {success 
              ? 'Sua senha foi criada com sucesso.'
              : 'Digite uma nova senha para sua conta Fottufy.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}