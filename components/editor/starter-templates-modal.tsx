"use client";

import { Download } from "lucide-react";

import {
  CSS_SHAPE_RADIUS,
  CYLINDER_BODY_PATH,
  CYLINDER_RIM_PATH,
  POLYGON_POINTS,
} from "@/components/editor/canvas-node";
import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NODE_DEFAULT_SIZES } from "@/types/canvas";
import type { CanvasNode } from "@/types/canvas";

const PREVIEW_PADDING = 24;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** The preview's fit bounds — every template node's box, unioned together. */
function computeBounds(nodes: CanvasNode[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const { width: defaultWidth, height: defaultHeight } = NODE_DEFAULT_SIZES[node.data.shape];
    const width = node.width ?? defaultWidth;
    const height = node.height ?? defaultHeight;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  return { minX, minY, maxX, maxY };
}

function nodeCenter(node: CanvasNode) {
  const { width: defaultWidth, height: defaultHeight } = NODE_DEFAULT_SIZES[node.data.shape];
  return {
    x: node.position.x + (node.width ?? defaultWidth) / 2,
    y: node.position.y + (node.height ?? defaultHeight) / 2,
  };
}

interface PreviewNodeProps {
  node: CanvasNode;
}

/**
 * One node's shape, drawn straight into the preview's `<svg>` — reuses the
 * exact same geometry constants `CanvasNodeRenderer` uses for the real
 * canvas (CSS radius for rectangle/pill/circle, the `0–100` polygon/path
 * data for diamond/hexagon/cylinder) so a template's preview always matches
 * what actually gets imported. No React Flow instance involved, just plain
 * SVG positioned at the node's own coordinates.
 */
function PreviewNode({ node }: PreviewNodeProps) {
  const { width: defaultWidth, height: defaultHeight } = NODE_DEFAULT_SIZES[node.data.shape];
  const { x, y } = node.position;
  const width = node.width ?? defaultWidth;
  const height = node.height ?? defaultHeight;
  const fill = node.data.color;
  const stroke = "rgba(255, 255, 255, 0.18)";

  const radius = CSS_SHAPE_RADIUS[node.data.shape];
  if (radius) {
    const rx = node.data.shape === "rectangle" ? 6 : height / 2;
    return (
      <rect x={x} y={y} width={width} height={height} rx={rx} fill={fill} stroke={stroke} strokeWidth={1.5} />
    );
  }

  const points = POLYGON_POINTS[node.data.shape];
  if (points) {
    return (
      <svg x={x} y={y} width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={points} fill={fill} stroke={stroke} strokeWidth={2} />
      </svg>
    );
  }

  return (
    <svg x={x} y={y} width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d={CYLINDER_BODY_PATH} fill={fill} stroke={stroke} strokeWidth={2} />
      <path d={CYLINDER_RIM_PATH} fill="none" stroke={stroke} strokeWidth={2} />
    </svg>
  );
}

interface TemplatePreviewProps {
  template: CanvasTemplate;
}

/** Fixed-size viewport; the diagram's own bounds get fit into it via the `<svg>`'s `viewBox`, not by scaling node coordinates ourselves. */
function TemplatePreview({ template }: TemplatePreviewProps) {
  const { minX, minY, maxX, maxY } = computeBounds(template.nodes);
  const viewBox = `${minX - PREVIEW_PADDING} ${minY - PREVIEW_PADDING} ${
    maxX - minX + PREVIEW_PADDING * 2
  } ${maxY - minY + PREVIEW_PADDING * 2}`;
  const centers = new Map(template.nodes.map((node) => [node.id, nodeCenter(node)]));

  return (
    <div className="h-32 w-full overflow-hidden rounded-lg bg-base">
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        {template.edges.map((templateEdge) => {
          const from = centers.get(templateEdge.source);
          const to = centers.get(templateEdge.target);
          if (!from || !to) return null;
          return (
            <line
              key={templateEdge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth={1.5}
            />
          );
        })}
        {template.nodes.map((node) => (
          <PreviewNode key={node.id} node={node} />
        ))}
      </svg>
    </div>
  );
}

interface StarterTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the selected template; the modal closes itself right after. */
  onImport: (template: CanvasTemplate) => void;
}

/** Dialog listing every `CANVAS_TEMPLATES` entry as a card with a live preview and an import action. */
export function StarterTemplatesModal({ open, onOpenChange, onImport }: StarterTemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Starter templates</DialogTitle>
          <DialogDescription>
            Start from a pre-built diagram — importing replaces everything currently on the canvas.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="grid gap-3 pr-3 sm:grid-cols-2">
            {CANVAS_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-3"
              >
                <TemplatePreview template={template} />
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-medium text-copy-primary">{template.name}</h3>
                  <p className="text-xs text-copy-muted">{template.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    onImport(template);
                    onOpenChange(false);
                  }}
                >
                  <Download className="h-4 w-4" />
                  Import
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
