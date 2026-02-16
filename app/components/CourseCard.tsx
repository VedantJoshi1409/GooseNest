'use client';

import { useState, useRef, useEffect } from 'react';

interface Course {
  code: string;
  name: string;
}

interface CourseDetail {
  description: string | null;
  subject: string | null;
  level: number | null;
  facultyName: string;
  prereqs: { prereqCode: string; prereq: { code: string; title: string } }[];
  unlocks: { courseCode: string; course: { code: string; title: string } }[];
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
  const [expanded, setExpanded] = useState(false);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
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
      if (e.key === 'Escape') {
        if (isEditing) {
          onCancelEdit();
          setShowTermSubmenu(false);
        }
        if (expanded) {
          setExpanded(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isEditing, onCancelEdit, expanded]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      onCancelEdit();
      setShowTermSubmenu(false);
    } else {
      onEdit();
    }
  };

  const handleCardClick = () => {
    if (isEditing) return;
    const willExpand = !expanded;
    setExpanded(willExpand);

    if (willExpand && !courseDetail) {
      setLoadingDetail(true);
      fetch(`/api/courses/${encodeURIComponent(course.code)}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) setCourseDetail(data);
        })
        .finally(() => setLoadingDetail(false));
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
      <div
        onClick={handleCardClick}
        className={`border p-4 rounded transition-colors cursor-pointer ${
          missingPrereqs
            ? 'border-red-400 bg-red-50'
            : expanded
              ? 'border-[var(--goose-ink)] bg-[var(--goose-cream)]'
              : 'border-[var(--goose-mist)] hover:border-[var(--goose-ink)]'
        }`}
      >
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

          <div className="flex items-center gap-1">
            {/* Expand/collapse indicator */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`text-[var(--goose-slate)] transition-transform ${expanded ? 'rotate-180' : ''}`}
            >
              <path d="M4 6l4 4 4-4" />
            </svg>

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

        {/* Expanded course info dropdown */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[var(--goose-mist)]" onClick={(e) => e.stopPropagation()}>
            {loadingDetail ? (
              <p className="text-[var(--goose-slate)] italic text-sm">Loading course details...</p>
            ) : courseDetail ? (
              <div className="space-y-3 text-sm">
                {/* Subject & Faculty */}
                <div className="flex flex-wrap gap-2">
                  {courseDetail.subject && (
                    <span className="px-2 py-0.5 rounded text-xs font-display bg-[var(--goose-mist)]/40 text-[var(--goose-ink)]">
                      {courseDetail.subject}
                    </span>
                  )}
                  {courseDetail.level && (
                    <span className="px-2 py-0.5 rounded text-xs font-display bg-[var(--goose-mist)]/40 text-[var(--goose-ink)]">
                      Level {courseDetail.level}
                    </span>
                  )}
                </div>

                {/* Description */}
                {courseDetail.description && (
                  <p className="text-[var(--goose-ink)] leading-relaxed">
                    {courseDetail.description}
                  </p>
                )}

                {/* Prerequisites */}
                {courseDetail.prereqs.length > 0 && (
                  <div>
                    <h4 className="font-display font-semibold text-[var(--goose-ink)] mb-1">Prerequisites</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {courseDetail.prereqs.map((p) => (
                        <span
                          key={p.prereqCode}
                          className="px-2 py-0.5 rounded text-xs font-display border border-[var(--goose-mist)] text-[var(--goose-slate)]"
                        >
                          {p.prereqCode}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unlocks */}
                {courseDetail.unlocks.length > 0 && (
                  <div>
                    <h4 className="font-display font-semibold text-[var(--goose-ink)] mb-1">Unlocks</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {courseDetail.unlocks.map((u) => (
                        <span
                          key={u.courseCode}
                          className="px-2 py-0.5 rounded text-xs font-display border border-[var(--goose-mist)] text-[var(--goose-slate)]"
                        >
                          {u.courseCode}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* No extra info fallback */}
                {!courseDetail.description && courseDetail.prereqs.length === 0 && courseDetail.unlocks.length === 0 && (
                  <p className="text-[var(--goose-slate)] italic">No additional information available for this course.</p>
                )}
              </div>
            ) : (
              <p className="text-[var(--goose-slate)] italic text-sm">Failed to load course details.</p>
            )}
          </div>
        )}
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
