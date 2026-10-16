-- Reporte de costos reales de IA por usuario/servicio (Oct 2026): además del
-- costo ya convertido a USD (`realCostUsd`), se persiste el desglose crudo de
-- tokens de la llamada a Gemini que generó el cargo, para poder re-derivar el
-- costo con tarifas distintas en el futuro sin depender solo del total.

ALTER TABLE `ft_transactions`
  ADD COLUMN `promptTokens` INTEGER NULL,
  ADD COLUMN `candidatesTokens` INTEGER NULL,
  ADD COLUMN `totalTokens` INTEGER NULL;
