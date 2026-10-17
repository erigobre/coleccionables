-- El costo real (realCostUsd) no incluía el cargo de "Grounding with Google
-- Search" que Google factura aparte de los tokens (Oct 2026: se detectó que
-- el gasto real en Gemini superaba por mucho al reportado internamente). Se
-- agregan columnas para poder auditar ese costo contra la factura real:
-- cuántas búsquedas de grounding facturó esta llamada y qué build de Gemini
-- la atendió (el alias `gemini-flash-latest` puede cambiar de generación).

ALTER TABLE `ft_transactions`
  ADD COLUMN `groundingRequests` INTEGER NULL,
  ADD COLUMN `modelVersion` VARCHAR(191) NULL;
