/**
 * Utilitário para envio de e-mails de boas-vindas para novos usuários
 * Utiliza o serviço de e-mail configurado em sendEmail.ts
 */

import { sendEmail } from './sendEmail';

/**
 * Envia um e-mail de boas-vindas para um novo usuário com suas credenciais de acesso
 * 
 * @param email Email do usuário
 * @param name Nome do usuário 
 * @param password Senha temporária (em texto plano)
 * @returns Resultado do envio de e-mail
 */
export async function sendWelcomeEmail(email: string, name: string, password: string) {
  const displayName = name || email.split('@')[0];
  const currentYear = new Date().getFullYear();
  
  const htmlContent = getWelcomeEmailTemplate(displayName, email, password, currentYear);
  
  try {
    const result = await sendEmail({
      to: email,
      subject: '🥳 Sua conta foi criada! Aqui estão seus dados de acesso',
      html: htmlContent
    });
    
    return result;
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    return { success: false, message: 'Falha ao enviar e-mail de boas-vindas' };
  }
}

/**
 * Gera o template HTML do e-mail de boas-vindas
 * 
 * @param displayName Nome de exibição do usuário
 * @param email E-mail do usuário
 * @param password Senha temporária
 * @param currentYear Ano atual para o rodapé
 * @returns HTML formatado do e-mail
 */
function getWelcomeEmailTemplate(
  displayName: string, 
  email: string, 
  password: string, 
  currentYear: number
): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Bem-vindo à Fottufy!</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); overflow: hidden;">
      <div style="background-color: #4361ee; color: #ffffff; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Bem-vindo à Fottufy! 🎉</h1>
      </div>
      
      <div style="padding: 30px 30px 20px; color: #333333;">
        <p style="font-size: 16px; margin-bottom: 25px;">
          Olá, <strong>${displayName}</strong>!
        </p>
        
        <p style="font-size: 16px; margin-bottom: 25px;">
          Sua conta na Fottufy foi criada com sucesso 🎉
        </p>
        
        <div style="background-color: #f8f9fa; border-left: 4px solid #4361ee; padding: 20px; margin-bottom: 25px;">
          <p style="font-size: 16px; margin: 0 0 10px 0;"><strong>Aqui estão seus dados de acesso:</strong></p>
          <p style="font-size: 16px; margin: 0 0 5px 0;">📧 E-mail: <strong>${email}</strong></p>
          <p style="font-size: 16px; margin: 0;">🔐 Senha temporária: <strong>${password}</strong></p>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://fottufy.com/auth" 
             style="display: inline-block; background-color: #4361ee; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Acessar agora
          </a>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 25px;">
          Recomendamos que você troque a senha após o primeiro acesso.
        </p>
        
        <p style="font-size: 16px; margin-bottom: 15px;">
          Obrigado por escolher a Fottufy para gerenciar seus projetos fotográficos!
        </p>
        
        <p style="font-size: 16px; margin-bottom: 0;">
          Atenciosamente,<br />
          Equipe Fottufy
        </p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666;">
        <p style="margin: 0 0 10px;">
          Este e-mail foi enviado automaticamente, por favor não responda.
        </p>
        <p style="margin: 0 0 10px;">
          © ${currentYear} Fottufy. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </body>
</html>
  `;
}