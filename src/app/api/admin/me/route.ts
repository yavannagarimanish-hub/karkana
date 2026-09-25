import { NextResponse } from 'next/server';
import { getCurrentAdminSession } from '@/lib/auth';

export async function GET() {
  const session = await getCurrentAdminSession();

  if (!session) {
    return NextResponse.json(
      { authenticated: false, error: 'No active session' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      username: session.username,
      role: session.role,
    },
  });
}
