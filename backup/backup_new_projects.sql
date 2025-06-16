-- Backup da tabela: new_projects
-- Total de registros: 1
-- Data do backup: 2025-06-16T00:52:53.764Z

-- Desabilitar triggers
ALTER TABLE "new_projects" DISABLE TRIGGER ALL;

INSERT INTO "new_projects" ("id", "user_id", "title", "description", "created_at", "show_watermark") VALUES
('28b099a2-1c9f-4ac7-baec-aad330ffbfde', 1, 'Projeto de Teste', 'Descrição do projeto', '2025-04-23T23:48:16.849Z', true);

-- Reabilitar triggers
ALTER TABLE "new_projects" ENABLE TRIGGER ALL;

