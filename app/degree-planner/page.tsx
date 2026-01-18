"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import DegreeModal from "../components/DegreeModal";
import CourseTree from "../components/CourseTree";
import { useTemplate } from "../context/TemplateContext";

export default function DegreePlannerPage() {
  const { selectedTemplate, selectTemplate, isLoading } = useTemplate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleModifyClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSelectDegree = async (templateId: number, degreeName: string) => {
    await selectTemplate(templateId);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Current Degree Section */}
        <section className="border border-[var(--goose-ink)] p-4 md:p-6 mb-8">
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
        </section>

        {/* Prerequisite Tree Section */}
        <section className="border border-[var(--goose-ink)] p-8 md:p-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--goose-ink)] mb-6">
            Prerequisite Tree
          </h2>

          {/* Course Tree Visualization */}
          <CourseTree requirements={selectedTemplate?.requirements || []} />
        </section>
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
