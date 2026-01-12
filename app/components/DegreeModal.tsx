'use client';

import { useEffect, useState, useMemo } from 'react';

interface DegreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDegree: (degree: string) => void;
}

const degrees = [
  { id: 1, name: "Bachelor of Computer Science", code: "BCS" },
  { id: 2, name: "Bachelor of Mathematics", code: "BMath" },
  { id: 3, name: "Bachelor of Software Engineering", code: "BSE" },
  { id: 4, name: "Bachelor of Engineering", code: "BEng" },
  { id: 5, name: "Bachelor of Science", code: "BSc" },
  { id: 6, name: "Honours Mathematics", code: "HMath" },
  { id: 7, name: "Data Science", code: "DS" },
  { id: 8, name: "Business Administration and Computer Science Double Degree", code: "BBA/BCS" },
];

export default function DegreeModal({ isOpen, onClose, onSelectDegree }: DegreeModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter degrees based on search query using useMemo
  const filteredDegrees = useMemo(() => {
    return degrees.filter((degree) =>
      degree.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDegreeClick = (degreeName: string) => {
    onSelectDegree(degreeName);
    setSearchQuery(""); // Reset search on selection
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--goose-cream)] border-2 border-[var(--goose-ink)] max-w-2xl w-full mx-4 max-h-[80vh] rounded-lg overflow-hidden relative animate-modal-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--goose-ink)] hover:text-[var(--goose-slate)] transition-colors z-10"
          aria-label="Close modal"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Modal content */}
        <div className="p-6 md:p-8">
          <h2
            id="modal-title"
            className="font-display text-2xl md:text-3xl font-bold text-[var(--goose-ink)] mb-6"
          >
            Select your degree
          </h2>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Search for a degree..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-[var(--goose-ink)] px-4 py-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--goose-slate)]"
          />

          {/* Degree list */}
          <div className="overflow-y-auto max-h-96 space-y-2">
            {filteredDegrees.length > 0 ? (
              filteredDegrees.map((degree) => (
                <div
                  key={degree.id}
                  onClick={() => handleDegreeClick(degree.name)}
                  className="p-4 border border-[var(--goose-mist)] hover:border-[var(--goose-ink)] cursor-pointer rounded transition-colors hover:bg-[var(--goose-mist)]/30"
                >
                  <div className="font-display font-semibold text-[var(--goose-ink)]">
                    {degree.name}
                  </div>
                  <div className="text-sm text-[var(--goose-slate)] mt-1">
                    {degree.code}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[var(--goose-slate)] italic">
                No degrees found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
