"use client";

const FACULTIES = [
  { id: "MAT", name: "Mathematics" },
  { id: "ENG", name: "Engineering" },
  { id: "SCI", name: "Science" },
  { id: "ART", name: "Arts" },
  { id: "ENV", name: "Environment" },
  { id: "HEA", name: "Health Sciences" },
];

type FacultySelectorProps = {
  selected: string[];
  onChange: (faculties: string[]) => void;
};

export default function FacultySelector({
  selected,
  onChange,
}: FacultySelectorProps) {
  const toggleFaculty = (facultyId: string) => {
    if (selected.includes(facultyId)) {
      onChange(selected.filter((f) => f !== facultyId));
    } else {
      onChange([...selected, facultyId]);
    }
  };

  const selectAll = () => {
    onChange(FACULTIES.map((f) => f.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="min-w-[200px]">
      <div className="flex gap-2 mb-3">
        <button
          onClick={selectAll}
          className="text-xs px-2 py-1 bg-[var(--goose-ink)] hover:bg-[var(--goose-slate)] text-[var(--goose-cream)] rounded transition-colors"
        >
          All
        </button>
        <button
          onClick={clearAll}
          className="text-xs px-2 py-1 border border-[var(--goose-ink)] text-[var(--goose-ink)] hover:bg-[var(--goose-mist)]/30 rounded transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="space-y-2">
        {FACULTIES.map((faculty) => (
          <label
            key={faculty.id}
            className="flex items-center gap-2 cursor-pointer text-[var(--goose-ink)] hover:text-[var(--goose-slate)]"
          >
            <input
              type="checkbox"
              checked={selected.includes(faculty.id)}
              onChange={() => toggleFaculty(faculty.id)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">{faculty.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
