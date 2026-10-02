-- Grupo familiar (colecciones compartidas): cuando el OWNER expulsa a un
-- miembro y éste elige "transferir" sus objetos en vez de sacarlos
-- (CollectionMembersService.removeMember, modo TRANSFER), se reusa el
-- sistema de Transfer ya existente. Estos dos campos distinguen esa
-- transferencia de una normal e identifican la colección de origen, para
-- poder desvincular el objeto si el expulsado rechaza la transferencia o la
-- deja expirar (TransfersService.reject / expireOverdueTransfers).
ALTER TABLE `transfers`
    ADD COLUMN `initiatedByUserId` VARCHAR(191) NULL,
    ADD COLUMN `initiatedFromCollectionId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_initiatedByUserId_fkey` FOREIGN KEY (`initiatedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_initiatedFromCollectionId_fkey` FOREIGN KEY (`initiatedFromCollectionId`) REFERENCES `collections`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
