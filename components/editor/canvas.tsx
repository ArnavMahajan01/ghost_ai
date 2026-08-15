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
} from "@xyflow/react";
import { useCallback, type DragEvent } from "react";

import { CanvasNodeRenderer } from "@/components/editor/canvas-node";
import { ShapePanel } from "@/components/editor/shape-panel";
import { createNodeId, SHAPE_DRAG_MIME_TYPE } from "@/lib/canvas";
import { DEFAULT_NODE_COLOR } from "@/types/canvas";
import type { CanvasEdge, CanvasNode, ShapeDragPayload } from "@/types/canvas";

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

      const newNode: CanvasNode = {
        id: createNodeId(payload.shape),
        type: "canvasNode",
        position,
        width: payload.width,
        height: payload.height,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR.fill,
          shape: payload.shape,
        },
      };

      onNodesChange([{ type: "add", item: newNode }]);
    },
    [screenToFlowPosition, onNodesChange]
  );

  return (
    <div className="relative flex-1" onDragOver={handleDragOver} onDrop={handleDrop}>
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
      <ShapePanel />
    </div>
  );
}
