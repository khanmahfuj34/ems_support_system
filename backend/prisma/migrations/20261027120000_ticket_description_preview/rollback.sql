-- Restore the previous application version first, then apply this SQL.
ALTER TABLE `tickets` DROP COLUMN `description_preview`;
