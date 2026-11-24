import React, { useEffect, useState } from 'react';
import { Package, Plus, Trash2, AlertCircle, Loader2, X } from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  getTodayIsoDate,
  TIPOS_MOVIMIENTO,
  UNIDADES_OPCIONES,
  validateMovimientoPayload,
  type MaterialRecord,
  type MaterialRowInput,
  type MovimientoRecord,
  type TipoMovimiento,
  type UnidadMedida,
} from '../types/warehouse';
import type { SaveMovimientoData } from '../services/movimientosService';

interface MovimientoFormProps {
  defaultAlmacenista: string;
  editingMovimiento: MovimientoRecord | null;
  editingMateriales: MaterialRecord[];
  isLoadingEdit: boolean;
  isSaving: boolean;
  onSave: (data: SaveMovimientoData, originalMaterialIds: string[]) => Promise<void>;
  onCancelEdit: () => void;
}

function createInitialRows(): MaterialRowInput[] {
  return [
    {
      localId: 'row-init-1',
      codigo: '',
      descripcion_material: '',
      cantidad: '',
      unidad: 'caja',
    },
    {
      localId: 'row-init-2',
      codigo: '',
      descripcion_material: '',
      cantidad: '',
      unidad: 'pieza',
    },
  ];
}

export function MovimientoForm({
  defaultAlmacenista,
  editingMovimiento,
  editingMateriales,
  isLoadingEdit,
  isSaving,
  onSave,
  onCancelEdit,
}: MovimientoFormProps) {
  const [folio, setFolio] = useState('');
  const [fecha, setFecha] = useState(getTodayIsoDate());
  const [proveedor, setProveedor] = useState('');
  const [rfc, setRfc] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento>('entrada');
  const [materiales, setMateriales] = useState<MaterialRowInput[]>(createInitialRows);
  const [observaciones, setObservaciones] = useState('');
  const [recibioAlmacenista, setRecibioAlmacenista] = useState(defaultAlmacenista);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditMode = Boolean(editingMovimiento);

  useEffect(() => {
    setFormError(null);
    if (editingMovimiento) {
      setFolio(editingMovimiento.folio);
      setFecha(editingMovimiento.fecha);
      setProveedor(editingMovimiento.proveedor);
      setRfc(editingMovimiento.rfc);
      setTipoMovimiento(editingMovimiento.tipo_movimiento);
      setObservaciones(editingMovimiento.observaciones);
      setRecibioAlmacenista(editingMovimiento.recibio_almacenista);

      if (editingMateriales.length > 0) {
        setMateriales(
          editingMateriales.map((m) => ({
            localId: m.id,
            docId: m.id,
            codigo: m.codigo,
            descripcion_material: m.descripcion_material,
            cantidad: String(m.cantidad),
            unidad: m.unidad,
          }))
        );
      } else {
        setMateriales(createInitialRows());
      }
    } else {
      setFolio('');
      setFecha(getTodayIsoDate());
      setProveedor('');
      setRfc('');
      setTipoMovimiento('entrada');
      setMateriales(createInitialRows());
      setObservaciones('');
      setRecibioAlmacenista(defaultAlmacenista);
    }
  }, [editingMovimiento, editingMateriales, defaultAlmacenista]);

  const handleMaterialChange = (
    localId: string,
    field: keyof Omit<MaterialRowInput, 'localId' | 'docId'>,
    value: string
  ) => {
    setMateriales((prev) =>
      prev.map((row) =>
        row.localId === localId
          ? {
              ...row,
              [field]: field === 'unidad' ? (value as UnidadMedida) : value,
            }
          : row
      )
    );
  };

  const handleAddRow = () => {
    if (materiales.length >= BLUEPRINT_LIMITS.MAX_PARTIDAS) return;
    setMateriales((prev) => [
      ...prev,
      {
        localId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        codigo: '',
        descripcion_material: '',
        cantidad: '',
        unidad: 'pieza',
      },
    ]);
  };

  const handleRemoveRow = (localId: string) => {
    if (materiales.length <= 1) return;
    setMateriales((prev) => prev.filter((row) => row.localId !== localId));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateMovimientoPayload({
      folio,
      fecha,
      proveedor,
      rfc,
      tipo_movimiento: tipoMovimiento,
      observaciones,
      recibio_almacenista: recibioAlmacenista,
      materiales,
    });

    if (!validation.valid || !validation.normalized) {
      setFormError(validation.error ?? 'Revisa los campos obligatorios del formulario.');
      return;
    }

    const originalMaterialIds = editingMateriales.map((m) => m.id);
    try {
      await onSave(validation.normalized, originalMaterialIds);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? 'No se pudieron guardar los cambios. Verifica tu conexión e intenta de nuevo.'
          : 'Error al guardar el movimiento.'
      );
    }
  };

  if (isLoadingEdit) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-600" aria-hidden="true" />
        <p className="mt-3 text-sm text-slate-600">Cargando partidas del movimiento...</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10"
      aria-label="Formulario de Nota de Entrada o Remisión de Almacén"
    >
      {/* Barra de modo edición */}
      {isEditMode && editingMovimiento && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Editando movimiento</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-medium">{editingMovimiento.folio}</span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Cancelar edición
          </button>
        </div>
      )}

      {/* Encabezado: Logo y Título */}
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-600"
            aria-label="Espacio para logotipo de empresa"
          >
            <div className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <Package className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Logo</span>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Nota de entrada / Remisión de Almacén
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isEditMode
                ? 'Modifica los datos generales o las partidas de materiales y guarda los cambios'
                : 'Registra entradas, salidas y devoluciones para el historial del almacén'}
            </p>
          </div>
        </div>
      </header>

      {/* Error de validación */}
      {formError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <p>{formError}</p>
        </div>
      )}

      {/* Datos Generales */}
      <section
        aria-label="Datos generales del documento"
        className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2"
      >
        <div>
          <label htmlFor="folio" className="block text-sm font-semibold text-slate-700">
            Folio
          </label>
          <input
            type="text"
            id="folio"
            name="folio"
            value={folio}
            maxLength={BLUEPRINT_LIMITS.FOLIO_MAX}
            onChange={(e) => setFolio(e.target.value)}
            placeholder="Ej. REM-2026-0042"
            required
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="fecha" className="block text-sm font-semibold text-slate-700">
            Fecha
          </label>
          <input
            type="date"
            id="fecha"
            name="fecha"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="proveedor" className="block text-sm font-semibold text-slate-700">
            Proveedor
          </label>
          <input
            type="text"
            id="proveedor"
            name="proveedor"
            value={proveedor}
            maxLength={BLUEPRINT_LIMITS.PROVEEDOR_MAX}
            onChange={(e) => setProveedor(e.target.value)}
            placeholder="Nombre o razón social del proveedor"
            required
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="rfc" className="block text-sm font-semibold text-slate-700">
            RFC
          </label>
          <input
            type="text"
            id="rfc"
            name="rfc"
            value={rfc}
            maxLength={BLUEPRINT_LIMITS.RFC_MAX}
            onChange={(e) =>
              setRfc(e.target.value.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, ''))
            }
            placeholder="Ej. ABC120315XY9"
            required
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-slate-900 placeholder:normal-case placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
          />
        </div>
      </section>

      {/* Tipo de Movimiento */}
      <fieldset className="mt-6 border-y border-dashed border-slate-300 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
          <legend className="text-sm font-semibold text-slate-700">
            Tipo de Movimiento:
          </legend>
          <div className="flex flex-wrap items-center gap-6">
            {TIPOS_MOVIMIENTO.map((opcion) => (
              <label
                key={opcion.value}
                htmlFor={`tipo_movimiento_${opcion.value}`}
                className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-800"
              >
                <input
                  type="radio"
                  id={`tipo_movimiento_${opcion.value}`}
                  name="tipo_movimiento"
                  value={opcion.value}
                  checked={tipoMovimiento === opcion.value}
                  onChange={() => setTipoMovimiento(opcion.value)}
                  className="h-4 w-4 border-slate-300 text-slate-900 accent-slate-900 focus:ring-2 focus:ring-slate-900/20"
                />
                <span>{opcion.label}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Detalle de Materiales */}
      <section aria-labelledby="detalle-materiales-heading" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <h2
            id="detalle-materiales-heading"
            className="text-base font-semibold text-slate-900"
          >
            Detalle de Materiales
          </h2>
          <button
            type="button"
            onClick={handleAddRow}
            disabled={materiales.length >= BLUEPRINT_LIMITS.MAX_PARTIDAS}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-slate-900/15 focus:outline-none disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Agregar fila
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="w-36 px-3.5 py-3 text-xs font-semibold text-slate-700"
                >
                  Código
                </th>
                <th
                  scope="col"
                  className="px-3.5 py-3 text-xs font-semibold text-slate-700"
                >
                  Descripción Material
                </th>
                <th
                  scope="col"
                  className="w-32 px-3.5 py-3 text-xs font-semibold text-slate-700"
                >
                  Cantidad
                </th>
                <th
                  scope="col"
                  className="w-40 px-3.5 py-3 text-xs font-semibold text-slate-700"
                >
                  Unidad
                </th>
                {materiales.length > 1 && (
                  <th scope="col" className="w-12 px-2 py-3">
                    <span className="sr-only">Eliminar fila</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {materiales.map((row, index) => (
                <tr key={row.localId} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 align-middle">
                    <label htmlFor={`codigo_${index + 1}`} className="sr-only">
                      Código fila {index + 1}
                    </label>
                    <input
                      type="text"
                      id={`codigo_${index + 1}`}
                      name="codigo[]"
                      value={row.codigo}
                      maxLength={BLUEPRINT_LIMITS.CODIGO_MAX}
                      onChange={(e) =>
                        handleMaterialChange(row.localId, 'codigo', e.target.value)
                      }
                      placeholder="SKU-001"
                      className="block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <label
                      htmlFor={`descripcion_material_${index + 1}`}
                      className="sr-only"
                    >
                      Descripción Material fila {index + 1}
                    </label>
                    <input
                      type="text"
                      id={`descripcion_material_${index + 1}`}
                      name="descripcion_material[]"
                      value={row.descripcion_material}
                      maxLength={BLUEPRINT_LIMITS.DESCRIPCION_MAX}
                      onChange={(e) =>
                        handleMaterialChange(
                          row.localId,
                          'descripcion_material',
                          e.target.value
                        )
                      }
                      placeholder="Descripción del producto o material"
                      className="block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <label htmlFor={`cantidad_${index + 1}`} className="sr-only">
                      Cantidad fila {index + 1}
                    </label>
                    <input
                      type="number"
                      id={`cantidad_${index + 1}`}
                      name="cantidad[]"
                      min="0"
                      max={BLUEPRINT_LIMITS.MAX_CANTIDAD}
                      step="any"
                      value={row.cantidad}
                      onChange={(e) =>
                        handleMaterialChange(row.localId, 'cantidad', e.target.value)
                      }
                      placeholder="0"
                      className="block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-right font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <label htmlFor={`unidad_${index + 1}`} className="sr-only">
                      Unidad fila {index + 1}
                    </label>
                    <select
                      id={`unidad_${index + 1}`}
                      name="unidad[]"
                      value={row.unidad}
                      onChange={(e) =>
                        handleMaterialChange(row.localId, 'unidad', e.target.value)
                      }
                      className="block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
                    >
                      {UNIDADES_OPCIONES.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  {materiales.length > 1 && (
                    <td className="px-2 py-2.5 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.localId)}
                        aria-label={`Eliminar fila ${index + 1}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <hr className="my-6 border-0 border-t border-dashed border-slate-300" />

      {/* Observaciones / Estado del Paquete */}
      <section aria-label="Observaciones y estado del paquete">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="observaciones"
            className="block text-sm font-semibold text-slate-700"
          >
            Observaciones / Estado del Paquete:
          </label>
          <span className="font-mono text-xs tabular-nums text-slate-400">
            {observaciones.length}/{BLUEPRINT_LIMITS.OBSERVACIONES_MAX}
          </span>
        </div>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={3}
          maxLength={BLUEPRINT_LIMITS.OBSERVACIONES_MAX}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Indique condiciones físicas del empaque, sellos, faltantes o incidencias detectadas..."
          className="mt-1.5 block w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
        />
      </section>

      {/* Pie de formulario: Recibió y Guardar / Actualizar */}
      <footer className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <label
            htmlFor="recibio_almacenista"
            className="block text-sm font-semibold text-slate-700"
          >
            Recibió (Almacenista):
          </label>
          <input
            type="text"
            id="recibio_almacenista"
            name="recibio_almacenista"
            value={recibioAlmacenista}
            maxLength={BLUEPRINT_LIMITS.ALMACENISTA_MAX}
            onChange={(e) => setRecibioAlmacenista(e.target.value)}
            placeholder="Nombre completo del almacenista"
            required
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          {isEditMode && (
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-slate-900/15 focus:outline-none disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 focus:outline-none disabled:opacity-60 sm:w-auto whitespace-nowrap shrink-0"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEditMode ? 'Actualizar Datos' : 'Guardar Datos'}
          </button>
        </div>
      </footer>
    </form>
  );
}
