import { neon } from '@neondatabase/serverless'

export interface Service {
  id: number
  serviceDate: string
  unit: string | null
  warrantyPaid: boolean
  warrantyExpiresAt: string | null
  renewalContacted: boolean
  note: string | null
}

export interface Client {
  id: number
  firstName: string
  lastName: string
  address: string
  phone: string | null
  email: string | null
  note: string | null
  services: Service[]
}

export interface ExpiringWarranty {
  serviceId: number
  clientId: number
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  unit: string | null
  warrantyExpiresAt: string
  daysLeft: number
}

export interface ClientInput {
  firstName: string
  lastName: string
  address: string
  phone: string | null
  email: string | null
  note: string | null
}

export interface ServiceInput {
  clientId: number
  serviceDate: string
  unit: string | null
  warrantyPaid: boolean
  note: string | null
}

function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL nije postavljen')
  return neon(url)
}

let tablesReady = false

async function ensureTables() {
  if (tablesReady) return
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT contact_required CHECK (phone IS NOT NULL OR email IS NOT NULL)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service_date DATE NOT NULL,
      unit_description TEXT,
      warranty_paid BOOLEAN NOT NULL DEFAULT FALSE,
      warranty_expires_at DATE,
      renewal_contacted BOOLEAN NOT NULL DEFAULT FALSE,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  tablesReady = true
}

// ─── Validacija ─────────────────────────────────────────────

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export function parseClientInput(b: Record<string, unknown>): { data?: ClientInput; error?: string } {
  const firstName = str(b.firstName)
  const lastName = str(b.lastName)
  const address = str(b.address)
  const phone = str(b.phone) || null
  const email = str(b.email) || null
  const note = str(b.note) || null

  if (!firstName || !lastName || !address) return { error: 'Ime, prezime i adresa su obavezni' }
  if (!phone && !email) return { error: 'Unesite bar telefon ili email' }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Email nije ispravan' }

  return { data: { firstName, lastName, address, phone, email, note } }
}

export function parseServiceInput(b: Record<string, unknown>): { data?: ServiceInput; error?: string } {
  const clientId = Number(b.clientId)
  const serviceDate = str(b.serviceDate)

  if (!Number.isInteger(clientId)) return { error: 'Klijent nije izabran' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) return { error: 'Datum servisa nije ispravan' }

  return {
    data: {
      clientId,
      serviceDate,
      unit: str(b.unit) || null,
      warrantyPaid: b.warrantyPaid === true,
      note: str(b.note) || null,
    },
  }
}

function addOneYear(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y + 1, m - 1, d)).toISOString().slice(0, 10)
}

// ─── Klijenti ───────────────────────────────────────────────

export async function getClients(): Promise<Client[]> {
  await ensureTables()
  const sql = getDb()
  const rows = await sql`
    SELECT
      c.id,
      c.first_name AS "firstName",
      c.last_name AS "lastName",
      c.address,
      c.phone,
      c.email,
      c.note,
      COALESCE(
        json_agg(
          json_build_object(
            'id', s.id,
            'serviceDate', s.service_date::text,
            'unit', s.unit_description,
            'warrantyPaid', s.warranty_paid,
            'warrantyExpiresAt', s.warranty_expires_at::text,
            'renewalContacted', s.renewal_contacted,
            'note', s.note
          ) ORDER BY s.service_date DESC
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::json
      ) AS services
    FROM clients c
    LEFT JOIN services s ON s.client_id = c.id
    GROUP BY c.id
    ORDER BY c.last_name, c.first_name
  `
  return rows as unknown as Client[]
}

export async function createClient(d: ClientInput): Promise<void> {
  await ensureTables()
  const sql = getDb()
  await sql`
    INSERT INTO clients (first_name, last_name, address, phone, email, note)
    VALUES (${d.firstName}, ${d.lastName}, ${d.address}, ${d.phone}, ${d.email}, ${d.note})
  `
}

export async function updateClient(id: number, d: ClientInput): Promise<void> {
  await ensureTables()
  const sql = getDb()
  await sql`
    UPDATE clients
    SET first_name = ${d.firstName}, last_name = ${d.lastName}, address = ${d.address},
        phone = ${d.phone}, email = ${d.email}, note = ${d.note}
    WHERE id = ${id}
  `
}

export async function deleteClient(id: number): Promise<void> {
  await ensureTables()
  const sql = getDb()
  await sql`DELETE FROM clients WHERE id = ${id}`
}

// ─── Servisi ────────────────────────────────────────────────

export async function addService(d: ServiceInput): Promise<void> {
  await ensureTables()
  const sql = getDb()
  const expiresAt = d.warrantyPaid ? addOneYear(d.serviceDate) : null
  await sql`
    INSERT INTO services (client_id, service_date, unit_description, warranty_paid, warranty_expires_at, note)
    VALUES (${d.clientId}, ${d.serviceDate}, ${d.unit}, ${d.warrantyPaid}, ${expiresAt}, ${d.note})
  `
}

export async function setRenewalContacted(id: number, value: boolean): Promise<void> {
  await ensureTables()
  const sql = getDb()
  await sql`UPDATE services SET renewal_contacted = ${value} WHERE id = ${id}`
}

export async function deleteService(id: number): Promise<void> {
  await ensureTables()
  const sql = getDb()
  await sql`DELETE FROM services WHERE id = ${id}`
}

// Plaćena garancija, još nije kontaktiran, ističe u narednih 10 dana (ili je već istekla)
export async function getExpiringWarranties(): Promise<ExpiringWarranty[]> {
  await ensureTables()
  const sql = getDb()
  const rows = await sql`
    SELECT
      s.id AS "serviceId",
      c.id AS "clientId",
      c.first_name AS "firstName",
      c.last_name AS "lastName",
      c.phone,
      c.email,
      s.unit_description AS unit,
      s.warranty_expires_at::text AS "warrantyExpiresAt",
      (s.warranty_expires_at - CURRENT_DATE) AS "daysLeft"
    FROM services s
    JOIN clients c ON c.id = s.client_id
    WHERE s.warranty_paid = TRUE
      AND s.renewal_contacted = FALSE
      AND s.warranty_expires_at <= CURRENT_DATE + 10
    ORDER BY s.warranty_expires_at
  `
  return rows as unknown as ExpiringWarranty[]
}