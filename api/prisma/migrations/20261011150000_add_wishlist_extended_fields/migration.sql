-- Guarda la info extendida que la IA detecta al buscar un artículo para wishlist
-- (hoy se descartaba). No se muestra en la UI; solo alimenta el prellenado del
-- formulario de alta de objeto al "traspasar" un item de wishlist. Todo nullable:
-- los items existentes quedan sin estos datos.

-- AlterTable
ALTER TABLE `wishlist_items`
  ADD COLUMN `conservationState` ENUM('MINT', 'NEAR_MINT', 'BUEN_ESTADO', 'CON_DETALLES') NULL,
  ADD COLUMN `brand` VARCHAR(191) NULL,
  ADD COLUMN `toyLine` VARCHAR(191) NULL,
  ADD COLUMN `edition` VARCHAR(191) NULL,
  ADD COLUMN `scale` VARCHAR(191) NULL,
  ADD COLUMN `designer` VARCHAR(191) NULL,
  ADD COLUMN `releaseYear` INTEGER NULL,
  ADD COLUMN `originalSetNumber` VARCHAR(191) NULL,
  ADD COLUMN `uniqueIdentifier` VARCHAR(191) NULL,
  ADD COLUMN `comicCoverNumber` VARCHAR(191) NULL,
  ADD COLUMN `comicIssueNumber` VARCHAR(191) NULL,
  ADD COLUMN `comicWriter` VARCHAR(191) NULL,
  ADD COLUMN `comicPenciler` VARCHAR(191) NULL,
  ADD COLUMN `comicInker` VARCHAR(191) NULL,
  ADD COLUMN `comicColorist` VARCHAR(191) NULL,
  ADD COLUMN `comicPublisher` VARCHAR(191) NULL,
  ADD COLUMN `suggestedTags` JSON NULL,
  ADD COLUMN `avatarUrl` VARCHAR(191) NULL;
