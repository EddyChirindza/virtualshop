-- Corrige elegibilidade de notificações globais: por defeito apenas utilizadores
-- que já existiam no momento da publicação devem recebê-las. Mantém suporte
-- explícito para futuras notificações destinadas também a novos utilizadores.
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS include_new_users BOOLEAN NOT NULL DEFAULT false;

-- Dados históricos: preservar o comportamento anterior para broadcasts já
-- publicados (evita esconder notificações antigas de utilizadores recentes).
UPDATE notifications
SET include_new_users = true
WHERE recipient_scope = 'all_customers'
  AND status = 'published'
  AND include_new_users = false;

CREATE INDEX IF NOT EXISTS idx_notifications_published_new_users
    ON notifications (published_at DESC, id DESC)
    WHERE status = 'published' AND recipient_scope = 'all_customers' AND include_new_users = true;
