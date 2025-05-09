import { db } from "../db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { addHours } from "date-fns";
import { passwordResetTokens, users } from "@shared/schema";
import { hashPassword } from "../auth";
import { sendEmail } from "./sendEmail";

/**
 * Gera um token de redefinição de senha para um usuário
 * @param userId ID do usuário
 * @param expiresInMinutes Tempo de expiração em minutos (padrão: 60 minutos)
 * @returns Token gerado ou null se falhar
 */
export async function generatePasswordResetToken(userId: number, expiresInMinutes: number = 60): Promise<string | null> {
  try {
    // Verifica se o usuário existe
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) {
      console.error(`Usuário ID ${userId} não encontrado para gerar token`);
      return null;
    }

    // Gera um token aleatório
    const token = randomBytes(32).toString('hex');
    
    // Define a data de expiração
    const expiresAt = addHours(new Date(), expiresInMinutes / 60);

    // Insere o token no banco de dados
    await db.insert(passwordResetTokens).values({
      token,
      userId,
      expiresAt,
      used: false
    });

    return token;
  } catch (error) {
    console.error("Erro ao gerar token de redefinição de senha:", error);
    return null;
  }
}

/**
 * Envia um email com link para criação de senha
 * @param email Email do usuário
 * @param token Token de redefinição de senha
 * @param isNewUser Se é um novo usuário ou uma redefinição de senha
 * @param userName Nome do usuário para personalizar a saudação (opcional)
 * @returns Sucesso ou falha no envio
 */
export async function sendPasswordResetEmail(
  email: string, 
  token: string, 
  isNewUser: boolean = false,
  userName?: string
): Promise<boolean> {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://fottufy.com';
    const resetLink = `${baseUrl}/create-password?token=${token}`;
    
    const subject = isNewUser 
      ? "🥳 Sua conta foi criada! Crie sua senha para acessar agora" 
      : "Redefinição de senha Fottufy";
      
    const body = isNewUser 
      ? getWelcomeEmailTemplate(resetLink, userName)
      : getResetPasswordEmailTemplate(resetLink);
    
    const result = await sendEmail({
      to: email,
      subject,
      html: body
    });
    
    return result.success;
  } catch (error) {
    console.error("Erro ao enviar email de redefinição de senha:", error);
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
    // Busca o token no banco de dados
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    
    if (!resetToken) {
      return { isValid: false };
    }
    
    // Verifica se o token já foi usado
    if (resetToken.used) {
      return { isValid: false };
    }
    
    // Verifica se o token expirou
    if (new Date() > resetToken.expiresAt) {
      return { isValid: false };
    }
    
    // Token válido, retorna true e o ID do usuário
    return { isValid: true, userId: resetToken.userId };
  } catch (error) {
    console.error("Erro ao verificar token de redefinição de senha:", error);
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
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
    
    // Marca o token como usado
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
    
    return true;
  } catch (error) {
    console.error("Erro ao redefinir senha com token:", error);
    return false;
  }
}

// Template de e-mail para novos usuários criarem senha
function getWelcomeEmailTemplate(resetLink: string, userName?: string): string {
  // Use o nome do usuário se disponível, ou um cumprimento genérico
  const greeting = userName ? `Bem-vindo(a) ${userName}!` : "Bem-vindo(a) à Fottufy!";
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Criação de senha - Fottufy</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); margin: auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://cdn.fottufy.com/assets/logo.png" alt="Fottufy Logo" style="max-width: 150px;">
        </div>
        <h2 style="color: #2a2a2a;">🎉 ${greeting}</h2>
        <p style="font-size: 16px; color: #444;">
          Sua conta foi criada automaticamente após a sua compra. Para ativá-la e acessar seus projetos, você precisa criar sua senha.
        </p>
        <p style="font-size: 16px; color: #444;">Clique no botão abaixo para definir sua senha:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #1d72f3; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
            Criar senha
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:
        </p>
        <p style="font-size: 14px; color: #666; word-break: break-all;">
          ${resetLink}
        </p>
        <p style="font-size: 14px; color: #888; margin-top: 30px;">
          ⚠️ Esse link é válido por 24 horas e pode ser usado apenas uma vez. Se você não solicitou esse acesso, ignore este e-mail.
        </p>
        <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="font-size: 14px; color: #888; text-align: center;">Equipe Fottufy</p>
          <p style="font-size: 12px; color: #aaa; text-align: center;">&copy; ${new Date().getFullYear()} Fottufy. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
  </html>
  `;
}

// Template de e-mail para redefinição de senha
function getResetPasswordEmailTemplate(resetLink: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinição de Senha Fottufy</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { text-align: center; margin-bottom: 20px; }
      .logo { max-width: 150px; }
      h1 { color: #0056b3; }
      .button { display: inline-block; background-color: #0056b3; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; margin: 20px 0; }
      .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="https://cdn.fottufy.com/assets/logo.png" alt="Fottufy Logo" class="logo">
    </div>
    
    <h1>Redefinição de Senha</h1>
    
    <p>Recebemos uma solicitação para redefinir a senha da sua conta Fottufy.</p>
    
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    
    <p style="text-align: center;">
      <a href="${resetLink}" class="button">Redefinir minha senha</a>
    </p>
    
    <p>Ou copie e cole este link no seu navegador:</p>
    <p style="word-break: break-all;">${resetLink}</p>
    
    <p><strong>Observação:</strong> Este link é válido por 1 hora. Após esse período, você precisará solicitar um novo link de redefinição de senha.</p>
    
    <p>Se você não solicitou a redefinição de senha, por favor ignore este e-mail.</p>
    
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Fottufy. Todos os direitos reservados.</p>
      <p>Este é um e-mail automático, por favor não responda.</p>
    </div>
  </body>
  </html>
  `;
}