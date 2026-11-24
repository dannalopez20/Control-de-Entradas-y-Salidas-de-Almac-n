import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { CheckCircle2, Loader2, LogOut, AlertCircle } from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  createMovimientoWithMateriales,
  deleteMovimientoWithMateriales,
  fetchMaterialesByMovimiento,
  subscribeMovimientos,
  updateMovimientoWithMateriales,
  type SaveMovimientoData,
} from './services/movimientosService';
import type { MaterialRecord, MovimientoRecord } from './types/warehouse';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MovimientoForm } from './components/MovimientoForm';
import { MovimientosList } from './components/MovimientosList';
import { WarehouseLogo } from './components/WarehouseLogo';

type ActiveView = 'historial' | 'formulario';

function WarehouseWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [activeView, setActiveView] = useState<ActiveView>('historial');
  const [movimientos, setMovimientos] = useState<MovimientoRecord[]>([]);
  const [isLoadingMovimientos, setIsLoadingMovimientos] = useState(true);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const [editingMovimiento, setEditingMovimiento] = useState<MovimientoRecord | null>(null);
  const [editingMateriales, setEditingMateriales] = useState<MaterialRecord[]>([]);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [expandedMateriales, setExpandedMateriales] = useState<Record<string, MaterialRecord[]>>(
    {}
  );
  const [loadingExpandId, setLoadingExpandId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Surface Firestore errors to ErrorBoundary
  if (syncError) {
    throw syncError;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setMovimientos([]);
        setEditingMovimiento(null);
        setEditingMateriales([]);
        setExpandedMateriales({});
        setIsLoadingMovimientos(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    setIsLoadingMovimientos(true);
    const unsubscribe = subscribeMovimientos(
      user.uid,
      (records) => {
        setMovimientos(records);
        setIsLoadingMovimientos(false);
      },
      (err) => {
        setIsLoadingMovimientos(false);
        setSyncError(err);
      }
    );
    return unsubscribe;
  }, [authReady, user]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code !== 'auth/popup-closed-by-user') {
        setAuthError('No fue posible iniciar sesión con Google. Intenta nuevamente.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleStartNew = () => {
    setEditingMovimiento(null);
    setEditingMateriales([]);
    setActiveView('formulario');
  };

  const handleEditMovimiento = useCallback(
    async (movimiento: MovimientoRecord) => {
      if (!user) return;
      setEditingMovimiento(movimiento);
      setActiveView('formulario');
      setIsLoadingEdit(true);
      try {
        const mats = await fetchMaterialesByMovimiento(user.uid, movimiento.id);
        setEditingMateriales(mats);
      } catch (err) {
        setSyncError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoadingEdit(false);
      }
    },
    [user]
  );

  const handleCancelEdit = () => {
    setEditingMovimiento(null);
    setEditingMateriales([]);
    setActiveView('historial');
  };

  const handleSaveMovimiento = async (
    data: SaveMovimientoData,
    originalMaterialIds: string[]
  ) => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (editingMovimiento) {
        await updateMovimientoWithMateriales(
          user.uid,
          editingMovimiento.id,
          data,
          originalMaterialIds
        );
        // Invalidate cached expanded rows so re-expanding fetches latest edits
        setExpandedMateriales((prev) => {
          const next = { ...prev };
          delete next[editingMovimiento.id];
          return next;
        });
        setToastMessage(`Movimiento ${data.folio} actualizado correctamente.`);
        setEditingMovimiento(null);
        setEditingMateriales([]);
      } else {
        await createMovimientoWithMateriales(user.uid, data);
        setToastMessage(`Movimiento ${data.folio} registrado correctamente.`);
      }
      setActiveView('historial');
    } catch (err) {
      setSyncError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMovimiento = async (movimiento: MovimientoRecord) => {
    if (!user) return;
    setDeletingId(movimiento.id);
    try {
      await deleteMovimientoWithMateriales(user.uid, movimiento.id);
      setExpandedMateriales((prev) => {
        const next = { ...prev };
        delete next[movimiento.id];
        return next;
      });
      if (editingMovimiento?.id === movimiento.id) {
        setEditingMovimiento(null);
        setEditingMateriales([]);
      }
      setToastMessage(`Movimiento ${movimiento.folio} eliminado.`);
    } catch (err) {
      setSyncError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleExpand = async (movimientoId: string) => {
    if (!user || expandedMateriales[movimientoId]) return;
    setLoadingExpandId(movimientoId);
    try {
      const mats = await fetchMaterialesByMovimiento(user.uid, movimientoId);
      setExpandedMateriales((prev) => ({ ...prev, [movimientoId]: mats }));
    } catch (err) {
      setSyncError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingExpandId(null);
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" aria-label="Cargando sesión" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-blue-200/80 bg-white p-8 shadow-xs">
          <div className="flex h-14 w-24 items-center justify-center rounded-lg border border-blue-100 bg-blue-50/60 px-2.5 py-2">
            <WarehouseLogo className="h-full w-full" compact />
          </div>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-blue-950">
            Control de Almacén
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Inicia sesión con tu cuenta de Google para registrar notas de entrada, salida y devolución, consultar tu historial de movimientos y editarlos en cualquier momento.
          </p>

          {authError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-900"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 focus:outline-none disabled:opacity-60 whitespace-nowrap"
          >
            {isSigningIn && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Iniciar sesión con Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 border-b border-blue-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
          <a
            href="#historial"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('historial');
            }}
            className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-blue-950 whitespace-nowrap shrink-0"
          >
            <WarehouseLogo className="h-7 w-14 shrink-0" compact />
            <span>Control de Almacén</span>
          </a>

          <nav aria-label="Navegación principal" className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveView('historial')}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'historial'
                  ? 'border-blue-700 text-blue-950'
                  : 'border-transparent text-slate-500 hover:text-blue-900'
              }`}
            >
              Historial de Movimientos
            </button>
            <button
              type="button"
              onClick={handleStartNew}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'formulario'
                  ? 'border-blue-700 text-blue-950'
                  : 'border-transparent text-slate-500 hover:text-blue-900'
              }`}
            >
              {editingMovimiento ? 'Editando Remisión' : 'Nueva Remisión'}
            </button>
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden text-xs text-slate-500 md:inline truncate max-w-44">
              {user.displayName || user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-900 transition-colors hover:bg-blue-50 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs font-medium text-emerald-800 hover:underline whitespace-nowrap shrink-0"
            >
              Cerrar
            </button>
          </div>
        )}

        {activeView === 'historial' ? (
          <MovimientosList
            movimientos={movimientos}
            isLoading={isLoadingMovimientos}
            expandedMateriales={expandedMateriales}
            loadingExpandId={loadingExpandId}
            deletingId={deletingId}
            onNewMovimiento={handleStartNew}
            onEditMovimiento={handleEditMovimiento}
            onDeleteMovimiento={handleDeleteMovimiento}
            onToggleExpand={handleToggleExpand}
          />
        ) : (
          <MovimientoForm
            defaultAlmacenista={user.displayName || ''}
            editingMovimiento={editingMovimiento}
            editingMateriales={editingMateriales}
            isLoadingEdit={isLoadingEdit}
            isSaving={isSaving}
            onSave={handleSaveMovimiento}
            onCancelEdit={handleCancelEdit}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WarehouseWorkspace />
    </ErrorBoundary>
  );
}
