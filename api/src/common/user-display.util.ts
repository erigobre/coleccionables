// Para notificaciones push y texto de "X te invitó/sacó/transfirió": se
// prefiere el @usuario (identidad pública, estable) sobre el nombre real.
// Cae al nombre solo para las cuentas legacy que todavía no tienen @usuario
// asignado (decisión del usuario 2026-10-17).
export function displayHandle(user: { name: string; username?: string | null }): string {
  return user.username ? `@${user.username}` : user.name;
}
