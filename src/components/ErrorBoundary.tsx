"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Catches render failures so the app never shows a blank crash on store builds */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[BuildIQ]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--paper)] px-6 text-center">
          <p className="font-display text-2xl font-semibold text-[var(--ink)]">Something went wrong</p>
          <p className="mt-2 max-w-sm text-sm text-[var(--sage)]">
            Please restart BuildIQ. If this keeps happening, contact support@supplymonkeyco.com.
          </p>
          <button
            className="btn-copper mt-6 !rounded-xl"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = "/dashboard";
            }}
          >
            Back to jobs
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
