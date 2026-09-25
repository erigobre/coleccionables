import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { backendFetch } from '@/lib/backend';

interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: 'PAID' | 'PENDING' | 'FAILED';
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  organization: { id: string; name: string };
}

const STATUS_LABEL: Record<Payment['status'], string> = {
  PAID: 'Pagado',
  PENDING: 'Pendiente',
  FAILED: 'Fallido',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function PagosPage() {
  const payments = await backendFetch<Payment[]>('/admin/payments');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Pagos</h1>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organización</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Registrado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="text-foreground">
                  <Link href="/organizaciones" className="hover:underline">
                    {payment.organization.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(payment.periodStart)} – {formatDate(payment.periodEnd)}
                </TableCell>
                <TableCell className="text-foreground">
                  ${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} {payment.currency}
                </TableCell>
                <TableCell>
                  <Badge variant={payment.status === 'PAID' ? 'default' : payment.status === 'FAILED' ? 'destructive' : 'outline'}>
                    {STATUS_LABEL[payment.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(payment.createdAt)}</TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hay pagos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
