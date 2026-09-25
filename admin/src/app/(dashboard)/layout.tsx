import Link from 'next/link';
import { getSession } from '@/lib/session';
import { logoutAction } from '../login/actions';

const NAV_ITEMS = [
  { href: '/', label: 'Resumen' },
  { href: '/usuarios', label: 'Usuarios' },
  { href: '/organizaciones', label: 'Organizaciones' },
];

// El middleware ya garantiza que solo llega aquí una sesión SUPERADMIN
// válida — no hace falta volver a verificar el rol en cada página.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold text-primary">FRIKIDEX</span>
            <nav className="flex items-center gap-5 text-sm">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">{session?.user.name}</span>
            <form action={logoutAction}>
              <button type="submit" className="text-muted-foreground hover:text-foreground">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
