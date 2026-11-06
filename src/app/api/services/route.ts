import { NextRequest, NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import {
  addService,
  deleteService,
  getExpiringWarranties,
  parseServiceInput,
  setRenewalContacted,
} from '@/lib/clients'

export const dynamic = 'force-dynamic'

const unauthorized = () => NextResponse.json({ error: 'Neovlašteni pristup' }, { status: 401 })
const serverError = (e: unknown) => {
  console.error(e)
  return NextResponse.json({ error: 'Greška baze' }, { status: 500 })
}

// GET: garancije koje ističu
export async function GET(req: NextRequest) {
  if (!(await isAuthed(req))) return unauthorized()
  try {
    return NextResponse.json(await getExpiringWarranties())
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed(req))) return unauthorized()
  const { data, error } = parseServiceInput(await req.json())
  if (!data) return NextResponse.json({ error }, { status: 400 })
  try {
    await addService(data)
    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError(e)
  }
}

// PATCH: označi / skini oznaku "kontaktiran"
export async function PATCH(req: NextRequest) {
  if (!(await isAuthed(req))) return unauthorized()
  const body = await req.json()
  const id = Number(body.id)
  if (!Number.isInteger(id) || typeof body.renewalContacted !== 'boolean') {
    return NextResponse.json({ error: 'Neispravni podaci' }, { status: 400 })
  }
  try {
    await setRenewalContacted(id, body.renewalContacted)
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
    await deleteService(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError(e)
  }
}