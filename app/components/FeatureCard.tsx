import Link from "next/link";

interface FeatureCardProps {
  category: string;
  title: string;
  description: string;
  href: string;
}

export default function FeatureCard({ category, title, description, href }: FeatureCardProps) {
  return (
    <div className="border border-[var(--goose-ink)] group hover:border-[var(--goose-slate)] transition-colors">
      {/* Image Placeholder */}
      <div className="aspect-video bg-[#e5e5e5] flex items-center justify-center">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[#b8b8b8]"
        >
          <rect width="80" height="80" fill="transparent"/>
          <path
            d="M26 33L33 26L50 43L56 37L63 43V56H17V43L26 33Z"
            fill="currentColor"
          />
          <circle cx="28" cy="23" r="5" fill="currentColor"/>
        </svg>
      </div>

      {/* Card Content */}
      <div className="p-6 md:p-8 space-y-3">
        <p className="text-sm text-[var(--goose-slate)] uppercase tracking-wide">
          {category}
        </p>
        <h3 className="font-display text-2xl font-bold text-[var(--goose-ink)]">
          {title}
        </h3>
        <p className="text-base text-[var(--goose-ink)]">
          {description}
        </p>
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-[var(--goose-ink)] hover:text-[var(--goose-slate)] transition-colors group-hover:gap-3 group-hover:transition-all"
        >
          <span>Explore</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-transform"
          >
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
