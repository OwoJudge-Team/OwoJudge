import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ displayID: string }> }
) {
  const { displayID } = await params;

  // Prefer per-ID markdown at src/app/api/problems/<id>/index.md, fallback to the [displayID]/index.md in this folder
  const candidates = [
    path.join(process.cwd(), "src", "app", "api", "problems", displayID, "index.md"),
    path.join(process.cwd(), "src", "app", "api", "problems", "[displayID]", "index.md"),
  ];
  let description = "# Description not found";
  for (const p of candidates) {
    try {
      description = await fs.readFile(p, "utf8");
      break;
    } catch {
      // try next
    }
  }

  // Mock problem data for frontend-only testing
  const mock = {
    _id: "mock-" + displayID,
    displayID,
    title: "Sample Problem " + displayID.toUpperCase(),
    timeLimit: 1000,
    memoryLimit: 262144,
    scorePolicy: "sum",
    tags: ["sample", "math"],
    problemRelatedTags: ["intro"],
    submissionDetail: { accepted: 0, submitted: 0 },
    userDetail: { solved: 0, attempted: 0 },
    description,
    sampleTestcases: [
      { filename: "sample1.in", point: 0, subtask: "sample" },
      { filename: "sample2.in", point: 0, subtask: "sample" },
    ],
  };

  return NextResponse.json(mock);
}
