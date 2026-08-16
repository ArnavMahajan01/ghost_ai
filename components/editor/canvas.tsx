"use client";

import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react";
import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  MarkerType,
  ReactFlow,
  useReactFlow,
  type Connection,
  type EdgeTypes,
  type NodeTypes,
  type XYPosition,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, type DragEvent } from "react";

import { CanvasControls } from "@/components/editor/canvas-controls";
import { CanvasEdgeRenderer } from "@/components/editor/canvas-edge";
import { CanvasMinimap } from "@/components/editor/canvas-minimap";
import { CanvasNodeRenderer } from "@/components/editor/canvas-node";
import { ShapePanel } from "@/components/editor/shape-panel";
import type { CanvasTemplate } from "@/components/editor/starter-templates";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  createEdgeId,
  createNodeId,
  instantiateTemplate,
  normalizeEdgeHandles,
  SHAPE_DRAG_MIME_TYPE,
} from "@/lib/canvas";
import { DEFAULT_NODE_COLOR, NODE_DEFAULT_SIZES } from "@/types/canvas";
import type {
  CanvasEdge,
  CanvasNode,
  NodeShape,
  ShapeDragPayload,
} from "@/types/canvas";

import "@xyflow/react/dist/style.css";

const nodeTypes: NodeTypes = { canvasNode: CanvasNodeRenderer };
const edgeTypes: EdgeTypes = { canvasEdge: CanvasEdgeRenderer };

/** Arrowhead every new edge gets — the edge's own stroke/rounded-ends styling lives in `CanvasEdgeRenderer`. */
const EDGE_MARKER_END = { type: MarkerType.ArrowClosed, color: "rgba(225, 225, 235, 0.7)" };

interface CanvasProps {
  isTemplatesModalOpen: boolean;
  onTemplatesModalOpenChange: (open: boolean) => void;
}

/**
 * The Liveblocks-synced React Flow canvas. Must render under a `RoomProvider`
 * and `ReactFlowProvider`, and inside `ClientSideSuspense` —
 * `useLiveblocksFlow`'s suspense mode throws while the room's storage is
 * still loading.
 */
export function Canvas({ isTemplatesModalOpen, onTemplatesModalOpenChange }: CanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });
  const reactFlowInstance = useReactFlow<CanvasNode, CanvasEdge>();
  const { screenToFlowPosition, fitView } = reactFlowInstance;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pendingFitViewRef = useRef(false);

  // Normalizes any edges saved before 16-edge-behavior.md's handle rename —
  // see `normalizeEdgeHandles` for why. Only affects what gets rendered;
  // stored edge data is untouched unless the user reconnects/edits them.
  const displayEdges = useMemo(() => normalizeEdgeHandles(edges), [edges]);

  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  useKeyboardShortcuts({ reactFlowInstance, onUndo: undo, onRedo: redo });

  // `useLiveblocksFlow`'s own `onConnect` builds a plain untyped edge via
  // `addEdge`, with no way to make it a `canvasEdge` — so new connections
  // are added the same way `addNode` adds nodes: construct the edge
  // ourselves and hand it to `onEdgesChange` as an "add" change.
  const handleConnect = useCallback(
    (connection: Connection) => {
      const newEdge: CanvasEdge = {
        id: createEdgeId(connection.source, connection.target),
        type: "canvasEdge",
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        markerEnd: EDGE_MARKER_END,
        data: { label: "" },
      };

      onEdgesChange([{ type: "add", item: newEdge }]);
    },
    [onEdgesChange]
  );

  // Fires once after `handleImportTemplate` swaps in a template's nodes —
  // deferred to an effect (rather than called right after the change) so it
  // runs against the post-import `nodes`/viewport, not whatever was on
  // screen the instant the import was triggered.
  useEffect(() => {
    if (pendingFitViewRef.current) {
      pendingFitViewRef.current = false;
      fitView({ duration: 300 });
    }
  }, [nodes, fitView]);

  const handleImportTemplate = useCallback(
    (template: CanvasTemplate) => {
      const { nodes: templateNodes, edges: templateEdges } = instantiateTemplate(template);

      // Clear the existing canvas first, then add the template on top of
      // the now-empty canvas — a template import replaces the canvas
      // rather than layering onto whatever was already there.
      onNodesChange([
        ...nodes.map((existing) => ({ type: "remove" as const, id: existing.id })),
        ...templateNodes.map((item) => ({ type: "add" as const, item })),
      ]);
      onEdgesChange([
        ...edges.map((existing) => ({ type: "remove" as const, id: existing.id })),
        ...templateEdges.map((item) => ({ type: "add" as const, item })),
      ]);

      pendingFitViewRef.current = true;
    },
    [nodes, edges, onNodesChange, onEdgesChange]
  );

  const addNode = useCallback(
    (shape: NodeShape, position: XYPosition, width: number, height: number) => {
      const newNode: CanvasNode = {
        id: createNodeId(shape),
        type: "canvasNode",
        position,
        width,
        height,
        data: { label: "", color: DEFAULT_NODE_COLOR.fill, shape },
      };

      onNodesChange([{ type: "add", item: newNode }]);
    },
    [onNodesChange]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const raw = event.dataTransfer.getData(SHAPE_DRAG_MIME_TYPE);
      if (!raw) return;

      let payload: ShapeDragPayload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(payload.shape, position, payload.width, payload.height);
    },
    [screenToFlowPosition, addNode]
  );

  // Keyboard/click fallback for the shape panel — a focused button has no
  // drop coordinates, so drop the new node at the center of the visible
  // canvas viewport instead.
  const handleAddShape = useCallback(
    (shape: NodeShape) => {
      const { width, height } = NODE_DEFAULT_SIZES[shape];
      const rect = wrapperRef.current?.getBoundingClientRect();
      const center = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const flowCenter = screenToFlowPosition(center);

      addNode(
        shape,
        { x: flowCenter.x - width / 2, y: flowCenter.y - height / 2 },
        width,
        height
      );
    },
    [screenToFlowPosition, addNode]
  );

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} />
        <CanvasMinimap />
      </ReactFlow>
      <CanvasControls canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
      <ShapePanel onAddShape={handleAddShape} />
      <StarterTemplatesModal
        open={isTemplatesModalOpen}
        onOpenChange={onTemplatesModalOpenChange}
        onImport={handleImportTemplate}
      />
    </div>
  );
}
