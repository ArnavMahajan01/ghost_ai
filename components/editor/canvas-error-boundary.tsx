"use client";

import { AlertTriangle } from "lucide-react";
import { Component, type ReactNode } from "react";

interface CanvasErrorBoundaryProps {
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches Liveblocks connection errors (auth failures, network drops, room
 * access rejections) thrown by the Suspense tree below it, so a broken
 * realtime connection doesn't take down the whole workspace page.
 */
export class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-base text-center">
          <AlertTriangle className="h-8 w-8 text-error" />
          <p className="text-sm text-copy-primary">
            Couldn&apos;t connect to the canvas
          </p>
          <p className="text-xs text-copy-muted">
            Check your connection and try reloading the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
