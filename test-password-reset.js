// Script para testar o fluxo de criação de senha (token e e-mail)
// Execute esse script com o comando: node test-password-reset.js

const fetch = require('node-fetch');

// Função para simular um webhook da Hotmart quando um cliente faz uma compra
async function simulateHotmartPurchase() {
  // Este payload simula um evento de compra da Hotmart com o novo offerId hjb8gqn7
  const mockPayload = {
    event: "purchase.approved",
    data: {
      buyer: {
        email: "teste@exemplo.com",
        name: "Cliente Teste",
        phone: "5511987654321"
      },
      purchase: {
        transaction: "htrsn-2345678",
        offer: {
          off: "hjb8gqn7" // ID da oferta adicionado (standard)
        },
        status: "approved"
      }
    }
  };

  console.log("🚀 Simulando um webhook da Hotmart para testar o fluxo completo...");
  console.log("📤 Enviando payload:", JSON.stringify(mockPayload, null, 2));

  try {
    const response = await fetch('http://localhost:5000/api/webhook/hotmart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockPayload)
    });

    const result = await response.json();
    console.log("✅ Resposta do webhook:", result);
    console.log("\nVerifique:");
    console.log("1. Os logs do servidor para confirmar que o token foi gerado");
    console.log("2. Verifique a caixa de entrada do e-mail teste@exemplo.com (se configurado)");
    console.log("3. Ou verifique o banco de dados para confirmar que o token foi armazenado");
    
  } catch (error) {
    console.error("❌ Erro ao simular webhook:", error);
  }
}

// Função para testar o envio de e-mail diretamente
async function testDirectEmailSend() {
  const testEmail = {
    to: "teste@exemplo.com",
    subject: "Teste de criação de senha",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Teste de E-mail</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); margin: auto;">
            <h2 style="color: #2a2a2a;">🧪 Teste de E-mail</h2>
            <p style="font-size: 16px; color: #444;">
              Este é um e-mail de teste para verificar se o sistema de envio está funcionando.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://fottufy.com" 
                style="background-color: #1d72f3; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
                Botão de Teste
              </a>
            </div>
            <p style="font-size: 14px; color: #888; margin-top: 30px;">
              Este é apenas um teste do sistema de e-mail.
            </p>
          </div>
        </body>
      </html>
    `
  };

  console.log("📧 Testando envio direto de e-mail...");

  try {
    const response = await fetch('http://localhost:5000/api/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmail)
    });

    const result = await response.json();
    console.log("✅ Resposta do teste de e-mail:", result);
    
  } catch (error) {
    console.error("❌ Erro ao testar e-mail:", error);
  }
}

// Executar os testes
async function runTests() {
  console.log("==================================================");
  console.log("📝 TESTE DO FLUXO DE CRIAÇÃO DE SENHA");
  console.log("==================================================");
  
  // Primeiro testar o envio direto de e-mail
  await testDirectEmailSend();
  
  console.log("\n--------------------------------------------------\n");
  
  // Depois simular o webhook completo da Hotmart
  await simulateHotmartPurchase();
}

runTests();