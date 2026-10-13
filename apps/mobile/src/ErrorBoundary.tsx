import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  failed: boolean;
}

/** Last line of defence: shows a friendly recovery screen instead of a blank page if a screen crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ORVIX UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="auth">
        <div className="auth-hero">
          <h1>Something went wrong</h1>
          <p>Your data is safe. Reload the app to carry on.</p>
        </div>
        <button className="btn primary block" onClick={() => window.location.reload()}>
          Reload ORVIX
        </button>
      </main>
    );
  }
}
