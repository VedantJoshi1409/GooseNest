import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-[var(--goose-mist)]">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-display text-xl font-bold text-[var(--goose-ink)] hover:opacity-80 transition-opacity">
            Logo
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/degree-planner" className="text-[var(--goose-ink)] hover:text-[var(--goose-slate)] transition-colors">
              Degree planner
            </Link>
            <Link href="/prerequisite-tree" className="text-[var(--goose-ink)] hover:text-[var(--goose-slate)] transition-colors">
              Prerequisite tree
            </Link>
            <Link href="/schedule-planner" className="text-[var(--goose-ink)] hover:text-[var(--goose-slate)] transition-colors">
              Schedule planner
            </Link>
            <Link href="#" className="text-[var(--goose-ink)] hover:text-[var(--goose-slate)] transition-colors">
              Resources
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button className="px-6 py-2 border border-[var(--goose-ink)] text-[var(--goose-ink)] rounded hover:bg-[var(--goose-ink)] hover:text-[var(--goose-cream)] transition-colors">
              Sign in
            </button>
            <button className="px-6 py-2 bg-[var(--goose-ink)] text-[var(--goose-cream)] rounded hover:opacity-90 transition-opacity">
              Sign up
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
