'use client';

import { useState } from "react";
import Navbar from "../components/Navbar";
import DegreeModal from "../components/DegreeModal";

export default function DegreePlannerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDegree, setSelectedDegree] = useState<string | null>(null);

  const handleModifyClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSelectDegree = (degree: string) => {
    setSelectedDegree(degree);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Current Degree Section */}
        <section className="border border-[var(--goose-ink)] p-8 md:p-12 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-[var(--goose-ink)] mb-2">
                Current degree
              </h1>
              {selectedDegree ? (
                <p className="text-lg text-[var(--goose-ink)]">
                  {selectedDegree}
                </p>
              ) : (
                <p className="text-lg text-[var(--goose-slate)] italic">
                  No degree selected
                </p>
              )}
            </div>
            <button
              onClick={handleModifyClick}
              className="px-6 py-2 border border-[var(--goose-ink)] text-[var(--goose-ink)] rounded hover:bg-[var(--goose-ink)] hover:text-[var(--goose-cream)] transition-colors self-start md:self-auto"
              aria-label="Modify degree selection"
            >
              Modify
            </button>
          </div>
        </section>

        {/* Prerequisite Tree Placeholder Section */}
        <section className="border border-[var(--goose-ink)] p-8 md:p-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--goose-ink)] mb-6">
            Prerequisite Tree
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Electives Tree Placeholder */}
            <div>
              <h3 className="font-display text-lg font-semibold text-[var(--goose-ink)] mb-4">
                Electives tree
              </h3>
              <div className="border border-[var(--goose-mist)] bg-[var(--goose-cream)] min-h-[300px] rounded flex items-center justify-center p-8">
                <p className="text-[var(--goose-slate)] italic text-center">
                  Tree visualization coming soon
                </p>
              </div>
            </div>

            {/* Core Tree Placeholder */}
            <div>
              <h3 className="font-display text-lg font-semibold text-[var(--goose-ink)] mb-4">
                Core tree
              </h3>
              <div className="border border-[var(--goose-mist)] bg-[var(--goose-cream)] min-h-[300px] rounded flex items-center justify-center p-8">
                <p className="text-[var(--goose-slate)] italic text-center">
                  Tree visualization coming soon
                </p>
              </div>
            </div>
          </div>
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
