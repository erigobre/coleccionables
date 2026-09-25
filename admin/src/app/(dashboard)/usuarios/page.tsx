import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { backendFetch } from '@/lib/backend';
import { reactivateUserAction, suspendUserAction } from './actions';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    sponsored: boolean;
  } | null;
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const users = await backendFetch<AdminUser[]>(
    `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
        <form className="w-64">
          <Input name="search" placeholder="Buscar por nombre o correo" defaultValue={search ?? ''} />
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-foreground">
                  <Link href={`/usuarios/${user.id}`} className="hover:underline">
                    {user.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell className="text-muted-foreground">{user.organization?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'SUPERADMIN' ? 'secondary' : 'outline'}>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}>{user.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {user.status === 'ACTIVE' ? (
                    <form action={suspendUserAction.bind(null, user.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        Suspender
                      </Button>
                    </form>
                  ) : (
                    <form action={reactivateUserAction.bind(null, user.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        Reactivar
                      </Button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
