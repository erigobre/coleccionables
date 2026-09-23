-- Avatar 1:1 del objeto para el re-ranking visual de "¿Ya lo tengo?" (recorte
-- por bounding box de Gemini, o cuadrado centrado determinista de respaldo).
-- Nullable: los objetos existentes quedan sin avatar y el backend usa
-- photos[0] como respaldo al compararlos.
ALTER TABLE `items` ADD COLUMN `avatarUrl` VARCHAR(191) NULL;
