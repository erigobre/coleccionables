'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateFtConfigAction, type UpdateFtConfigState } from './actions';

const initialState: UpdateFtConfigState = {};

interface FtConfigRowProps {
  configKey: string;
  label: string;
  value: number;
}

export function FtConfigRow({ configKey, label, value }: FtConfigRowProps) {
  const action = updateFtConfigAction.bind(null, configKey);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="font-mono text-xs text-muted-foreground">{configKey}</p>
        {state.error && <p className="mt-1 text-sm text-destructive">{state.error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Input name="value" type="number" min="0" step="1" defaultValue={value} className="w-24" />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
