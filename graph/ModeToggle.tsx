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
      <div className="flex bg-gray-900/90 rounded-t-lg overflow-hidden">
        <button
          onClick={() => onChange("faculty")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "faculty"
              ? "bg-blue-600 text-white"
              : "bg-transparent text-gray-300 hover:text-white"
          }`}
        >
          Faculties
        </button>
        <button
          onClick={() => onChange("search")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "search"
              ? "bg-blue-600 text-white"
              : "bg-transparent text-gray-300 hover:text-white"
          }`}
        >
          Search
        </button>
      </div>
      <div className="bg-gray-900/90 p-4 rounded-b-lg shadow-lg">
        {children}
      </div>
    </div>
  );
}
