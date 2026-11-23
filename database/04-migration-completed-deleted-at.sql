-- Migração manual para bancos MySQL JÁ EXISTENTES (o docker-entrypoint só roda 01-03 em bancos novos).
-- Com spring.jpa.hibernate.ddl-auto=update o Hibernate também cria estas colunas sozinho.
-- completed : nota inteira marcada como concluída
-- deleted_at: momento em que a nota foi para a lixeira (base da exclusão automática após 30 dias)
ALTER TABLE notes
    ADD COLUMN completed  BOOLEAN     NOT NULL DEFAULT FALSE AFTER deleted,
    ADD COLUMN deleted_at DATETIME(6) NULL AFTER completed;
