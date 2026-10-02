'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SidebarNavLinks } from './sidebar';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-sm" className="md:hidden" />}
      >
        <Menu className="size-5" />
        <span className="sr-only">Abrir menú</span>
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground">
        <SheetHeader className="flex-row items-center gap-2">
          <Image src="/frikidex-icono.svg" alt="Frikidex" width={28} height={28} className="rounded-md" />
          <SheetTitle className="text-lg font-bold tracking-tight text-sidebar-foreground">FRIKIDEX</SheetTitle>
        </SheetHeader>
        <SidebarNavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
