-- Renombra las organizaciones existentes de "Colección de {nombre}" a
-- "Monedero de {@usuario}" para que coincida con el nuevo texto que genera
-- auth.service.ts al registrar. Solo aplica a nombres con el patrón viejo
-- (evita tocar organizaciones ya renombradas a mano desde el superadmin).
-- COALESCE cubre las pocas cuentas viejas sin @usuario asignado.
UPDATE `organizations` o
JOIN `users` u ON u.`organizationId` = o.`id` AND u.`role` = 'OWNER'
SET o.`name` = CONCAT('Monedero de ', COALESCE(u.`username`, u.`name`))
WHERE o.`name` LIKE 'Colección de %';
