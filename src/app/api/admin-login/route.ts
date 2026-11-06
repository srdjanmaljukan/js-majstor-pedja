import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = await sessionToken()
  if (!token) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD nije postavljen' }, { status: 500 })
  }

  const { password } = await req.json()
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Pogrešna lozinka' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}