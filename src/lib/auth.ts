import { NextRequest } from 'next/server'

export const SESSION_COOKIE = 'admin_session'

// Token izveden iz lozinke; u cookie ne ide sama lozinka
export async function sessionToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD
  if (!password) return null
  const data = new TextEncoder().encode(`admin-session:${password}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = await sessionToken()
  if (!token) return false
  return req.cookies.get(SESSION_COOKIE)?.value === token
}