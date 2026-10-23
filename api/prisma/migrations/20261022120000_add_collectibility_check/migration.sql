-- Nuevo servicio de FT "¿Es Coleccionable?" (Home): identificación + rating
-- 0-5 estrellas + precio de lanzamiento + precio actual de mercado, en un
-- solo llamado a Gemini con búsqueda web. Costo editable desde Superadmin
-- igual que el resto del catálogo (FtServiceConfig es genérico).
ALTER TABLE `ft_service_configs` MODIFY `key` ENUM('CREATE_WITH_AI', 'SCAN_HAVE_IT', 'BARCODE_LOOKUP', 'MARKET_PRICE_FRESH', 'MARKET_PRICE_CACHED', 'COLLECTIBILITY_CHECK') NOT NULL;
ALTER TABLE `ft_transactions` MODIFY `service` ENUM('CREATE_WITH_AI', 'SCAN_HAVE_IT', 'BARCODE_LOOKUP', 'MARKET_PRICE_FRESH', 'MARKET_PRICE_CACHED', 'COLLECTIBILITY_CHECK') NULL;

INSERT INTO `ft_service_configs` (`key`, `label`, `ftCost`, `active`, `updatedAt`) VALUES ('COLLECTIBILITY_CHECK', '¿Es Coleccionable?', 5, true, NOW());
