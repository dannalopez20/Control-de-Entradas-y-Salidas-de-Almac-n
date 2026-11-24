import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      isQuotaError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'Error inesperado en la aplicación.';
    const isQuotaError = raw.toLowerCase().includes('quota exceeded');
    let friendly = 'Ocurrió un problema al comunicar con la base de datos.';

    if (isQuotaError) {
      friendly =
        'Se alcanzó la cuota diaria gratuita de Firestore. La cuota se restablecerá mañana.';
    } else if (raw.includes('permission-denied') || raw.includes('Missing or insufficient permissions')) {
      friendly =
        'No tienes permisos suficientes para completar esta operación. Verifica que iniciaste sesión con tu cuenta verificada.';
    }

    return {
      hasError: true,
      message: friendly,
      isQuotaError,
    };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '', isQuotaError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">
                  {this.state.isQuotaError ? 'Límite de cuota alcanzado' : 'Error de sincronización'}
                </h2>
                <p className="text-sm text-slate-600">{this.state.message}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
