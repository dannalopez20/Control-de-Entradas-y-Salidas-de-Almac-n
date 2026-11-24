import type { Timestamp } from 'firebase/firestore';

export type TipoMovimiento = 'entrada' | 'salida' | 'devolucion';

export type UnidadMedida = 'caja' | 'pieza' | 'paquete' | 'kg' | 'litro' | 'tarima';

export const UNIDADES_OPCIONES: { value: UnidadMedida; label: string }[] = [
  { value: 'caja', label: 'Caja' },
  { value: 'pieza', label: 'Pieza' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'litro', label: 'Litro (L)' },
  { value: 'tarima', label: 'Tarima / Pallet' },
];

export const TIPOS_MOVIMIENTO: { value: TipoMovimiento; label: string }[] = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'devolucion', label: 'Devolución' },
];

// Synchronized verbatim with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_LIMITS = {
  FOLIO_MAX: 60,
  PROVEEDOR_MAX: 150,
  RFC_MAX: 13,
  OBSERVACIONES_MAX: 1000,
  ALMACENISTA_MAX: 120,
  CODIGO_MAX: 60,
  DESCRIPCION_MAX: 200,
  RESUMEN_MAX: 300,
  MAX_PARTIDAS: 100,
  MAX_CANTIDAD: 10000000,
  RFC_PATTERN: /^[A-Z0-9&Ñ]+$/,
  FECHA_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
} as const;

export interface MaterialRowInput {
  localId: string;
  docId?: string;
  codigo: string;
  descripcion_material: string;
  cantidad: string;
  unidad: UnidadMedida;
}

