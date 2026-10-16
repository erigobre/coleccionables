'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateFtServiceConfigAction, type UpdateFtServiceConfigState } from './actions';

const initialState: UpdateFtServiceConfigState = {};

interface FtServiceConfigRowProps {
  configKey: string;
  label: string;
  ftCost: number;
  active: boolean;
}

export function FtServiceConfigRow({ configKey, label, ftCost, active }: FtServiceConfigRowProps) {
  const action = updateFtServiceConfigAction.bind(null, configKey);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="font-mono text-xs text-muted-foreground">{configKey}</p>
        {state.error && <p className="mt-1 text-sm text-destructive">{state.error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" name="active" defaultChecked={active} className="h-4 w-4" />
          Activo
        </label>
        <Input name="ftCost" type="number" min="0" step="1" defaultValue={ftCost} className="w-20" />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
