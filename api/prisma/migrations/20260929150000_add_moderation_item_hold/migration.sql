-- Rediseño de Moderación (pedido 2026-09-29): un objeto cuya foto detecta una
-- persona real queda retenido (oculto de "Objetos") en vez de guardarse
-- normal, hasta que un superadmin lo revise desde el panel. `photoUrls` deja
-- ver la foto sin depender del objeto; `itemId` liga el objeto retenido;
-- `userAppeal` guarda la aclaración que el usuario puede pedir desde la app.

-- AlterTable
ALTER TABLE `items`
    MODIFY COLUMN `status` ENUM('ACTIVE', 'PENDING_TRANSFER', 'SOLD', 'DONATED', 'LOST', 'PENDING_MODERATION') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `moderation_flags`
    MODIFY COLUMN `action` ENUM('AUTO_SUSPENDED', 'FLAGGED_FOR_REVIEW', 'ITEM_HELD') NOT NULL,
    ADD COLUMN `photoUrls` JSON NULL,
    ADD COLUMN `itemId` VARCHAR(191) NULL,
    ADD COLUMN `userAppeal` TEXT NULL,
    ADD COLUMN `userAppealAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `moderation_flags_itemId_key` ON `moderation_flags`(`itemId`);

-- AddForeignKey
ALTER TABLE `moderation_flags` ADD CONSTRAINT `moderation_flags_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
