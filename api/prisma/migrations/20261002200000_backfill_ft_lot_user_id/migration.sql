-- Backfill de `ft_lots.userId` para filas creadas ANTES del rediseño de
-- monederos (migración 20261002150000): esa migración agregó la columna sin
-- backfillear, y el código nuevo (ft.service.ts) solo trata como "compartido
-- por la Organization" a los lotes de source PROMO/SUBSCRIPTION — los
-- MONTHLY_FREE/PURCHASE/REFERRAL/REFUND viejos con userId NULL se habían
-- vuelto invisibles para todo el mundo (bug reportado 2026-10-02).
--
-- Solo se infiere el dueño cuando la Organization tiene exactamente 1 usuario
-- hoy (sin ambigüedad posible): es el caso de el 100% de las Organizations
-- reales, ya que la función de compartir familia es nueva y recién se
-- desplegó. Si alguna Organization ya tuviera más de 1 usuario, esos lotes
-- se dejan como estaban (compartidos) en vez de asignarlos a ciegas.
UPDATE ft_lots fl
JOIN (
  SELECT organizationId, MIN(id) AS soleUserId
  FROM users
  GROUP BY organizationId
  HAVING COUNT(*) = 1
) sole ON sole.organizationId = fl.organizationId
SET fl.userId = sole.soleUserId
WHERE fl.userId IS NULL
  AND fl.source IN ('MONTHLY_FREE', 'PURCHASE', 'REFERRAL', 'REFUND');
