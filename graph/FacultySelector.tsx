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
          className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          All
        </button>
        <button
          onClick={clearAll}
          className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded"
        >
          Clear
        </button>
      </div>
      <div className="space-y-2">
        {FACULTIES.map((faculty) => (
          <label
            key={faculty.id}
            className="flex items-center gap-2 cursor-pointer text-white hover:text-blue-300"
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
