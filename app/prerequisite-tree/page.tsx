import Link from "next/link";
import Navbar from "../components/Navbar";

export default function PrerequisiteTreePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-8 py-16 text-center">
        <h1 className="font-display text-5xl font-bold text-[var(--goose-ink)] mb-6">
          Prerequisite Tree
        </h1>
        <p className="text-xl text-[var(--goose-ink)] mb-8">
          Coming soon - Visualize your course dependencies
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 border border-[var(--goose-ink)] text-[var(--goose-ink)] rounded hover:bg-[var(--goose-ink)] hover:text-[var(--goose-cream)] transition-colors"
        >
          ← Back to home
        </Link>
      </main>
    </div>
  );
}
