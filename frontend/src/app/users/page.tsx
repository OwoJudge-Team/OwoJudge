"use client";
import { useEffect, useState } from "react";

export default function Page() {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error);
  }, []);
  return <pre>{JSON.stringify(users, null, 2)}</pre>;
}
