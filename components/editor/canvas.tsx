"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
  type XYPosition,
} from "@xyflow/react";
import { useCallback, useRef, type DragEvent } from "react";

import { CanvasNodeRenderer } from "@/components/editor/canvas-node";
import { ShapePanel } from "@/components/editor/shape-panel";
import { createNodeId, SHAPE_DRAG_MIME_TYPE } from "@/lib/canvas";
import { DEFAULT_NODE_COLOR, NODE_DEFAULT_SIZES } from "@/types/canvas";
import type {
  CanvasEdge,
  CanvasNode,
  NodeShape,
  ShapeDragPayload,
} from "@/types/canvas";

import "@xyflow/react/dist/style.css";

const nodeTypes: NodeTypes = { canvasNode: CanvasNodeRenderer };

/**
 * The Liveblocks-synced React Flow canvas. Must render under a `RoomProvider`
 * and `ReactFlowProvider`, and inside `ClientSideSuspense` —
 * `useLiveblocksFlow`'s suspense mode throws while the room's storage is
 * still loading.
 */
export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });
  const { screenToFlowPosition } = useReactFlow<CanvasNode, CanvasEdge>();
  const wrapperRef = useRef<HTMLDivElement>(null);

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
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        fitView
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} />
        <MiniMap />
      </ReactFlow>
      <ShapePanel onAddShape={handleAddShape} />
    </div>
  );
}
