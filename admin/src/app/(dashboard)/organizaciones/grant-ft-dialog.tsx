'use client';

import { useActionState, useState } from 'react';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { grantFtAction, type GrantFtState } from './actions';

const initialState: GrantFtState = {};

export function GrantFtDialog({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const [open, setOpen] = useState(false);
  const action = grantFtAction.bind(null, organizationId);
  const [state, formAction, pending] = useActionState(async (prev: GrantFtState, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Gift className="size-4" />
        Regalar FT
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regalar FrikiTokens · {organizationName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se suman a su saldo sin cobrar nada; queda registrado como una asignación tipo sponsor en la bitácora.
          </p>
          <div className="space-y-2">
            <Label htmlFor="amount">Cantidad de FT</Label>
            <Input id="amount" name="amount" type="number" min="1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional, queda en la bitácora)</Label>
            <Input id="reason" name="reason" placeholder="Cortesía por soporte, colaboración, etc." />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Otorgando…' : 'Regalar FT'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
