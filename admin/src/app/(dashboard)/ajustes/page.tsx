import { backendFetch } from '@/lib/backend';
import { FtConfigRow } from './ft-config-row';

interface AdminFtConfigEntry {
  key: string;
  label: string;
  value: number;
}

// Regalos de FT configurables sin deploy: bono de registro, regalo mensual
// recurrente (el cron ya existe, esto solo expone su monto), y el programa
// de invitaciones completo (bonos + tope + interruptor general) — pedido
// 2026-09-28.
export default async function AjustesPage() {
  const entries = await backendFetch<AdminFtConfigEntry[]>('/admin/ft-config');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Regalos de FrikiTokens: bono de bienvenida, regalo mensual recurrente y el programa de invitaciones
          (bonos, tope mensual e interruptor general).
        </p>
      </div>

      <div className="rounded-lg border border-border px-4">
        {entries.map((entry) => (
          <FtConfigRow key={entry.key} configKey={entry.key} label={entry.label} value={entry.value} />
        ))}
      </div>
    </div>
  );
}
