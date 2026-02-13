"use client";

import ForceGraph3D, { ForceGraph3DInstance } from "3d-force-graph";

const ForceGraph3DFn = ForceGraph3D as unknown as () => (
  elem: HTMLElement,
) => ForceGraph3DInstance;
import { useCallback, useEffect, useRef, useState } from "react";
import { GraphData, GraphLink, GraphNode } from "./types";
import NodeInfoBox from "./NodeInfoBox";

const FACULTY_COLORS: Record<string, string> = {
  MAT: "#df1aa0",
  SCI: "#0072da",
  HEA: "#2596be",
  ENV: "#b6bf00",
  ENG: "#5d0096",
  ART: "#ed8c00",
  "N/A": "#888888",
};

const FACULTY_NAMES: Record<string, string> = {
  MAT: "Mathematics",
  SCI: "Science",
  HEA: "Health Sciences",
  ENV: "Environment",
  ENG: "Engineering",
  ART: "Arts",
  "N/A": "Other",
};

function mixWithWhite(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const newR = Math.round(r + (255 - r) * amount);
  const newG = Math.round(g + (255 - g) * amount);
  const newB = Math.round(b + (255 - b) * amount);

  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

const GREY = "#666666";
const TERMS = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
const ROOT_ID = "__root__";

function makeNode(id: string, title: string, faculty: string): GraphNode {
  return {
    id,
    title,
    subject: "",
    description: "",
    faculty,
    prerequisites: [],
    unlocks: [],
    level: 0,
  };
}

export default function CourseGraph() {
  const ref = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraph3DInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // TODO: replace with actual user ID from auth
  const userId = 1;

  // Track current state for nodeColor callback
  const completedRef = useRef<Set<string>>(new Set());
  const facultyIdsRef = useRef<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    const scheduleRes = await fetch(`/api/users/${userId}/schedule`);
    if (!scheduleRes.ok) return;

    const scheduleData: {
      currentTerm: string;
      entries: { courseCode: string; term: string }[];
    } = await scheduleRes.json();

    const courseCodes = scheduleData.entries.map((e) => e.courseCode);

    if (courseCodes.length === 0) {
      if (graphRef.current) {
        graphRef.current.graphData({ nodes: [], links: [] });
      }
      return;
    }

    // Build completed courses set from schedule
    const completedCourses = new Set<string>();
    const currentTermIndex = TERMS.indexOf(scheduleData.currentTerm);
    for (const entry of scheduleData.entries) {
      if (TERMS.indexOf(entry.term) < currentTermIndex) {
        completedCourses.add(entry.courseCode);
      }
    }
    completedRef.current = completedCourses;

    // Fetch course nodes with prerequisite data
    const res = await fetch(
      `/api/graph?courses=${courseCodes.join(",")}&includeUnlocked=false`,
    );
    const rawData: GraphData = await res.json();
    const courseNodeIds = new Set(rawData.nodes.map((n) => n.id));

    // Group courses by faculty
    const facultyGroups = new Map<string, GraphNode[]>();
    rawData.nodes.forEach((node) => {
      const fac = node.faculty || "N/A";
      if (!facultyGroups.has(fac)) facultyGroups.set(fac, []);
      facultyGroups.get(fac)!.push(node);
    });

    // Build graph: root -> faculties (with children only) -> courses
    const rootNode: GraphNode = makeNode(ROOT_ID, "Courses Taken", ROOT_ID);
    rootNode.fx = 0;
    rootNode.fy = 0;
    rootNode.fz = 0;
    const nodes: GraphNode[] = [rootNode];
    const links: GraphLink[] = [];
    const facultyIds = new Set<string>();

    facultyGroups.forEach((courses, facCode) => {
      const facTitle = FACULTY_NAMES[facCode] || facCode;
      nodes.push(makeNode(facCode, facTitle, facCode));
      facultyIds.add(facCode);
      links.push({ source: ROOT_ID, target: facCode });
      courses.forEach((course) => nodes.push(course));
    });
    facultyIdsRef.current = facultyIds;

    // Course links:
    // - Has prereqs in graph? Link to those prereqs.
    // - Has 0 prereqs total? Link to faculty.
    // - Has prereqs but none in graph (unmet)? Float (no link).
    rawData.nodes.forEach((course) => {
      const validPrereqs = course.prerequisites.filter((p) =>
        courseNodeIds.has(p),
      );

      if (validPrereqs.length > 0) {
        validPrereqs.forEach((prereq) => {
          links.push({ source: prereq, target: course.id });
        });
      } else if (course.prerequisites.length === 0) {
        links.push({ source: course.faculty || "N/A", target: course.id });
      }
    });

    const data: GraphData = { nodes, links };

    if (graphRef.current) {
      graphRef.current.graphData(data);
    } else {
      graphRef.current = ForceGraph3DFn()(ref.current!)
        .graphData(data)
        .nodeLabel("title")
        .nodeColor((node: any) => {
          if (node.id === ROOT_ID) return "#ffffff";
          if (facultyIdsRef.current.has(node.id)) {
            const baseColor = FACULTY_COLORS[node.faculty] || "#888888";
            return mixWithWhite(baseColor, 0.7);
          }
          if (!completedRef.current.has(node.id)) return GREY;
          return FACULTY_COLORS[node.faculty] || "#888888";
        })
        .nodeVal((node: any) => {
          if (node.id === ROOT_ID) return 20;
          if (facultyIdsRef.current.has(node.id)) return 12;
          return 4;
        })
        .backgroundColor("#050510")
        .onNodeClick((node) => {
          setSelectedNode(node as GraphNode);
        });

      graphRef.current?.cameraPosition(
        { x: 0, y: 0, z: 300 },
        { x: 150, y: -50, z: 0 },
        0,
      );
    }
  }, []);

  // Load on mount + listen for schedule changes from other tabs/pages
  useEffect(() => {
    loadData();

    const channel = new BroadcastChannel("schedule-updates");
    channel.onmessage = () => loadData();
    return () => channel.close();
  }, [loadData]);

  return (
    <div className="relative w-full h-full">
      {selectedNode && (
        <NodeInfoBox
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      <div ref={ref} className="w-full h-full" />
    </div>
  );
}
