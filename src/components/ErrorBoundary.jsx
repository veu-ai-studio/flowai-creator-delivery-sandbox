import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught render error:', error.message, info?.componentStack?.slice(0, 200));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-8 max-w-lg w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <span className="text-red-400 text-lg">!</span>
              </div>
              <div>
                <p className="font-bold text-foreground">Something went wrong</p>
                <p className="text-xs text-muted-foreground mt-0.5">A rendering error occurred. You can try recovering.</p>
              </div>
            </div>
            {this.state.error?.message && (
              <pre className="text-[10px] text-red-400 bg-red-500/10 rounded p-3 overflow-auto max-h-32 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
            >
              Try to recover
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}