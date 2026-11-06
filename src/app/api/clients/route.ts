import { NextRequest, NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  parseClientInput,
} from '@/lib/clients'

export const dynamic = 'force-dynamic'

const unauthorized = () => NextResponse.json({ error: 'Neovlašteni pristup' }, { status: 401 })
const serverError = (e: unknown) => {
  console.error(e)
  return NextResponse.json({ error: 'Greška baze' }, { status: 500 })
}

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req))) return unauthorized()
  try {
    return NextResponse.json(await getClients())
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed(req))) return unauthorized()
  const { data, error } = parseClientInput(await req.json())
  if (!data) return NextResponse.json({ error }, { status: 400 })
  try {
    await createClient(data)
    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthed(req))) return unauthorized()
  const body = await req.json()
  const id = Number(body.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Nedostaje id' }, { status: 400 })
  const { data, error } = parseClientInput(body)
  if (!data) return NextResponse.json({ error }, { status: 400 })
  try {
    await updateClient(id, data)
    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthed(req))) return unauthorized()
  const id = Number((await req.json()).id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Nedostaje id' }, { status: 400 })
  try {
    await deleteClient(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError(e)
  }
}