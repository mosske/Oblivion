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
    console.warn("ErrorBoundary caught temporary view error, performing automatic seamless retry:", error, errorInfo);
    
    const nextCount = this.state.retryCount + 1;
    this.setState({ retryCount: nextCount });

    if (nextCount <= 3) {
      // Seamlessly retry the view automatically within 50ms without showing recovery UI prompt
      if (this.retryTimeout) clearTimeout(this.retryTimeout);
      this.retryTimeout = setTimeout(() => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
          try {
            this.props.onReset();
          } catch {}
        }
      }, 50);
    } else {
      // If retry view fails 3 times, automatically perform a clean Reload App
      console.warn("View retry limit reached (3 times). Automatically reloading application...");
      if (this.retryTimeout) clearTimeout(this.retryTimeout);
      this.retryTimeout = setTimeout(() => {
        window.location.reload();
      }, 300);
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

  public render() {
    if (this.state.hasError) {
      // Return a seamless subtle placeholder during the fast retry cycle instead of the recovery prompt screen
      return (
        <div className="flex-1 flex items-center justify-center min-h-[300px] p-8 text-center select-none">
          <Loader2 className="w-6 h-6 text-[var(--accent-color,var(--primary))] animate-spin opacity-80" stroke="currentColor" />
        </div>
      );
    }

    return this.props.children;
  }
}

