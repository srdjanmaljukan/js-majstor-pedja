import { NextRequest, NextResponse } from "next/server";
import {
  addReview,
  getAllReviews,
  approveReview,
  deleteReview,
} from "@/lib/reviews";
import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/auth";

// POST /api/reviews — posjetilac šalje recenziju
export async function POST(req: NextRequest) {
  try {
    const { name, location, text, rating } = await req.json();

    if (!name || !text || !rating) {
      return NextResponse.json({ error: "Nedostaju podaci" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Ocjena mora biti između 1 i 5" },
        { status: 400 },
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: "Tekst je predugačak" },
        { status: 400 },
      );
    }

    await addReview({ name, location: location || "", text, rating });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Greška" }, { status: 500 });
  }
}

// GET /api/reviews — admin dohvata sve recenzije
export async function GET(req: NextRequest) {
  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: "Neovlašteni pristup" }, { status: 401 });
  }

  const reviews = await getAllReviews();
  return NextResponse.json(reviews);
}

// PATCH /api/reviews — admin odobrava recenziju
export async function PATCH(req: NextRequest) {
if (!(await isAuthed(req))) {
  return NextResponse.json({ error: 'Neovlašteni pristup' }, { status: 401 })
}

  const { id } = await req.json();
  await approveReview(id);
  revalidatePath("/");
  return NextResponse.json({ success: true });
}

// DELETE /api/reviews — admin briše recenziju
export async function DELETE(req: NextRequest) {
if (!(await isAuthed(req))) {
  return NextResponse.json({ error: 'Neovlašteni pristup' }, { status: 401 })
}

  const { id } = await req.json();
  await deleteReview(id);
  revalidatePath("/");
  return NextResponse.json({ success: true });
}
