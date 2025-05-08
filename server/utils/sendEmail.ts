/**
 * Serviço de envio de e-mails usando Resend
 * 
 * Este módulo oferece funções para envio de e-mails através da API do Resend.
 * 
 * Requisitos:
 * - Variável de ambiente RESEND_API_KEY configurada com a chave de API do Resend
 */

import { Resend } from 'resend';

// Verifica se a API key está configurada
let resendClient: Resend | null = null;

if (process.env.RESEND_API_KEY) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn('AVISO: RESEND_API_KEY não está configurada. O envio de e-mails não funcionará.');
}

// Interface para os parâmetros da função sendEmail
interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Envia um e-mail usando o serviço Resend
 * 
 * @param params Parâmetros do e-mail (destinatário, assunto, conteúdo HTML)
 * @returns Objeto com status do envio e mensagem
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; message: string; data?: any }> {
  const { to, subject, html, from = 'Fottufy <noreply@fottufy.com>' } = params;

  // Se DEBUG_EMAIL estiver desabilitado, evitar logs detalhados para economizar memória
  const debug = process.env.DEBUG_EMAIL === 'true';

  try {
    // Verifica se o cliente Resend está configurado
    if (!resendClient) {
      if (debug) {
        console.error('Erro ao enviar e-mail: Cliente Resend não configurado');
      }
      return { 
        success: false, 
        message: 'Serviço de e-mail não configurado.' 
      };
    }

    // Validação básica dos parâmetros
    if (!to || !subject || !html) {
      return { 
        success: false, 
        message: 'Parâmetros de email incompletos.' 
      };
    }

    // Envia o e-mail
    const { data, error } = await resendClient.emails.send({
      from,
      to,
      subject,
      html,
    });

    // Verifica se ocorreu algum erro
    if (error) {
      if (debug) {
        console.error('Erro ao enviar e-mail via Resend:', error.message);
      }
      return { 
        success: false, 
        message: 'Falha ao enviar e-mail.' 
      };
    }

    // Retorna sucesso com dados mínimos para economizar memória
    return { 
      success: true, 
      message: 'E-mail enviado' 
    };
  } catch (error) {
    // Captura e trata qualquer erro inesperado
    if (debug) {
      console.error('Erro inesperado ao enviar e-mail:', 
        error instanceof Error ? error.message : 'Erro desconhecido');
    }
    return { 
      success: false, 
      message: 'Erro ao enviar e-mail.' 
    };
  }
}