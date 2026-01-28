/**
 * Templates de emails de nurturing (drip campaign) para usuários free
 * 
 * Sequência: 6 emails em 10 dias
 * - Email 1: Dia 1 após cadastro
 * - Email 2: Dia 2 após cadastro
 * - Email 3: Dia 4 após cadastro
 * - Email 4: Dia 6 após cadastro
 * - Email 5: Dia 8 após cadastro
 * - Email 6: Dia 10 após cadastro
 */

interface NurturingEmailTemplate {
  subject: string;
  getHtml: (userName: string) => string;
}

const baseStyles = `
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: white; border-radius: 24px; padding: 40px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo-text { font-size: 32px; font-weight: 900; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    h1 { color: #1f2937; font-size: 24px; font-weight: 800; margin-bottom: 20px; line-height: 1.3; }
    p { color: #4b5563; font-size: 16px; line-height: 1.7; margin-bottom: 16px; }
    .highlight { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 16px; margin: 24px 0; border-left: 4px solid #f59e0b; }
    .highlight p { margin: 0; color: #92400e; font-weight: 600; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; margin: 24px 0; }
    .cta-button:hover { opacity: 0.9; }
    .feature-list { background: #f8fafc; border-radius: 16px; padding: 24px; margin: 24px 0; }
    .feature-item { display: flex; align-items: center; margin-bottom: 12px; }
    .feature-icon { width: 24px; height: 24px; margin-right: 12px; color: #10b981; }
    .footer { text-align: center; margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 14px; }
    .stat-box { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 20px; border-radius: 16px; text-align: center; margin: 20px 0; }
    .stat-number { font-size: 36px; font-weight: 900; color: #059669; }
    .stat-label { color: #047857; font-size: 14px; font-weight: 600; }
  </style>
`;

