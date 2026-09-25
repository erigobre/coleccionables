'use client';

import { useActionState, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateOrganizationAction, type EditOrganizationState } from './actions';

const initialState: EditOrganizationState = {};

export function EditOrganizationDialog({
  organizationId,
  name,
  plan,
  subscriptionStatus,
}: {
  organizationId: string;
  name: string;
  plan: string | null;
  subscriptionStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const action = updateOrganizationAction.bind(null, organizationId);
  const [state, formAction, pending] = useActionState(async (prev: EditOrganizationState, formData: FormData) => {
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
          <DialogTitle>Editar organización</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <Input id="plan" name="plan" defaultValue={plan ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subscriptionStatus">Estado de suscripción</Label>
            <select
              id="subscriptionStatus"
              name="subscriptionStatus"
              defaultValue={subscriptionStatus}
              className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAST_DUE">PAST_DUE</option>
              <option value="CANCELED">CANCELED</option>
              <option value="SPONSORED">SPONSORED</option>
            </select>
          </div>
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
