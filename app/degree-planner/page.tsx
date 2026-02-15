"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import DegreeModal from "../components/DegreeModal";
import RequirementsChecklist from "../components/RequirementsChecklist";
import { useTemplate } from "../context/TemplateContext";

const CourseGraph = dynamic(() => import("@/graph/CourseGraph"), {
  ssr: false,
});

export default function DegreePlannerPage() {
  const { selectedTemplate, refreshFromDB, isLoading } = useTemplate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [degreeVersion, setDegreeVersion] = useState(0);

  const handleModifyClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSelectDegree = async () => {
    await refreshFromDB();
    setDegreeVersion((v) => v + 1);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Current Degree Bar */}
      <section className="max-w-7xl w-full mx-auto px-8 py-4">
        <div className="border border-[var(--goose-ink)] p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="font-display text-xl md:text-2xl font-bold text-[var(--goose-ink)] mb-1">
                Current degree
              </h1>
              {isLoading ? (
                <p className="text-base text-[var(--goose-slate)] italic">
                  Loading...
                </p>
              ) : selectedTemplate ? (
                <p className="text-base text-[var(--goose-ink)]">
                  {selectedTemplate.name}
                </p>
              ) : (
                <p className="text-base text-[var(--goose-slate)] italic">
                  No degree selected
                </p>
              )}
            </div>
            <button
              onClick={handleModifyClick}
              className="px-5 py-1.5 border border-[var(--goose-ink)] text-[var(--goose-ink)] rounded hover:bg-[var(--goose-ink)] hover:text-[var(--goose-cream)] transition-colors self-start md:self-auto text-sm"
              aria-label="Modify degree selection"
            >
              Modify
            </button>
          </div>
        </div>
      </section>

      {/* Requirements Checklist + 3D Course Graph */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-4 flex gap-4 h-[calc(100vh-200px)]">
        <aside className="w-64 flex-shrink-0 border border-[var(--goose-mist)] rounded-lg overflow-hidden">
          <RequirementsChecklist key={degreeVersion} />
        </aside>
        <div className="flex-1 border border-[var(--goose-mist)] rounded-lg overflow-hidden">
          <CourseGraph />
        </div>
      </main>

      {/* Degree Selection Modal */}
      <DegreeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSelectDegree={handleSelectDegree}
      />
    </div>
  );
}
