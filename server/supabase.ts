import { createClient } from '@supabase/supabase-js';

// Verificar se as variáveis de ambiente necessárias estão definidas
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL não está definido nas variáveis de ambiente');
}

if (!process.env.SUPABASE_KEY) {
  throw new Error('SUPABASE_KEY não está definido nas variáveis de ambiente');
}

// Criar cliente Supabase com as variáveis de ambiente
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Configurações para upload de arquivos
export const BUCKET_NAME = 'photos';
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Função para gerar nome de arquivo único
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 12);
  const extension = originalName.split('.').pop() || 'jpg';
  
  return `${timestamp}-${randomString}.${extension}`;
}

// Função para validar o tipo de arquivo
export function isValidFileType(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimetype);
}

// Função para validar o tamanho do arquivo
export function isValidFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

// Função para criar bucket se não existir
export async function ensureBucketExists(): Promise<void> {
  try {
    // Verificar se o bucket existe
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`Criando bucket '${BUCKET_NAME}'...`);
      
      // Criar o bucket com acesso público
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
      });
      
      if (error) {
        console.error(`Erro ao criar bucket: ${error.message}`);
        throw error;
      }
      
      console.log(`Bucket '${BUCKET_NAME}' criado com sucesso!`);
    } else {
      console.log(`Bucket '${BUCKET_NAME}' já existe.`);
    }
  } catch (error) {
    console.error('Erro ao verificar/criar bucket:', error);
    throw error;
  }
}