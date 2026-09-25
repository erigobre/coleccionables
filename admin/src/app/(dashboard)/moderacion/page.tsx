import Link from 'next/link';
import { Clock, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { backendFetch } from '@/lib/backend';
import { ResolveFlagDialog } from './resolve-flag-dialog';

interface ModerationFlag {
  id: string;
  context: string;
  category: string;
  detail: string | null;
  action: 'AUTO_SUSPENDED' | 'FLAGGED_FOR_REVIEW';
  reviewedAt: string | null;
  resolution: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; status: string } | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function ModeracionPage({
  searchParams,
}: {
  searchParams: Promise<{ reviewed?: string }>;
}) {
  const { reviewed } = await searchParams;
  const query = reviewed !== undefined ? `?reviewed=${reviewed}` : '?reviewed=false';
  const flags = await backendFetch<ModerationFlag[]>(`/admin/moderation-flags${query}`);
  const showingReviewed = reviewed === 'true';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Moderación</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/moderacion?reviewed=false"
            className={`flex items-center gap-1.5 ${!showingReviewed ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Clock className="size-4" />
            Pendientes
          </Link>
          <Link
            href="/moderacion?reviewed=true"
            className={`flex items-center gap-1.5 ${showingReviewed ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ShieldCheck className="size-4" />
            Resueltos
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Acción tomada</TableHead>
              {showingReviewed && <TableHead>Resolución</TableHead>}
              {!showingReviewed && <TableHead className="text-right">Acción</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.map((flag) => (
              <TableRow key={flag.id}>
                <TableCell className="text-muted-foreground">{formatDate(flag.createdAt)}</TableCell>
                <TableCell className="text-foreground">
                  {flag.user ? (
                    <Link href={`/usuarios/${flag.user.id}`} className="hover:underline">
                      {flag.user.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{flag.context}</TableCell>
                <TableCell>
                  <div>
                    <Badge variant="outline">{flag.category}</Badge>
                    {flag.detail && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{flag.detail}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={flag.action === 'AUTO_SUSPENDED' ? 'destructive' : 'outline'}>
                    {flag.action === 'AUTO_SUSPENDED' ? 'Suspendido automático' : 'Marcado para revisión'}
                  </Badge>
                </TableCell>
                {showingReviewed && (
                  <TableCell className="text-muted-foreground">{flag.resolution ?? '—'}</TableCell>
                )}
                {!showingReviewed && (
                  <TableCell className="text-right">
                    <ResolveFlagDialog flagId={flag.id} canReactivate={flag.action === 'AUTO_SUSPENDED'} />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {flags.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {showingReviewed ? 'No hay incidentes resueltos' : 'No hay incidentes pendientes'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
