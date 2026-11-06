import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary nije konfigurisan" },
      { status: 500 },
    );
  }

  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: "Neovlašteni pristup" }, { status: 401 });
  }

  const { publicIds } = await req.json();
  if (!publicIds || !Array.isArray(publicIds)) {
    return NextResponse.json({ error: "Nedostaju public_id" }, { status: 400 });
  }

  const folder = process.env.CLOUDINARY_FOLDER || "majstor-radovi";

  try {
    for (const publicId of publicIds) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = await sha1(signatureStr);

      const formData = new FormData();
      formData.append("public_id", publicId);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);

      await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        {
          method: "POST",
          body: formData,
        },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete greška:", e);
    return NextResponse.json({ error: "Greška pri brisanju" }, { status: 500 });
  }
}

async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
