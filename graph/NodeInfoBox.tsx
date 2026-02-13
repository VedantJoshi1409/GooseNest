"use client";

import { GraphNode } from "./types";

type NodeInfoBoxProps = {
  node: GraphNode;
  onClose: () => void;
};

export default function NodeInfoBox({ node, onClose }: NodeInfoBoxProps) {
  return (
    <div className="absolute top-4 left-4 bg-gray-900/95 p-4 rounded-lg shadow-lg z-10 max-w-[400px]">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-white font-semibold text-lg">{node.title}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-400">ID: </span>
          <span className="text-white">{node.id}</span>
        </div>

        <div>
          <span className="text-gray-400">Faculty: </span>
          <span className="text-white">{node.faculty}</span>
        </div>

        <div>
          <span className="text-gray-400">Subject: </span>
          <span className="text-white">{node.subject}</span>
        </div>

        <div>
          <span className="text-gray-400">Level: </span>
          <span className="text-white">{node.level}</span>
        </div>

        {node.prerequisites.length > 0 && (
          <div>
            <span className="text-gray-400">Prerequisites: </span>
            <span className="text-white">{node.prerequisites.join(", ")}</span>
          </div>
        )}

        {node.description && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <span className="text-gray-400">Description: </span>
            <p className="text-white mt-1">{node.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
