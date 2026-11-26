import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Une erreur inattendue est survenue.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg max-w-lg w-full p-6 text-center space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Une erreur d&apos;affichage est survenue
            </h2>
            <p className="text-sm text-slate-600">
              La plateforme a rencontré un problème temporaire. Cliquez ci-dessous pour recharger la page en toute sécurité.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              Recharger la plateforme
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
