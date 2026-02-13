export type GraphNode = {
  id: string;
  title: string;
  subject: string;
  description: string;
  faculty: string;
  prerequisites: string[];
  unlocks: string[];
  level: number;

  // --- simulation / layout fields (optional) ---
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
};

export type GraphLink = {
  source: string;
  target: string;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};
