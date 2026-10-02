-- Plan "Ajustes de cuenta + Wallet de FrikiTokens (suscripción familiar)"
-- (confirmado 2026-10-02). Dos partes:
-- 1) Seguridad de cuenta: foto, cooldown de @usuario, verificación de correo,
--    borrado con gracia de 15 días (PENDING_DELETION).
-- 2) Rediseño de FT a "3 monederos" por persona: gratis y comprado son
--    personales y siguen a la persona (ftFreeGrantAt se mueve de
--    Organization a User; ft_lots gana `userId`, null = compartido por la
--    Organization); suscripción es el único monedero compartido
--    (FtLotSource.SUBSCRIPTION, ft_plans.maxInvitedMembers, organizations
--    .activeFtPlanId/ftSubscriptionGrantAt). organization_invites cubre
--    invitar a una cuenta que YA existe a la Organization (requiere
--    aceptación, igual que `transfers`).

-- AlterTable: users
ALTER TABLE `users`
    MODIFY COLUMN `status` ENUM('ACTIVE', 'SUSPENDED', 'PENDING_DELETION') NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `avatarUrl` VARCHAR(191) NULL,
    ADD COLUMN `usernameChangedAt` DATETIME(3) NULL,
    ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `emailVerificationToken` VARCHAR(191) NULL,
    ADD COLUMN `emailVerificationTokenExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `deletionRequestedAt` DATETIME(3) NULL,
    ADD COLUMN `ftFreeGrantAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_emailVerificationToken_key` ON `users`(`emailVerificationToken`);

-- AlterTable: organizations (el regalo gratis ahora es por persona, ver users.ftFreeGrantAt arriba)
ALTER TABLE `organizations`
    DROP COLUMN `ftFreeGrantAt`,
    ADD COLUMN `activeFtPlanId` VARCHAR(191) NULL,
    ADD COLUMN `ftSubscriptionGrantAt` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_activeFtPlanId_fkey` FOREIGN KEY (`activeFtPlanId`) REFERENCES `ft_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: ft_lots (regla central del modelo de 3 monederos: userId null = compartido por la Organization, asignado = personal y sigue a la persona)
ALTER TABLE `ft_lots`
    MODIFY COLUMN `source` ENUM('MONTHLY_FREE', 'PURCHASE', 'PROMO', 'REFUND', 'REFERRAL', 'SUBSCRIPTION') NOT NULL,
    ADD COLUMN `userId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `ft_lots_userId_expiresAt_idx` ON `ft_lots`(`userId`, `expiresAt`);

-- AddForeignKey
ALTER TABLE `ft_lots` ADD CONSTRAINT `ft_lots_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: ft_plans
ALTER TABLE `ft_plans`
    ADD COLUMN `maxInvitedMembers` INTEGER NOT NULL DEFAULT 0;

-- CreateTable: organization_invites
CREATE TABLE `organization_invites` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `invitedByUserId` VARCHAR(191) NOT NULL,
    `targetUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,

    INDEX `organization_invites_targetUserId_status_idx`(`targetUserId`, `status`),
    INDEX `organization_invites_organizationId_status_idx`(`organizationId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organization_invites` ADD CONSTRAINT `organization_invites_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_invites` ADD CONSTRAINT `organization_invites_invitedByUserId_fkey` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_invites` ADD CONSTRAINT `organization_invites_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: tope de familiares por plan (plan barato -> 2, plan caro -> 5;
-- confirmado con el owner 2026-10-02). `novato` es el plan gratuito, no
-- pensado para compartirse, se deja en 0 (default).
UPDATE `ft_plans` SET `maxInvitedMembers` = 2 WHERE `code` = 'coleccionista';
UPDATE `ft_plans` SET `maxInvitedMembers` = 5 WHERE `code` = 'vitrina-pro';
