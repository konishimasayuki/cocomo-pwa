import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, getExpectedHash, sha256Hex } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (typeof password !== 'string' || password.length === 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const hash = await sha256Hex(password);
  if (hash !== getExpectedHash()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, hash, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30 // 30日
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
