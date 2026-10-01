'use client';

import { useActionState, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { resolveFlagAction, type ResolveFlagState } from './actions';

const initialState: ResolveFlagState = {};

export function ResolveFlagDialog({
  flagId,
  canReactivate,
  isHeldItem,
}: {
  flagId: string;
  canReactivate: boolean;
  isHeldItem: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Sin preseleccionar: el admin debe elegir explícitamente Aprobar/Rechazar
  // antes de poder enviar, para no aprobar por accidente un objeto retenido
  // con un clic apresurado en "Marcar como resuelto" (riesgo detectado 2026-09-30).
  const [approveItem, setApproveItem] = useState<'true' | 'false' | null>(null);
  const action = resolveFlagAction.bind(null, flagId);
  const [state, formAction, pending] = useActionState(async (prev: ResolveFlagState, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <ShieldCheck className="size-4" />
        Resolver
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolver incidente de moderación</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {isHeldItem && (
            <div className="space-y-2">
              <Label>Objeto retenido</Label>
              <div className="flex gap-4 text-sm text-foreground">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="approveItem"
                    value="true"
                    checked={approveItem === 'true'}
                    onChange={() => setApproveItem('true')}
                  />
                  Aprobar (era un falso positivo)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="approveItem"
                    value="false"
                    checked={approveItem === 'false'}
                    onChange={() => setApproveItem('false')}
                  />
                  Rechazar (borrar objeto y fotos)
                </label>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="resolution">Nota de resolución</Label>
            <textarea
              id="resolution"
              name="resolution"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground"
              placeholder={
                isHeldItem && approveItem === 'false'
                  ? 'Se muestra al usuario como motivo del rechazo (opcional)'
                  : 'Qué se decidió y por qué'
              }
            />
          </div>
          {canReactivate && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name="reactivateUser" className="h-4 w-4" />
              Reactivar la cuenta del usuario (falso positivo)
            </label>
          )}
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || (isHeldItem && approveItem === null)}>
              {pending ? 'Guardando…' : 'Marcar como resuelto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
