'use client';

import { useActionState, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteUserAction, type DeleteUserState } from './actions';

const initialState: DeleteUserState = {};

export function DeleteUserDialog({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const action = deleteUserAction.bind(null, userId);
  const [state, formAction, pending] = useActionState(async (prev: DeleteUserState, formData: FormData) => {
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
          <DialogTitle>Eliminar usuario · {userEmail}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esto borra al usuario y todo lo que le pertenece (colecciones, objetos, ubicaciones, wishlist, tokens de
            FT, etc.). No se puede deshacer.
          </p>
          <div className="space-y-2">
            <Label htmlFor="confirm-user">
              Escribe <span className="font-semibold text-foreground">{userEmail}</span> para confirmar
            </Label>
            <Input id="confirm-user" name="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending || confirmText !== userEmail}>
              {pending ? 'Eliminando…' : 'Eliminar definitivamente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
