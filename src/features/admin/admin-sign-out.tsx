'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Button } from '@/ui/button';

export function AdminSignOut() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/v1/auth/admin/logout', { method: 'POST' });
        router.push('/admin/login');
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
