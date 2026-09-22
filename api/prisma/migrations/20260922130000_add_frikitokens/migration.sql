-- AlterTable
ALTER TABLE `organizations` ADD COLUMN `ftFreeGrantAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `items` ADD COLUMN `lastMarketPriceResult` JSON NULL,
    ADD COLUMN `lastMarketPriceAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `ft_service_configs` (
    `key` ENUM('CREATE_WITH_AI', 'SCAN_HAVE_IT', 'BARCODE_LOOKUP', 'MARKET_PRICE_FRESH', 'MARKET_PRICE_CACHED') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `ftCost` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ft_configs` (
    `key` VARCHAR(191) NOT NULL,
    `value` INTEGER NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ft_lots` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `source` ENUM('MONTHLY_FREE', 'PURCHASE', 'PROMO', 'REFUND') NOT NULL,
    `amount` INTEGER NOT NULL,
    `originalAmount` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ft_lots_organizationId_expiresAt_idx`(`organizationId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ft_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `type` ENUM('CHARGE', 'GRANT') NOT NULL,
    `service` ENUM('CREATE_WITH_AI', 'SCAN_HAVE_IT', 'BARCODE_LOOKUP', 'MARKET_PRICE_FRESH', 'MARKET_PRICE_CACHED') NULL,
    `status` ENUM('HELD', 'CONFIRMED', 'RELEASED') NOT NULL DEFAULT 'HELD',
    `ftAmount` INTEGER NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `realCostUsd` DECIMAL(10, 6) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ft_transactions_idempotencyKey_key`(`idempotencyKey`),
    INDEX `ft_transactions_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ft_lots` ADD CONSTRAINT `ft_lots_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ft_transactions` ADD CONSTRAINT `ft_transactions_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ft_transactions` ADD CONSTRAINT `ft_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: catálogo inicial de costos por servicio (plan FrikiTokens, valores
-- confirmados con el owner 2026-09-22; editables después desde Superadmin).
INSERT INTO `ft_service_configs` (`key`, `label`, `ftCost`, `active`, `updatedAt`) VALUES
    ('CREATE_WITH_AI', 'Analizar fotos para dar de alta', 2, true, CURRENT_TIMESTAMP(3)),
    ('SCAN_HAVE_IT', 'Escanear "¿Ya lo tengo?"', 1, true, CURRENT_TIMESTAMP(3)),
    ('BARCODE_LOOKUP', 'Buscar por código de barras', 1, true, CURRENT_TIMESTAMP(3)),
    ('MARKET_PRICE_FRESH', 'Precio de mercado (consulta nueva)', 5, true, CURRENT_TIMESTAMP(3)),
    ('MARKET_PRICE_CACHED', 'Precio de mercado (último dato guardado)', 2, true, CURRENT_TIMESTAMP(3));

-- Seed: perillas globales (plan FrikiTokens §10, confirmado con el owner).
INSERT INTO `ft_configs` (`key`, `value`) VALUES
    ('MONTHLY_FREE_FT', 20);
