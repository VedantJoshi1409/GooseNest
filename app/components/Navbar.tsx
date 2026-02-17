"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-[var(--goose-mist)]">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="GooseNest" width={40} height={40} />
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/degree-planner" className="text-[var(--goose-ink)] hover:text-[var(--goose-slate)] transition-colors">
              Degree planner
            </Link>
            <Link href="/schedule-planner" className="text-[var(--goose-ink)] hover:text-[var(--goose-slate)] transition-colors">
              Schedule planner
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? null : user ? (
              <>
                <span className="text-sm text-[var(--goose-slate)]">
                  {user.name || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-6 py-2 border border-[var(--goose-ink)] text-[var(--goose-ink)] rounded hover:bg-[var(--goose-ink)] hover:text-[var(--goose-cream)] transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2 bg-[var(--goose-ink)] text-[var(--goose-cream)] rounded hover:opacity-90 transition-opacity"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
