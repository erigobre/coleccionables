-- Backfill ESTIMADO (no es un dato medido) del costo de grounding que falta
-- en las filas de ft_transactions creadas ANTES del fix de hoy (2026-10-17,
-- ver 20261017120000_add_ft_transaction_grounding). Esas filas tienen
-- groundingRequests/modelVersion NULL porque esas columnas no existían
-- cuando se guardaron, así que no hay forma de recuperar el conteo real de
-- búsquedas de cada llamada vieja.
--
-- Se usa como referencia la única muestra real disponible hoy (el panel de
-- Costos de IA, build gemini-3.8-flash): 12 llamadas de "Analizar fotos",
-- 2 búsquedas de grounding en total => 1/6 búsquedas por llamada en
-- promedio. Se aplica esa misma tasa, con la fórmula de Gemini 3+
-- ($14 USD por 1000 búsquedas), a TODAS las llamadas viejas de los 3
-- servicios que siempre intentan grounding (CREATE_WITH_AI, BARCODE_LOOKUP,
-- MARKET_PRICE_FRESH — ver gemini.service.ts, todas pasan tools:
-- [{googleSearch:{}}]). SCAN_HAVE_IT y MARKET_PRICE_CACHED no se tocan: no
-- usan grounding.
--
-- Costo estimado por llamada = (1/6) * (14 / 1000) = 0.002333 USD.
-- Deliberadamente NO se escribe nada en groundingRequests/modelVersion de
-- estas filas: siguen en NULL para que queden identificables como
-- "estimado, no medido" y se puedan distinguir de datos reales futuros.

UPDATE `ft_transactions`
SET `realCostUsd` = `realCostUsd` + 0.002333
WHERE `type` = 'CHARGE'
  AND `status` = 'CONFIRMED'
  AND `service` IN ('CREATE_WITH_AI', 'BARCODE_LOOKUP', 'MARKET_PRICE_FRESH')
  AND `groundingRequests` IS NULL;
