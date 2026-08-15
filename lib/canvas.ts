import type { NodeShape } from "@/types/canvas";

/** Custom `dataTransfer` MIME type used to carry a shape drag's payload. */
export const SHAPE_DRAG_MIME_TYPE = "application/x-ghost-canvas-shape";

let nodeIdCounter = 0;

/**
 * Generates a canvas node ID from the shape name, a timestamp, and an
 * in-memory counter — unique enough for client-generated IDs without
 * needing a server round-trip.
 */
export function createNodeId(shape: NodeShape): string {
  nodeIdCounter += 1;
  return `${shape}-${Date.now()}-${nodeIdCounter}`;
}
