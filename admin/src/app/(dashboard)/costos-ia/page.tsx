import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { backendFetch } from '@/lib/backend';

interface FtCostReportRow {
  userId: string | null;
  user: { id: string; name: string; username: string | null; email: string } | null;
  service: string | null;
  serviceLabel: string;
  calls: number;
  ftAmount: number;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  realCostUsd: number;
  realCostMxn: number;
  avgRealCostUsdPerCall: number;
  ftPerUsd: number | null;
}

interface FtCostReport {
  rows: FtCostReportRow[];
  totals: { calls: number; ftAmount: number; totalTokens: number; realCostUsd: number; realCostMxn: number };
  usdToMxnRate: number;
}

function usd(value: number) {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

function mxn(value: number) {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}

function num(value: number) {
  return value.toLocaleString('es-MX');
}

function userLabel(user: FtCostReportRow['user']) {
  if (!user) return '— (sin usuario)';
  return user.username ? `@${user.username}` : user.name;
}

function firstDayOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Reporte de costo real de IA por usuario/servicio (pedido 2026-10-16): cruza
// lo cobrado en FrikiTokens contra el costo real de Gemini (tokens y USD) —
// `admin.service.ts getFtCostReport()` — para ajustar las tarifas de
// ft_service_configs con datos reales en vez de estimaciones.
export default async function CostosIaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const effectiveFrom = from || firstDayOfMonth();
  const effectiveTo = to || today();

  // El backend filtra `createdAt < to`, así que se manda el día siguiente a
  // `effectiveTo` para que ese día quede incluido completo.
  const toExclusive = new Date(effectiveTo);
  toExclusive.setDate(toExclusive.getDate() + 1);

  const report = await backendFetch<FtCostReport>(
    `/admin/ft-cost-report?from=${effectiveFrom}&to=${toExclusive.toISOString().slice(0, 10)}`,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Costos de IA</h1>
          <p className="text-sm text-muted-foreground">
            Costo real de cada llamada a Gemini (tokens y USD) cruzado contra lo cobrado en FrikiTokens, por usuario y
            servicio — para ajustar tarifas con datos reales.
          </p>
        </div>
        <form className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" name="from" defaultValue={effectiveFrom} className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" name="to" defaultValue={effectiveTo} className="w-40" />
          </div>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Llamadas</p>
          <p className="text-2xl font-bold text-foreground">{num(report.totals.calls)}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">FT cobrados</p>
          <p className="text-2xl font-bold text-foreground">{num(report.totals.ftAmount)}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Tokens totales</p>
          <p className="text-2xl font-bold text-foreground">{num(report.totals.totalTokens)}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Costo real (Gemini)</p>
          <p className="text-2xl font-bold text-foreground">{usd(report.totals.realCostUsd)}</p>
          <p className="text-xs text-muted-foreground">{mxn(report.totals.realCostMxn)}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Tipo de cambio usado: ${report.usdToMxnRate.toLocaleString('es-MX', { maximumFractionDigits: 4 })} MXN por
        USD (Frankfurter.app, actualizado cada 12h)
      </p>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead className="text-right">Llamadas</TableHead>
              <TableHead className="text-right">FT cobrados</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="text-right">Costo real (USD)</TableHead>
              <TableHead className="text-right">Costo real (MXN)</TableHead>
              <TableHead className="text-right">Promedio/llamada</TableHead>
              <TableHead className="text-right">FT por $1 real</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => (
              <TableRow key={`${row.userId ?? 'none'}-${row.service ?? 'none'}`}>
                <TableCell className="text-foreground">{userLabel(row.user)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.serviceLabel}</Badge>
                </TableCell>
                <TableCell className="text-right text-foreground">{num(row.calls)}</TableCell>
                <TableCell className="text-right text-foreground">{num(row.ftAmount)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{num(row.totalTokens)}</TableCell>
                <TableCell className="text-right text-foreground">{usd(row.realCostUsd)}</TableCell>
                <TableCell className="text-right text-foreground">{mxn(row.realCostMxn)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{usd(row.avgRealCostUsdPerCall)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {row.ftPerUsd === null ? '—' : row.ftPerUsd.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                </TableCell>
              </TableRow>
            ))}
            {report.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No hay cargos confirmados en este rango de fechas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
