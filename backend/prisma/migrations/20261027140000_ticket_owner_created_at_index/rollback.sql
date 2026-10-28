-- Restore the previous application/schema version first, then apply this SQL.
DROP INDEX `tickets_user_id_created_at_idx` ON `tickets`;
