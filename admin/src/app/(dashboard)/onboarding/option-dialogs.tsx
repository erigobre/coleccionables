'use client';

import { useActionState, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COLLECTING_ICON_CHOICES, LOCATION_ICON_CHOICES } from './icons';
import {
  createOnboardingOptionAction,
  updateOnboardingOptionAction,
  type OnboardingOptionFormState,
} from './actions';

const initialState: OnboardingOptionFormState = {};

function iconChoicesFor(kind: 'COLLECTING' | 'LOCATION') {
  return kind === 'COLLECTING' ? COLLECTING_ICON_CHOICES : LOCATION_ICON_CHOICES;
}

function IconSelect({ name, defaultValue, kind }: { name: string; defaultValue?: string; kind: 'COLLECTING' | 'LOCATION' }) {
  return (
    <select
      id={name}
      name={name}
      defaultValue={defaultValue}
      required
      className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      <option value="" disabled>
        Elegir ícono…
      </option>
      {iconChoicesFor(kind).map((icon) => (
        <option key={icon} value={icon}>
          {icon}
        </option>
      ))}
    </select>
  );
}

export function CreateOnboardingOptionDialog({ kind }: { kind: 'COLLECTING' | 'LOCATION' }) {
  const [open, setOpen] = useState(false);
  const action = createOnboardingOptionAction.bind(null, kind);
  const [state, formAction, pending] = useActionState(async (prev: OnboardingOptionFormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Nueva opción
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva opción de {kind === 'COLLECTING' ? '"Qué coleccionas"' : '"Dónde lo tienes"'}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código (único, clave estable, ej. "toys")</Label>
            <Input id="code" name="code" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Etiqueta (texto mostrado al usuario)</Label>
            <Input id="label" name="label" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="icon">Ícono</Label>
              <IconSelect name="icon" kind={kind} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Orden</Label>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={0} />
            </div>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creando…' : 'Crear opción'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditOnboardingOptionDialogProps {
  optionId: string;
  kind: 'COLLECTING' | 'LOCATION';
  label: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export function EditOnboardingOptionDialog({
  optionId,
  kind,
  label,
  icon,
  sortOrder,
  isActive,
}: EditOnboardingOptionDialogProps) {
  const [open, setOpen] = useState(false);
  const action = updateOnboardingOptionAction.bind(null, optionId);
  const [state, formAction, pending] = useActionState(async (prev: OnboardingOptionFormState, formData: FormData) => {
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
          <DialogTitle>Editar opción</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Etiqueta</Label>
            <Input id="label" name="label" defaultValue={label} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="icon">Ícono</Label>
              <IconSelect name="icon" kind={kind} defaultValue={icon} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Orden</Label>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={sortOrder} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="isActive" defaultChecked={isActive} className="size-4" />
            Opción activa (visible en el onboarding de la app)
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
