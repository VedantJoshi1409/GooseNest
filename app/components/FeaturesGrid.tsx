import FeatureCard from "./FeatureCard";

export default function FeaturesGrid() {
  const features = [
    {
      category: "Degree",
      title: "Select your path",
      description: "Choose and modify your degree program with ease.",
      href: "/degree-planner",
    },
    {
      category: "Schedule",
      title: "Plan term by term",
      description: "Organize your courses across all semesters ahead.",
      href: "/schedule-planner",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-8 py-16 md:py-20">
      <div className="text-center space-y-4 mb-12">
        <p className="text-sm uppercase tracking-wide text-[var(--goose-slate)]">
          Features
        </p>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-[var(--goose-ink)]">
          Everything you need
        </h2>
        <p className="text-lg text-[var(--goose-ink)]">
          Tools built for your success
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 md:gap-8">
        {features.map((feature, index) => (
          <div
            key={feature.href}
            className={`fade-up ${index === 1 ? "delay-1" : index === 2 ? "delay-2" : ""}`}
          >
            <FeatureCard {...feature} />
          </div>
        ))}
      </div>
    </section>
  );
}
