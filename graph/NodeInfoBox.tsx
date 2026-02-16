"use client";

import { GraphNode } from "./types";

type NodeInfoBoxProps = {
  node: GraphNode;
  onClose: () => void;
};

export default function NodeInfoBox({ node, onClose }: NodeInfoBoxProps) {
  return (
    <div className="absolute top-4 left-4 bg-[var(--goose-cream)] border border-[var(--goose-ink)] p-4 rounded-lg shadow-lg z-10 max-w-[400px]">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-[var(--goose-ink)] font-display font-semibold text-lg">{node.title}</h3>
        <button
          onClick={onClose}
          className="text-[var(--goose-slate)] hover:text-[var(--goose-ink)] text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-[var(--goose-slate)]">ID: </span>
          <span className="text-[var(--goose-ink)]">{node.id}</span>
        </div>

        <div>
          <span className="text-[var(--goose-slate)]">Faculty: </span>
          <span className="text-[var(--goose-ink)]">{node.faculty}</span>
        </div>

        <div>
          <span className="text-[var(--goose-slate)]">Subject: </span>
          <span className="text-[var(--goose-ink)]">{node.subject}</span>
        </div>

        <div>
          <span className="text-[var(--goose-slate)]">Level: </span>
          <span className="text-[var(--goose-ink)]">{node.level}</span>
        </div>

        {node.prerequisites.length > 0 && (
          <div>
            <span className="text-[var(--goose-slate)]">Prerequisites: </span>
            <span className="text-[var(--goose-ink)]">{node.prerequisites.join(", ")}</span>
          </div>
        )}

        {node.description && (
          <div className="mt-3 pt-3 border-t border-[var(--goose-mist)]">
            <span className="text-[var(--goose-slate)]">Description: </span>
            <p className="text-[var(--goose-ink)] mt-1">{node.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
