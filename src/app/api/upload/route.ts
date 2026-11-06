import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary nije konfigurisan" },
      { status: 500 },
    );
  }

  // Provjeri lozinku iz headera
  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: "Neovlašteni pristup" }, { status: 401 });
  }

  const folder = process.env.CLOUDINARY_FOLDER || "majstor-radovi";

  try {
    const formData = await req.formData();
    const type = formData.get("type") as string; // 'single' | 'before-after'
    const caption = formData.get("caption") as string | null;

    // Generiši unique ID za par
    const pairId = `${Date.now()}`;

    if (type === "single") {
      const file = formData.get("image") as File;
      if (!file)
        return NextResponse.json({ error: "Nema slike" }, { status: 400 });

      const url = await uploadToCloudinary(
        file,
        folder,
        apiKey,
        apiSecret,
        cloudName,
        caption || undefined,
      );
      return NextResponse.json({ success: true, url });
    }

    if (type === "before-after") {
      const beforeFile = formData.get("before") as File;
      const afterFile = formData.get("after") as File;

      if (!beforeFile || !afterFile) {
        return NextResponse.json({ error: "Nedostaju slike" }, { status: 400 });
      }

      const [beforeUrl, afterUrl] = await Promise.all([
        uploadToCloudinary(
          beforeFile,
          `${folder}/before-after`,
          apiKey,
          apiSecret,
          cloudName,
          caption || undefined,
          `${pairId}_before`,
        ),
        uploadToCloudinary(
          afterFile,
          `${folder}/before-after`,
          apiKey,
          apiSecret,
          cloudName,
          caption || undefined,
          `${pairId}_after`,
        ),
      ]);

      revalidatePath("/");

      return NextResponse.json({ success: true, beforeUrl, afterUrl });
    }

    return NextResponse.json({ error: "Nepoznat tip" }, { status: 400 });
  } catch (e) {
    console.error("Upload greška:", e);
    return NextResponse.json({ error: "Greška pri uploadu" }, { status: 500 });
  }
}

async function uploadToCloudinary(
  file: File,
  folder: string,
  apiKey: string,
  apiSecret: string,
  cloudName: string,
  caption?: string,
  publicId?: string,
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  // Pravi SHA1 signature za Cloudinary API
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const paramsToSign: Record<string, string> = {
    folder,
    timestamp,
    ...(publicId && { public_id: publicId }),
    ...(caption && { context: `caption=${caption}` }),
  };

  // Sortirani query string za potpisivanje
  const signatureStr =
    Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&") + apiSecret;

  const signature = await sha1(signatureStr);

  const uploadFormData = new FormData();
  uploadFormData.append("file", dataUri);
  uploadFormData.append("api_key", apiKey);
  uploadFormData.append("timestamp", timestamp);
  uploadFormData.append("signature", signature);
  uploadFormData.append("folder", folder);
  if (publicId) uploadFormData.append("public_id", publicId);
  if (caption) uploadFormData.append("context", `caption=${caption}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: uploadFormData },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }

  const data = await res.json();
  return data.secure_url;
}

// SHA1 bez node:crypto (Web Crypto API)
async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

console.log("ENV check:", {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY ? "postoji" : "NEDOSTAJE",
  apiSecret: process.env.CLOUDINARY_API_SECRET ? "postoji" : "NEDOSTAJE",
});
