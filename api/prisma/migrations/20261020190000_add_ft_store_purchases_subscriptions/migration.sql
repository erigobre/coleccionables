-- Fase 10 (compras reales de FrikiTokens vía StoreKit / Google Play Billing):
-- tablas de auditoría de compras únicas y de estado de suscripción, separadas
-- de ft_lots/ft_transactions (que no se tocan — FtService.grant() sigue siendo
-- el único mecanismo que acredita FT).

-- CreateTable: ft_store_purchases
CREATE TABLE `ft_store_purchases` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `platform` ENUM('IOS', 'ANDROID') NOT NULL,
    `storeTransactionId` VARCHAR(191) NOT NULL,
    `purchaseToken` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NOT NULL,
    `ftPackageId` VARCHAR(191) NULL,
    `ftTransactionId` VARCHAR(191) NOT NULL,
    `status` ENUM('VERIFIED', 'REFUNDED') NOT NULL DEFAULT 'VERIFIED',
    `rawPayload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ft_store_purchases_ftTransactionId_key`(`ftTransactionId`),
    UNIQUE INDEX `ft_store_purchases_platform_storeTransactionId_key`(`platform`, `storeTransactionId`),
    INDEX `ft_store_purchases_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: ft_store_subscriptions
CREATE TABLE `ft_store_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `platform` ENUM('IOS', 'ANDROID') NOT NULL,
    `ftPlanId` VARCHAR(191) NOT NULL,
    `originalTransactionId` VARCHAR(191) NULL,
    `purchaseToken` VARCHAR(191) NULL,
    `storeSubscriptionId` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'GRACE_PERIOD', 'PAST_DUE', 'CANCELED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `currentPeriodEndsAt` DATETIME(3) NULL,
    `lastNotificationType` VARCHAR(191) NULL,
    `lastNotificationAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ft_store_subscriptions_organizationId_key`(`organizationId`),
    INDEX `ft_store_subscriptions_platform_originalTransactionId_idx`(`platform`, `originalTransactionId`),
    INDEX `ft_store_subscriptions_platform_purchaseToken_idx`(`platform`, `purchaseToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ft_store_purchases` ADD CONSTRAINT `ft_store_purchases_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ft_store_purchases` ADD CONSTRAINT `ft_store_purchases_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ft_store_purchases` ADD CONSTRAINT `ft_store_purchases_ftPackageId_fkey` FOREIGN KEY (`ftPackageId`) REFERENCES `ft_packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ft_store_purchases` ADD CONSTRAINT `ft_store_purchases_ftTransactionId_fkey` FOREIGN KEY (`ftTransactionId`) REFERENCES `ft_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ft_store_subscriptions` ADD CONSTRAINT `ft_store_subscriptions_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ft_store_subscriptions` ADD CONSTRAINT `ft_store_subscriptions_ftPlanId_fkey` FOREIGN KEY (`ftPlanId`) REFERENCES `ft_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
