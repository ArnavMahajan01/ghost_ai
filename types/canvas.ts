import type { Edge, Node } from "@xyflow/react";

/** One of the 6 node shapes supported by the canvas — see `context/ui-context.md`. */
export type NodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon";

export const NODE_SHAPES: NodeShape[] = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
];

/** A node fill + text color pair from the canvas's fixed palette. */
export interface NodeColor {
  fill: string;
  text: string;
}

/** The 8 defined node color pairs — index 0 is the default. */
export const NODE_COLORS: NodeColor[] = [
  { fill: "#1F1F1F", text: "#EDEDED" }, // Neutral dark (default)
  { fill: "#10233D", text: "#52A8FF" }, // Blue
  { fill: "#2E1938", text: "#BF7AF0" }, // Purple
  { fill: "#331B00", text: "#FF990A" }, // Orange
  { fill: "#3C1618", text: "#FF6166" }, // Red
  { fill: "#3A1726", text: "#F75F8F" }, // Pink
  { fill: "#0F2E18", text: "#62C073" }, // Green
  { fill: "#062822", text: "#0AC7B4" }, // Teal
];

export const DEFAULT_NODE_COLOR = NODE_COLORS[0];
export const DEFAULT_NODE_SHAPE: NodeShape = "rectangle";

/** Default width/height (px) for a freshly-dropped node of each shape. */
export const NODE_DEFAULT_SIZES: Record<
  NodeShape,
  { width: number; height: number }
> = {
  rectangle: { width: 160, height: 80 }, // wider than tall
  diamond: { width: 140, height: 140 }, // slightly larger so labels have room
  circle: { width: 100, height: 100 }, // square
  pill: { width: 160, height: 64 },
  cylinder: { width: 120, height: 110 },
  hexagon: { width: 140, height: 110 },
};

/** Minimum node dimensions (px) enforced while resizing. */
export const MIN_NODE_WIDTH = 60;
export const MIN_NODE_HEIGHT = 40;

/** The payload carried on a shape drag from the shape panel to the canvas. */
export interface ShapeDragPayload {
  shape: NodeShape;
  width: number;
  height: number;
}

/** Data carried by every canvas node. */
export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  color: string;
  shape: NodeShape;
}

/** The canvas's custom React Flow node type — no custom rendering yet, see spec's scope limits. */
export type CanvasNode = Node<CanvasNodeData, "canvasNode">;

/** The canvas's custom React Flow edge type — no custom rendering yet, see spec's scope limits. */
export type CanvasEdge = Edge<Record<string, never>, "canvasEdge">;
