-- AlterTable: antifraude del programa de invitaciones.
-- registrationIp: se captura desde este momento en adelante (NULL en cuentas
-- ya existentes, no hay forma de reconstruirla retroactivamente).
-- referralSuspended: bandera permanente que, una vez encendida, trata al
-- usuario como si ya hubiera llegado al tope de por vida (deja de cobrar
-- bono de inviter y se oculta "Invitar amigos" en la app).
-- referralBonusPaid: el bono de invitado ya no se paga al instante de
-- canjear el código (se exige actividad mínima primero, ver
-- ReferralBonusCronService) — se marca en `true` de una vez para las filas
-- ya referidas hoy, porque esas ya cobraron su bono bajo la lógica anterior
-- (inmediata) y no deben volver a pasar por el cron.
ALTER TABLE `users` ADD COLUMN `registrationIp` VARCHAR(191) NULL,
    ADD COLUMN `referralSuspended` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `referralBonusPaid` BOOLEAN NOT NULL DEFAULT false;

UPDATE `users` SET `referralBonusPaid` = true WHERE `referredById` IS NOT NULL;
