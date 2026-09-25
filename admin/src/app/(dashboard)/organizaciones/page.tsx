import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { backendFetch } from '@/lib/backend';
import { sponsorAction, unsponsorAction } from './actions';
import { AddPaymentDialog } from './add-payment-dialog';

interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
}

interface AdminOrganization {
  id: string;
  name: string;
  plan: string | null;
  subscriptionStatus: string;
  sponsored: boolean;
  _count: { users: number };
  payments: Payment[];
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagado',
  PENDING: 'Pendiente',
  FAILED: 'Fallido',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function OrganizacionesPage() {
  const organizations = await backendFetch<AdminOrganization[]>('/admin/organizations');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Organizaciones</h1>

      <div className="space-y-4">
        {organizations.map((org) => (
          <div key={org.id} className="rounded-xl border border-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{org.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {org._count.users} usuario(s) · Plan: {org.plan ?? '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={org.sponsored ? 'secondary' : 'outline'}>{org.subscriptionStatus}</Badge>
                {org.sponsored ? (
                  <form action={unsponsorAction.bind(null, org.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      Quitar patrocinio
                    </Button>
                  </form>
                ) : (
                  <form action={sponsorAction.bind(null, org.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      Patrocinar
                    </Button>
                  </form>
                )}
                <AddPaymentDialog organizationId={org.id} organizationName={org.name} />
              </div>
            </div>

            {org.payments.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {org.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(payment.periodStart)} – {formatDate(payment.periodEnd)}
                        </TableCell>
                        <TableCell className="text-foreground">
                          ${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} {payment.currency}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'PAID' ? 'default' : payment.status === 'FAILED' ? 'destructive' : 'outline'}>
                            {PAYMENT_STATUS_LABEL[payment.status] ?? payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ))}
        {organizations.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No hay organizaciones registradas</p>
        )}
      </div>
    </div>
  );
}