export interface MaterialRecord {
  id: string;
  ownerId: string;
  movimientoId: string;
  codigo: string;
  descripcion_material: string;
  cantidad: number;
  unidad: UnidadMedida;
  orden: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface MovimientoRecord {
  id: string;
  ownerId: string;
  folio: string;
  fecha: string;
  proveedor: string;
  rfc: string;
  tipo_movimiento: TipoMovimiento;
  observaciones: string;
  recibio_almacenista: string;
  total_partidas: number;
  total_cantidad: number;
  resumen_materiales: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface MovimientoFormPayload {
  folio: string;
  fecha: string;
  proveedor: string;
  rfc: string;
  tipo_movimiento: TipoMovimiento;
  observaciones: string;
  recibio_almacenista: string;
  materiales: MaterialRowInput[];
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildResumenMateriales(
  rows: { codigo: string; descripcion_material: string; cantidad: number; unidad: UnidadMedida }[]
): string {
  const parts = rows.map((r) => {
    const label = r.codigo.trim() || r.descripcion_material.trim();
    return `${label} (${r.cantidad} ${r.unidad})`;
  });
  const joined = parts.join(', ');
  if (joined.length <= BLUEPRINT_LIMITS.RESUMEN_MAX) {
    return joined;
  }
  return `${joined.slice(0, BLUEPRINT_LIMITS.RESUMEN_MAX - 1)}…`;
}

export interface NormalizedMaterialItem {
  docId?: string;
  codigo: string;
  descripcion_material: string;
  cantidad: number;
  unidad: UnidadMedida;
  orden: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalized?: {
    folio: string;
    fecha: string;
    proveedor: string;
    rfc: string;
    tipo_movimiento: TipoMovimiento;
    observaciones: string;
    recibio_almacenista: string;
    materiales: NormalizedMaterialItem[];
    total_partidas: number;
    total_cantidad: number;
    resumen_materiales: string;
  };
}

export function validateMovimientoPayload(payload: MovimientoFormPayload): ValidationResult {
  const folio = payload.folio.trim();
  const fecha = payload.fecha.trim();
  const proveedor = payload.proveedor.trim();
  const rfc = payload.rfc.trim().toUpperCase().replace(/\s+/g, '');
  const observaciones = payload.observaciones.trim();
  const recibio_almacenista = payload.recibio_almacenista.trim();

  if (!folio || folio.length > BLUEPRINT_LIMITS.FOLIO_MAX) {
    return {
      valid: false,
      error: `El folio es obligatorio y debe tener máximo ${BLUEPRINT_LIMITS.FOLIO_MAX} caracteres.`,
    };
  }

  if (!BLUEPRINT_LIMITS.FECHA_PATTERN.test(fecha)) {
    return { valid: false, error: 'Selecciona una fecha válida (AAAA-MM-DD).' };
  }

  if (!proveedor || proveedor.length > BLUEPRINT_LIMITS.PROVEEDOR_MAX) {
    return {
      valid: false,
      error: `El proveedor es obligatorio y debe tener máximo ${BLUEPRINT_LIMITS.PROVEEDOR_MAX} caracteres.`,
    };
  }

  if (!rfc || rfc.length > BLUEPRINT_LIMITS.RFC_MAX || !BLUEPRINT_LIMITS.RFC_PATTERN.test(rfc)) {
    return {
      valid: false,
      error: 'El RFC es obligatorio (máximo 13 caracteres alfanuméricos sin espacios ni guiones).',
    };
  }

  if (!['entrada', 'salida', 'devolucion'].includes(payload.tipo_movimiento)) {
    return { valid: false, error: 'Selecciona un tipo de movimiento válido.' };
  }

  if (observaciones.length > BLUEPRINT_LIMITS.OBSERVACIONES_MAX) {
    return {
      valid: false,
      error: `Las observaciones no pueden exceder ${BLUEPRINT_LIMITS.OBSERVACIONES_MAX} caracteres.`,
    };
  }

  if (!recibio_almacenista || recibio_almacenista.length > BLUEPRINT_LIMITS.ALMACENISTA_MAX) {
    return {
      valid: false,
      error: `El nombre del almacenista es obligatorio (máximo ${BLUEPRINT_LIMITS.ALMACENISTA_MAX} caracteres).`,
    };
  }

  const filledRows = payload.materiales.filter(
    (m) =>
      m.codigo.trim() !== '' ||
      m.descripcion_material.trim() !== '' ||
      m.cantidad.trim() !== ''
  );

  if (filledRows.length === 0) {
    return {
      valid: false,
      error: 'Agrega al menos un material con descripción y cantidad en la tabla.',
    };
  }

  if (filledRows.length > BLUEPRINT_LIMITS.MAX_PARTIDAS) {
    return {
      valid: false,
      error: `Se permiten máximo ${BLUEPRINT_LIMITS.MAX_PARTIDAS} partidas por movimiento.`,
    };
  }

  const normalizedMateriales: NormalizedMaterialItem[] = [];

  for (let i = 0; i < filledRows.length; i++) {
    const row = filledRows[i];
    const codigo = row.codigo.trim();
    const descripcion = row.descripcion_material.trim();
    const cantidadNum = Number(row.cantidad);

    if (codigo.length > BLUEPRINT_LIMITS.CODIGO_MAX) {
      return {
        valid: false,
        error: `Fila ${i + 1}: el código no puede exceder ${BLUEPRINT_LIMITS.CODIGO_MAX} caracteres.`,
      };
    }

    if (!descripcion || descripcion.length > BLUEPRINT_LIMITS.DESCRIPCION_MAX) {
      return {
        valid: false,
        error: `Fila ${i + 1}: la descripción del material es obligatoria (máximo ${BLUEPRINT_LIMITS.DESCRIPCION_MAX} caracteres).`,
      };
    }

    if (
      row.cantidad.trim() === '' ||
      Number.isNaN(cantidadNum) ||
      !Number.isFinite(cantidadNum) ||
      cantidadNum < 0 ||
      cantidadNum > BLUEPRINT_LIMITS.MAX_CANTIDAD
    ) {
      return {
        valid: false,
        error: `Fila ${i + 1}: ingresa una cantidad numérica válida mayor o igual a 0.`,
      };
    }

    normalizedMateriales.push({
      docId: row.docId,
      codigo,
      descripcion_material: descripcion,
      cantidad: cantidadNum,
      unidad: row.unidad,
      orden: i,
    });
  }

  const total_partidas = normalizedMateriales.length;
  const total_cantidad = Number(
    normalizedMateriales.reduce((acc, item) => acc + item.cantidad, 0).toFixed(4)
  );
  const resumen_materiales = buildResumenMateriales(normalizedMateriales);

  return {
    valid: true,
    normalized: {
      folio,
      fecha,
      proveedor,
      rfc,
      tipo_movimiento: payload.tipo_movimiento,
      observaciones,
      recibio_almacenista,
      materiales: normalizedMateriales,
      total_partidas,
      total_cantidad,
      resumen_materiales,
    },
  };
}
