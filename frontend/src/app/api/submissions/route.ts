import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { problemID, language, source } = body || {};

  if (!problemID || !language || !source) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }
  // Simulate a small delay and success response
  return NextResponse.json(
    {
      id: "mock-submission-1",
      problemID,
      language,
      status: "pending",
      createdTime: new Date().toISOString(),
    },
    { status: 201 }
  );
}
