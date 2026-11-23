-- ==============================================================================
-- NoteCore — Script 01: Criação da Base de Dados e Usuário MySQL
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS notecore
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Criação do usuário exclusivo para a aplicação NoteCore
CREATE USER IF NOT EXISTS 'notecore'@'%' IDENTIFIED BY 'notecore123';
CREATE USER IF NOT EXISTS 'notecore'@'localhost' IDENTIFIED BY 'notecore123';

-- Concessão de privilégios sobre a base notecore
GRANT ALL PRIVILEGES ON notecore.* TO 'notecore'@'%';
GRANT ALL PRIVILEGES ON notecore.* TO 'notecore'@'localhost';

FLUSH PRIVILEGES;

