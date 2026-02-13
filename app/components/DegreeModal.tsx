"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useTemplate } from "../context/TemplateContext";

interface DegreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDegree: (templateId: number, degreeName: string) => void;
}

interface SelectedDegreeState {
  id: number;
  name: string;
  requirements?: any[];
}

interface CustomRequirement {
  id: string;
  title: string;
  amount: number;
  eligibleCourses: string[];
  eligibleFaculties: string[];
  isCustom: true;
}

export default function DegreeModal({
  isOpen,
  onClose,
  onSelectDegree,
}: DegreeModalProps) {
  const { templates, isLoading } = useTemplate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDegree, setSelectedDegree] =
    useState<SelectedDegreeState | null>(null);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [isEditingRequirements, setIsEditingRequirements] = useState(false);
  const [enabledRequirements, setEnabledRequirements] = useState<Set<number>>(
    new Set()
  );
  const [customRequirements, setCustomRequirements] = useState<
    CustomRequirement[]
  >([]);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  // Custom requirement form state
  const [customTitle, setCustomTitle] = useState("");
  const [customAmount, setCustomAmount] = useState(1);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedFaculties, setSelectedFaculties] = useState<string[]>([]);
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  // Mock data - in production, fetch from API
  const mockCourses = [
    {
      code: "CS 135",
      name: "Designing Functional Programs",
      faculty: "Mathematics",
    },
    {
      code: "CS 136",
      name: "Elementary Algorithm Design and Data Abstraction",
      faculty: "Mathematics",
    },
    {
      code: "MATH 135",
      name: "Algebra for Honours Mathematics",
      faculty: "Mathematics",
    },
    {
      code: "MATH 136",
      name: "Linear Algebra 1 for Honours Mathematics",
      faculty: "Mathematics",
    },
    {
      code: "ENGL 109",
      name: "Introduction to Academic Writing",
      faculty: "Arts",
    },
    { code: "PSYCH 101", name: "Introductory Psychology", faculty: "Arts" },
    { code: "ECE 105", name: "Classical Mechanics", faculty: "Engineering" },
    {
      code: "ECE 106",
      name: "Electricity and Magnetism",
      faculty: "Engineering",
    },
  ];

  const faculties = [
    "Mathematics",
    "Arts",
    "Engineering",
    "Science",
    "Environment",
    "Health",
  ];

  const filteredCourses = useMemo(() => {
    return mockCourses.filter(
      (course) =>
        course.code.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
        course.name.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
        course.faculty.toLowerCase().includes(courseSearchQuery.toLowerCase())
    );
  }, [courseSearchQuery]);

  // Filter degrees based on search query using useMemo
  const filteredDegrees = useMemo(() => {
    return templates.filter((degree) =>
      degree.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        courseDropdownRef.current &&
        !courseDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCourseDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (isCourseDropdownOpen) {
          setIsCourseDropdownOpen(false);
        } else if (isCreatingCustom) {
          setIsCreatingCustom(false);
        } else if (isDropdownOpen) {
          setIsDropdownOpen(false);
        } else if (isEditingRequirements) {
          setIsEditingRequirements(false);
        } else if (selectedDegree) {
          setSelectedDegree(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [
    isOpen,
    isDropdownOpen,
    isEditingRequirements,
    isCreatingCustom,
    isCourseDropdownOpen,
    selectedDegree,
    onClose,
  ]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDegree(null);
      setSearchQuery("");
      setIsDropdownOpen(false);
      setIsEditingRequirements(false);
      setEnabledRequirements(new Set());
      setCustomRequirements([]);
      setIsCreatingCustom(false);
      resetCustomForm();
    }
  }, [isOpen]);

  const resetCustomForm = () => {
    setCustomTitle("");
    setCustomAmount(1);
    setCourseSearchQuery("");
    setSelectedCourses([]);
    setSelectedFaculties([]);
  };

  if (!isOpen) return null;

  const handleDegreeClick = async (templateId: number, degreeName: string) => {
    setIsDropdownOpen(false);
    setSearchQuery(degreeName);
    setLoadingRequirements(true);

    try {
      // Fetch full template details with requirements
      const response = await fetch(`/api/templates/${templateId}`);
      if (response.ok) {
        const templateData = await response.json();
        setSelectedDegree({
          id: templateId,
          name: degreeName,
          requirements: templateData.requirements || [],
        });
        // Enable all requirements by default
        const allRequirementIds = new Set(
          templateData.requirements?.map((_: any, index: number) => index) || []
        );
        setEnabledRequirements(allRequirementIds);
        setIsEditingRequirements(false);
      }
    } catch (error) {
      console.error("Error fetching template details:", error);
    } finally {
      setLoadingRequirements(false);
    }
  };

  const handleEditDegree = () => {
    setIsEditingRequirements(true);
  };

  const handleCancelEdit = () => {
    // Restore all requirements to enabled
    if (selectedDegree?.requirements) {
      const allRequirementIds = new Set(
        selectedDegree.requirements.map((_, index) => index)
      );
      setEnabledRequirements(allRequirementIds);
    }
    setIsEditingRequirements(false);
    setIsCreatingCustom(false);
  };

  const handleSaveEdit = () => {
    setIsEditingRequirements(false);
    setIsCreatingCustom(false);
  };

  const toggleRequirement = (index: number) => {
    setEnabledRequirements((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleCreateCustomRequirement = () => {
    setIsCreatingCustom(true);
  };

  const handleSaveCustomRequirement = () => {
    if (!customTitle.trim()) {
      alert("Please enter a requirement title");
      return;
    }

    if (selectedCourses.length === 0 && selectedFaculties.length === 0) {
      alert("Please select at least one course or faculty");
      return;
    }

    const newCustomReq: CustomRequirement = {
      id: `custom-${Date.now()}`,
      title: customTitle,
      amount: customAmount,
      eligibleCourses: selectedCourses,
      eligibleFaculties: selectedFaculties,
      isCustom: true,
    };

    setCustomRequirements([...customRequirements, newCustomReq]);
    resetCustomForm();
    setIsCreatingCustom(false);
  };

  const handleCancelCustomRequirement = () => {
    resetCustomForm();
    setIsCreatingCustom(false);
  };

  const toggleCourse = (courseCode: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseCode)
        ? prev.filter((c) => c !== courseCode)
        : [...prev, courseCode]
    );
  };

  const toggleFaculty = (faculty: string) => {
    setSelectedFaculties((prev) =>
      prev.includes(faculty)
        ? prev.filter((f) => f !== faculty)
        : [...prev, faculty]
    );
  };

  const removeCustomRequirement = (id: string) => {
    setCustomRequirements((prev) => prev.filter((req) => req.id !== id));
  };

  const hasModifications = () => {
    if (!selectedDegree?.requirements) return false;
    // Check if any template requirements were toggled off
    const allEnabled = selectedDegree.requirements.every((_, index) =>
      enabledRequirements.has(index)
    );
    // Check if custom requirements were added
    return !allEnabled || customRequirements.length > 0;
  };

  const handleConfirmSelection = async () => {
    if (!selectedDegree) return;

    // TODO: replace with actual user ID from auth
    const userId = 1;

    try {
      if (!hasModifications()) {
        // No modifications — assign default template
        await fetch(`/api/users/${userId}/degree`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: selectedDegree.id }),
        });
      } else {
        // Build requirements list from enabled template reqs + custom reqs
        const requirements: any[] = [];

        // Add enabled template requirements
        selectedDegree.requirements?.forEach((req, index) => {
          if (enabledRequirements.has(index)) {
            requirements.push({
              name: req.courseGroup?.name || req.name || `Requirement ${index + 1}`,
              amount: req.amount || 1,
              courseGroupId: req.courseGroupId,
            });
          }
        });

        // Add custom requirements
        customRequirements.forEach((req) => {
          requirements.push({
            name: req.title,
            amount: req.amount,
            courseCodes: req.eligibleCourses,
          });
        });

        await fetch(`/api/users/${userId}/degree`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: selectedDegree.id,
            name: `${selectedDegree.name} (Custom)`,
            requirements,
          }),
        });
      }

      onSelectDegree(selectedDegree.id, selectedDegree.name);
      onClose();
    } catch (error) {
      console.error("Error saving degree selection:", error);
    }
  };

  const allRequirements = [
    ...(selectedDegree?.requirements || []).map((req, index) => ({
      ...req,
      index,
      isCustom: false,
    })),
    ...customRequirements,
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--goose-cream)] border-2 border-[var(--goose-ink)] w-full max-w-2xl h-[600px] rounded-lg overflow-hidden relative animate-modal-in flex flex-col"
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
        <div className="p-6 md:p-8 flex-1 overflow-hidden">
          <h2
            id="modal-title"
            className="font-display text-2xl md:text-3xl font-bold text-[var(--goose-ink)] mb-6"
          >
            Select your degree
          </h2>

          {/* Search bar with dropdown */}
          <div className="relative mb-6">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for a degree..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full border border-[var(--goose-ink)] px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--goose-slate)] cursor-pointer"
            />

            {/* Dropdown */}
            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-2 bg-[var(--goose-cream)] border border-[var(--goose-ink)] rounded shadow-lg z-20 max-h-64 overflow-y-auto"
              >
                {isLoading ? (
                  <div className="p-4 text-center text-[var(--goose-slate)] italic">
                    Loading degrees...
                  </div>
                ) : filteredDegrees.length > 0 ? (
                  filteredDegrees.map((degree) => (
                    <div
                      key={degree.id}
                      onClick={() => handleDegreeClick(degree.id, degree.name)}
                      className="p-3 hover:bg-[var(--goose-mist)]/50 cursor-pointer border-b border-[var(--goose-mist)] last:border-b-0 transition-colors"
                    >
                      <div className="font-display font-semibold text-[var(--goose-ink)]">
                        {degree.name}
                      </div>
                      {degree.code && (
                        <div className="text-sm text-[var(--goose-slate)] mt-1">
                          {degree.code}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-[var(--goose-slate)] italic">
                    No degrees found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Requirements Section - Always visible with fixed height */}
          <div className="border border-[var(--goose-ink)] p-6 md:p-8 rounded h-[280px] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-xl font-bold text-[var(--goose-ink)]">
                Requirements
              </h3>
              {isEditingRequirements && !isCreatingCustom && (
                <button
                  onClick={handleCreateCustomRequirement}
                  className="text-xs px-3 py-1 border border-[var(--goose-ink)] rounded hover:bg-[var(--goose-mist)]/50 transition-colors"
                >
                  + Add Custom
                </button>
              )}
            </div>

            {/* Custom Requirement Form */}
            {isCreatingCustom ? (
              <div className="space-y-3 border border-[var(--goose-slate)] p-4 rounded bg-[var(--goose-mist)]/30">
                <div>
                  <label className="text-sm font-medium text-[var(--goose-ink)] block mb-1">
                    Requirement Title
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g., Additional Electives"
                    className="w-full border border-[var(--goose-ink)] px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--goose-slate)]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--goose-ink)] block mb-1">
                    Number of Courses Required
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customAmount}
                    onChange={(e) =>
                      setCustomAmount(parseInt(e.target.value) || 1)
                    }
                    className="w-full border border-[var(--goose-ink)] px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--goose-slate)]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--goose-ink)] block mb-1">
                    Eligible Course Groups
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {faculties.map((faculty) => (
                      <button
                        key={faculty}
                        onClick={() => toggleFaculty(faculty)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          selectedFaculties.includes(faculty)
                            ? "bg-[var(--goose-ink)] text-[var(--goose-cream)] border-[var(--goose-ink)]"
                            : "border-[var(--goose-slate)] hover:bg-[var(--goose-mist)]/50"
                        }`}
                      >
                        {faculty}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--goose-ink)] block mb-1">
                    Eligible Courses (Search & Select)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={courseSearchQuery}
                      onChange={(e) => setCourseSearchQuery(e.target.value)}
                      onFocus={() => setIsCourseDropdownOpen(true)}
                      placeholder="Search courses..."
                      className="w-full border border-[var(--goose-ink)] px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--goose-slate)]"
                    />

                    {isCourseDropdownOpen && (
                      <div
                        ref={courseDropdownRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-[var(--goose-cream)] border border-[var(--goose-ink)] rounded shadow-lg z-30 max-h-40 overflow-y-auto"
                      >
                        {filteredCourses.map((course) => (
                          <div
                            key={course.code}
                            onClick={() => toggleCourse(course.code)}
                            className="p-2 hover:bg-[var(--goose-mist)]/50 cursor-pointer border-b border-[var(--goose-mist)] last:border-b-0 flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCourses.includes(course.code)}
                              onChange={() => {}}
                              className="w-3 h-3 accent-[var(--goose-ink)]"
                            />
                            <div>
                              <div className="text-xs font-semibold text-[var(--goose-ink)]">
                                {course.code}
                              </div>
                              <div className="text-[10px] text-[var(--goose-slate)]">
                                {course.name} ({course.faculty})
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedCourses.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedCourses.map((courseCode) => (
                        <span
                          key={courseCode}
                          className="text-xs bg-[var(--goose-ink)] text-[var(--goose-cream)] px-2 py-0.5 rounded flex items-center gap-1"
                        >
                          {courseCode}
                          <button
                            onClick={() => toggleCourse(courseCode)}
                            className="hover:text-red-300"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCancelCustomRequirement}
                    className="flex-1 text-xs px-3 py-1.5 border border-[var(--goose-ink)] rounded hover:bg-[var(--goose-mist)]/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCustomRequirement}
                    className="flex-1 text-xs px-3 py-1.5 bg-[var(--goose-ink)] text-[var(--goose-cream)] rounded hover:bg-[var(--goose-slate)] transition-colors"
                  >
                    Add Requirement
                  </button>
                </div>
              </div>
            ) : loadingRequirements ? (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-center text-[var(--goose-slate)] italic">
                  Loading requirements...
                </p>
              </div>
            ) : allRequirements.length > 0 ? (
              <div className="space-y-3">
                {allRequirements.map((req, displayIndex) => {
                  const isCustomReq = "isCustom" in req && req.isCustom;
                  const actualIndex = isCustomReq ? -1 : req.index;
                  const isEnabled =
                    isCustomReq || enabledRequirements.has(actualIndex);

                  return (
                    <div
                      key={isCustomReq ? req.id : displayIndex}
                      className={`text-[var(--goose-ink)] ${
                        isEditingRequirements ? "flex items-start gap-3" : ""
                      } ${
                        !isEnabled && !isEditingRequirements ? "hidden" : ""
                      }`}
                    >
                      {isEditingRequirements && !isCustomReq && (
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleRequirement(actualIndex)}
                          className="mt-1 w-4 h-4 cursor-pointer accent-[var(--goose-ink)]"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <p
                            className={`font-medium ${
                              !isEnabled ? "text-[var(--goose-slate)]" : ""
                            }`}
                          >
                            {isCustomReq
                              ? req.title
                              : req.courseGroup?.name ||
                                `Requirement ${displayIndex + 1}`}
                            {isCustomReq && (
                              <span className="ml-2 text-xs bg-[var(--goose-slate)] text-[var(--goose-cream)] px-2 py-0.5 rounded">
                                Custom
                              </span>
                            )}
                          </p>
                          {isEditingRequirements && isCustomReq && (
                            <button
                              onClick={() => removeCustomRequirement(req.id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-[var(--goose-slate)] mt-1">
                          {isCustomReq
                            ? `Required: ${req.amount} course${
                                req.amount !== 1 ? "s" : ""
                              }`
                            : `Required: ${req.amount || 1} course${
                                (req.amount || 1) !== 1 ? "s" : ""
                              }`}
                        </p>

                        {isCustomReq ? (
                          <>
                            {req.eligibleFaculties.length > 0 && (
                              <div className="mt-1 text-xs text-[var(--goose-slate)]">
                                Faculties: {req.eligibleFaculties.join(", ")}
                              </div>
                            )}
                            {req.eligibleCourses.length > 0 && (
                              <ul className="mt-1 ml-4 list-disc text-xs text-[var(--goose-slate)]">
                                {req.eligibleCourses
                                  .slice(0, 3)
                                  .map((courseCode) => (
                                    <li key={courseCode}>{courseCode}</li>
                                  ))}
                                {req.eligibleCourses.length > 3 && (
                                  <li className="italic">
                                    ...and {req.eligibleCourses.length - 3} more
                                    courses
                                  </li>
                                )}
                              </ul>
                            )}
                          </>
                        ) : (
                          req.courseGroup?.links &&
                          req.courseGroup.links.length > 0 && (
                            <ul className="mt-1 ml-4 list-disc text-xs text-[var(--goose-slate)]">
                              {req.courseGroup.links
                                .slice(0, 3)
                                .map((link: any, linkIndex: number) => (
                                  <li key={linkIndex}>
                                    {link.course?.code ||
                                      link.course?.name ||
                                      "Course"}
                                  </li>
                                ))}
                              {req.courseGroup.links.length > 3 && (
                                <li className="italic">
                                  ...and {req.courseGroup.links.length - 3} more
                                  courses
                                </li>
                              )}
                            </ul>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-center text-[var(--goose-slate)] italic">
                  {selectedDegree
                    ? "No specific requirements listed for this degree."
                    : "Select a degree to view its requirements."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer with buttons */}
        {selectedDegree && (
          <div className="border-t border-[var(--goose-ink)] p-6 md:p-8 bg-[var(--goose-cream)] flex gap-4 justify-between">
            {isEditingRequirements ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="px-6 py-2 border border-[var(--goose-ink)] text-[var(--goose-ink)] rounded hover:bg-[var(--goose-mist)]/50 transition-colors font-display font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2 bg-[var(--goose-ink)] text-[var(--goose-cream)] rounded hover:bg-[var(--goose-slate)] transition-colors font-display font-semibold"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditDegree}
                  className="px-6 py-2 border border-[var(--goose-ink)] text-[var(--goose-ink)] rounded hover:bg-[var(--goose-mist)]/50 transition-colors font-display font-semibold"
                >
                  Edit Degree
                </button>
                <button
                  onClick={handleConfirmSelection}
                  className="px-6 py-2 bg-[var(--goose-ink)] text-[var(--goose-cream)] rounded hover:bg-[var(--goose-slate)] transition-colors font-display font-semibold"
                >
                  Confirm Selection
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
