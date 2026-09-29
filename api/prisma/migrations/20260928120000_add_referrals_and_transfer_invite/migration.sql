-- AlterTable: nuevos campos del programa de invitaciones en User.
-- referralCode es nullable (mismo criterio que username): se genera
-- perezosamente la primera vez que se pide, no hace falta backfill.
ALTER TABLE `users` ADD COLUMN `referralCode` VARCHAR(191) NULL,
    ADD COLUMN `referralSource` ENUM('FRIEND_CODE', 'TRANSFER_INVITE') NULL,
    ADD COLUMN `referredAt` DATETIME(3) NULL,
    ADD COLUMN `referredById` VARCHAR(191) NULL;

-- AlterTable: nueva fuente de lote de FT para los bonos del programa de invitaciones.
ALTER TABLE `ft_lots` MODIFY `source` ENUM('MONTHLY_FREE', 'PURCHASE', 'PROMO', 'REFUND', 'REFERRAL') NOT NULL;

-- AlterTable: toEmail se agrega NULL primero porque ya existen filas en
-- `transfers` (transferencias históricas) que no tienen ese dato — se
-- rellena desde `users.email` vía el toUserId ya existente en cada una
-- (todas las filas existentes ya tenían cuenta receptora) y luego se
-- endurece a NOT NULL. toUserId pasa a nullable para las invitaciones
-- nuevas a correos sin cuenta todavía.
ALTER TABLE `transfers` ADD COLUMN `toEmail` VARCHAR(191) NULL;

UPDATE `transfers` t
  INNER JOIN `users` u ON u.`id` = t.`toUserId`
  SET t.`toEmail` = u.`email`
  WHERE t.`toEmail` IS NULL;

ALTER TABLE `transfers` MODIFY `toEmail` VARCHAR(191) NOT NULL,
    MODIFY `toUserId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_referralCode_key` ON `users`(`referralCode`);

-- CreateIndex
CREATE INDEX `transfers_toEmail_toUserId_status_idx` ON `transfers`(`toEmail`, `toUserId`, `status`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_referredById_fkey` FOREIGN KEY (`referredById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
