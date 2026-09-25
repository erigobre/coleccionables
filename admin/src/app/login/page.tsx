'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form action={formAction} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-foreground">Frikidex Admin</h1>
          <p className="text-sm text-muted-foreground">Acceso solo para superadmins</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
