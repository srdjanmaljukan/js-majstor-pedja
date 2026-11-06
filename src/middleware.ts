import { NextRequest, NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/admin/login') return NextResponse.next()
  if (await isAuthed(req)) return NextResponse.next()
  return NextResponse.redirect(new URL('/admin/login', req.url))
}

export const config = {
  matcher: ['/admin/:path*'],
}