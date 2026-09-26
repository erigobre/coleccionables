'use client';

import { useActionState, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteOrganizationAction, type DeleteOrganizationState } from './actions';

const initialState: DeleteOrganizationState = {};

export function DeleteOrganizationDialog({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const action = deleteOrganizationAction.bind(null, organizationId);
  const [state, formAction, pending] = useActionState(async (prev: DeleteOrganizationState, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmText('');
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" className="text-destructive hover:text-destructive" />}>
        <Trash2 className="size-4" />
        Eliminar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar organización · {organizationName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esto borra la organización, todos sus usuarios y todo lo que tengan (objetos, colecciones, ubicaciones,
            pagos, FrikiTokens, etc.). No se puede deshacer.
          </p>
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Escribe <span className="font-semibold text-foreground">{organizationName}</span> para confirmar
            </Label>
            <Input id="confirm" name="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending || confirmText !== organizationName}>
              {pending ? 'Eliminando…' : 'Eliminar definitivamente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
