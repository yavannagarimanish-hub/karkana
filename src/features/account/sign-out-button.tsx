'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Button } from '@/ui/button';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/v1/auth/logout', { method: 'POST' });
        router.push('/');
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
