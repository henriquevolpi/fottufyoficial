import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

interface PlanConfig {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  photoLimit: number;
}

const plans: PlanConfig[] = [
  {
    name: "Básico",
    description: "Até 6.000 fotos por mês - Ideal para quem está começando",
    monthlyPrice: 1990, // em centavos
    yearlyPrice: 15500, // em centavos (R$155,00/ano)
    photoLimit: 6000
  },
  {
    name: "Fotógrafo",
    description: "Até 17.000 fotos por mês - Perfeito para fotógrafos ativos",
    monthlyPrice: 2990,
    yearlyPrice: 23500, // R$235,00/ano
    photoLimit: 17000
  },
  {
    name: "Estúdio",
    description: "Até 40.000 fotos por mês - Para estúdios e grandes equipes",
    monthlyPrice: 4990,
    yearlyPrice: 36900, // R$369,00/ano
    photoLimit: 40000
  }
];

async function listExistingProducts() {
  console.log("\n=== Produtos existentes na Stripe ===\n");
  
  const products = await stripe.products.list({ limit: 100, active: true });
  
  for (const product of products.data) {
    console.log(`Produto: ${product.name} (${product.id})`);
    console.log(`  Descrição: ${product.description || 'N/A'}`);
    console.log(`  Metadata:`, product.metadata);
    
    const prices = await stripe.prices.list({ product: product.id, active: true });
    for (const price of prices.data) {
      const interval = price.recurring?.interval || 'one-time';
      const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
      console.log(`  Preço: R$${amount} (${interval}) - ID: ${price.id}`);
    }
    console.log('');
  }
  
  return products.data;
}

async function createProducts() {
  console.log("\n=== Criando produtos e preços na Stripe ===\n");
  
  const createdPlans: any[] = [];
  
  for (const plan of plans) {
    console.log(`\nCriando produto: ${plan.name}...`);
    
    const existingProducts = await stripe.products.list({
      limit: 100,
      active: true
    });
    
    let product = existingProducts.data.find(p => 
      p.name === `Fottufy ${plan.name}` || 
      p.metadata?.planName === plan.name.toLowerCase()
    );
    
    if (!product) {
      product = await stripe.products.create({
        name: `Fottufy ${plan.name}`,
        description: plan.description,
        metadata: {
          planName: plan.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          photoLimit: plan.photoLimit.toString(),
          source: 'fottufy'
        }
      });
      console.log(`  Produto criado: ${product.id}`);
    } else {
      console.log(`  Produto já existe: ${product.id}`);
    }
    
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true
    });
    
    let monthlyPrice = existingPrices.data.find(p => 
      p.recurring?.interval === 'month' && 
      p.unit_amount === plan.monthlyPrice
    );
    
    if (!monthlyPrice) {
      monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthlyPrice,
        currency: 'brl',
        recurring: { interval: 'month' },
        metadata: {
          planName: plan.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          billingCycle: 'monthly',
          photoLimit: plan.photoLimit.toString()
        }
      });
      console.log(`  Preço mensal criado: ${monthlyPrice.id} (R$${(plan.monthlyPrice / 100).toFixed(2)}/mês)`);
    } else {
      console.log(`  Preço mensal já existe: ${monthlyPrice.id}`);
    }
    
    let yearlyPrice = existingPrices.data.find(p => 
      p.recurring?.interval === 'year' && 
      p.unit_amount === plan.yearlyPrice
    );
    
    if (!yearlyPrice) {
      yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.yearlyPrice,
        currency: 'brl',
        recurring: { interval: 'year' },
        metadata: {
          planName: plan.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          billingCycle: 'yearly',
          photoLimit: plan.photoLimit.toString()
        }
      });
      console.log(`  Preço anual criado: ${yearlyPrice.id} (R$${(plan.yearlyPrice / 100).toFixed(2)}/ano)`);
    } else {
      console.log(`  Preço anual já existe: ${yearlyPrice.id}`);
    }
    
    createdPlans.push({
      name: plan.name,
      productId: product.id,
      monthlyPriceId: monthlyPrice.id,
      yearlyPriceId: yearlyPrice.id,
      photoLimit: plan.photoLimit
    });
  }
  
  return createdPlans;
}

async function main() {
  try {
    console.log("Conectando à Stripe...\n");
    
    const account = await stripe.accounts.retrieve();
    console.log(`Conta Stripe: ${account.email || account.id}`);
    console.log(`Modo: ${account.charges_enabled ? 'Produção' : 'Teste/Sandbox'}\n`);
    
    console.log("Listando produtos existentes...");
    await listExistingProducts();
    
    console.log("\n\nCriando/verificando produtos do Fottufy...");
    const createdPlans = await createProducts();
    
    console.log("\n\n=== RESUMO DOS PLANOS CRIADOS ===\n");
    console.log("Cole estes IDs no shared/schema.ts:\n");
    
    for (const plan of createdPlans) {
      console.log(`// ${plan.name} (${plan.photoLimit.toLocaleString()} fotos)`);
      console.log(`// Mensal: ${plan.monthlyPriceId}`);
      console.log(`// Anual: ${plan.yearlyPriceId}`);
      console.log('');
    }
    
    console.log("\n=== Configuração para SUBSCRIPTION_PLANS ===\n");
    console.log(`
export const STRIPE_PRICE_IDS = {
  BASICO_MONTHLY: "${createdPlans[0]?.monthlyPriceId || 'CRIAR'}",
  BASICO_YEARLY: "${createdPlans[0]?.yearlyPriceId || 'CRIAR'}",
  FOTOGRAFO_MONTHLY: "${createdPlans[1]?.monthlyPriceId || 'CRIAR'}",
  FOTOGRAFO_YEARLY: "${createdPlans[1]?.yearlyPriceId || 'CRIAR'}",
  ESTUDIO_MONTHLY: "${createdPlans[2]?.monthlyPriceId || 'CRIAR'}",
  ESTUDIO_YEARLY: "${createdPlans[2]?.yearlyPriceId || 'CRIAR'}",
};
`);
    
    console.log("\nScript concluído com sucesso!");
    
  } catch (error) {
    console.error("Erro:", error);
    process.exit(1);
  }
}

main();
