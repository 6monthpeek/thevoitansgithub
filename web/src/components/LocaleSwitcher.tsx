'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Locale = 'tr' | 'en';

export function LocaleSwitcher({ to }: { to: Locale }) {
  const pathname = usePathname() || '/';
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Mevcut /tr veya /en önekini tek sefer sil
  const base = useMemo(() => pathname.replace(/^\/(tr|en)(?=\/|$)/, ''), [pathname]);

  const target = useMemo(() => {
    const rest = base === '/' ? '' : base;
    return `/${to}${rest}`;
  }, [base, to]);

  // Hydration farkını engellemek için mount öncesi stabil href
  const safeHref = mounted ? target : `/${to}`;

  return (
    <Link href={safeHref} prefetch={false}
      className='rounded-full px-3 py-1.5 text-xs border border-white/10 hover:border-white/25 bg-black/20 hover:bg-black/30 transition-colors'>
      {to.toUpperCase()}
    </Link>
  );
}
