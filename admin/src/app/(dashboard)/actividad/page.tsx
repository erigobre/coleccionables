import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { backendFetch } from '@/lib/backend';

interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function ActividadPage() {
  const logs = await backendFetch<AuditLog[]>('/admin/audit-logs');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Actividad</h1>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Objetivo</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                <TableCell className="text-foreground">{log.adminEmail}</TableCell>
                <TableCell>
                  <Badge variant="outline">{log.action}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.targetType} · {log.targetId}
                </TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  {log.metadata ? JSON.stringify(log.metadata) : '—'}
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hay actividad registrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
