import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { backendFetch } from '@/lib/backend';
import { CreateOnboardingOptionDialog, EditOnboardingOptionDialog } from './option-dialogs';

interface AdminOnboardingOption {
  id: string;
  kind: 'COLLECTING' | 'LOCATION';
  code: string;
  label: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
}

function OptionsSection({
  title,
  kind,
  options,
}: {
  title: string;
  kind: 'COLLECTING' | 'LOCATION';
  options: AdminOnboardingOption[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <CreateOnboardingOptionDialog kind={kind} />
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Etiqueta</TableHead>
              <TableHead>Ícono</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {options.map((option) => (
              <TableRow key={option.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{option.code}</TableCell>
                <TableCell className="text-foreground">{option.label}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{option.icon}</TableCell>
                <TableCell className="text-foreground">{option.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={option.isActive ? 'default' : 'outline'}>
                    {option.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <EditOnboardingOptionDialog
                    optionId={option.id}
                    kind={option.kind}
                    label={option.label}
                    icon={option.icon}
                    sortOrder={option.sortOrder}
                    isActive={option.isActive}
                  />
                </TableCell>
              </TableRow>
            ))}
            {options.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No hay opciones registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

// Catálogo de las preguntas 1 y 2 del onboarding de primera vez — editar aquí
// cambia las opciones que ve cualquier cuenta nueva sin requerir un release
// de la app (pedido 2026-10-23).
export default async function OnboardingPage() {
  const options = await backendFetch<AdminOnboardingOption[]>('/admin/onboarding-options');
  const collecting = options.filter((o) => o.kind === 'COLLECTING').sort((a, b) => a.sortOrder - b.sortOrder);
  const locations = options.filter((o) => o.kind === 'LOCATION').sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Onboarding</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo de opciones que se muestran en las preguntas 1 y 2 del onboarding de primera vez (qué coleccionas /
          dónde lo tienes). Desactivar una opción la quita de la app de inmediato, sin necesidad de publicar nada.
        </p>
      </div>

      <OptionsSection title="Qué coleccionas" kind="COLLECTING" options={collecting} />
      <OptionsSection title="Dónde lo tienes" kind="LOCATION" options={locations} />
    </div>
  );
}
