import {
  CSS_SHAPE_RADIUS,
  CYLINDER_BODY_PATH,
  CYLINDER_RIM_PATH,
  POLYGON_POINTS,
} from "@/components/editor/canvas-node";
import { DEFAULT_NODE_COLOR } from "@/types/canvas";
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

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Builds a detached DOM element that mirrors `CanvasNodeRenderer`'s shape
 * geometry (same CSS-radius/SVG branches, reusing their exact constants) at
 * the shape's default size and default color. Meant to be handed to
 * `DataTransfer.setDragImage` — the browser rasterizes it once at drag
 * start, so it never needs to be mounted into the visible page.
 */
export function createShapeDragPreviewElement(
  shape: NodeShape,
  width: number,
  height: number
): HTMLElement {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.opacity = "0.85";

  const fill = DEFAULT_NODE_COLOR.fill;
  const stroke = "rgba(255, 255, 255, 0.4)";

  const radius = CSS_SHAPE_RADIUS[shape];
  if (radius) {
    container.style.backgroundColor = fill;
    container.style.border = `2px solid ${stroke}`;
    container.style.borderRadius = radius;
    return container;
  }

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));

  const points = POLYGON_POINTS[shape];
  if (points) {
    const polygon = document.createElementNS(SVG_NS, "polygon");
    polygon.setAttribute("points", points);
    polygon.setAttribute("fill", fill);
    polygon.setAttribute("stroke", stroke);
    polygon.setAttribute("stroke-width", "2");
    svg.appendChild(polygon);
  } else {
    const body = document.createElementNS(SVG_NS, "path");
    body.setAttribute("d", CYLINDER_BODY_PATH);
    body.setAttribute("fill", fill);
    body.setAttribute("stroke", stroke);
    body.setAttribute("stroke-width", "2");

    const rim = document.createElementNS(SVG_NS, "path");
    rim.setAttribute("d", CYLINDER_RIM_PATH);
    rim.setAttribute("fill", "none");
    rim.setAttribute("stroke", stroke);
    rim.setAttribute("stroke-width", "2");

    svg.appendChild(body);
    svg.appendChild(rim);
  }

  container.appendChild(svg);
  return container;
}
