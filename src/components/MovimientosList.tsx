import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import type { MaterialRecord, MovimientoRecord, TipoMovimiento } from '../types/warehouse';

interface MovimientosListProps {
  movimientos: MovimientoRecord[];
  isLoading: boolean;
  expandedMateriales: Record<string, MaterialRecord[]>;
  loadingExpandId: string | null;
  deletingId: string | null;
  onNewMovimiento: () => void;
  onEditMovimiento: (movimiento: MovimientoRecord) => void;
  onDeleteMovimiento: (movimiento: MovimientoRecord) => Promise<void>;
  onToggleExpand: (movimientoId: string) => void;
}

type FilterTipo = 'todos' | TipoMovimiento;

function TipoLabel({ tipo }: { tipo: TipoMovimiento }) {
  if (tipo === 'entrada') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <ArrowDownLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Entrada
      </span>
    );
  }
  if (tipo === 'salida') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Salida
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
      <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Devolución
    </span>
  );
}

export function MovimientosList({
  movimientos,
  isLoading,
  expandedMateriales,
  loadingExpandId,
  deletingId,
  onNewMovimiento,
  onEditMovimiento,
  onDeleteMovimiento,
  onToggleExpand,
}: MovimientosListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MovimientoRecord | null>(null);

  const stats = useMemo(() => {
    let entradas = 0;
    let salidas = 0;
    let devoluciones = 0;
    for (const m of movimientos) {
      if (m.tipo_movimiento === 'entrada') entradas++;
      else if (m.tipo_movimiento === 'salida') salidas++;
      else if (m.tipo_movimiento === 'devolucion') devoluciones++;
    }
    return {
      total: movimientos.length,
      entradas,
      salidas,
      devoluciones,
    };
  }, [movimientos]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return movimientos.filter((m) => {
      if (filterTipo !== 'todos' && m.tipo_movimiento !== filterTipo) {
        return false;
      }
      if (!q) return true;
      return (
        m.folio.toLowerCase().includes(q) ||
        m.proveedor.toLowerCase().includes(q) ||
        m.rfc.toLowerCase().includes(q) ||
        m.recibio_almacenista.toLowerCase().includes(q) ||
        m.resumen_materiales.toLowerCase().includes(q) ||
        m.fecha.includes(q)
      );
    });
  }, [movimientos, searchTerm, filterTipo]);

  const handleRowExpand = (movId: string) => {
    if (expandedId === movId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(movId);
    onToggleExpand(movId);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    if (expandedId === target.id) setExpandedId(null);
    await onDeleteMovimiento(target);
  };

  return (
    <div className="space-y-6">
      {/* Resumen numérico */}
      <section aria-label="Resumen de movimientos" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total de movimientos</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Entradas</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-700">
            {stats.entradas}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Salidas</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-700">
            {stats.salidas}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Devoluciones</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-red-700">
            {stats.devoluciones}
          </p>
        </div>
      </section>

      {/* Contenedor principal de tabla */}
      <section className="rounded-xl border border-slate-200 bg-white">
        {/* Barra de búsqueda y filtros */}
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar folio, proveedor, RFC, material..."
                aria-label="Buscar movimientos"
                className="block w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
              />
            </div>

            <div
              role="group"
              aria-label="Filtrar por tipo de movimiento"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
            >
              {(
                [
                  { id: 'todos', label: 'Todos' },
                  { id: 'entrada', label: 'Entradas' },
                  { id: 'salida', label: 'Salidas' },
                  { id: 'devolucion', label: 'Devoluciones' },
                ] as { id: FilterTipo; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTipo(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    filterTipo === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onNewMovimiento}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 focus:outline-none whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo Movimiento
          </button>
        </div>

        {/* Estado de carga */}
        {isLoading ? (
          <div className="divide-y divide-slate-200 p-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center justify-between gap-4 py-4">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : movimientos.length === 0 ? (
          /* Estado vacío inicial */
          <div className="px-6 py-14 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Aún no hay movimientos registrados
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
              Registra tu primera nota de entrada, salida o devolución de almacén para consultarla y editarla en cualquier momento.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={onNewMovimiento}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Registrar Primer Movimiento
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* Estado sin coincidencias de búsqueda */
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">
              No se encontraron movimientos con los filtros actuales.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterTipo('todos');
              }}
              className="mt-3 text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
            >
              Limpiar búsqueda y filtros
            </button>
          </div>
        ) : (
          /* Tabla de movimientos */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="w-10 px-3 py-3">
                    <span className="sr-only">Expandir</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-700">
                    Folio
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-700">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-700">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-700">
                    Proveedor / RFC
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-700">
                    Materiales
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-700">
                    Almacenista
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold text-slate-700"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filtered.map((mov) => {
                  const isExpanded = expandedId === mov.id;
                  const detailRows = expandedMateriales[mov.id];
                  const isBusyDeleting = deletingId === mov.id;

                  return (
                    <React.Fragment key={mov.id}>
                      <tr className="transition-colors hover:bg-slate-50/70">
                        <td className="px-3 py-3.5 align-top">
                          <button
                            type="button"
                            onClick={() => handleRowExpand(mov.id)}
                            aria-expanded={isExpanded}
                            aria-label={
                              isExpanded
                                ? `Ocultar detalle del folio ${mov.folio}`
                                : `Ver detalle del folio ${mov.folio}`
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 align-top font-mono text-sm font-semibold text-slate-900 whitespace-nowrap">
                          {mov.folio}
                        </td>
                        <td className="px-4 py-3.5 align-top font-mono text-sm tabular-nums text-slate-700 whitespace-nowrap">
                          {mov.fecha}
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <TipoLabel tipo={mov.tipo_movimiento} />
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <p className="text-sm font-medium text-slate-900">{mov.proveedor}</p>
                          <p className="mt-0.5 font-mono text-xs text-slate-500">{mov.rfc}</p>
                        </td>
                        <td className="max-w-xs px-4 py-3.5 align-top">
                          <p className="truncate text-sm text-slate-800" title={mov.resumen_materiales}>
                            {mov.resumen_materiales || 'Sin detalle'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            <span className="font-mono tabular-nums">{mov.total_partidas}</span>{' '}
                            {mov.total_partidas === 1 ? 'partida' : 'partidas'}
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono tabular-nums">{mov.total_cantidad}</span>{' '}
                            unidades totales
                          </p>
                        </td>
                        <td className="px-4 py-3.5 align-top text-sm text-slate-700 whitespace-nowrap">
                          {mov.recibio_almacenista}
                        </td>
                        <td className="px-4 py-3.5 text-right align-top">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onEditMovimiento(mov)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(mov)}
                              disabled={isBusyDeleting}
                              aria-label={`Eliminar folio ${mov.folio}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              {isBusyDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Detalle expandible de partidas y observaciones */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-xs font-semibold text-slate-700">
                                  Partidas registradas ({mov.folio})
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => onEditMovimiento(mov)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
                                >
                                  Editar este movimiento
                                </button>
                              </div>

                              {loadingExpandId === mov.id ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                  Cargando partidas...
                                </div>
                              ) : detailRows && detailRows.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                    <thead className="bg-slate-50">
                                      <tr>
                                        <th className="px-3 py-2 font-semibold text-slate-600">
                                          Código
                                        </th>
                                        <th className="px-3 py-2 font-semibold text-slate-600">
                                          Descripción Material
                                        </th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-600">
                                          Cantidad
                                        </th>
                                        <th className="px-3 py-2 font-semibold text-slate-600">
                                          Unidad
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {detailRows.map((item) => (
                                        <tr key={item.id}>
                                          <td className="px-3 py-2 font-mono text-slate-700">
                                            {item.codigo || '—'}
                                          </td>
                                          <td className="px-3 py-2 text-slate-900">
                                            {item.descripcion_material}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                                            {item.cantidad}
                                          </td>
                                          <td className="px-3 py-2 capitalize text-slate-700">
                                            {item.unidad}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  Sin partidas detalladas disponibles.
                                </p>
                              )}

                              {mov.observaciones && (
                                <div className="text-xs text-slate-700">
                                  <span className="font-semibold text-slate-800">
                                    Observaciones / Estado del Paquete:{' '}
                                  </span>
                                  <span>{mov.observaciones}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de confirmación de eliminación */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 id="delete-dialog-title" className="text-base font-semibold text-slate-900">
              Eliminar movimiento
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              ¿Deseas eliminar permanentemente el folio{' '}
              <span className="font-mono font-semibold text-slate-900">
                {confirmDelete.folio}
              </span>{' '}
              y todas sus partidas de materiales? Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 whitespace-nowrap shrink-0"
              >
                Eliminar registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
