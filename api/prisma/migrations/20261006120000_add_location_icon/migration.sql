-- Icono fijo por ubicación (elegido de una lista cerrada en la app).
-- Nullable: las ubicaciones existentes quedan sin icono y se muestran con el genérico.

-- AlterTable
ALTER TABLE `locations` ADD COLUMN `icon` VARCHAR(191) NULL;
