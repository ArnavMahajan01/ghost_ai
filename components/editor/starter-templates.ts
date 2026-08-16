import { MarkerType } from "@xyflow/react";

import { NODE_COLORS, NODE_DEFAULT_SIZES } from "@/types/canvas";
import type { CanvasEdge, CanvasNode, NodeColor, NodeShape } from "@/types/canvas";

const [NEUTRAL, BLUE, PURPLE, ORANGE, RED, , GREEN, TEAL] = NODE_COLORS;

/** Same arrowhead/stroke `components/editor/canvas.tsx` gives every live-drawn edge, so imported diagrams look native. */
const TEMPLATE_EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "rgba(225, 225, 235, 0.7)",
};

/** Builds one template node at its default size for `shape`, keeping the template data below to just id/label/shape/color/position. */
function node(
  id: string,
  label: string,
  shape: NodeShape,
  color: NodeColor,
  x: number,
  y: number
): CanvasNode {
  const { width, height } = NODE_DEFAULT_SIZES[shape];
  return {
    id,
    type: "canvasNode",
    position: { x, y },
    width,
    height,
    data: { label, color: color.fill, shape },
  };
}

/** Builds one template edge with the shared marker/style, defaulting to a plain left-to-right connection. */
function edge(
  id: string,
  source: string,
  target: string,
  options?: { label?: string; sourceHandle?: string; targetHandle?: string }
): CanvasEdge {
  return {
    id,
    type: "canvasEdge",
    source,
    target,
    sourceHandle: options?.sourceHandle ?? "right",
    targetHandle: options?.targetHandle ?? "left",
    markerEnd: TEMPLATE_EDGE_MARKER,
    data: { label: options?.label ?? "" },
  };
}

/** A predefined starter diagram — see `components/editor/starter-templates-modal.tsx` for how these get imported. */
export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const MICROSERVICES_TEMPLATE: CanvasTemplate = {
  id: "microservices",
  name: "Microservices Architecture",
  description:
    "An API gateway routing to independent services, each backed by its own database.",
  nodes: [
    node("gateway", "API Gateway", "hexagon", BLUE, 300, 0),
    node("users-svc", "Users Service", "rectangle", NEUTRAL, 60, 180),
    node("orders-svc", "Orders Service", "rectangle", NEUTRAL, 300, 180),
    node("billing-svc", "Billing Service", "rectangle", NEUTRAL, 540, 180),
    node("users-db", "Users DB", "cylinder", TEAL, 60, 340),
    node("orders-db", "Orders DB", "cylinder", TEAL, 300, 340),
    node("billing-db", "Billing DB", "cylinder", TEAL, 540, 340),
  ],
  edges: [
    edge("gateway-users", "gateway", "users-svc", { sourceHandle: "left", targetHandle: "top" }),
    edge("gateway-orders", "gateway", "orders-svc", { sourceHandle: "bottom", targetHandle: "top" }),
    edge("gateway-billing", "gateway", "billing-svc", { sourceHandle: "right", targetHandle: "top" }),
    edge("users-svc-db", "users-svc", "users-db", { sourceHandle: "bottom", targetHandle: "top" }),
    edge("orders-svc-db", "orders-svc", "orders-db", { sourceHandle: "bottom", targetHandle: "top" }),
    edge("billing-svc-db", "billing-svc", "billing-db", { sourceHandle: "bottom", targetHandle: "top" }),
  ],
};

const CICD_TEMPLATE: CanvasTemplate = {
  id: "cicd-pipeline",
  name: "CI/CD Pipeline",
  description:
    "A push-to-deploy pipeline with build and test stages, plus a rollback path on failure.",
  nodes: [
    node("push", "Push", "circle", NEUTRAL, 0, 0),
    node("build", "Build", "rectangle", BLUE, 200, 0),
    node("test", "Test", "rectangle", PURPLE, 420, 0),
    node("deploy", "Deploy", "rectangle", ORANGE, 640, 0),
    node("prod", "Production", "hexagon", GREEN, 860, 0),
    node("rollback", "Rollback", "pill", RED, 640, 180),
  ],
  edges: [
    edge("push-build", "push", "build"),
    edge("build-test", "build", "test"),
    edge("test-deploy", "test", "deploy"),
    edge("deploy-prod", "deploy", "prod"),
    edge("deploy-rollback", "deploy", "rollback", {
      label: "on failure",
      sourceHandle: "bottom",
      targetHandle: "top",
    }),
  ],
};

const EVENT_DRIVEN_TEMPLATE: CanvasTemplate = {
  id: "event-driven",
  name: "Event-Driven System",
  description:
    "A producer publishing to an event bus, fanned out to multiple consumers with a dead letter queue for failures.",
  nodes: [
    node("producer", "Producer", "rectangle", BLUE, 0, 120),
    node("bus", "Event Bus", "hexagon", ORANGE, 240, 120),
    node("orders-consumer", "Order Consumer", "rectangle", NEUTRAL, 480, 0),
    node("email-consumer", "Email Consumer", "rectangle", NEUTRAL, 480, 120),
    node("analytics-consumer", "Analytics Consumer", "rectangle", NEUTRAL, 480, 240),
    node("dlq", "Dead Letter Queue", "cylinder", RED, 720, 120),
  ],
  edges: [
    edge("producer-bus", "producer", "bus"),
    edge("bus-orders", "bus", "orders-consumer", { sourceHandle: "top", targetHandle: "left" }),
    edge("bus-email", "bus", "email-consumer"),
    edge("bus-analytics", "bus", "analytics-consumer", { sourceHandle: "bottom", targetHandle: "left" }),
    edge("bus-dlq", "bus", "dlq", { label: "failed" }),
  ],
};

const KUBERNETES_TEMPLATE: CanvasTemplate = {
  id: "kubernetes-docker",
  name: "Kubernetes & Docker Architecture",
  description:
    "A container image flowing from build to registry, deployed onto a cluster and exposed to users through an ingress.",
  nodes: [
    node("registry", "Docker Registry", "cylinder", TEAL, 0, 120),
    node("ci-build", "CI Build", "rectangle", BLUE, 220, 120),
    node("cluster", "K8s Cluster", "hexagon", PURPLE, 440, 120),
    node("pod-a", "Pod A", "circle", NEUTRAL, 680, 20),
    node("pod-b", "Pod B", "circle", NEUTRAL, 680, 220),
    node("service", "Service", "pill", ORANGE, 900, 120),
    node("ingress", "Ingress", "diamond", GREEN, 1120, 120),
    node("users", "Users", "circle", NEUTRAL, 1340, 130),
  ],
  edges: [
    edge("registry-build", "registry", "ci-build"),
    edge("build-cluster", "ci-build", "cluster"),
    edge("cluster-pod-a", "cluster", "pod-a", { sourceHandle: "top", targetHandle: "left" }),
    edge("cluster-pod-b", "cluster", "pod-b", { sourceHandle: "bottom", targetHandle: "left" }),
    edge("pod-a-service", "pod-a", "service", { sourceHandle: "right", targetHandle: "top" }),
    edge("pod-b-service", "pod-b", "service", { sourceHandle: "right", targetHandle: "bottom" }),
    edge("service-ingress", "service", "ingress"),
    edge("ingress-users", "ingress", "users"),
  ],
};

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  MICROSERVICES_TEMPLATE,
  CICD_TEMPLATE,
  EVENT_DRIVEN_TEMPLATE,
  KUBERNETES_TEMPLATE,
];
