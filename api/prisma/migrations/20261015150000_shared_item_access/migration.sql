-- Acceso compartido a objetos (plan "Acceso compartido a objetos + autorización
-- del dueño", Oct 2026): favoritos pasan de columna de `items` a una lista
-- personal por usuario, y se agrega la solicitud de autorización del dueño
-- para transferir/vender/eliminar un objeto compartido.

-- CreateTable: item_favorites
CREATE TABLE `item_favorites` (
    `userId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `itemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill: cada isFavorite=true existente se asigna al dueño real del objeto
-- (hoy el único que podía verlo/marcarlo, ya que el acceso compartido no existía).
INSERT INTO `item_favorites` (`userId`, `itemId`, `createdAt`)
SELECT `ownerId`, `id`, NOW(3) FROM `items` WHERE `isFavorite` = true;

-- DropColumn: items.isFavorite (reemplazada por item_favorites)
ALTER TABLE `items` DROP COLUMN `isFavorite`;

-- AddForeignKey
ALTER TABLE `item_favorites` ADD CONSTRAINT `item_favorites_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_favorites` ADD CONSTRAINT `item_favorites_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: item_action_requests
CREATE TABLE `item_action_requests` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `requestedByUserId` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `action` ENUM('TRANSFER', 'SELL', 'DELETE') NOT NULL,
    `toEmail` VARCHAR(191) NULL,
    `price` DECIMAL(10, 2) NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `item_action_requests_ownerId_status_idx`(`ownerId`, `status`),
    INDEX `item_action_requests_itemId_action_status_idx`(`itemId`, `action`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `item_action_requests` ADD CONSTRAINT `item_action_requests_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_action_requests` ADD CONSTRAINT `item_action_requests_requestedByUserId_fkey` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_action_requests` ADD CONSTRAINT `item_action_requests_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
