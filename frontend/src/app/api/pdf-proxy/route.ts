import { NextRequest, NextResponse } from "next/server";

const isPrivateHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }
  if (host.startsWith("10.") || host.startsWith("192.168.")) {
    return true;
  }
  return /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
};

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get("url");
  if (!sourceUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url parameter" }, { status: 400 });
  }

  if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) {
    return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 });
  }

  if (isPrivateHost(parsed.hostname)) {
    return NextResponse.json({ error: "Private hosts are not allowed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/pdf,*/*",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF (${upstream.status})` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("pdf")) {
      return NextResponse.json(
        { error: "Target URL does not look like a PDF resource" },
        { status: 415 }
      );
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to fetch PDF" }, { status: 502 });
  }
}
