'use client';

import { useActionState, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createFtPackageAction,
  updateFtPackageAction,
  type FtPackageFormState,
} from './actions';

const initialState: FtPackageFormState = {};

export function CreateFtPackageDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: FtPackageFormState, formData: FormData) => {
    const result = await createFtPackageAction(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Nuevo paquete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo paquete de FT</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código (único, ej. "pro")</Label>
            <Input id="code" name="code" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ftAmount">FrikiTokens</Label>
              <Input id="ftAmount" name="ftAmount" type="number" min="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceMxn">Precio (MXN)</Label>
              <Input id="priceMxn" name="priceMxn" type="number" step="0.01" min="0" required />
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
              {pending ? 'Creando…' : 'Crear paquete'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditFtPackageDialogProps {
  packageId: string;
  ftAmount: number;
  priceMxnCents: number;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
}

export function EditFtPackageDialog({
  packageId,
  ftAmount,
  priceMxnCents,
  badge,
  sortOrder,
  isActive,
}: EditFtPackageDialogProps) {
  const [open, setOpen] = useState(false);
  const action = updateFtPackageAction.bind(null, packageId);
  const [state, formAction, pending] = useActionState(async (prev: FtPackageFormState, formData: FormData) => {
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
          <DialogTitle>Editar paquete de FT</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ftAmount">FrikiTokens</Label>
              <Input id="ftAmount" name="ftAmount" type="number" min="1" defaultValue={ftAmount} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceMxn">Precio (MXN)</Label>
              <Input
                id="priceMxn"
                name="priceMxn"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(priceMxnCents / 100).toFixed(2)}
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
            Paquete activo (visible en la landing y la app)
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
