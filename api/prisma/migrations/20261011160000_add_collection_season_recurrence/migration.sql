-- AlterTable
-- `seasons` pasa de un rango fijo (siempre con año) a soportar recurrencia
-- semanal/mensual/anual sin año (se calcula en vivo). startDate/endDate ahora
-- solo aplican a ONE_TIME, por eso se vuelven NULL. reminderSentAt (un solo
-- disparo fijo a 3 días del fin) se reemplaza por reminderDaysBefore
-- (configurable 1-10, aplica a inicio Y fin) + el tracking por asignación en
-- collection_season_assignments.
ALTER TABLE `seasons`
    ADD COLUMN `recurrence` ENUM('ONE_TIME', 'WEEKLY', 'MONTHLY', 'YEARLY') NOT NULL DEFAULT 'ONE_TIME',
    ADD COLUMN `startWeekday` INTEGER NULL,
    ADD COLUMN `endWeekday` INTEGER NULL,
    ADD COLUMN `startDayOfMonth` INTEGER NULL,
    ADD COLUMN `endDayOfMonth` INTEGER NULL,
    ADD COLUMN `startMonth` INTEGER NULL,
    ADD COLUMN `startDay` INTEGER NULL,
    ADD COLUMN `endMonth` INTEGER NULL,
    ADD COLUMN `endDay` INTEGER NULL,
    ADD COLUMN `reminderDaysBefore` INTEGER NULL,
    MODIFY COLUMN `startDate` DATETIME(3) NULL,
    MODIFY COLUMN `endDate` DATETIME(3) NULL;

-- Backfill: todas las temporadas que ya existían en producción (creadas bajo
-- el modelo viejo, siempre con fecha de inicio/fin fijas) se vuelven YEARLY
-- con el día/mes que ya habían elegido (sin año), y quedan con recordatorio
-- activado a 5 días antes — para que su comportamiento actual (aviso antes de
-- que termine) no se pierda ni choque con el nuevo sistema configurable.
UPDATE `seasons`
SET
    `recurrence` = 'YEARLY',
    `startMonth` = MONTH(`startDate`),
    `startDay` = DAY(`startDate`),
    `endMonth` = MONTH(`endDate`),
    `endDay` = DAY(`endDate`),
    `reminderDaysBefore` = 5;

-- AlterTable
ALTER TABLE `seasons` DROP COLUMN `reminderSentAt`;

-- CreateTable
-- Asignación de una temporada/evento a una colección: solo guarda la
-- intención (destino + progreso de la ocurrencia actual), nunca mueve
-- objetos por sí sola. Una colección puede tener varias asignaciones a la
-- vez (una por temporada), y una misma temporada puede asignarse a varias
-- colecciones — por eso el único índice único es el par (collectionId, seasonId).
CREATE TABLE `collection_season_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `seasonId` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `destinationLocationId` VARCHAR(191) NOT NULL,
    `lastMovedOccurrenceStart` DATETIME(3) NULL,
    `lastReturnedOccurrenceStart` DATETIME(3) NULL,
    `startReminderSentFor` DATETIME(3) NULL,
    `endReminderSentFor` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `collection_season_assignments_collectionId_seasonId_key`(`collectionId`, `seasonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `collection_season_assignments` ADD CONSTRAINT `collection_season_assignments_seasonId_fkey` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_season_assignments` ADD CONSTRAINT `collection_season_assignments_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `collections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_season_assignments` ADD CONSTRAINT `collection_season_assignments_destinationLocationId_fkey` FOREIGN KEY (`destinationLocationId`) REFERENCES `locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
