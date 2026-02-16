"use client";

import { useState } from "react";

type CourseSearchProps = {
  onSearch: (courses: string[], includeUnlocked: boolean) => void;
};

export default function CourseSearch({ onSearch }: CourseSearchProps) {
  const [input, setInput] = useState("");
  const [includeUnlocked, setIncludeUnlocked] = useState(true);

  const handleSearch = () => {
    const courses = input
      .toUpperCase()
      .split(/[,\s]+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    onSearch(courses, includeUnlocked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-w-[250px]">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="AFM101, CS135, MATH145..."
        className="w-full px-3 py-2 bg-[var(--goose-cream)] text-[var(--goose-ink)] rounded border border-[var(--goose-ink)] focus:ring-2 focus:ring-[var(--goose-slate)] focus:outline-none text-sm mb-3"
      />

      <label className="flex items-center gap-2 cursor-pointer text-[var(--goose-ink)] hover:text-[var(--goose-slate)] mb-3">
        <input
          type="checkbox"
          checked={includeUnlocked}
          onChange={(e) => setIncludeUnlocked(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm">Include unlocked courses</span>
      </label>

      <button
        onClick={handleSearch}
        className="w-full px-3 py-2 bg-[var(--goose-ink)] hover:bg-[var(--goose-slate)] text-[var(--goose-cream)] rounded text-sm font-display font-medium transition-colors"
      >
        Search
      </button>
    </div>
  );
}
