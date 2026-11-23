-- ==============================================================================
-- NoteCore — Script 03: Dados Iniciais de Demonstração (DML)
-- Senha de Ana Moura: notecore123 (hash BCrypt)
-- ==============================================================================

USE notecore;

-- Inserção de usuário padrão caso não exista
INSERT INTO users (id, name, email, password_hash)
VALUES (1, 'Ana Moura', 'ana.moura@notecore.com', '$2a$10$wE9K25x7mK6rL4y65h7iK.b7uB5m.n89vI8Wq1s8K9l4j8f3.9qTu')
ON DUPLICATE KEY UPDATE id=id;

-- Inserção de notas demonstrativas para Ana Moura
INSERT INTO notes (id, note_type, title, category, author, favorite, deleted, urgency, user_id, text_content, markdown_content, created_at, updated_at)
VALUES 
(1, 'TEXT', 'Bem-vindo ao NoteCore!', 'Tecnologia', 'Equipe NoteCore', TRUE, FALSE, 'alta', 1, 
 'O NoteCore agora está totalmente integrado com Spring Boot 3, persistência em banco de dados e autenticação segura via JWT. Todas as suas anotações e tarefas são sincronizadas e salvas no servidor.', NULL, NOW(6), NOW(6)),
(2, 'MARKDOWN', 'Guia de Markdown e Recursos', 'Estratégia', 'Ana Moura', TRUE, FALSE, 'media', 1, 
 NULL, '# Recursos NoteCore\n\n- **Tipos Polimórficos**: Texto, Markdown e Checklist.\n- **Filtros e Pesquisas**: Busca textual por substring, categoria e tags.\n- **Segurança**: Criptografia BCrypt e tokens JWT com validade configurável.', NOW(6), NOW(6)),
(3, 'CHECKLIST', 'Sprint de Entrega NoteCore', 'Operações', 'Equipe Dev', FALSE, FALSE, 'baixa', 1, 
 NULL, NULL, NOW(6), NOW(6)),
(4, 'CODE', 'Script de Inicialização Docker', 'Tecnologia', 'DevOps Team', FALSE, FALSE, 'media', 1,
 '#!/bin/bash\n# Inicia os contêineres do NoteCore\necho ''Iniciando NoteCore...''\ndocker-compose up -d --build\necho ''Serviços ativos na porta 8080!''', NULL, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE id=id;

-- Inserção de tags para as notas
INSERT INTO note_tags (note_id, tag) VALUES
(1, 'bem-vindo'), (1, 'notecore'), (1, 'início'),
(2, 'markdown'), (2, 'guia'), (2, 'documentação'),
(3, 'sprint'), (3, 'checklist'), (3, 'prod'),
(4, 'docker'), (4, 'devops'), (4, 'bash')
ON DUPLICATE KEY UPDATE note_id=note_id;

-- Inserção de itens de checklist para a nota 3
INSERT INTO checklist_items (note_id, item_text, item_done) VALUES
(3, 'Unificação dos repositórios front, back e db', TRUE),
(3, 'Implementação de segurança e isolamento multi-tenant', TRUE),
(3, 'Testes unitários e de integração 100% aprovados', TRUE),
(3, 'Documentação completa no README.md', TRUE);

-- Inserção de tarefas associadas
INSERT INTO tasks (id, title, related_note_id, date, status, user_id, created_at, updated_at)
VALUES
(1, 'Validar endpoints REST da API', 3, CURRENT_DATE(), 'concluida', 1, NOW(6), NOW(6)),
(2, 'Realizar testes de interface e responsividade', 3, CURRENT_DATE(), 'concluida', 1, NOW(6), NOW(6)),
(3, 'Revisar documentação e empacotamento final', 3, CURRENT_DATE(), 'andamento', 1, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE id=id;

