-- Unifica el costo de los servicios de IA restantes a 5 FT, completando la
-- unificación empezada en 20260923120000 (CREATE_WITH_AI) y 20260923150500
-- (SCAN_HAVE_IT). MARKET_PRICE_CACHED se deja intacto a propósito: es el
-- caso de "reobtener un precio ya obtenido antes", que debe seguir costando
-- menos que una consulta nueva.
UPDATE `ft_service_configs` SET `ftCost` = 5 WHERE `key` = 'CREATE_WITH_AI';
UPDATE `ft_service_configs` SET `ftCost` = 5 WHERE `key` = 'BARCODE_LOOKUP';
