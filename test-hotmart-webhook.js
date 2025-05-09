// Script para testar o webhook da Hotmart
// Execute com o comando: node test-hotmart-webhook.js
import fetch from 'node-fetch';

const URL = process.env.TEST_URL || 'http://localhost:5000';

// Função para gerar um email aleatório para testes
function generateRandomEmail() {
  const timestamp = Date.now();
  return `teste${timestamp}@exemplo.com`;
}

// Simular um evento de compra da Hotmart com o offerId hjb8gqn7 (plano standard)
async function simulateHotmartPurchase() {
  const testEmail = generateRandomEmail();
  
  const payload = {
    event: "purchase.approved",
    data: {
      buyer: {
        email: testEmail,
        name: "Cliente Teste",
        phone: "5511987654321"
      },
      purchase: {
        transaction: "htrsn-" + Date.now(),
        offer: {
          off: "hjb8gqn7" // ID da oferta "standard"
        },
        status: "approved"
      }
    }
  };

  console.log("🚀 Simulando webhook da Hotmart para plano 'standard'...");
  console.log(`📧 Email de teste: ${testEmail}`);
  
  try {
    const response = await fetch(`${URL}/api/webhook/hotmart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log("✅ Resposta do webhook:", result);
    
    if (result.message === "Hotmart webhook processado com sucesso") {
      console.log(`
📝 Resumo do teste:
1. Webhook enviado com sucesso
2. Usuário criado com email: ${testEmail}
3. Senha temporária gerada e enviada por email
4. Plano 'standard' ativado para o usuário

⚠️ Importante:
- Verifique a caixa de entrada do email ${testEmail} (se configurado)
- Ou verifique os logs do servidor para confirmar que o email foi enviado
      `);
    } else {
      console.log("❌ O webhook não foi processado corretamente");
    }
  } catch (error) {
    console.error("❌ Erro ao simular webhook:", error);
  }
}

// Executar o teste
simulateHotmartPurchase().catch(console.error);