import { pool } from "../db";

async function addPhoneColumn() {
  try {
    console.log("Iniciando migração para adicionar coluna de telefone...");
    
    // Verificar se a coluna já existe para evitar erros
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone'
    `);
    
    if (checkResult.rows.length === 0) {
      // A coluna não existe, então vamos criá-la
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN phone TEXT;
      `);
      console.log("Coluna 'phone' adicionada com sucesso à tabela 'users'");
      
      // Atualizar registros existentes com valor padrão
      await pool.query(`
        UPDATE users 
        SET phone = '00000000000' 
        WHERE phone IS NULL
      `);
      console.log("Registros existentes atualizados com valor padrão para telefone");
      
      // Tornar a coluna NOT NULL depois de preencher os valores existentes
      await pool.query(`
        ALTER TABLE users 
        ALTER COLUMN phone SET NOT NULL
      `);
      console.log("Coluna 'phone' definida como NOT NULL");
    } else {
      console.log("A coluna 'phone' já existe na tabela 'users'");
    }
    
    console.log("Migração concluída com sucesso!");
  } catch (error) {
    console.error("Erro durante a migração:", error);
    throw error;
  }
}

// Executar a migração
addPhoneColumn()
  .then(() => {
    console.log("Processo de migração finalizado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Falha na migração:", error);
    process.exit(1);
  });