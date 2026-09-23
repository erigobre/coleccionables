-- El análisis de fotos con IA ahora usa búsqueda web (googleSearch) además de
-- procesar imágenes, y extrae muchos más campos que antes: el consumo real de
-- tokens sube bastante frente al esquema forzado anterior. Se ajusta el costo
-- en FrikiTokens de 2 a 4 para reflejarlo (referencia: MARKET_PRICE_CACHED=2
-- también usa búsqueda pero sin imágenes ni tantos campos; MARKET_PRICE_FRESH=5
-- es la búsqueda más cara que ya existía).
UPDATE `ft_service_configs` SET `ftCost` = 4 WHERE `key` = 'CREATE_WITH_AI';
