import { pool } from "./db";
import { r2Client, BUCKET_NAME } from "./r2";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";

const PROTECTED_USER_ID = 5;
const INACTIVE_DAYS_THRESHOLD = 7;
const PROJECT_AGE_DAYS = 30;
const R2_BATCH_SIZE = 500;
const DELAY_BETWEEN_ACCOUNTS_MS = 2000;
const DELAY_BETWEEN_BATCHES_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractR2Key(photo: any): string | null {
  const url = photo.url || photo.filename || "";
  if (url.startsWith("/uploads/")) return url.replace("/uploads/", "");
  if (url.includes("cdn.fottufy.com/")) return url.split("cdn.fottufy.com/")[1];
  if (url.includes("r2.cloudflarestorage.com/")) {
    const parts = url.split("/");
    return parts[parts.length - 1];
  }
  if (photo.filename && !photo.filename.includes("/")) return photo.filename;
  return null;
}

async function deleteBatchFromR2(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  try {
    await r2Client.send(new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: { Objects: keys.map(k => ({ Key: k })), Quiet: true }
    }));
    return keys.length;
  } catch (err: any) {
    console.error(`[R2-CLEANUP] Erro no batch R2: ${err.message}`);
    return 0;
  }
}

async function runCleanup(): Promise<void> {
  const startTime = Date.now();
  console.log(`[R2-CLEANUP] === Iniciando varredura diaria ===`);
  console.log(`[R2-CLEANUP] Data: ${new Date().toISOString()}`);
  console.log(`[R2-CLEANUP] Regra: contas sem assinatura ativa ha ${INACTIVE_DAYS_THRESHOLD}+ dias, projetos com ${PROJECT_AGE_DAYS}+ dias`);
  console.log(`[R2-CLEANUP] Conta protegida: user_id=${PROTECTED_USER_ID}`);

  try {
    const { rows: accounts } = await pool.query(`
      SELECT u.id as user_id, u.email, u.subscription_status, u.subscription_end_date
      FROM users u
      WHERE u.subscription_status NOT IN ('active', 'pending_cancellation')
        AND u.id != $1
        AND (
          u.subscription_end_date IS NOT NULL 
          AND u.subscription_end_date < NOW() - INTERVAL '${INACTIVE_DAYS_THRESHOLD} days'
        )
        AND EXISTS (
          SELECT 1 FROM projects p
          WHERE p.photographer_id = u.id
            AND p.created_at < NOW() - INTERVAL '${PROJECT_AGE_DAYS} days'
            AND jsonb_array_length(COALESCE(p.photos, '[]'::jsonb)) > 0
        )
    `, [PROTECTED_USER_ID]);

    if (accounts.length === 0) {
      console.log(`[R2-CLEANUP] Nenhuma conta elegivel para limpeza`);
      console.log(`[R2-CLEANUP] === Varredura concluida em ${Date.now() - startTime}ms ===`);
      return;
    }

    console.log(`[R2-CLEANUP] ${accounts.length} contas encontradas para limpeza`);

    let totalPhotosDeleted = 0;
    let totalProjectsCleaned = 0;
    let accountsProcessed = 0;

    for (const account of accounts) {
      const freshCheck = await pool.query(
        `SELECT subscription_status, subscription_end_date FROM users WHERE id = $1`,
        [account.user_id]
      );
      if (freshCheck.rows.length > 0) {
        const status = freshCheck.rows[0].subscription_status;
        const endDate = freshCheck.rows[0].subscription_end_date;
        if (['active', 'pending_cancellation'].includes(status)) {
          console.log(`[R2-CLEANUP] Pulando user_id=${account.user_id} (${account.email}) - assinatura reativada`);
          continue;
        }
        if (endDate && new Date(endDate) > new Date(Date.now() - INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000)) {
          console.log(`[R2-CLEANUP] Pulando user_id=${account.user_id} (${account.email}) - inativo ha menos de ${INACTIVE_DAYS_THRESHOLD} dias`);
          continue;
        }
      }

      const { rows: projects } = await pool.query(`
        SELECT id, photos
        FROM projects
        WHERE photographer_id = $1
          AND created_at < NOW() - INTERVAL '${PROJECT_AGE_DAYS} days'
          AND jsonb_array_length(COALESCE(photos, '[]'::jsonb)) > 0
      `, [account.user_id]);

      if (projects.length === 0) continue;

      let accountKeys: string[] = [];
      let projectIds: number[] = [];

      for (const project of projects) {
        const photos = project.photos || [];
        projectIds.push(project.id);
        for (const photo of photos) {
          const key = extractR2Key(photo);
          if (key) accountKeys.push(key);
        }
      }

      if (accountKeys.length === 0) continue;

      console.log(`[R2-CLEANUP] Processando user_id=${account.user_id} (${account.email}): ${accountKeys.length} fotos em ${projects.length} projetos`);

      let accountDeleted = 0;
      for (let i = 0; i < accountKeys.length; i += R2_BATCH_SIZE) {
        const batch = accountKeys.slice(i, i + R2_BATCH_SIZE);
        const deleted = await deleteBatchFromR2(batch);
        accountDeleted += deleted;
        if (i + R2_BATCH_SIZE < accountKeys.length) {
          await sleep(DELAY_BETWEEN_BATCHES_MS);
        }
      }

      if (accountDeleted > 0) {
        await pool.query(
          `UPDATE projects SET photos = '[]'::jsonb, selected_photos = '[]'::jsonb WHERE id = ANY($1)`,
          [projectIds]
        );
      }

      totalPhotosDeleted += accountDeleted;
      totalProjectsCleaned += projectIds.length;
      accountsProcessed++;

      console.log(`[R2-CLEANUP] user_id=${account.user_id}: ${accountDeleted} fotos deletadas, ${projectIds.length} projetos limpos`);

      if (accountsProcessed < accounts.length) {
        await sleep(DELAY_BETWEEN_ACCOUNTS_MS);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[R2-CLEANUP] === Resultado Final ===`);
    console.log(`[R2-CLEANUP] Contas processadas: ${accountsProcessed}`);
    console.log(`[R2-CLEANUP] Fotos deletadas do R2: ${totalPhotosDeleted}`);
    console.log(`[R2-CLEANUP] Projetos limpos: ${totalProjectsCleaned}`);
    console.log(`[R2-CLEANUP] Duracao: ${duration}s`);
    console.log(`[R2-CLEANUP] =====================`);
  } catch (error: any) {
    console.error(`[R2-CLEANUP] Erro na varredura:`, error.message);
  }
}

export function startCleanupScheduler(): void {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const INITIAL_DELAY = 5 * 60 * 1000;

  console.log(`[R2-CLEANUP] Sistema de limpeza automatica iniciado`);
  console.log(`[R2-CLEANUP] Primeira execucao em ${INITIAL_DELAY / 60000} minutos`);
  console.log(`[R2-CLEANUP] Proximas execucoes a cada 24 horas`);

  setTimeout(() => {
    runCleanup();
    setInterval(runCleanup, TWENTY_FOUR_HOURS);
  }, INITIAL_DELAY);
}
