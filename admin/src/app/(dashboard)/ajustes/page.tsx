import { backendFetch } from '@/lib/backend';
import { FtConfigRow } from './ft-config-row';
import { FtServiceConfigRow } from './ft-service-config-row';

interface AdminFtConfigEntry {
  key: string;
  label: string;
  value: number;
}

interface AdminFtServiceConfigEntry {
  key: string;
  label: string;
  ftCost: number;
  active: boolean;
}

// Regalos de FT configurables sin deploy: bono de registro, regalo mensual
// recurrente (el cron ya existe, esto solo expone su monto), y el programa
// de invitaciones completo (bonos + tope + interruptor general) — pedido
// 2026-09-28.
export default async function AjustesPage() {
  const [entries, serviceEntries] = await Promise.all([
    backendFetch<AdminFtConfigEntry[]>('/admin/ft-config'),
    backendFetch<AdminFtServiceConfigEntry[]>('/admin/ft-service-config'),
  ]);

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

      <div>
        <h2 className="text-lg font-semibold text-foreground">Costo por servicio de IA</h2>
        <p className="text-sm text-muted-foreground">
          FrikiTokens que se cobran por cada acción (análisis con IA, "¿ya lo tengo?", precio de mercado, código de
          barras). Desactivar un servicio lo bloquea aunque haya saldo.
        </p>
      </div>

      <div className="rounded-lg border border-border px-4">
        {serviceEntries.map((entry) => (
          <FtServiceConfigRow
            key={entry.key}
            configKey={entry.key}
            label={entry.label}
            ftCost={entry.ftCost}
            active={entry.active}
          />
        ))}
      </div>
    </div>
  );
}
