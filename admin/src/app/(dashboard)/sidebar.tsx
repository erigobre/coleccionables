'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Building2,
  CreditCard,
  LayoutDashboard,
  ShieldAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Resumen', icon: LayoutDashboard },
  { href: '/usuarios', label: 'Usuarios', icon: Users },
  { href: '/organizaciones', label: 'Organizaciones', icon: Building2 },
  { href: '/pagos', label: 'Pagos', icon: CreditCard },
  { href: '/moderacion', label: 'Moderación', icon: ShieldAlert },
  { href: '/actividad', label: 'Actividad', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <Image src="/frikidex-icono.svg" alt="Frikidex" width={28} height={28} className="rounded-md" />
        <span className="text-lg font-bold tracking-tight">FRIKIDEX</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
