'use client';

import { useActionState, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createFtPlanAction, updateFtPlanAction, type FtPlanFormState } from './actions';

const initialState: FtPlanFormState = {};

export function CreateFtPlanDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: FtPlanFormState, formData: FormData) => {
    const result = await createFtPlanAction(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Nuevo plan
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo plan mensual de FT</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="code">Código (único)</Label>
              <Input id="code" name="code" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Etiqueta</Label>
              <Input id="label" name="label" placeholder="Coleccionista" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ftAmountMonthly">FT / mes</Label>
              <Input id="ftAmountMonthly" name="ftAmountMonthly" type="number" min="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyPriceMxn">Precio mensual (MXN)</Label>
              <Input id="monthlyPriceMxn" name="monthlyPriceMxn" type="number" step="0.01" min="0" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="badge">Insignia (opcional)</Label>
              <Input id="badge" name="badge" placeholder="Más popular" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Orden</Label>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={0} />
            </div>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creando…' : 'Crear plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditFtPlanDialogProps {
  planId: string;
  label: string;
  ftAmountMonthly: number;
  monthlyPriceMxnCents: number;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
}

export function EditFtPlanDialog({
  planId,
  label,
  ftAmountMonthly,
  monthlyPriceMxnCents,
  badge,
  sortOrder,
  isActive,
}: EditFtPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const action = updateFtPlanAction.bind(null, planId);
  const [state, formAction, pending] = useActionState(async (prev: FtPlanFormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil className="size-4" />
        Editar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar plan de FT</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Etiqueta</Label>
            <Input id="label" name="label" defaultValue={label} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ftAmountMonthly">FT / mes</Label>
              <Input id="ftAmountMonthly" name="ftAmountMonthly" type="number" min="1" defaultValue={ftAmountMonthly} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyPriceMxn">Precio mensual (MXN)</Label>
              <Input
                id="monthlyPriceMxn"
                name="monthlyPriceMxn"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(monthlyPriceMxnCents / 100).toFixed(2)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="badge">Insignia (opcional)</Label>
              <Input id="badge" name="badge" defaultValue={badge ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Orden</Label>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={sortOrder} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="isActive" defaultChecked={isActive} className="size-4" />
            Plan activo (visible en la landing y la app)
          </label>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
