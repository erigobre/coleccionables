import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { backendFetch } from '@/lib/backend';
import { reactivateUserAction, suspendUserAction } from '../actions';
import { EditUserDialog } from './edit-user-dialog';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  username: string;
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
  _count: { items: number; collections: number; seasons: number };
  recentItems: { id: string; name: string; status: string; category: string; createdAt: string }[];
  recentUsageEvents: { id: string; type: string; createdAt: string }[];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function UsuarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await backendFetch<UserDetail>(`/admin/users/${id}`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/usuarios" className="text-sm text-muted-foreground hover:text-foreground">
            ← Usuarios
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{user.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <EditUserDialog userId={user.id} name={user.name} email={user.email} />
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
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Correo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{user.email}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Usuario</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">@{user.username}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rol / Estado</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Badge variant={user.role === 'SUPERADMIN' ? 'secondary' : 'outline'}>{user.role}</Badge>
            <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}>{user.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Registrado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</CardContent>
        </Card>
      </div>

      {user.organization && (
        <Card>
          <CardHeader>
            <CardTitle>Organización</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="text-foreground">{user.organization.name}</span>
            <Badge variant="outline">{user.organization.plan}</Badge>
            <Badge variant="outline">{user.organization.subscriptionStatus}</Badge>
            {user.organization.sponsored && <Badge variant="secondary">Patrocinada</Badge>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Objetos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-foreground">{user._count.items}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Colecciones</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-foreground">{user._count.collections}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Temporadas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-foreground">{user._count.seasons}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Objetos recientes</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.recentItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-foreground">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.category}</TableCell>
                    <TableCell className="text-muted-foreground">{item.status}</TableCell>
                  </TableRow>
                ))}
                {user.recentItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      Sin objetos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Actividad reciente</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.recentUsageEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-foreground">{event.type}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(event.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {user.recentUsageEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                      Sin eventos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
