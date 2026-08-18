import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-slate-950 text-slate-100 rounded-3xl m-4 border border-rose-500/30 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-5 shadow-lg">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">View Render Recovery</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            {this.props.fallbackMessage ||
              "A temporary glitch occurred while loading this view. Your playback and saved playlists are safe."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-[#c89b3c] hover:bg-[#b58b34] text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry View</span>
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = "";
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-transform active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>Reload App</span>
            </button>
          </div>
          {process.env.NODE_ENV !== "production" && this.state.error && (
            <details className="mt-6 text-left max-w-lg w-full bg-slate-900/80 p-4 rounded-xl text-xs text-rose-300 font-mono overflow-auto max-h-40 border border-rose-500/20">
              <summary className="cursor-pointer font-semibold mb-1 text-slate-400">Technical Details</summary>
              <pre className="whitespace-pre-wrap">{this.state.error.toString()}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
