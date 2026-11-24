import React, { useEffect, useState } from 'react';
import { Plus, Trash2, AlertCircle, Loader2, X } from 'lucide-react';
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
import { WarehouseLogo } from './WarehouseLogo';

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
      <div className="rounded-xl border border-blue-200/80 bg-white p-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-700" aria-hidden="true" />
        <p className="mt-3 text-sm text-slate-600">Cargando partidas del movimiento...</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="overflow-hidden rounded-xl border border-blue-200/80 bg-white shadow-xs"
      aria-label="Formulario de Nota de Entrada o Remisión de Almacén"
    >
      {/* Barra de modo edición */}
      {isEditMode && editingMovimiento && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50/90 px-6 py-3 text-sm text-amber-950 sm:px-8">
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

      {/* Encabezado Formal: Logo de Camioneta y Título */}
      <header className="border-b border-blue-100 bg-gradient-to-r from-blue-950/[0.03] via-white to-sky-50/50 px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div
              className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-blue-200/80 bg-white px-2.5 py-2"
              aria-label="Logotipo de logística y almacén"
            >
              <WarehouseLogo className="h-full w-full" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-blue-950 sm:text-2xl">
                Nota de entrada / Remisión de Almacén
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {isEditMode
                  ? 'Modifica los datos generales o las partidas de materiales y guarda los cambios'
                  : 'Registra entradas, salidas y devoluciones para el historial del almacén'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Error de validación */}
      {formError && (
        <div className="px-6 pt-6 sm:px-8">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            <p>{formError}</p>
          </div>
        </div>
      )}

      {/* Área 1: Datos Generales */}
      <section
        aria-label="Datos generales del documento"
        className="border-b border-blue-100 bg-white px-6 py-6 sm:px-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-blue-900">
            01. Datos Generales
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
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
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
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
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 focus:border-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
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
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
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
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-slate-900 placeholder:normal-case placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Área 2: Tipo de Movimiento (zona diferenciada en azul suave) */}
      <fieldset className="border-b border-blue-100 bg-blue-50/55 px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
          <legend className="text-sm font-semibold text-blue-950">
            02. Tipo de Movimiento:
          </legend>
          <div className="flex flex-wrap items-center gap-3">
            {TIPOS_MOVIMIENTO.map((opcion) => {
              const selected = tipoMovimiento === opcion.value;
              return (
                <label
                  key={opcion.value}
                  htmlFor={`tipo_movimiento_${opcion.value}`}
                  className={`inline-flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-blue-700 bg-blue-900 text-white shadow-xs'
                      : 'border-blue-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/60'
                  }`}
                >
                  <input
                    type="radio"
                    id={`tipo_movimiento_${opcion.value}`}
                    name="tipo_movimiento"
                    value={opcion.value}
                    checked={selected}
                    onChange={() => setTipoMovimiento(opcion.value)}
                    className="sr-only"
                  />
                  <span>{opcion.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </fieldset>

      {/* Área 3: Detalle de Materiales (tabla con encabezado azul marino y filas alternadas) */}
      <section
        aria-labelledby="detalle-materiales-heading"
        className="border-b border-blue-100 bg-white px-6 py-6 sm:px-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h2
            id="detalle-materiales-heading"
            className="text-sm font-semibold tracking-tight text-blue-900"
          >
            03. Detalle de Materiales
          </h2>
          <button
            type="button"
            onClick={handleAddRow}
            disabled={materiales.length >= BLUEPRINT_LIMITS.MAX_PARTIDAS}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-blue-900 transition-colors hover:bg-blue-100 focus:ring-2 focus:ring-blue-600/20 focus:outline-none disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Agregar fila
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-blue-200/80">
          <table className="min-w-full divide-y divide-blue-100 text-left">
            <thead className="bg-blue-950 text-white">
              <tr>
                <th scope="col" className="w-36 px-3.5 py-3 text-xs font-semibold">
                  Código
                </th>
                <th scope="col" className="px-3.5 py-3 text-xs font-semibold">
                  Descripción Material
                </th>
                <th scope="col" className="w-32 px-3.5 py-3 text-xs font-semibold">
                  Cantidad
                </th>
                <th scope="col" className="w-40 px-3.5 py-3 text-xs font-semibold">
                  Unidad
                </th>
                {materiales.length > 1 && (
                  <th scope="col" className="w-12 px-2 py-3">
                    <span className="sr-only">Eliminar fila</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100 bg-white">
              {materiales.map((row, index) => (
                <tr
                  key={row.localId}
                  className="odd:bg-white even:bg-blue-50/30 hover:bg-blue-50/70"
                >
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
                      className="block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
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
                      className="block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
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
                      className="block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-right font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
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
                      className="block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
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
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
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

      {/* Área 4: Observaciones y Firma / Guardar (zona diferenciada inferior) */}
      <section
        aria-label="Observaciones y cierre de recepción"
        className="bg-slate-50/80 px-6 py-6 sm:px-8"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="observaciones"
              className="block text-sm font-semibold text-blue-950"
            >
              04. Observaciones / Estado del Paquete:
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
            className="mt-2 block w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
          />
        </div>

        <footer className="mt-6 flex flex-col gap-4 border-t border-blue-200/70 pt-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-md">
            <label
              htmlFor="recibio_almacenista"
              className="block text-sm font-semibold text-blue-950"
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
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {isEditMode && (
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={isSaving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-blue-600/20 focus:outline-none disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 focus:outline-none disabled:opacity-60 sm:w-auto whitespace-nowrap shrink-0"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isEditMode ? 'Actualizar Datos' : 'Guardar Datos'}
            </button>
          </div>
        </footer>
      </section>
    </form>
  );
}
