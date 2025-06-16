import fs from 'fs';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function restoreUserPlansData() {
  console.log('🔄 Iniciando restauração dos dados de planos dos usuários...');
  
  try {
    // Read the backup data
    const backupData = JSON.parse(fs.readFileSync('backup/backup_users.json', 'utf8'));
    const users = backupData.data;
    
    console.log(`📊 Encontrados ${users.length} usuários no backup`);
    
    let usersUpdated = 0;
    let planStats = {};
    let totalUploadsRestored = 0;
    
    for (const user of users) {
      // Map Neon column names to Render column names
      const planType = user.plan_type || 'free';
      const uploadLimit = user.upload_limit || 0;
      const usedUploads = user.used_uploads || 0;
      const subscriptionId = user.subscription_id;
      const stripeCustomerId = user.stripe_customer_id;
      const stripeSubscriptionId = user.stripe_subscription_id;
      const subscriptionStatus = user.subscription_status || 'inactive';
      const subscriptionStartDate = user.subscription_start_date;
      const subscriptionEndDate = user.subscription_end_date;
      
      // Count plan statistics
      planStats[planType] = (planStats[planType] || 0) + 1;
      totalUploadsRestored += usedUploads;
      
      // Map plan limits correctly
      let maxProjects = 5; // Default
      let maxPhotosPerProject = 50; // Default
      
      switch (planType) {
        case 'basic':
          maxPhotosPerProject = uploadLimit || 10000;
          break;
        case 'basic_v2':
          maxPhotosPerProject = uploadLimit || 6000;
          break;
        case 'standard':
        case 'standard_v2':
          maxPhotosPerProject = uploadLimit || 20000;
          break;
        case 'professional':
          maxPhotosPerProject = uploadLimit || 50000;
          break;
        case 'free':
          maxPhotosPerProject = uploadLimit || 50;
          break;
      }
      
      // Update user with correct plan data
      await pool.query(
        `UPDATE users 
         SET plan = $1,
             subscription_plan = $2,
             subscription_status = $3,
             used_uploads = $4,
             max_projects = $5,
             max_photos_per_project = $6,
             subscription_start_date = $7,
             subscription_end_date = $8,
             stripe_customer_id = $9,
             stripe_subscription_id = $10
         WHERE id = $11`,
        [
          planType,                    // plan
          planType,                    // subscription_plan  
          subscriptionStatus,          // subscription_status
          usedUploads,                // used_uploads
          maxProjects,                // max_projects
          maxPhotosPerProject,        // max_photos_per_project
          subscriptionStartDate,      // subscription_start_date
          subscriptionEndDate,        // subscription_end_date
          stripeCustomerId,           // stripe_customer_id
          stripeSubscriptionId,       // stripe_subscription_id
          user.id
        ]
      );
      
      usersUpdated++;
      
      if (usedUploads > 0 || planType !== 'free') {
        console.log(`✅ Usuário ID ${user.id} (${user.name}): Plano ${planType}, ${usedUploads} uploads usados, limite ${maxPhotosPerProject}`);
      }
    }
    
    console.log('\n📈 RESUMO DA RESTAURAÇÃO DE PLANOS:');
    console.log(`- Usuários atualizados: ${usersUpdated}`);
    console.log(`- Total de uploads restaurados: ${totalUploadsRestored}`);
    console.log('\n📊 ESTATÍSTICAS POR PLANO:');
    
    for (const [plan, count] of Object.entries(planStats)) {
      console.log(`- ${plan}: ${count} usuários`);
    }
    
    return {
      usersUpdated,
      totalUploadsRestored,
      planStats
    };
    
  } catch (error) {
    console.error('❌ Erro durante a restauração:', error);
    throw error;
  }
}

async function verifyUserPlans() {
  try {
    const result = await pool.query(`
      SELECT 
        plan,
        COUNT(*) as user_count,
        SUM(used_uploads) as total_uploads,
        AVG(max_photos_per_project) as avg_photo_limit,
        COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subscriptions
      FROM users 
      GROUP BY plan
      ORDER BY user_count DESC
    `);
    
    console.log('\n🔍 VERIFICAÇÃO FINAL DOS PLANOS:');
    
    for (const row of result.rows) {
      console.log(`- Plano ${row.plan}: ${row.user_count} usuários, ${row.total_uploads} uploads, limite médio ${Math.round(row.avg_photo_limit)}, ${row.active_subscriptions} ativos`);
    }
    
    // Check users with highest upload usage
    const topUsers = await pool.query(`
      SELECT name, plan, used_uploads, max_photos_per_project, subscription_status
      FROM users 
      WHERE used_uploads > 0
      ORDER BY used_uploads DESC
      LIMIT 10
    `);
    
    console.log('\n👥 TOP 10 USUÁRIOS POR UPLOADS:');
    for (const user of topUsers.rows) {
      console.log(`- ${user.name}: ${user.used_uploads} uploads (${user.plan}), limite ${user.max_photos_per_project}, status ${user.subscription_status}`);
    }
    
    return result.rows;
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    throw error;
  }
}

async function main() {
  try {
    await restoreUserPlansData();
    await verifyUserPlans();
    console.log('\n✅ Restauração de planos concluída com sucesso!');
  } catch (error) {
    console.error('❌ Falha na restauração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();