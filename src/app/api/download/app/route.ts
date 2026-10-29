import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Forces a browser download of the standalone single-file Saathy app
 * (public/Saathy.html) instead of rendering it in the tab.
 */
export async function GET() {
  try {
    const file = await readFile(path.join(process.cwd(), "public", "Saathy.html"));
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": 'attachment; filename="Saathy.html"',
        "Content-Length": String(file.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Standalone app HTML not found" }, { status: 404 });
  }
}
