import React, { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorCount: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState((state) => ({
      hasError: false,
      errorCount: state.errorCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.state.errorCount < 3) {
        setTimeout(this.handleRetry, 500);
        return (
          <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-950">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-4">Loading...</div>
              <div className="text-gray-400">Retrying view (Attempt {this.state.errorCount + 1}/3)</div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-950">
          <div className="text-center p-8">
            <div className="text-3xl font-bold text-red-400 mb-4">Error Loading View</div>
            <div className="text-gray-400 mb-6">Critical error after 3 retries. Please refresh.</div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-semibold"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;