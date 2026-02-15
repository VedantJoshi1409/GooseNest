'use client';

import { useState, useRef, useEffect } from 'react';

interface Course {
  code: string;
  name: string;
}

interface CourseCardProps {
  course: Course;
  completed: boolean;
  missingPrereqs?: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onMove: (targetTerm: string) => void;
  onRemove: () => void;
  onCancelEdit: () => void;
}

const TERMS = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];

export default function CourseCard({
  course,
  completed,
  missingPrereqs,
  isEditing,
  onEdit,
  onMove,
  onRemove,
  onCancelEdit
}: CourseCardProps) {
  const [showTermSubmenu, setShowTermSubmenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Close edit menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isEditing && cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onCancelEdit();
        setShowTermSubmenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, onCancelEdit]);

  // Close edit menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditing) {
        onCancelEdit();
        setShowTermSubmenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isEditing, onCancelEdit]);

  const handleEditClick = () => {
    if (isEditing) {
      onCancelEdit();
      setShowTermSubmenu(false);
    } else {
      onEdit();
    }
  };

  const handleMoveClick = () => {
    setShowTermSubmenu(!showTermSubmenu);
  };

  const handleTermSelect = (term: string) => {
    onMove(term);
    setShowTermSubmenu(false);
  };

  const handleRemoveClick = () => {
    onRemove();
  };

  return (
    <div ref={cardRef} className="relative">
      <div className={`border p-4 rounded transition-colors ${missingPrereqs ? 'border-red-400 bg-red-50' : 'border-[var(--goose-mist)] hover:border-[var(--goose-ink)]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {completed && !missingPrereqs && (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-green-600 shrink-0">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {missingPrereqs && (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-red-500 shrink-0" aria-label="Missing prerequisites">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 6v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="14" r="1" fill="currentColor" />
              </svg>
            )}
            <div>
              <div className={`font-display font-semibold ${completed ? 'text-[var(--goose-slate)]' : missingPrereqs ? 'text-red-700' : 'text-[var(--goose-ink)]'}`}>
                {course.code}
              </div>
              <div className={`text-sm mt-1 ${missingPrereqs ? 'text-red-500' : 'text-[var(--goose-slate)]'}`}>
                {course.name}
              </div>
              {missingPrereqs && (
                <div className="text-xs text-red-500 mt-1">No prerequisites met</div>
              )}
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={handleEditClick}
            className="text-[var(--goose-ink)] hover:text-[var(--goose-slate)] transition-colors p-2"
            aria-label="Edit course"
            aria-expanded={isEditing}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Edit dropdown menu */}
      {isEditing && (
        <div className="mt-2 border border-[var(--goose-ink)] rounded bg-[var(--goose-cream)] shadow-lg z-20">
          {/* Move to term option */}
          <div className="relative">
            <button
              onClick={handleMoveClick}
              className="w-full text-left px-4 py-2 hover:bg-[var(--goose-mist)]/30 transition-colors flex items-center justify-between"
              aria-expanded={showTermSubmenu}
            >
              <span>Move to term...</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${showTermSubmenu ? 'rotate-90' : ''}`}
              >
                <path d="M6 4l4 4-4 4" />
              </svg>
            </button>

            {/* Term submenu */}
            {showTermSubmenu && (
              <div className="md:absolute md:left-full md:top-0 md:ml-1 bg-[var(--goose-cream)] border border-[var(--goose-ink)] rounded shadow-lg md:min-w-[120px] mt-2 md:mt-0">
                {TERMS.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleTermSelect(term)}
                    className="w-full text-left px-4 py-2 hover:bg-[var(--goose-mist)]/30 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Remove option */}
          <button
            onClick={handleRemoveClick}
            className="w-full text-left px-4 py-2 hover:bg-[var(--goose-mist)]/30 transition-colors border-t border-[var(--goose-mist)] text-red-600"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
