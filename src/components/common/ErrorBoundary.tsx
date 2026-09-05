import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-50">
          <div className="text-center space-y-4 p-8 max-w-md">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
            <p className="text-sm text-slate-500 leading-relaxed">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-6 py-2.5 rounded-full btn-brand-gradient text-sm font-bold flex items-center space-x-2 mx-auto shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
