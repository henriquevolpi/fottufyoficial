# Scripts de Backup e Restauração PostgreSQL (Neon → Render)

Scripts Node.js para fazer backup completo do banco PostgreSQL Neon e restaurar no Render ou qualquer outro PostgreSQL.

## Arquivos Criados

- `backup-script.js` - Script para fazer backup completo
- `restore-script.js` - Script para restaurar dados
- `/backup/` - Pasta com todos os arquivos de backup

## Como Usar

### 1. Fazer Backup do Banco Neon

```bash
node backup-script.js
```

**O que o script faz:**
- Conecta automaticamente no seu banco Neon
- Lista todas as tabelas existentes
- Exporta cada tabela em dois formatos:
  - `.json` - Estrutura + dados (mais seguro)
  - `.sql` - Comandos INSERT diretos (mais rápido)
- Cria resumo detalhado do backup

### 2. Restaurar no Render (ou outro PostgreSQL)

```bash
# Usando arquivos SQL (recomendado - mais rápido)
DATABASE_URL="sua_string_conexao_render" node restore-script.js --sql

# Usando arquivos JSON (alternativo - mais seguro)
DATABASE_URL="sua_string_conexao_render" node restore-script.js --json
```

## Backup Realizado

**Data:** 15/06/2025 - 20:45 UTC  
**Total de registros:** 56.930

### Tabelas exportadas:
- `users`: 199 registros
- `projects`: 140 registros  
- `new_projects`: 1 registro
- `photo_comments`: 22 registros
- `photos`: 0 registros (vazia)
- `password_reset_tokens`: 27 registros
- `session`: 56.541 registros

## Para usar no Render

1. **Copie os arquivos de backup** para seu projeto no Render
2. **Configure DATABASE_URL** no Render apontando para seu PostgreSQL
3. **Execute a restauração:**
   ```bash
   node restore-script.js --sql
   ```

## Estrutura dos Arquivos

### Arquivos JSON
- Contêm metadados completos da tabela
- Estrutura de colunas e constraints
- Dados em formato estruturado
- Mais seguro para debugging

### Arquivos SQL
- Comandos INSERT diretos
- Otimizado para restauração rápida
- Desabilita triggers durante inserção
- Processa em lotes de 100 registros

## Vantagens dos Scripts

1. **Automático** - Detecta todas as tabelas sem configuração manual
2. **Duplo formato** - JSON + SQL para máxima compatibilidade
3. **Tratamento de erros** - Continua mesmo se uma tabela falhar
4. **Relatórios detalhados** - Logs completos de sucesso/falha
5. **Otimizado** - Inserções em lote para performance
6. **Seguro** - Fecha conexões corretamente

## Notas Importantes

- Os scripts usam a string de conexão hardcoded do seu Neon
- Para usar em outro ambiente, altere a variável `DATABASE_URL`
- A tabela `session` tem muitos registros (56k) - pode demorar
- Todos os dados foram preservados com integridade

## Resolução de Problemas

**Erro de autenticação:** Verifique a string de conexão  
**Erro de permissão:** Usuário precisa de CREATE/INSERT no banco destino  
**Timeout:** Tabelas grandes podem demorar, aguarde a conclusão  
**Constraint errors:** Execute primeiro os scripts que criam as tabelas