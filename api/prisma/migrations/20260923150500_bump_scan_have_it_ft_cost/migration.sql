-- "¿Ya lo tengo?" con foto ahora hace el mismo análisis con búsqueda web que
-- CREATE_WITH_AI (ftCost=4) MÁS una segunda llamada a Gemini para comparar
-- visualmente la foto contra hasta 3 avatares candidatos (sin búsqueda, pero
-- con hasta 4 imágenes). Se ajusta el costo en FrikiTokens de 1 a 5 para
-- reflejar ambas llamadas. PROPUESTO: pendiente de confirmación del owner
-- antes de aplicarse (ver resumen de la conversación).
UPDATE `ft_service_configs` SET `ftCost` = 5 WHERE `key` = 'SCAN_HAVE_IT';
