"use client";

import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";

interface Course {
  code: string;
  title: string;
  prerequisites: string[];
}

interface SelectedCourse {
  code: string;
  title: string;
  type: string;
  prerequisites: string[];
}

// Test data - courses taken so far (ordered by sequence within each type)
const coursesTaken: Course[] = [
  { code: "MATH145", title: "Algebra (Advanced Level)", prerequisites: [] },
  {
    code: "MATH146",
    title: "Linear Algebra 1 (Advanced Level)",
    prerequisites: ["MATH145"],
  },
  {
    code: "MATH137",
    title: "Calculus 2 For Honours Mathematics",
    prerequisites: [],
  },
  {
    code: "MATH148",
    title: "Calculus 2 (Advanced Level)",
    prerequisites: ["MATH138"],
  },
  {
    code: "CS145",
    title: "Designing Functional Programs (Advanced Level)",
    prerequisites: [],
  },
  {
    code: "CS146",
    title: "Elementary Algorithm Design and Data Abstraction (Advanced Level)",
    prerequisites: ["CS145"],
  },
  {
    code: "COMMST100",
    title: "Introduction to Communication Studies",
    prerequisites: [],
  },
  {
    code: "COMMST225",
    title: "Communication, Media, and Popular Culture",
    prerequisites: ["COMMST100"],
  },
  {
    code: "AFM101",
    title: "Introduction to Financial Accounting",
    prerequisites: [],
  },
  { code: "STAT230", title: "Probability", prerequisites: ["MATH138"] },
];

// Define course chains within each type (first course connects to category, rest chain together)
const courseChains: Record<string, string[][]> = {
  MATH: [["MATH145", "MATH146"], ["MATH137", "MATH148", "STAT230"]],
  CS: [["CS145", "CS146"]],
  COMMST: [["COMMST100", "COMMST225"]],
  AFM: [["AFM101"]],
};

export default function CourseTree() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(
    null
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const elements: any[] = [];

    // Root node - center
    elements.push({
      data: { id: "center", label: "⬡", type: "root", title: "Courses Taken" },
    });

    // Create a map of course data for quick lookup
    const courseMap = new Map<string, Course>();
    coursesTaken.forEach((course) => {
      courseMap.set(course.code, course);
    });

    // Create category nodes and course chains
    Object.entries(courseChains).forEach(([type, chains]) => {
      const typeId = `type-${type}`;

      // Add category node
      elements.push({
        data: {
          id: typeId,
          label: type,
          type: "category",
          title: `${type} Courses`,
        },
      });

      // Connect category to center
      elements.push({
        data: {
          id: `edge-center-${typeId}`,
          source: "center",
          target: typeId,
        },
      });

      // Process each chain within this category
      chains.forEach((chain) => {
        chain.forEach((courseCode, index) => {
          const course = courseMap.get(courseCode);
          if (!course) return;

          // Add course node
          elements.push({
            data: {
              id: course.code,
              label: course.code,
              type: "course",
              title: course.title,
              prerequisites: course.prerequisites,
            },
          });

          if (index === 0) {
            // First course in chain connects to category
            elements.push({
              data: {
                id: `edge-${typeId}-${course.code}`,
                source: typeId,
                target: course.code,
              },
            });
          } else {
            // Subsequent courses connect to previous course in chain
            const prevCourse = chain[index - 1];
            elements.push({
              data: {
                id: `edge-${prevCourse}-${course.code}`,
                source: prevCourse,
                target: course.code,
              },
            });
          }
        });
      });
    });

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        // Base node style - transparent, just text
        {
          selector: "node",
          style: {
            "background-opacity": 0,
            "border-width": 0,
            label: "data(label)",
            color: "#c9a227",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "10px",
            "font-family": "monospace",
            "font-weight": "bold",
            width: 10,
            height: 10,
            "text-wrap": "wrap",
            "text-max-width": "100px",
          },
        },
        // Root node
        {
          selector: "node[type='root']",
          style: {
            "font-size": "32px",
            color: "#c9a227",
            width: 40,
            height: 40,
          },
        },
        // Category nodes
        {
          selector: "node[type='category']",
          style: {
            color: "#a78bfa",
            "font-size": "14px",
            "font-weight": "bold",
            width: 20,
            height: 20,
          },
        },
        // Course nodes
        {
          selector: "node[type='course']",
          style: {
            color: "#f0e6d3",
            "font-size": "10px",
            width: 10,
            height: 10,
          },
        },
        // All edges
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#7c5cbf",
            "curve-style": "bezier",
            opacity: 0.6,
          },
        },
        // Edges from center
        {
          selector: "edge[source='center']",
          style: {
            "line-color": "#c9a227",
            width: 1.5,
            opacity: 0.7,
          },
        },
      ],
      layout: {
        name: "cose",
        idealEdgeLength: () => 100,
        nodeOverlap: 50,
        refresh: 20,
        fit: true,
        padding: 50,
        randomize: false,
        componentSpacing: 120,
        nodeRepulsion: () => 6000,
        edgeElasticity: () => 80,
        nestingFactor: 1.2,
        gravity: 0.4,
        numIter: 1500,
        initialTemp: 250,
        coolingFactor: 0.95,
        minTemp: 1.0,
        animate: false,
      } as any,
      minZoom: 0.3,
      maxZoom: 2.5,
      wheelSensitivity: 5,
    });

    // Click handler for nodes
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const nodeData = node.data();
      setSelectedCourse({
        code: nodeData.label,
        title: nodeData.title || nodeData.label,
        type: nodeData.type,
        prerequisites: nodeData.prerequisites || [],
      });
    });

    // Click background to deselect
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        setSelectedCourse(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, []);

  return (
    <div
      className="relative w-full h-full min-h-[600px] rounded overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #0a1628 0%, #162a4a 50%, #0a1628 100%)",
      }}
    >
      {/* Canvas */}
      <div ref={containerRef} className="w-full h-full min-h-[600px]" />

      {/* Course Info Panel */}
      {selectedCourse && (
        <div className="absolute top-4 left-4 bg-[#0d1f3c]/95 border border-[#3d5a80] rounded-lg px-4 py-3 backdrop-blur-sm max-w-xs">
          <div className="flex justify-between items-start mb-2">
            <span
              className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                selectedCourse.type === "root"
                  ? "bg-[#c9a227]/20 text-[#c9a227]"
                  : selectedCourse.type === "category"
                  ? "bg-[#a78bfa]/20 text-[#a78bfa]"
                  : "bg-[#f0e6d3]/20 text-[#f0e6d3]"
              }`}
            >
              {selectedCourse.type}
            </span>
            <button
              onClick={() => setSelectedCourse(null)}
              className="text-[#6b8cae] hover:text-[#f0e6d3] text-lg leading-none"
            >
              ×
            </button>
          </div>
          <h3 className="text-[#c9a227] font-bold text-lg mb-1">
            {selectedCourse.code}
          </h3>
          <p className="text-[#f0e6d3] text-sm mb-2">{selectedCourse.title}</p>
          {selectedCourse.prerequisites.length > 0 && (
            <div className="text-xs">
              <span className="text-[#22c55e] font-semibold">
                Prerequisites:{" "}
              </span>
              <span className="text-[#6b8cae]">
                {selectedCourse.prerequisites.join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 bg-[#0d1f3c]/80 border border-[#3d5a80] rounded px-3 py-2 text-xs text-[#6b8cae] backdrop-blur-sm">
        <p>Scroll to zoom • Drag to pan • Click for info</p>
      </div>
    </div>
  );
}
