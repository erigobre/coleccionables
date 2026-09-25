import Link from 'next/link';
import { Bell } from 'lucide-react';
import { backendFetch } from '@/lib/backend';
import { getSession } from '@/lib/session';
import { Sidebar } from './sidebar';
import { UserMenu } from './user-menu';

interface ModerationFlag {
  id: string;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, pendingFlags] = await Promise.all([
    getSession(),
    backendFetch<ModerationFlag[]>('/admin/moderation-flags?reviewed=false').catch(() => []),
  ]);
  const pendingCount = pendingFlags.length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-border px-6 py-3">
          <Link
            href="/moderacion"
            className="relative flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Bell className="size-5" />
            {pendingCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
          {session && <UserMenu name={session.user.name} />}
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
