import Link from "next/link";

export default function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-8 py-12 md:py-16">
      <div className="border border-[var(--goose-ink)] p-8 md:p-12 lg:p-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="lg:col-span-3 space-y-6">
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
              <button className="px-8 py-3 border border-[var(--goose-ink)] text-[var(--goose-ink)] rounded hover:bg-[var(--goose-ink)] hover:text-[var(--goose-cream)] transition-colors">
                Learn more
              </button>
            </div>
          </div>

          {/* Right Image Placeholder */}
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="w-full aspect-square bg-[#e5e5e5] rounded flex items-center justify-center">
              <svg
                width="120"
                height="120"
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-[#b8b8b8]"
              >
                <rect width="120" height="120" fill="transparent"/>
                <path
                  d="M40 50L50 40L75 65L85 55L95 65V85H25V65L40 50Z"
                  fill="currentColor"
                />
                <circle cx="42" cy="35" r="8" fill="currentColor"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
