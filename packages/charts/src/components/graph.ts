export interface GraphNode {
  id: string;
  label?: string;
  group?: string;
  color?: string;
  value?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
