import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { backendFetch } from '@/lib/backend';
import { CreateFtPackageDialog, EditFtPackageDialog } from './package-dialogs';
import { CreateFtPlanDialog, EditFtPlanDialog } from './plan-dialogs';

interface AdminFtPackage {
  id: string;
  code: string;
  ftAmount: number;
  priceMxnCents: number;
  badge: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface AdminFtPlan {
  id: string;
  code: string;
  label: string;
  ftAmountMonthly: number;
  monthlyPriceMxnCents: number;
  badge: string | null;
  isActive: boolean;
  sortOrder: number;
}

function mxn(cents: number) {
  return `$${(cents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
}

// Mismo catálogo que consumen /ft/packages y /ft/plans (landing pública y el
// modal "sin FrikiTokens" de la app): editar aquí cambia los precios en todo
// el proyecto sin necesidad de un deploy — pedido 2026-09-25.
export default async function FrikiTokensPage() {
  const [packages, plans] = await Promise.all([
    backendFetch<AdminFtPackage[]>('/admin/ft-packages'),
    backendFetch<AdminFtPlan[]>('/admin/ft-plans'),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">FrikiTokens</h1>
        <p className="text-sm text-muted-foreground">
          Paquetes y planes que se muestran en frikidex.com, en el modal de &quot;sin FrikiTokens&quot; de la app y en
          cualquier otro lugar del proyecto — todos leen de este mismo catálogo.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Paquetes (compra única)</h2>
          <CreateFtPackageDialog />
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>FrikiTokens</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Insignia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{pkg.code}</TableCell>
                  <TableCell className="text-foreground">{pkg.ftAmount.toLocaleString('es-MX')} FT</TableCell>
                  <TableCell className="text-foreground">{mxn(pkg.priceMxnCents)}</TableCell>
                  <TableCell className="text-muted-foreground">{pkg.badge ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={pkg.isActive ? 'default' : 'outline'}>{pkg.isActive ? 'Activo' : 'Inactivo'}</Badge>
                  </TableCell>
                  <TableCell>
                    <EditFtPackageDialog
                      packageId={pkg.id}
                      ftAmount={pkg.ftAmount}
                      priceMxnCents={pkg.priceMxnCents}
                      badge={pkg.badge}
                      sortOrder={pkg.sortOrder}
                      isActive={pkg.isActive}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {packages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No hay paquetes registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Planes (suscripción mensual)</h2>
          <CreateFtPlanDialog />
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Etiqueta</TableHead>
                <TableHead>FT / mes</TableHead>
                <TableHead>Precio mensual</TableHead>
                <TableHead>Insignia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{plan.code}</TableCell>
                  <TableCell className="text-foreground">{plan.label}</TableCell>
                  <TableCell className="text-foreground">{plan.ftAmountMonthly.toLocaleString('es-MX')} FT</TableCell>
                  <TableCell className="text-foreground">{mxn(plan.monthlyPriceMxnCents)}</TableCell>
                  <TableCell className="text-muted-foreground">{plan.badge ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? 'default' : 'outline'}>{plan.isActive ? 'Activo' : 'Inactivo'}</Badge>
                  </TableCell>
                  <TableCell>
                    <EditFtPlanDialog
                      planId={plan.id}
                      label={plan.label}
                      ftAmountMonthly={plan.ftAmountMonthly}
                      monthlyPriceMxnCents={plan.monthlyPriceMxnCents}
                      badge={plan.badge}
                      sortOrder={plan.sortOrder}
                      isActive={plan.isActive}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {plans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No hay planes registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
