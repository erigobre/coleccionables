import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { backendFetch } from '@/lib/backend';

interface AdminStats {
  totalUsers: number;
  totalOrganizations: number;
  totalItems: number;
  totalCollections: number;
  aiScansThisMonth: number;
  activeUsersLast30Days: number;
}

const CARDS: { key: keyof AdminStats; label: string }[] = [
  { key: 'totalUsers', label: 'Usuarios totales' },
  { key: 'totalOrganizations', label: 'Cuentas' },
  { key: 'totalItems', label: 'Objetos registrados' },
  { key: 'totalCollections', label: 'Colecciones' },
  { key: 'aiScansThisMonth', label: 'Escaneos IA este mes' },
  { key: 'activeUsersLast30Days', label: 'Usuarios activos (30 días)' },
];

export default async function StatsPage() {
  const stats = await backendFetch<AdminStats>('/admin/stats');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Resumen</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Card key={card.key}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{stats[card.key].toLocaleString('es-MX')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
