-- ==============================================================================
-- NoteCore — Script 02: Criação das Tabelas e Relacionamentos (DDL)
-- Idempotente (executável múltiplas vezes com IF NOT EXISTS)
-- ==============================================================================

USE notecore;

-- 1. Tabela de Usuários (Autenticação e Multi-tenant)
CREATE TABLE IF NOT EXISTS users (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_user_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela Polimórfica de Notas (SINGLE_TABLE: TEXT, MARKDOWN, CHECKLIST, CODE)
CREATE TABLE IF NOT EXISTS notes (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    note_type         VARCHAR(31)  NOT NULL,
    title             VARCHAR(120) NOT NULL,
    category          VARCHAR(50)  NULL,
    author            VARCHAR(100) NULL,
    favorite          BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted           BOOLEAN      NOT NULL DEFAULT FALSE,
    completed         BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at        DATETIME(6)  NULL,
    urgency           VARCHAR(10)  NULL DEFAULT 'media',
    user_id           BIGINT       NULL,
    text_content      LONGTEXT     NULL,
    markdown_content  LONGTEXT     NULL,
    created_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_notes_user_deleted (user_id, deleted),
    INDEX idx_notes_title (title),
    INDEX idx_notes_category (category),
    INDEX idx_notes_author (author),
    INDEX idx_notes_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Associação de Tags (ElementCollection de Strings)
CREATE TABLE IF NOT EXISTS note_tags (
    note_id  BIGINT      NOT NULL,
    tag      VARCHAR(50) NOT NULL,
    PRIMARY KEY (note_id, tag),
    INDEX idx_note_tags_tag (tag),
    CONSTRAINT fk_note_tags_note FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Itens de Checklist (ElementCollection para ChecklistNote)
CREATE TABLE IF NOT EXISTS checklist_items (
    note_id    BIGINT       NOT NULL,
    item_text  VARCHAR(255) NULL,
    item_done  BOOLEAN      NOT NULL DEFAULT FALSE,
    INDEX idx_checklist_note (note_id),
    CONSTRAINT fk_checklist_items_note FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Tarefas (Sincronização com o painel de tarefas)
CREATE TABLE IF NOT EXISTS tasks (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    title            VARCHAR(200) NOT NULL,
    related_note_id  BIGINT       NULL,
    date             VARCHAR(20)  NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'pendente',
    user_id          BIGINT       NULL,
    created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_tasks_user (user_id),
    INDEX idx_tasks_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

