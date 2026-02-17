import Link from "next/link";

export default function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-8 py-12 md:py-16">
      <div className="border border-[var(--goose-ink)] rounded-xl p-8 md:p-12 lg:p-16 shadow-[0_0_40px_rgba(0,0,0,0.06)]">
        <div className="space-y-6">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--goose-ink)] leading-tight fade-up">
            Plan your degree with clarity
          </h1>
          <p className="text-lg text-[var(--goose-ink)] max-w-2xl fade-up delay-1">
            GooseNest helps University of Waterloo students map their path through degree requirements. See what you&apos;ve completed and what lies ahead.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 fade-up delay-2">
            <Link
              href="/degree-planner"
              className="inline-block px-8 py-3 bg-[var(--goose-ink)] text-[var(--goose-cream)] rounded hover:opacity-90 transition-opacity text-center"
            >
              Start planning
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
