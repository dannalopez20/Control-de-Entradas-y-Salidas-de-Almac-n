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
      {/* Resumen numérico por área */}
      <section aria-label="Resumen de movimientos" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-blue-900 bg-blue-950 p-5 text-white">
          <p className="text-xs font-medium text-blue-200">Total de movimientos</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-white">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/70 p-5">
          <p className="text-xs font-medium text-blue-900">Entradas</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-700">
            {stats.entradas}
          </p>
        </div>
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-5">
          <p className="text-xs font-medium text-sky-900">Salidas</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-700">
            {stats.salidas}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-600">Devoluciones</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-red-700">
            {stats.devoluciones}
          </p>
        </div>
      </section>

      {/* Contenedor principal de tabla */}
      <section className="overflow-hidden rounded-xl border border-blue-200/80 bg-white shadow-xs">
        {/* Barra de búsqueda y filtros */}
        <div className="flex flex-col gap-4 border-b border-blue-100 bg-blue-50/40 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-blue-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar folio, proveedor, RFC, material..."
                aria-label="Buscar movimientos"
                className="block w-full rounded-lg border border-blue-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
              />
            </div>

            <div
              role="group"
              aria-label="Filtrar por tipo de movimiento"
              className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-100/60 p-1"
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
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-blue-950/75 hover:text-blue-950'
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 focus:outline-none whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo Movimiento
          </button>
        </div>

        {/* Estado de carga */}
        {isLoading ? (
          <div className="divide-y divide-blue-100 p-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center justify-between gap-4 py-4">
                <div className="h-4 w-28 animate-pulse rounded bg-blue-100" />
                <div className="h-4 w-24 animate-pulse rounded bg-blue-100" />
                <div className="h-4 w-48 animate-pulse rounded bg-blue-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-blue-100" />
                <div className="h-8 w-24 animate-pulse rounded bg-blue-100" />
              </div>
            ))}
          </div>
        ) : movimientos.length === 0 ? (
          /* Estado vacío inicial */
          <div className="px-6 py-14 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-blue-300" aria-hidden="true" />
            <h2 className="mt-4 text-base font-semibold text-blue-950">
              Aún no hay movimientos registrados
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
              Registra tu primera nota de entrada, salida o devolución de almacén para consultarla y editarla en cualquier momento.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={onNewMovimiento}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Registrar Primer Movimiento
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* Estado sin coincidencias de búsqueda */
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-blue-950">
              No se encontraron movimientos con los filtros actuales.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterTipo('todos');
              }}
              className="mt-3 text-sm font-medium text-blue-800 underline underline-offset-4 hover:text-blue-950"
            >
              Limpiar búsqueda y filtros
            </button>
          </div>
        ) : (
          /* Tabla de movimientos */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-blue-100 text-left">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th scope="col" className="w-10 px-3 py-3">
                    <span className="sr-only">Expandir</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">
                    Folio
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">
                    Proveedor / RFC
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">
                    Materiales
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">
                    Almacenista
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100 bg-white">
                {filtered.map((mov, idx) => {
                  const isExpanded = expandedId === mov.id;
                  const detailRows = expandedMateriales[mov.id];
                  const isBusyDeleting = deletingId === mov.id;

                  return (
                    <React.Fragment key={mov.id}>
                      <tr
                        className={`transition-colors hover:bg-blue-50/75 ${
                          idx % 2 === 1 ? 'bg-blue-50/25' : 'bg-white'
                        }`}
                      >
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
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-950"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 align-top font-mono text-sm font-semibold text-blue-950 whitespace-nowrap">
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
                              className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-xs font-semibold text-blue-900 transition-colors hover:bg-blue-100 whitespace-nowrap shrink-0"
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
                        <tr className="bg-blue-50/55">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-xs font-semibold text-blue-950">
                                  Partidas registradas ({mov.folio})
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => onEditMovimiento(mov)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 underline underline-offset-4 hover:text-blue-950"
                                >
                                  Editar este movimiento
                                </button>
                              </div>

                              {loadingExpandId === mov.id ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-700" aria-hidden="true" />
                                  Cargando partidas...
                                </div>
                              ) : detailRows && detailRows.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-blue-200/80 bg-white">
                                  <table className="min-w-full divide-y divide-blue-100 text-left text-xs">
                                    <thead className="bg-blue-100/80 text-blue-950">
                                      <tr>
                                        <th className="px-3 py-2 font-semibold">
                                          Código
                                        </th>
                                        <th className="px-3 py-2 font-semibold">
                                          Descripción Material
                                        </th>
                                        <th className="px-3 py-2 text-right font-semibold">
                                          Cantidad
                                        </th>
                                        <th className="px-3 py-2 font-semibold">
                                          Unidad
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-50">
                                      {detailRows.map((item) => (
                                        <tr key={item.id} className="even:bg-blue-50/25">
                                          <td className="px-3 py-2 font-mono text-blue-950">
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
                                <div className="rounded-md border border-blue-200/70 bg-white/80 px-3.5 py-2.5 text-xs text-slate-700">
                                  <span className="font-semibold text-blue-950">
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

