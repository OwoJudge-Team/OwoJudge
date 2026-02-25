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

const sanitizeHtml = (html: string, baseUrl: string): string => {
  if (!/<head[\s>]/i.test(html)) {
    return html;
  }

  const hasBase = /<base[\s>]/i.test(html);
  const baseTag = hasBase ? "" : `<base href="${baseUrl}">`;
  return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
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
      redirect: "follow",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Failed to fetch target (${upstream.status})` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get("content-type") || "text/html; charset=utf-8";
    const isHtml = contentType.toLowerCase().includes("text/html");

    if (isHtml) {
      const html = await upstream.text();
      const adjusted = sanitizeHtml(html, parsed.toString());
      return new NextResponse(adjusted, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to fetch target URL" }, { status: 502 });
  }
}
