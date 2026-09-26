-- DropForeignKey
ALTER TABLE `locations` DROP FOREIGN KEY `locations_parentId_fkey`;

-- AddForeignKey
ALTER TABLE `locations` ADD CONSTRAINT `locations_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
