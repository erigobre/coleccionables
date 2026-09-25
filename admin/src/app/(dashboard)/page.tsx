import { Activity, Building2, Layers, Package, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { backendFetch } from '@/lib/backend';
import { UsageCharts } from './usage-charts';

interface AdminStats {
  totalUsers: number;
  totalOrganizations: number;
  totalItems: number;
  totalCollections: number;
  aiScansThisMonth: number;
  activeUsersLast30Days: number;
}

const CARDS: { key: keyof AdminStats; label: string; icon: typeof Users }[] = [
  { key: 'totalUsers', label: 'Usuarios totales', icon: Users },
  { key: 'totalOrganizations', label: 'Cuentas', icon: Building2 },
  { key: 'totalItems', label: 'Objetos registrados', icon: Package },
  { key: 'totalCollections', label: 'Colecciones', icon: Layers },
  { key: 'aiScansThisMonth', label: 'Escaneos IA este mes', icon: Sparkles },
  { key: 'activeUsersLast30Days', label: 'Usuarios activos (30 días)', icon: Activity },
];

interface TimeseriesPoint {
  month: string;
  newUsers: number;
  aiScans: number;
}

function getTrend(key: keyof AdminStats, timeseries: TimeseriesPoint[]): string | null {
  if (timeseries.length === 0) return null;
  const last = timeseries[timeseries.length - 1];
  if (key === 'totalUsers') {
    return last.newUsers > 0 ? `+${last.newUsers.toLocaleString('es-MX')} este mes` : null;
  }
  if (key === 'aiScansThisMonth' && timeseries.length >= 2) {
    const prev = timeseries[timeseries.length - 2];
    const diff = last.aiScans - prev.aiScans;
    if (diff === 0) return null;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toLocaleString('es-MX')} vs mes anterior`;
  }
  return null;
}

export default async function StatsPage() {
  const [stats, timeseries] = await Promise.all([
    backendFetch<AdminStats>('/admin/stats'),
    backendFetch<TimeseriesPoint[]>('/admin/stats/timeseries'),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Resumen</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const trend = getTrend(card.key, timeseries);
          return (
            <Card key={card.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{stats[card.key].toLocaleString('es-MX')}</p>
                {trend && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                    <TrendingUp className="size-3.5" />
                    {trend}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <UsageCharts data={timeseries} />
    </div>
  );
}
