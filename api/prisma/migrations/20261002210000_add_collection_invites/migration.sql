-- Invitación persistida a una colección compartida (bug reportado 2026-10-02:
-- inviteMember solo mandaba un push sin guardar ninguna fila; si se perdía o
-- no se podía tocar esa notificación exacta, no existía ninguna otra forma de
-- aceptarla). Mismo diseño que organization_invites.

-- CreateTable: collection_invites
CREATE TABLE `collection_invites` (
    `id` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `invitedByUserId` VARCHAR(191) NOT NULL,
    `targetUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,

    INDEX `collection_invites_targetUserId_status_idx`(`targetUserId`, `status`),
    INDEX `collection_invites_collectionId_status_idx`(`collectionId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `collection_invites` ADD CONSTRAINT `collection_invites_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `collections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_invites` ADD CONSTRAINT `collection_invites_invitedByUserId_fkey` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_invites` ADD CONSTRAINT `collection_invites_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
