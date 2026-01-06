"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Loading from "@/components/Loading";

const PUBLIC_PATHS = ["/login", "/"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && !PUBLIC_PATHS.includes(pathname)) {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return <Loading message="Checking authentication..." />;
  }

  if (!user && !PUBLIC_PATHS.includes(pathname)) {
    return <Loading message="Redirecting to login..." />;
  }

  return <>{children}</>;
}
