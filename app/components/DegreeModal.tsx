"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useTemplate } from "../context/TemplateContext";
import { useAuth } from "../context/AuthContext";
import { getAnonDegree, setAnonDegree, copyReqTreeClient } from "@/lib/session-store";

interface DegreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDegree: () => void;
}

interface RequirementNode {
  id: number;
  name: string;
  amount: number;
  isText: boolean;
  courseGroupId?: number | null;
  courseGroup?: {
    id: number;
    name: string;
    links: { course: { code: string; name?: string } }[];
  } | null;
  children: RequirementNode[];
}

interface SelectedDegreeState {
  id: number;
  name: string;
  requirements?: RequirementNode[];
}

interface CustomRequirement {
  id: string;
  title: string;
  amount: number;
  eligibleCourses: string[];
  eligibleFaculties: string[];
  facultyGroupIds: number[];
  isCustom: true;
}

interface FacultyInfo {
  name: string;
  courseGroupId: number | null;
  _count: { courses: number };
}

interface CourseSearchResult {
  code: string;
  title: string;
}

export default function DegreeModal({
  isOpen,
  onClose,
  onSelectDegree,
}: DegreeModalProps) {
  const { templates, isLoading } = useTemplate();
  const { user } = useAuth();
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
  const [planName, setPlanName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Custom requirement form state
  const [customTitle, setCustomTitle] = useState("");
  const [customAmount, setCustomAmount] = useState(1);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedFaculties, setSelectedFaculties] = useState<string[]>([]);
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

  const [faculties, setFaculties] = useState<FacultyInfo[]>([]);
  const [courseSearchResults, setCourseSearchResults] = useState<CourseSearchResult[]>([]);
  const [isSearchingCourses, setIsSearchingCourses] = useState(false);
  const courseSearchDebounce = useRef<ReturnType<typeof setTimeout>>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch faculties on mount
  useEffect(() => {
    fetch("/api/faculties")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setFaculties(data))
      .catch(() => {});
  }, []);

  // Debounced course search
  const handleCourseSearch = (value: string) => {
    setCourseSearchQuery(value);
    if (courseSearchDebounce.current) clearTimeout(courseSearchDebounce.current);
    if (!value.trim()) {
      setCourseSearchResults([]);
      setIsSearchingCourses(false);
      return;
    }
    setIsSearchingCourses(true);
    courseSearchDebounce.current = setTimeout(async () => {
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(value)}`);
      if (res.ok) {
        setCourseSearchResults(await res.json());
      }
      setIsSearchingCourses(false);
    }, 300);
  };

  const filteredDegrees = useMemo(() => {
    return templates.filter((degree) =>
      degree.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

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

  useEffect(() => {
    if (isOpen) {
      const loadCurrentDegree = async () => {
        setLoadingRequirements(true);
        try {
          let data: any;

          if (user) {
            const res = await fetch(`/api/users/${user.id}/degree`);
            if (!res.ok) return;
            data = await res.json();
          } else {
            data = getAnonDegree();
          }

          if (data.type === "plan" && data.plan) {
            const matchingTemplate = templates.find(t => t.name === data.plan.templateName);
            setSearchQuery(data.plan.templateName || data.plan.name);
            setPlanName(data.plan.name);
            setSelectedDegree({
              id: matchingTemplate?.id ?? 0,
              name: data.plan.name,
              requirements: data.plan.requirements || [],
            });
            const allIds = new Set<number>(
              (data.plan.requirements || []).map((r: RequirementNode) => r.id)
            );
            setEnabledRequirements(allIds);
          }
        } catch (error) {
          console.error("Error loading current degree:", error);
        } finally {
          setLoadingRequirements(false);
        }
      };
      loadCurrentDegree();
    } else {
      setSelectedDegree(null);
      setSearchQuery("");
      setIsDropdownOpen(false);
      setIsEditingRequirements(false);
      setEnabledRequirements(new Set());
      setCustomRequirements([]);
      setIsCreatingCustom(false);
      setPlanName("");
      setIsEditingName(false);
      setIsDirty(false);
      resetCustomForm();
    }
  }, [isOpen]);

  const resetCustomForm = () => {
    setCustomTitle("");
    setCustomAmount(1);
    setCourseSearchQuery("");
    setCourseSearchResults([]);
    setIsSearchingCourses(false);
    setSelectedCourses([]);
    setSelectedFaculties([]);
  };

  if (!isOpen) return null;

  const handleDegreeClick = async (templateId: number, degreeName: string) => {
    setIsDropdownOpen(false);
    setSearchQuery(degreeName);
    setLoadingRequirements(true);

    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (response.ok) {
        const templateData = await response.json();
        setSelectedDegree({
          id: templateId,
          name: degreeName,
          requirements: templateData.requirements || [],
        });
        setPlanName(degreeName);
        setIsDirty(true);
        const allReqIds = new Set<number>(
          (templateData.requirements || []).map((r: RequirementNode) => r.id)
        );
        setEnabledRequirements(allReqIds);
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
    if (selectedDegree?.requirements) {
      const allReqIds = new Set(
        selectedDegree.requirements.map((r) => r.id)
      );
      setEnabledRequirements(allReqIds);
    }
    setIsEditingRequirements(false);
    setIsCreatingCustom(false);
  };

  const handleSaveEdit = async () => {
    setIsDirty(true);
    await persistDegree();
    setIsEditingRequirements(false);
    setIsCreatingCustom(false);
  };

  const toggleRequirement = (reqId: number) => {
    setEnabledRequirements((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reqId)) {
        newSet.delete(reqId);
      } else {
        newSet.add(reqId);
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

    const facultyGroupIds = selectedFaculties
      .map((name) => faculties.find((f) => f.name === name)?.courseGroupId)
      .filter((id): id is number => id != null);

    const newCustomReq: CustomRequirement = {
      id: `custom-${Date.now()}`,
      title: customTitle,
      amount: customAmount,
      eligibleCourses: selectedCourses,
      eligibleFaculties: selectedFaculties,
      facultyGroupIds,
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
    const allEnabled = selectedDegree.requirements.every((r) =>
      enabledRequirements.has(r.id)
    );
    return !allEnabled || customRequirements.length > 0;
  };

  const persistDegree = async () => {
    if (!selectedDegree) return;

    if (!user) {
      // Anonymous: build plan data client-side and save to sessionStorage
      const templateRes = await fetch(`/api/templates/${selectedDegree.id}`);
      if (!templateRes.ok) return;
      const templateData = await templateRes.json();

      const copiedRequirements = copyReqTreeClient(templateData.requirements || []);

      const anonPlan = {
        type: "plan" as const,
        plan: {
          id: selectedDegree.id,
          name: planName || selectedDegree.name,
          templateName: templateData.name,
          requirements: copiedRequirements,
        },
      };
      setAnonDegree(anonPlan);

      // Also update the selected template cache
      sessionStorage.setItem(
        "goose_nest_selected_template",
        JSON.stringify({
          id: selectedDegree.id,
          name: planName || selectedDegree.name,
          requirements: copiedRequirements,
        })
      );
      return;
    }

    const userId = user.id;
    const modified = hasModifications();

    if (!modified) {
      await fetch(`/api/users/${userId}/degree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedDegree.id,
          name: planName || selectedDegree.name,
        }),
      });
    } else {
      const requirements: any[] = [];

      selectedDegree.requirements?.forEach((req) => {
        if (enabledRequirements.has(req.id)) {
          requirements.push({
            name: req.courseGroup?.name || req.name,
            amount: req.amount || 1,
            courseGroupId: req.courseGroup?.id || req.courseGroupId,
          });
        }
      });

      customRequirements.forEach((req) => {
        requirements.push({
          name: req.title,
          amount: req.amount,
          courseCodes: req.eligibleCourses,
          facultyGroupIds: req.facultyGroupIds,
        });
      });

      await fetch(`/api/users/${userId}/degree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedDegree.id,
          name: planName || selectedDegree.name,
          requirements,
        }),
      });
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectedDegree) return;

    try {
      if (isDirty) {
        await persistDegree();
      }
      onSelectDegree();
      onClose();
    } catch (error) {
      console.error("Error saving degree selection:", error);
    }
  };

  // Recursive rendering for requirement display in modal
  function RequirementDisplay({ req, depth = 0 }: { req: RequirementNode; depth?: number }) {
    const isLeaf = !req.children || req.children.length === 0;
    const isBranch = req.children && req.children.length > 0;
    const isText = req.isText;

    return (
      <div className={depth > 0 ? "ml-4 border-l border-[var(--goose-mist)] pl-3 mt-2" : ""}>
        <div className="flex items-start justify-between">
          <p className={`font-medium text-sm ${isText ? "italic text-[var(--goose-slate)]" : ""}`}>
            {isBranch
              ? `Complete ${req.amount} of the following:`
              : isText
                ? req.name
                : req.courseGroup?.name || req.name}
          </p>
        </div>

        {isLeaf && !isText && (
          <p className="text-xs text-[var(--goose-slate)] mt-1">
            Required: {req.amount} course{req.amount !== 1 ? "s" : ""}
          </p>
        )}

        {isLeaf && !isText && req.courseGroup?.links && req.courseGroup.links.length > 0 && (
          <ul className="mt-1 ml-4 list-disc text-xs text-[var(--goose-slate)]">
            {req.courseGroup.links.slice(0, 3).map((link: any, i: number) => (
              <li key={i}>
                {link.course?.code || "Course"}
              </li>
            ))}
            {req.courseGroup.links.length > 3 && (
              <li className="italic">
                ...and {req.courseGroup.links.length - 3} more courses
              </li>
            )}
          </ul>
        )}

        {isBranch && (
          <div className="mt-1">
            {req.children.map((child) => (
              <RequirementDisplay key={child.id} req={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Recursive rendering for edit mode
  function RequirementEditItem({
    req,
    depth = 0,
  }: {
    req: RequirementNode;
    depth?: number;
  }) {
    const isEnabled = enabledRequirements.has(req.id);
    const isLeaf = !req.children || req.children.length === 0;
    const isBranch = req.children && req.children.length > 0;
    const isText = req.isText;

    return (
      <div className={depth > 0 ? "ml-4 border-l border-[var(--goose-mist)] pl-3 mt-2" : ""}>
        <div className={`flex items-start gap-3 ${!isEnabled ? "opacity-50" : ""}`}>
          {depth === 0 && (
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={() => toggleRequirement(req.id)}
              className="mt-1 w-4 h-4 cursor-pointer accent-[var(--goose-ink)]"
            />
          )}
          <div className="flex-1">
            <p className={`font-medium text-sm ${isText ? "italic text-[var(--goose-slate)]" : ""}`}>
              {isBranch
                ? `Complete ${req.amount} of the following:`
                : isText
                  ? req.name
                  : req.courseGroup?.name || req.name}
            </p>

            {isLeaf && !isText && (
              <p className="text-xs text-[var(--goose-slate)] mt-1">
                Required: {req.amount} course{req.amount !== 1 ? "s" : ""}
              </p>
            )}

            {isLeaf && !isText && req.courseGroup?.links && req.courseGroup.links.length > 0 && (
              <ul className="mt-1 ml-4 list-disc text-xs text-[var(--goose-slate)]">
                {req.courseGroup.links.slice(0, 3).map((link: any, i: number) => (
                  <li key={i}>
                    {link.course?.code || "Course"}
                  </li>
                ))}
                {req.courseGroup.links.length > 3 && (
                  <li className="italic">
                    ...and {req.courseGroup.links.length - 3} more courses
                  </li>
                )}
              </ul>
            )}

            {isBranch && (
              <div className="mt-1">
                {req.children.map((child) => (
                  <RequirementDisplay key={child.id} req={child} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const allRequirements = [
    ...(selectedDegree?.requirements || []).map((req) => ({
      ...req,
      isCustom: false as const,
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

          {/* Requirements Section */}
          <div className="border border-[var(--goose-ink)] p-6 md:p-8 rounded h-[280px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
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

            {/* Editable plan name */}
            {selectedDegree && isEditingRequirements && (
              <div className="mb-4">
                <label className="text-xs text-[var(--goose-slate)] block mb-1">Plan Name</label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full border border-[var(--goose-ink)] px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--goose-slate)]"
                  placeholder="Enter plan name..."
                />
              </div>
            )}
            {selectedDegree && !isEditingRequirements && (
              <p className="text-sm text-[var(--goose-slate)] mb-4 flex items-center gap-1">
                {planName || selectedDegree.name}
                <button
                  onClick={() => { setIsEditingRequirements(true); }}
                  className="text-[var(--goose-slate)] hover:text-[var(--goose-ink)] transition-colors"
                  aria-label="Edit plan name"
                  title="Edit"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11.5 1.5l3 3L5 14H2v-3z" />
                  </svg>
                </button>
              </p>
            )}

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
                    {faculties.filter((f) => f.name !== "N/A").map((faculty) => (
                      <button
                        key={faculty.name}
                        onClick={() => toggleFaculty(faculty.name)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          selectedFaculties.includes(faculty.name)
                            ? "bg-[var(--goose-ink)] text-[var(--goose-cream)] border-[var(--goose-ink)]"
                            : "border-[var(--goose-slate)] hover:bg-[var(--goose-mist)]/50"
                        }`}
                      >
                        {faculty.name} ({faculty._count.courses})
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
                      onChange={(e) => handleCourseSearch(e.target.value)}
                      onFocus={() => setIsCourseDropdownOpen(true)}
                      placeholder="Search courses..."
                      autoComplete="off"
                      className="w-full border border-[var(--goose-ink)] px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--goose-slate)]"
                    />

                    {isCourseDropdownOpen && courseSearchQuery && (
                      <div
                        ref={courseDropdownRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-[var(--goose-cream)] border border-[var(--goose-ink)] rounded shadow-lg z-30 max-h-40 overflow-y-auto"
                      >
                        {isSearchingCourses && (
                          <div className="p-2 text-xs text-[var(--goose-slate)] italic">Searching...</div>
                        )}
                        {!isSearchingCourses && courseSearchResults.length === 0 && (
                          <div className="p-2 text-xs text-[var(--goose-slate)] italic">No courses found</div>
                        )}
                        {!isSearchingCourses && courseSearchResults.map((course) => (
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
                                {course.title}
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
                {allRequirements.map((req) => {
                  const isCustomReq = "isCustom" in req && req.isCustom;

                  if (isCustomReq) {
                    // Custom requirements — render flat as before
                    return (
                      <div
                        key={req.id}
                        className={isEditingRequirements ? "flex items-start gap-3" : ""}
                      >
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <p className="font-medium text-sm">
                              {req.title}
                              <span className="ml-2 text-xs bg-[var(--goose-slate)] text-[var(--goose-cream)] px-2 py-0.5 rounded">
                                Custom
                              </span>
                            </p>
                            {isEditingRequirements && (
                              <button
                                onClick={() => removeCustomRequirement(req.id)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-[var(--goose-slate)] mt-1">
                            Required: {req.amount} course{req.amount !== 1 ? "s" : ""}
                          </p>
                          {req.eligibleFaculties.length > 0 && (
                            <div className="mt-1 text-xs text-[var(--goose-slate)]">
                              Faculties: {req.eligibleFaculties.join(", ")}
                            </div>
                          )}
                          {req.eligibleCourses.length > 0 && (
                            <ul className="mt-1 ml-4 list-disc text-xs text-[var(--goose-slate)]">
                              {req.eligibleCourses.slice(0, 3).map((courseCode: string) => (
                                <li key={courseCode}>{courseCode}</li>
                              ))}
                              {req.eligibleCourses.length > 3 && (
                                <li className="italic">
                                  ...and {req.eligibleCourses.length - 3} more courses
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Template/plan requirement — use recursive rendering
                  const isEnabled = enabledRequirements.has(req.id);

                  if (!isEnabled && !isEditingRequirements) return null;

                  if (isEditingRequirements) {
                    return (
                      <RequirementEditItem key={req.id} req={req as RequirementNode} />
                    );
                  }

                  return (
                    <RequirementDisplay key={req.id} req={req as RequirementNode} />
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
