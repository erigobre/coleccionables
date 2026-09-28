-- AlterTable
ALTER TABLE `collections` ADD COLUMN `isSystem` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `items` ADD COLUMN `saleStatus` ENUM('FOR_SALE', 'RESERVED', 'SOLD') NULL,
    ADD COLUMN `salePrice` DECIMAL(10, 2) NULL;
