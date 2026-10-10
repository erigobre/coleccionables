-- Recuperar contraseña sin sesión (pedido 2026-10-10). No se guarda la
-- contraseña anterior ni la nueva en ningún lado: el ancla de seguridad es el
-- correo (quien lo controla puede repetir el flujo) más un log de auditoría
-- (IP + dispositivo + fecha) en password_change_logs. passwordChangedAt
-- invalida de golpe todos los tokens firmados antes de esa hora.

-- AlterTable: users
ALTER TABLE `users`
    ADD COLUMN `passwordResetToken` VARCHAR(191) NULL,
    ADD COLUMN `passwordResetTokenExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `passwordChangedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_passwordResetToken_key` ON `users`(`passwordResetToken`);

-- CreateTable: password_change_logs
CREATE TABLE `password_change_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `method` ENUM('SELF_CHANGE', 'FORGOT_PASSWORD_RESET') NOT NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `password_change_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `password_change_logs` ADD CONSTRAINT `password_change_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
