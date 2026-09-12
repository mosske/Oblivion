import React, { Component, ErrorInfo, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  private retryTimeout: any = null;
  private resetCounterTimeout: any = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("ErrorBoundary caught view error:", error, errorInfo);
    
    const nextCount = this.state.retryCount + 1;
    this.setState({ retryCount: nextCount });

    // Allow 1 seamless instant retry in case of a transient mounting timing issue
    if (nextCount <= 1) {
      if (this.retryTimeout) clearTimeout(this.retryTimeout);
      this.retryTimeout = setTimeout(() => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
          try {
            this.props.onReset();
          } catch {}
        }
      }, 100);
    }
  }

  public componentDidMount() {
    this.scheduleCounterReset();
  }

  public componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevState.hasError && !this.state.hasError) {
      this.scheduleCounterReset();
    }
  }

  public componentWillUnmount() {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    if (this.resetCounterTimeout) clearTimeout(this.resetCounterTimeout);
  }

  private scheduleCounterReset() {
    if (this.resetCounterTimeout) clearTimeout(this.resetCounterTimeout);
    this.resetCounterTimeout = setTimeout(() => {
      this.setState({ retryCount: 0 });
    }, 10000);
  }

  private handleResetView = () => {
    try {
      localStorage.removeItem("oblivion_tab_view_stack");
      localStorage.removeItem("oblivion_selected_playlist");
      localStorage.setItem("oblivion_active_tab", "home");
    } catch {}
    this.setState({ hasError: false, error: null, retryCount: 0 });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch {}
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // If still within the fast retry attempt
      if (this.state.retryCount <= 1) {
        return (
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0e0d11] text-white p-8 text-center select-none">
            <Loader2 className="w-8 h-8 text-[#dfb86c] animate-spin mb-4" />
            <p className="text-sm text-zinc-400 font-medium">Restoring music view...</p>
          </div>
        );
      }

      // Elegant Recovery Card if an error persists
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0e0d11] text-white p-6 select-none">
          <div className="max-w-md w-full bg-[#18161b] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-[#dfb86c]/10 border border-[#dfb86c]/30 flex items-center justify-center mx-auto text-[#dfb86c]">
              <span className="text-xl font-bold">♪</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Oblivion Audio Player</h2>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {this.props.fallbackMessage || "An unexpected rendering glitch occurred while loading this view."}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleResetView}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#f7e2ab] via-[#dfb86c] to-[#a07422] text-[#120f14] font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all"
              >
                Reset to Home & Reload
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, retryCount: 0 });
                }}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-all active:scale-95 border border-white/10"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