export const nurturingEmailTemplates: Record<number, NurturingEmailTemplate> = {
  1: {
    subject: "🎯 Você está perdendo seleções de fotos agora mesmo?",
    getHtml: (userName: string) => `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <span class="logo-text">📸 Fottufy</span>
            </div>
            
            <h1>Olá, ${userName}! Seus clientes merecem ver suas fotos com estilo.</h1>
            
            <p>Você sabia que fotógrafos que usam galerias profissionais <strong>fecham 40% mais contratos</strong>?</p>
            
            <div class="highlight">
              <p>💡 Seus clientes ainda recebem fotos por Google Drive ou WeTransfer? Existe uma forma muito mais elegante...</p>
            </div>
            
            <p>Com a Fottufy, você envia galerias com:</p>
            
            <div class="feature-list">
              <div class="feature-item">✨ Marca d'água automática que protege seu trabalho</div>
              <div class="feature-item">🎨 Design profissional que impressiona clientes</div>
              <div class="feature-item">📱 Funciona perfeito no celular</div>
              <div class="feature-item">✅ Sistema de seleção integrado</div>
            </div>
            
            <p style="text-align: center;">
              <a href="https://fottufy.com/subscription" class="cta-button">Quero impressionar meus clientes →</a>
            </p>
            
            <div class="footer">
              <p>Fottufy - A plataforma premium para fotógrafos profissionais</p>
              <p>Você recebeu este email porque se cadastrou na Fottufy.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  2: {
    subject: "⚡ O segredo dos fotógrafos que faturam 2x mais",
    getHtml: (userName: string) => `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <span class="logo-text">📸 Fottufy</span>
            </div>
            
            <h1>${userName}, você está cobrando pelo seu trabalho como deveria?</h1>
            
            <p>Muitos fotógrafos perdem dinheiro por não ter uma apresentação profissional.</p>
            
            <div class="stat-box">
              <div class="stat-number">+67%</div>
              <div class="stat-label">Valor percebido ao usar galerias profissionais</div>
            </div>
            
            <p>Quando seu cliente recebe as fotos em uma galeria elegante, com marca d'água e sistema de seleção, ele <strong>percebe mais valor</strong> no seu trabalho.</p>
            
            <div class="highlight">
              <p>🎯 Resultado: Você pode cobrar mais e ainda assim o cliente fica mais satisfeito!</p>
            </div>
            
            <p>A Fottufy foi criada exatamente para isso: elevar a percepção do seu trabalho.</p>
            
            <p style="text-align: center;">
              <a href="https://fottufy.com/subscription" class="cta-button">Começar a cobrar o que mereço →</a>
            </p>
            
            <div class="footer">
              <p>Fottufy - Eleve o valor do seu trabalho fotográfico</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  3: {
    subject: "🔒 Suas fotos estão protegidas? (Importante)",
    getHtml: (userName: string) => `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <span class="logo-text">📸 Fottufy</span>
            </div>
            
            <h1>${userName}, preciso te perguntar algo sério...</h1>
            
            <p>Quando você envia fotos para o cliente aprovar, elas estão protegidas?</p>
            
            <div class="highlight">
              <p>⚠️ Sem marca d'água, qualquer pessoa pode baixar e usar suas fotos sem pagar!</p>
            </div>
            
            <p>Na Fottufy, <strong>toda foto recebe marca d'água automática</strong>. Seu cliente vê, seleciona, mas só recebe as originais depois de pagar.</p>
            
            <div class="feature-list">
              <div class="feature-item">🔐 Marca d'água personalizada automática</div>
              <div class="feature-item">🚫 Bloqueio de download de originais</div>
              <div class="feature-item">✅ Liberação após pagamento</div>
              <div class="feature-item">📊 Controle total das suas entregas</div>
            </div>
            
            <p>Proteja seu trabalho. Você merece ser pago por cada foto entregue.</p>
            
            <p style="text-align: center;">
              <a href="https://fottufy.com/subscription" class="cta-button">Proteger minhas fotos agora →</a>
            </p>
            
            <div class="footer">
              <p>Fottufy - Proteção profissional para fotógrafos</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  4: {
    subject: "📱 Seus clientes selecionam fotos pelo celular?",
    getHtml: (userName: string) => `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <span class="logo-text">📸 Fottufy</span>
            </div>
            
            <h1>${userName}, 85% dos seus clientes estão no celular!</h1>
            
            <p>Se você ainda envia links do Google Drive ou pastas zip, seu cliente sofre para ver as fotos no celular.</p>
            
            <div class="stat-box">
              <div class="stat-number">85%</div>
              <div class="stat-label">das pessoas acessam pelo celular</div>
            </div>
            
            <p>A Fottufy foi pensada para o celular primeiro:</p>
            
            <div class="feature-list">
              <div class="feature-item">📱 Carregamento ultra-rápido</div>
              <div class="feature-item">👆 Seleção com um toque</div>
              <div class="feature-item">💬 Comentários em cada foto</div>
              <div class="feature-item">✨ Visual incrível em qualquer tela</div>
            </div>
            
            <div class="highlight">
              <p>💡 Clientes felizes = mais indicações = mais trabalho pra você!</p>
            </div>
            
            <p style="text-align: center;">
              <a href="https://fottufy.com/subscription" class="cta-button">Oferecer a melhor experiência →</a>
            </p>
            
            <div class="footer">
              <p>Fottufy - Perfeito no celular, perfeito no computador</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  5: {
    subject: "🚀 Fotógrafos profissionais já estão usando isso",
    getHtml: (userName: string) => `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <span class="logo-text">📸 Fottufy</span>
            </div>
            
            <h1>${userName}, você está ficando para trás?</h1>
            
            <p>Enquanto alguns fotógrafos ainda usam Google Drive, outros estão profissionalizando suas entregas.</p>
            
            <div class="highlight">
              <p>🏆 "Desde que comecei a usar a Fottufy, meus clientes elogiam demais a experiência. Já fechei 3 contratos novos só por indicação!" - Marina S.</p>
            </div>
            
            <p>O que fotógrafos profissionais estão fazendo diferente:</p>
            
            <div class="feature-list">
              <div class="feature-item">✅ Galerias com marca d'água automática</div>
              <div class="feature-item">✅ Sistema de seleção profissional</div>
              <div class="feature-item">✅ Portfólio online para captar clientes</div>
              <div class="feature-item">✅ Organização impecável de projetos</div>
            </div>
            
            <p>Não deixe a concorrência passar na sua frente.</p>
            
            <p style="text-align: center;">
              <a href="https://fottufy.com/subscription" class="cta-button">Quero me profissionalizar →</a>
            </p>
            
            <div class="footer">
              <p>Fottufy - A escolha dos fotógrafos profissionais</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  6: {
    subject: "🎁 Última chance: Comece agora com a Fottufy",
    getHtml: (userName: string) => `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <span class="logo-text">📸 Fottufy</span>
            </div>
            
            <h1>${userName}, vamos dar o primeiro passo juntos?</h1>
            
            <p>Já faz 10 dias que você se cadastrou, mas ainda não ativou seu plano.</p>
            
            <p>Entendo que mudar de ferramenta dá trabalho. Mas pense:</p>
            
            <div class="highlight">
              <p>💭 Quanto tempo você perde organizando fotos em pastas? Quanto deixa de ganhar por não ter uma apresentação profissional?</p>
            </div>
            
            <p>Com a Fottufy você ganha:</p>
            
            <div class="feature-list">
              <div class="feature-item">⏱️ Horas economizadas toda semana</div>
              <div class="feature-item">💰 Mais valor percebido pelo cliente</div>
              <div class="feature-item">🔒 Proteção total do seu trabalho</div>
              <div class="feature-item">🌟 Impressão profissional garantida</div>
            </div>
            
            <div class="stat-box">
              <div class="stat-number">A partir de R$29/mês</div>
              <div class="stat-label">Menos que um café por dia!</div>
            </div>
            
            <p>Vamos começar? Estou aqui para te ajudar!</p>
            
            <p style="text-align: center;">
              <a href="https://fottufy.com/subscription" class="cta-button">Ativar meu plano agora →</a>
            </p>
            
            <div class="footer">
              <p>Fottufy - Seu parceiro na fotografia profissional</p>
              <p style="font-size: 12px; color: #9ca3af;">Se não quiser mais receber esses emails, basta assinar qualquer plano ou responder pedindo para sair da lista.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

// Mapeia qual email deve ser enviado em qual dia após o cadastro
export const emailSchedule: Record<number, number> = {
  1: 1,  // Email 1 no dia 1
  2: 2,  // Email 2 no dia 2
  3: 4,  // Email 3 no dia 4
  4: 6,  // Email 4 no dia 6
  5: 8,  // Email 5 no dia 8
  6: 10, // Email 6 no dia 10
};

// Retorna qual email deve ser enviado baseado nos dias desde o cadastro
export function getEmailNumberForDay(daysSinceSignup: number): number | null {
  for (const [emailNum, dayToSend] of Object.entries(emailSchedule)) {
    if (dayToSend === daysSinceSignup) {
      return parseInt(emailNum);
    }
  }
  return null;
}
