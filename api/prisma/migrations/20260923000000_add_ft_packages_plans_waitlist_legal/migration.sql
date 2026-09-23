-- AlterTable
ALTER TABLE `users` ADD COLUMN `privacyVersionAccepted` VARCHAR(191) NULL,
    ADD COLUMN `termsVersionAccepted` VARCHAR(191) NULL,
    ADD COLUMN `legalAcceptedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `ft_packages` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `ftAmount` INTEGER NOT NULL,
    `priceMxnCents` INTEGER NOT NULL,
    `badge` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `availableFrom` DATETIME(3) NULL,
    `availableUntil` DATETIME(3) NULL,
    `stripePriceId` VARCHAR(191) NULL,
    `storeProductIdIos` VARCHAR(191) NULL,
    `storeProductIdAndroid` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ft_packages_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ft_plans` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `ftAmountMonthly` INTEGER NOT NULL,
    `monthlyPriceMxnCents` INTEGER NOT NULL,
    `annualPriceMxnCents` INTEGER NULL,
    `annualEnabled` BOOLEAN NOT NULL DEFAULT false,
    `badge` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `stripePriceIdMonthly` VARCHAR(191) NULL,
    `stripePriceIdAnnual` VARCHAR(191) NULL,
    `storeProductIdIos` VARCHAR(191) NULL,
    `storeProductIdAndroid` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ft_plans_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `waitlist` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `interest` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'landing',
    `ip` VARCHAR(191) NULL,
    `consent` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `waitlist_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed: paquetes y planes de FrikiTokens, con los mismos valores que ya
-- estaban hardcodeados en la landing (frikidex-landing.html) antes de
-- conectarla a la base de datos real. Editable después desde Superadmin
-- (Fase 9) sin volver a migrar.
INSERT INTO `ft_packages` (`id`, `code`, `ftAmount`, `priceMxnCents`, `badge`, `isActive`, `sortOrder`, `updatedAt`) VALUES
    ('ftpkg_100', 'pack-100', 100, 6900, NULL, true, 0, CURRENT_TIMESTAMP(3)),
    ('ftpkg_300', 'pack-300', 300, 17900, 'Más vendido', true, 1, CURRENT_TIMESTAMP(3)),
    ('ftpkg_1000', 'pack-1000', 1000, 49900, 'Mejor precio', true, 2, CURRENT_TIMESTAMP(3));

INSERT INTO `ft_plans` (`id`, `code`, `label`, `ftAmountMonthly`, `monthlyPriceMxnCents`, `annualPriceMxnCents`, `annualEnabled`, `badge`, `isActive`, `sortOrder`, `updatedAt`) VALUES
    ('ftplan_novato', 'novato', 'Novato', 20, 0, 0, false, NULL, true, 0, CURRENT_TIMESTAMP(3)),
    ('ftplan_coleccionista', 'coleccionista', 'Coleccionista', 250, 9900, 99000, false, NULL, true, 1, CURRENT_TIMESTAMP(3)),
    ('ftplan_vitrina_pro', 'vitrina-pro', 'Vitrina Pro', 600, 19900, 199000, false, 'Mejor valor', true, 2, CURRENT_TIMESTAMP(3));
