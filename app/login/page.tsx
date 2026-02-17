"use client";

import { createClient } from "@/lib/supabase/client";
import Navbar from "../components/Navbar";

export default function LoginPage() {
  const handleSignIn = () => {
    const supabase = createClient();
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[var(--goose-cream)]">
      <Navbar />
      <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 73px)" }}>
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-[var(--goose-ink)] mb-2">
          GooseNest
        </h1>
        <p className="text-[var(--goose-slate)] mb-8">
          Plan your University of Waterloo degree
        </p>
        <button
          onClick={handleSignIn}
          className="px-8 py-3 bg-[var(--goose-ink)] text-[var(--goose-cream)] rounded font-display font-semibold hover:opacity-90 transition-opacity"
        >
          Sign in with Google
        </button>
      </div>
      </div>
    </div>
  );
}
