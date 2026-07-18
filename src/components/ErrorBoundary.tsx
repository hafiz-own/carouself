'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm max-w-md">
            An unexpected error occurred in the application. For security reasons, your session encryption key may have been cleared from memory.
          </p>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded text-left text-xs text-red-300 font-mono overflow-auto max-w-2xl w-full">
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-600 text-neutral-900 dark:text-white rounded-lg hover:bg-amber-500 transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
