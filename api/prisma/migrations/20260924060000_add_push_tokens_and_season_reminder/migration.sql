-- AlterTable
ALTER TABLE `seasons` ADD COLUMN `reminderSentAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `push_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `push_tokens_token_key`(`token`),
    INDEX `push_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `push_tokens` ADD CONSTRAINT `push_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
