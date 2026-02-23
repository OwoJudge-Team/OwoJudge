"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import Loading from "@/components/Loading";
import { useAuth } from "@/contexts/AuthContext";

const announcements = [
  {
    title: "Judge cluster upgrade",
    time: "Today",
    body: `**Status:** Live\n\n- Faster feedback on all languages\n- Runtimes more stable under load`,
  },
  {
    title: "Night Sprint #08 opens soon",
    time: "6h",
    body: `**Format:** 5 timed tasks\n\n- Bonus for first 50 accepted\n- Editorial drops after finish`,
  },
  {
    title: "Editorial refresh in progress",
    time: "Fri",
    body: `**Goal:** simpler explanations\n\n- Clearer proofs\n- Better edge case notes`,
  },
];

const HomePage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <Loading message="Checking login status..." />;
  }

  if (!user) {
    return <Loading message="Redirecting to login..." />;
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-slate-100">Announcements</h2>
          <div className="mt-6 space-y-4">
            {announcements.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-100">{item.title}</h3>
                  <span className="text-xs text-slate-500">{item.time}</span>
                </div>
                <div className="mt-3">
                  <MarkdownRenderer content={item.body} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
