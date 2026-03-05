"use client";

import Loading from "@/components/Loading";
import { useAuth } from "@/contexts/AuthContext";
import CoolLink from "@/components/CoolLink";
import GlitchText from "@/components/GlitchText";

const HomePage: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading message="Checking login status..." />;
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-4xl">
        <section className="flex h-[70vh] max-h-[50rem] flex-col items-center justify-center gap-6 rounded-2xl border border-slate-700 bg-slate-800/80 p-6 text-center shadow-xl">
          <GlitchText text="DSA Judge+" />
          {user ? (
            <CoolLink href="/problems" text="Start Solving"></CoolLink>
          ) : (
            <CoolLink href="/login" text="Login to Start Solving"></CoolLink>
          )}
        </section>
      </div>
    </div>
  );
};

export default HomePage;
