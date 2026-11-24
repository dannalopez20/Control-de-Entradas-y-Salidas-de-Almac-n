import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  MaterialRecord,
  MovimientoRecord,
  NormalizedMaterialItem,
  TipoMovimiento,
} from '../types/warehouse';

const MOVIMIENTOS_COLLECTION = 'movimientos';

export interface SaveMovimientoData {
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
}

export function subscribeMovimientos(
  ownerId: string,
  onData: (items: MovimientoRecord[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, MOVIMIENTOS_COLLECTION),
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: MovimientoRecord[] = snapshot.docs.map((snap) => {
        const data = snap.data();
        return {
          id: snap.id,
          ownerId: String(data.ownerId ?? ''),
          folio: String(data.folio ?? ''),
          fecha: String(data.fecha ?? ''),
          proveedor: String(data.proveedor ?? ''),
          rfc: String(data.rfc ?? ''),
          tipo_movimiento: (data.tipo_movimiento as TipoMovimiento) ?? 'entrada',
          observaciones: String(data.observaciones ?? ''),
          recibio_almacenista: String(data.recibio_almacenista ?? ''),
          total_partidas: Number(data.total_partidas ?? 0),
          total_cantidad: Number(data.total_cantidad ?? 0),
          resumen_materiales: String(data.resumen_materiales ?? ''),
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
      });

      // Sort newest date first, then most recently created
      records.sort((a, b) => {
        const dateCmp = b.fecha.localeCompare(a.fecha);
        if (dateCmp !== 0) return dateCmp;
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });

      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, MOVIMIENTOS_COLLECTION);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function fetchMaterialesByMovimiento(
  ownerId: string,
  movimientoId: string
): Promise<MaterialRecord[]> {
  const path = `${MOVIMIENTOS_COLLECTION}/${movimientoId}/materiales`;
  try {
    const q = query(
      collection(db, MOVIMIENTOS_COLLECTION, movimientoId, 'materiales'),
      where('ownerId', '==', ownerId)
    );
    const snapshot = await getDocs(q);
    const items: MaterialRecord[] = snapshot.docs.map((snap) => {
      const data = snap.data();
      return {
        id: snap.id,
        ownerId: String(data.ownerId ?? ''),
        movimientoId: String(data.movimientoId ?? movimientoId),
        codigo: String(data.codigo ?? ''),
        descripcion_material: String(data.descripcion_material ?? ''),
        cantidad: Number(data.cantidad ?? 0),
        unidad: data.unidad ?? 'pieza',
        orden: Number(data.orden ?? 0),
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
      };
    });
    items.sort((a, b) => a.orden - b.orden);
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createMovimientoWithMateriales(
  ownerId: string,
  data: SaveMovimientoData
): Promise<string> {
  const movRef = doc(collection(db, MOVIMIENTOS_COLLECTION));
  const path = `${MOVIMIENTOS_COLLECTION}/${movRef.id}`;

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.set(movRef, {
      ownerId,
      folio: data.folio,
      fecha: data.fecha,
      proveedor: data.proveedor,
      rfc: data.rfc,
      tipo_movimiento: data.tipo_movimiento,
      observaciones: data.observaciones,
      recibio_almacenista: data.recibio_almacenista,
      total_partidas: data.total_partidas,
      total_cantidad: data.total_cantidad,
      resumen_materiales: data.resumen_materiales,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of data.materiales) {
      const matRef = doc(collection(db, MOVIMIENTOS_COLLECTION, movRef.id, 'materiales'));
      batch.set(matRef, {
        ownerId,
        movimientoId: movRef.id,
        codigo: item.codigo,
        descripcion_material: item.descripcion_material,
        cantidad: item.cantidad,
        unidad: item.unidad,
        orden: item.orden,
        createdAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();
    return movRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateMovimientoWithMateriales(
  ownerId: string,
  movimientoId: string,
  data: SaveMovimientoData,
  originalMaterialIds: string[]
): Promise<void> {
  const path = `${MOVIMIENTOS_COLLECTION}/${movimientoId}`;

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();
    const movRef = doc(db, MOVIMIENTOS_COLLECTION, movimientoId);

    batch.update(movRef, {
      folio: data.folio,
      fecha: data.fecha,
      proveedor: data.proveedor,
      rfc: data.rfc,
      tipo_movimiento: data.tipo_movimiento,
      observaciones: data.observaciones,
      recibio_almacenista: data.recibio_almacenista,
      total_partidas: data.total_partidas,
      total_cantidad: data.total_cantidad,
      resumen_materiales: data.resumen_materiales,
      updatedAt: now,
    });

    const retainedIds = new Set<string>();

    for (const item of data.materiales) {
      if (item.docId && originalMaterialIds.includes(item.docId)) {
        retainedIds.add(item.docId);
        const matRef = doc(db, MOVIMIENTOS_COLLECTION, movimientoId, 'materiales', item.docId);
        batch.update(matRef, {
          codigo: item.codigo,
          descripcion_material: item.descripcion_material,
          cantidad: item.cantidad,
          unidad: item.unidad,
          orden: item.orden,
          updatedAt: now,
        });
      } else {
        const newMatRef = doc(collection(db, MOVIMIENTOS_COLLECTION, movimientoId, 'materiales'));
        batch.set(newMatRef, {
          ownerId,
          movimientoId,
          codigo: item.codigo,
          descripcion_material: item.descripcion_material,
          cantidad: item.cantidad,
          unidad: item.unidad,
          orden: item.orden,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    for (const oldId of originalMaterialIds) {
      if (!retainedIds.has(oldId)) {
        const deleteRef = doc(db, MOVIMIENTOS_COLLECTION, movimientoId, 'materiales', oldId);
        batch.delete(deleteRef);
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMovimientoWithMateriales(
  ownerId: string,
  movimientoId: string
): Promise<void> {
  const path = `${MOVIMIENTOS_COLLECTION}/${movimientoId}`;

  try {
    const materiales = await fetchMaterialesByMovimiento(ownerId, movimientoId);
    const batch = writeBatch(db);

    for (const mat of materiales) {
      batch.delete(doc(db, MOVIMIENTOS_COLLECTION, movimientoId, 'materiales', mat.id));
    }

    batch.delete(doc(db, MOVIMIENTOS_COLLECTION, movimientoId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
