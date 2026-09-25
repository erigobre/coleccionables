'use client';

import { useActionState, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addPaymentAction, type AddPaymentState } from './actions';

const initialState: AddPaymentState = {};

export function AddPaymentDialog({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const [open, setOpen] = useState(false);
  const action = addPaymentAction.bind(null, organizationId);
  const [state, formAction, pending] = useActionState(async (prev: AddPaymentState, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="size-4" />
        Agregar pago
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo pago · {organizationName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Monto (MXN)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Inicio del periodo</Label>
              <Input id="periodStart" name="periodStart" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Fin del periodo</Label>
              <Input id="periodEnd" name="periodEnd" type="date" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              name="status"
              defaultValue="PAID"
              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
            >
              <option value="PAID">Pagado</option>
              <option value="PENDING">Pendiente</option>
              <option value="FAILED">Fallido</option>
            </select>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
