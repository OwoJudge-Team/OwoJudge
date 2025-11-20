import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  // Mock user data - replace with actual database query
  const users = [
    {
      id: 1,
      name: "Alice",
      username: "alice",
      email: "alice@example.com",
      bio: "Passionate competitive programmer and algorithm enthusiast.",
      points: 1500,
      problemsSolved: 25,
      rank: 1,
      joinDate: "2024-01-15",
      submissions: 120,
      acceptedSubmissions: 45,
    },
    {
      id: 2,
      name: "Bob",
      username: "bob",
      email: "bob@example.com",
      bio: "Software engineer who loves solving coding challenges.",
      points: 1400,
      problemsSolved: 23,
      rank: 2,
      joinDate: "2024-02-20",
      submissions: 95,
      acceptedSubmissions: 38,
    },
  ];

  const user = users.find((u) => u.id === parseInt(id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
