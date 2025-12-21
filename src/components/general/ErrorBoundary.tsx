import React from "react";
import { AlertTriangle, RotateCw, RefreshCw } from "lucide-react";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can log to server here if you want
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  private reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            <div className="bg-linear-to-br from-red-500/10 via-red-600/5 to-rose-500/10 backdrop-blur-xl rounded-2xl border border-red-500/20 shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="shrink-0">
                  <AlertTriangle className="w-7 h-7 text-red-500" strokeWidth={2} />
                </div>
                <h2 className="text-2xl font-semibold text-white">Oops! Something went wrong</h2>
              </div>
              
              <p className="text-gray-300 text-sm leading-relaxed mb-5">
                🎄 Happy Holidays! While we celebrate the season, it seems something unexpected happened. Don't worry—you can reload or reset to get back on track! ✨
              </p>

              {this.state.error?.message && (
                <div className="mb-6">
                  <pre className="bg-black/40 border border-white/10 rounded-xl p-4 overflow-auto max-h-48 text-xs text-red-300 font-mono leading-relaxed">
                    {this.state.error.message}
                  </pre>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 flex items-center justify-center gap-2 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-5 rounded-xl border border-blue-400/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>

                <button
                  onClick={this.reset}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium py-3 px-5 rounded-xl border border-white/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <RotateCw className="w-4 h-4" />
                  Reset UI
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}