-- Backup da tabela: photo_comments
-- Total de registros: 22
-- Data do backup: 2025-06-15T20:45:53.417Z

-- Desabilitar triggers
ALTER TABLE "photo_comments" DISABLE TRIGGER ALL;

INSERT INTO "photo_comments" ("id", "photo_id", "client_name", "comment", "is_viewed", "created_at") VALUES
('211ccb32-04cb-4b83-9835-a4a9b94ab464', 'j-kpQQpqG4RKHuUn5bMML', 'Maria Santos', 'Foto maravilhosa! A iluminação ficou perfeita.', false, '2025-06-08T02:19:14.156Z'),
('3da99cf2-dbe0-4ae7-9c81-bab0162a5974', 'j-kpQQpqG4RKHuUn5bMML', 'Carlos Oliveira', 'Excelente trabalho! Essa foto capturou perfeitamente o momento.', false, '2025-06-08T02:19:25.425Z'),
('f68d2b92-40e8-46a9-902f-3a538f403ad4', 'j-kpQQpqG4RKHuUn5bMML', 't', 'test', false, '2025-06-08T02:32:17.704Z'),
('73163c5b-a9e7-4d3d-9c6d-eac37706b181', 'j-kpQQpqG4RKHuUn5bMML', 'Cliente', 'Esta foto ficou incrível! Adorei a composição e as cores.', false, '2025-06-08T02:38:08.930Z'),
('d31ea687-a6c3-452b-b8ed-dfdab8e7b88c', 'j-kpQQpqG4RKHuUn5bMML', 'Cliente', '1', false, '2025-06-08T02:39:20.897Z'),
('6d3be4da-b107-467f-92e2-71de040a36bc', 'L_lq5uT6wgdb2VATjWoVI', 'Cliente', 'test', false, '2025-06-08T02:40:13.116Z'),
('c3b5f7d4-1255-46d6-ad82-ae51a088f3d1', 'KQrto50ZL28bzrLxf6HNB', 'Cliente', 'teste', true, '2025-06-08T02:42:12.838Z'),
('a0c4f5ba-cda2-4c7e-a0b1-47c7122b8681', 'iexa-wnd1IchfO2LPtYIM', 'Cliente', 'chapelada', false, '2025-06-08T02:48:43.337Z'),
('c4b63e85-2aa1-4539-a8c9-4a83a9b289ab', '2AeO7dDpihugjhnea-qYu', 'Cliente', '123', false, '2025-06-08T02:59:28.612Z'),
('ea91fb82-e9df-46e9-bb8b-e439f685f7ec', '8jttSl0purlIb5duzjiPE', 'Cliente', 'tutu', false, '2025-06-08T03:18:23.974Z'),
('dde8ee8b-8d69-483e-aee7-2f6a0a7d3973', '8jttSl0purlIb5duzjiPE', 'Cliente', 'test', false, '2025-06-08T03:41:06.404Z'),
('b087ef1e-3a60-4d72-a79f-c3fe9531dea9', 'UdLdj_xDy45fYNvEPMMNg', 'Cliente', 'teste1', false, '2025-06-08T03:52:21.036Z'),
('277ab97d-b4d2-4f58-97cb-0f0de997164c', '85K22Ltr23pZeM7NZg6NV', 'Cliente', '1234455', false, '2025-06-08T03:55:43.909Z'),
('9400e2f5-782c-4f50-b0e7-32d054ff8dd3', '85K22Ltr23pZeM7NZg6NV', 'Cliente', 'TESTEEE', false, '2025-06-08T03:57:10.762Z'),
('4b4155db-1f3d-4af3-9e06-22cde442a738', 'iGoyuPH59KAhBOvz54S6O', 'Cliente', 'Chupeta', false, '2025-06-08T04:23:45.454Z'),
('368916ba-2ff5-447c-a86c-4bf673ea7b7c', 'iGoyuPH59KAhBOvz54S6O', 'Cliente', 'test', false, '2025-06-08T05:10:19.665Z'),
('c2998d32-8c9f-4755-a84d-a389ef9ed9df', 'kfQF7FoYjvo--JeNbQZhJ', 'Cliente', 'fundo mais escuro', false, '2025-06-09T23:18:38.143Z'),
('68e6f059-c62c-43df-9d12-180a3d451f15', 'sewRgtyxWAYfKWqUFZSSi', 'Cliente', 'teste', false, '2025-06-10T06:09:42.314Z'),
('fce2b456-7669-4d91-a7ba-b5e96b6d56c8', 'YRaYfc0cGKgwAANF5Ip24', 'Cliente', 'chapelada', false, '2025-06-11T23:23:19.730Z'),
('864d60c3-1889-4524-8b5d-f0b580f36673', 'bZ4bh2KesFhfeH7tOErwp', 'Cliente', 'teste', false, '2025-06-12T15:33:49.790Z'),
('fb283aac-ddf2-4baa-8d86-58f55062cee7', 'Mt4SFihbx0YM2zUt_8dep', 'Cliente', '1234', false, '2025-06-12T15:34:34.394Z'),
('b9a3b9ba-8261-4905-828a-c2a1b84a5495', 'kXgOmcSJ5tB607DwdN4pJ', 'Cliente', 'TESTENEON', false, '2025-06-14T04:22:57.177Z');

-- Reabilitar triggers
ALTER TABLE "photo_comments" ENABLE TRIGGER ALL;

