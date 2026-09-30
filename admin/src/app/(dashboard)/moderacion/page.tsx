import Link from 'next/link';
import { Ban, CircleCheck, Clock, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { backendFetch, resolvePhotoUrl } from '@/lib/backend';
import { approveItemFlagAction, quickReactivateUserAction, quickSuspendUserAction } from './actions';
import { ResolveFlagDialog } from './resolve-flag-dialog';

interface ModerationFlag {
  id: string;
  context: string;
  category: string;
  detail: string | null;
  action: 'AUTO_SUSPENDED' | 'FLAGGED_FOR_REVIEW' | 'ITEM_HELD';
  photoUrls: string[] | null;
  userAppeal: string | null;
  userAppealAt: string | null;
  reviewedAt: string | null;
  resolution: string | null;
  createdAt: string;
  user: { id: string; name: string; username: string | null; email: string; status: string } | null;
  item: { id: string; name: string; status: string; category: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  possible_person: 'Posible persona real',
  not_collectible: 'No parece coleccionable',
};

const ACTION_LABELS: Record<ModerationFlag['action'], string> = {
  AUTO_SUSPENDED: 'Suspendido automático',
  FLAGGED_FOR_REVIEW: 'Marcado para revisión',
  ITEM_HELD: 'Objeto retenido',
};

const ACTION_BADGE_VARIANT: Record<ModerationFlag['action'], 'destructive' | 'outline' | 'secondary'> = {
  AUTO_SUSPENDED: 'destructive',
  FLAGGED_FOR_REVIEW: 'outline',
  ITEM_HELD: 'secondary',
};

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

function renderUsername(user: ModerationFlag['user']) {
  if (!user) return '—';
  return user.username ? (
    <>
      <span className="text-primary">@</span>
      {user.username}
    </>
  ) : (
    user.name
  );
}

export default async function ModeracionPage({
  searchParams,
}: {
  searchParams: Promise<{ reviewed?: string; category?: string }>;
}) {
  const { reviewed, category } = await searchParams;
  const query = reviewed !== undefined ? `?reviewed=${reviewed}` : '?reviewed=false';
  const flags = await backendFetch<ModerationFlag[]>(`/admin/moderation-flags${query}`);
  const showingReviewed = reviewed === 'true';

  const categories = Array.from(new Set(flags.map((f) => f.category)));
  const visibleFlags = category ? flags.filter((f) => f.category === category) : flags;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Moderación</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/moderacion?reviewed=false"
            className={`flex items-center gap-1.5 ${!showingReviewed ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Clock className="size-4" />
            Pendientes
          </Link>
          <Link
            href="/moderacion?reviewed=true"
            className={`flex items-center gap-1.5 ${showingReviewed ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ShieldCheck className="size-4" />
            Resueltos
          </Link>
        </div>
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Categoría:</span>
          <Link href={`/moderacion?reviewed=${showingReviewed}`}>
            <Badge variant={!category ? 'default' : 'outline'}>Todas</Badge>
          </Link>
          {categories.map((c) => (
            <Link key={c} href={`/moderacion?reviewed=${showingReviewed}&category=${encodeURIComponent(c)}`}>
              <Badge variant={category === c ? 'default' : 'outline'}>{categoryLabel(c)}</Badge>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleFlags.map((flag) => (
          <div key={flag.id} className="flex flex-col gap-3 rounded-xl border border-border p-4">
            {flag.photoUrls && flag.photoUrls.length > 0 && (
              <div className="flex gap-2">
                {flag.photoUrls.slice(0, 3).map((url, i) => (
                  <a
                    key={i}
                    href={resolvePhotoUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                    className="block h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolvePhotoUrl(url)} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={ACTION_BADGE_VARIANT[flag.action]}>{ACTION_LABELS[flag.action]}</Badge>
              <Badge variant="outline">{categoryLabel(flag.category)}</Badge>
            </div>

            <div className="text-sm">
              <p className="text-foreground">
                {flag.user ? (
                  <Link href={`/usuarios/${flag.user.id}`} className="font-medium hover:underline">
                    {renderUsername(flag.user)}
                  </Link>
                ) : (
                  '—'
                )}
                {flag.user?.status === 'SUSPENDED' && (
                  <Badge variant="destructive" className="ml-2">
                    Suspendido
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {flag.context} · {formatDate(flag.createdAt)}
              </p>
            </div>

            {flag.detail && <p className="text-sm text-muted-foreground">{flag.detail}</p>}

            {flag.item && (
              <p className="text-sm text-foreground">
                Objeto: <span className="font-medium">{flag.item.name}</span>{' '}
                <span className="text-xs text-muted-foreground">({flag.item.status})</span>
              </p>
            )}

            {flag.userAppeal && (
              <div className="rounded-lg border border-border bg-muted/50 p-2.5 text-sm">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Aclaración del usuario:</p>
                <p className="text-foreground">{flag.userAppeal}</p>
              </div>
            )}

            {showingReviewed ? (
              <p className="text-sm text-muted-foreground">{flag.resolution ?? 'Sin nota de resolución'}</p>
            ) : (
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                {flag.action === 'ITEM_HELD' && (
                  <form action={approveItemFlagAction.bind(null, flag.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      <CircleCheck className="size-4" />
                      Aprobar objeto
                    </Button>
                  </form>
                )}
                {flag.user &&
                  (flag.user.status === 'ACTIVE' ? (
                    <form action={quickSuspendUserAction.bind(null, flag.user.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        <Ban className="size-4" />
                        Suspender usuario
                      </Button>
                    </form>
                  ) : (
                    <form action={quickReactivateUserAction.bind(null, flag.user.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        <CircleCheck className="size-4" />
                        Reactivar usuario
                      </Button>
                    </form>
                  ))}
                <ResolveFlagDialog
                  flagId={flag.id}
                  canReactivate={flag.action === 'AUTO_SUSPENDED'}
                  isHeldItem={flag.action === 'ITEM_HELD'}
                />
              </div>
            )}
          </div>
        ))}
        {visibleFlags.length === 0 && (
          <p className="col-span-full py-8 text-center text-muted-foreground">
            {showingReviewed ? 'No hay incidentes resueltos' : 'No hay incidentes pendientes'}
          </p>
        )}
      </div>
    </div>
  );
}
