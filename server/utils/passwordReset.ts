import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from './sendEmail';
import { db } from '../db';
import { passwordResetTokens, users } from '@shared/schema';
import { add, isPast } from 'date-fns';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from '../auth';

/**
 * Gera um token de redefinição de senha para um usuário
 * @param userId ID do usuário
 * @param expiresInMinutes Tempo de expiração em minutos (padrão: 60 minutos)
 * @returns Token gerado ou null se falhar
 */
export async function generatePasswordResetToken(userId: number, expiresInMinutes: number = 60): Promise<string | null> {
  try {
    // Verifica se o usuário existe
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      console.error(`Usuário com ID ${userId} não encontrado`);
      return null;
    }

    // Define a data de expiração
    const expiresAt = add(new Date(), { minutes: expiresInMinutes });

    // Insere o token na tabela
    const [newToken] = await db.insert(passwordResetTokens)
      .values({
        userId,
        expiresAt,
      })
      .returning({ token: passwordResetTokens.token });

    if (!newToken?.token) {
      console.error('Falha ao gerar token de redefinição de senha');
      return null;
    }

    return newToken.token as string;
  } catch (error) {
    console.error('Erro ao gerar token de redefinição de senha:', error);
    return null;
  }
}

/**
 * Envia um email com link para criação de senha
 * @param email Email do usuário
 * @param token Token de redefinição de senha
 * @param isNewUser Se é um novo usuário ou uma redefinição de senha
 * @returns Sucesso ou falha no envio
 */
export async function sendPasswordResetEmail(
  email: string, 
  token: string, 
  isNewUser: boolean = false
): Promise<boolean> {
  try {
    // Verificar se o usuário existe
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      console.error(`Usuário com email ${email} não encontrado`);
      return false;
    }

    // Personaliza o assunto e texto com base se é novo usuário ou redefinição
    const subject = isNewUser 
      ? 'Bem-vindo à Fottufy! Complete seu cadastro' 
      : 'Redefinição de senha na Fottufy';
    
    const title = isNewUser 
      ? 'Bem-vindo à Fottufy!' 
      : 'Redefinição de Senha';
    
    const intro = isNewUser 
      ? `Seja bem-vindo(a), ${user.name}! Sua conta na Fottufy foi criada com sucesso a partir da sua compra na Hotmart.` 
      : `Olá, ${user.name}! Recebemos uma solicitação para redefinir sua senha na Fottufy.`;
    
    const actionText = isNewUser 
      ? 'Criar minha senha' 
      : 'Redefinir minha senha';
    
    const currentYear = new Date().getFullYear();
    const displayName = user.name.split(' ')[0]; // Pega apenas o primeiro nome

    // URL base do frontend - deve ser configurado corretamente para produção
    const baseUrl = process.env.FRONTEND_URL || 'https://fottufy.com';
    const resetUrl = `${baseUrl}/create-password?token=${token}`;

    // Template do email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://fottufy.com/logo.png" alt="Fottufy Logo" style="height: 60px;">
        </div>
        
        <h1 style="color: #4F46E5; text-align: center;">${title}</h1>
        
        <p>Olá, ${displayName}!</p>
        
        <p>${intro}</p>
        
        <p>Para ${isNewUser ? 'criar' : 'redefinir'} sua senha, clique no botão abaixo:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">${actionText}</a>
        </div>
        
        <p><strong>Atenção:</strong> Este link é válido por ${isNewUser ? '24 horas' : '1 hora'} e pode ser usado apenas uma vez.</p>
        
        <p>Se você não solicitou ${isNewUser ? 'a criação de uma conta' : 'a redefinição de senha'}, ignore este email ou entre em contato com nossa equipe de suporte.</p>
        
        <p>Atenciosamente,<br>Equipe Fottufy</p>
        
        <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #777; text-align: center;">
          <p>© ${currentYear} Fottufy. Todos os direitos reservados.</p>
        </div>
      </div>
    `;

    // Envia o email
    const result = await sendEmail({
      to: email,
      subject,
      html: htmlContent
    });

    return true;
  } catch (error) {
    console.error('Erro ao enviar email de redefinição de senha:', error);
    return false;
  }
}

/**
 * Verifica se um token de redefinição de senha é válido
 * @param token Token a ser verificado
 * @returns Objeto com status da verificação e ID do usuário se válido
 */
export async function verifyPasswordResetToken(token: string): Promise<{ isValid: boolean; userId?: number }> {
  try {
    // Busca o token no banco
    const [tokenRecord] = await db.select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token as unknown as string),
          eq(passwordResetTokens.used, false)
        )
      );

    // Verifica se o token existe e não está expirado
    if (!tokenRecord) {
      console.warn('Token de redefinição de senha não encontrado ou já utilizado');
      return { isValid: false };
    }

    // Verifica se o token está expirado
    if (isPast(tokenRecord.expiresAt)) {
      console.warn(`Token expirado em ${tokenRecord.expiresAt}`);
      return { isValid: false };
    }

    return { isValid: true, userId: tokenRecord.userId };
  } catch (error) {
    console.error('Erro ao verificar token de redefinição de senha:', error);
    return { isValid: false };
  }
}

/**
 * Redefine a senha de um usuário usando um token válido
 * @param token Token de redefinição
 * @param newPassword Nova senha
 * @returns Sucesso ou falha na redefinição
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  try {
    // Verifica se o token é válido
    const { isValid, userId } = await verifyPasswordResetToken(token);
    if (!isValid || !userId) {
      return false;
    }

    // Hash da nova senha
    const hashedPassword = await hashPassword(newPassword);

    // Atualiza a senha do usuário
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    // Marca o token como usado
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token as unknown as string));

    return true;
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return false;
  }
}