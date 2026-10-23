-- AlterTable
ALTER TABLE `users` ADD COLUMN `onboardingCompletedAt` DATETIME(3) NULL,
    ADD COLUMN `themePreference` ENUM('MORADO', 'NEGRO', 'ROSA') NOT NULL DEFAULT 'MORADO';

-- CreateTable
CREATE TABLE `onboarding_options` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('COLLECTING', 'LOCATION') NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `onboarding_options_kind_code_key`(`kind`, `code`),
    INDEX `onboarding_options_kind_isActive_sortOrder_idx`(`kind`, `isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed: 20 opciones COLLECTING
INSERT INTO `onboarding_options` (`id`, `kind`, `code`, `label`, `icon`, `isActive`, `sortOrder`, `updatedAt`) VALUES
    ('onb_toys', 'COLLECTING', 'toys', 'Juguetes', 'cube-outline', true, 0, CURRENT_TIMESTAMP(3)),
    ('onb_art_toys', 'COLLECTING', 'art_toys', 'Art Toys', 'color-palette-outline', true, 1, CURRENT_TIMESTAMP(3)),
    ('onb_action_figures', 'COLLECTING', 'action_figures', 'Figuras de acción/Funko', 'rocket-outline', true, 2, CURRENT_TIMESTAMP(3)),
    ('onb_comics', 'COLLECTING', 'comics', 'Comics', 'flash-outline', true, 3, CURRENT_TIMESTAMP(3)),
    ('onb_books', 'COLLECTING', 'books', 'Libros', 'book-outline', true, 4, CURRENT_TIMESTAMP(3)),
    ('onb_trading_cards', 'COLLECTING', 'trading_cards', 'Tarjetas coleccionables', 'card-outline', true, 5, CURRENT_TIMESTAMP(3)),
    ('onb_coins', 'COLLECTING', 'coins', 'Monedas', 'diamond-outline', true, 6, CURRENT_TIMESTAMP(3)),
    ('onb_stamps', 'COLLECTING', 'stamps', 'Estampillas postales', 'ticket-outline', true, 7, CURRENT_TIMESTAMP(3)),
    ('onb_model_cars', 'COLLECTING', 'model_cars', 'Autos a escala', 'car-sport-outline', true, 8, CURRENT_TIMESTAMP(3)),
    ('onb_video_games', 'COLLECTING', 'video_games', 'Videojuegos', 'game-controller-outline', true, 9, CURRENT_TIMESTAMP(3)),
    ('onb_vinyl', 'COLLECTING', 'vinyl', 'Vinilos/Discos', 'disc-outline', true, 10, CURRENT_TIMESTAMP(3)),
    ('onb_sneakers', 'COLLECTING', 'sneakers', 'Sneakers', 'shirt-outline', true, 11, CURRENT_TIMESTAMP(3)),
    ('onb_watches', 'COLLECTING', 'watches', 'Relojes', 'watch-outline', true, 12, CURRENT_TIMESTAMP(3)),
    ('onb_sports_memorabilia', 'COLLECTING', 'sports_memorabilia', 'Memorabilia deportiva', 'football-outline', true, 13, CURRENT_TIMESTAMP(3)),
    ('onb_dolls_plush', 'COLLECTING', 'dolls_plush', 'Muñecas/Peluches', 'paw-outline', true, 14, CURRENT_TIMESTAMP(3)),
    ('onb_plants', 'COLLECTING', 'plants', 'Plantas', 'leaf-outline', true, 15, CURRENT_TIMESTAMP(3)),
    ('onb_sculptures', 'COLLECTING', 'sculptures', 'Esculturas/Estatuas', 'trophy-outline', true, 16, CURRENT_TIMESTAMP(3)),
    ('onb_lego', 'COLLECTING', 'lego', 'LEGO/Sets de construcción', 'cube-outline', true, 17, CURRENT_TIMESTAMP(3)),
    ('onb_antiques', 'COLLECTING', 'antiques', 'Antigüedades', 'albums-outline', true, 18, CURRENT_TIMESTAMP(3)),
    ('onb_other', 'COLLECTING', 'other', 'Otro', 'gift-outline', true, 19, CURRENT_TIMESTAMP(3));

-- Seed: 10 opciones LOCATION
INSERT INTO `onboarding_options` (`id`, `kind`, `code`, `label`, `icon`, `isActive`, `sortOrder`, `updatedAt`) VALUES
    ('onb_home', 'LOCATION', 'home', 'Casa', 'home', true, 0, CURRENT_TIMESTAMP(3)),
    ('onb_warehouse', 'LOCATION', 'warehouse', 'Bodega', 'archive', true, 1, CURRENT_TIMESTAMP(3)),
    ('onb_office', 'LOCATION', 'office', 'Oficina', 'briefcase', true, 2, CURRENT_TIMESTAMP(3)),
    ('onb_store', 'LOCATION', 'store', 'Tienda/Negocio', 'storefront', true, 3, CURRENT_TIMESTAMP(3)),
    ('onb_hobby_room', 'LOCATION', 'hobby_room', 'Cuarto dedicado', 'bed', true, 4, CURRENT_TIMESTAMP(3)),
    ('onb_library', 'LOCATION', 'library', 'Biblioteca/Estudio', 'library', true, 5, CURRENT_TIMESTAMP(3)),
    ('onb_display_case', 'LOCATION', 'display_case', 'Vitrina', 'cube', true, 6, CURRENT_TIMESTAMP(3)),
    ('onb_garage', 'LOCATION', 'garage', 'Garage', 'car', true, 7, CURRENT_TIMESTAMP(3)),
    ('onb_vehicle', 'LOCATION', 'vehicle', 'Vehículo', 'bus', true, 8, CURRENT_TIMESTAMP(3)),
    ('onb_safe', 'LOCATION', 'safe', 'Caja de seguridad', 'lock-closed', true, 9, CURRENT_TIMESTAMP(3));
