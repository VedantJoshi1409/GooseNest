"use client";

import { ReactNode } from "react";

type ModeToggleProps = {
  mode: "faculty" | "search";
  onChange: (mode: "faculty" | "search") => void;
  children: ReactNode;
};

export default function ModeToggle({
  mode,
  onChange,
  children,
}: ModeToggleProps) {
  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="flex bg-[var(--goose-cream)] border border-[var(--goose-ink)] rounded-t-lg overflow-hidden">
        <button
          onClick={() => onChange("faculty")}
          className={`px-4 py-2 text-sm font-display font-medium transition-colors ${
            mode === "faculty"
              ? "bg-[var(--goose-ink)] text-[var(--goose-cream)]"
              : "bg-transparent text-[var(--goose-slate)] hover:text-[var(--goose-ink)]"
          }`}
        >
          Faculties
        </button>
        <button
          onClick={() => onChange("search")}
          className={`px-4 py-2 text-sm font-display font-medium transition-colors ${
            mode === "search"
              ? "bg-[var(--goose-ink)] text-[var(--goose-cream)]"
              : "bg-transparent text-[var(--goose-slate)] hover:text-[var(--goose-ink)]"
          }`}
        >
          Search
        </button>
      </div>
      <div className="bg-[var(--goose-cream)] border border-t-0 border-[var(--goose-ink)] p-4 rounded-b-lg shadow-lg">
        {children}
      </div>
    </div>
  );
}
