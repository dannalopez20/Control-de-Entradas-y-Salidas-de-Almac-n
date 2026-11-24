/**
 * Payload-First Security TDD Specification for Firestore Rules
 * Verifies the "Dirty Dozen" adversarial payloads against /movimientos and /movimientos/{id}/materiales.
 *
 * Run against the Firebase Emulator Suite with @firebase/rules-unit-testing when testing locally.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

const VALID_BASE_MOVIMIENTO = {
  ownerId: 'user-owner-1',
  folio: 'REM-2026-0001',
  fecha: '2026-11-19',
  proveedor: 'Industrial del Norte S.A.',
  rfc: 'IDN150320AB9',
  tipo_movimiento: 'entrada',
  observaciones: 'Empaque íntegro y sellado.',
  recibio_almacenista: 'Carlos Méndez',
  total_partidas: 2,
  total_cantidad: 15,
  resumen_materiales: 'SKU-001 (5 caja), SKU-002 (10 pieza)',
  createdAt: 'SERVER_TIMESTAMP',
  updatedAt: 'SERVER_TIMESTAMP',
};

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated create on movimientos',
    operation: 'create',
    path: '/movimientos/mov-001',
    auth: null,
    payload: VALID_BASE_MOVIMIENTO,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email user creating movement',
    operation: 'create',
    path: '/movimientos/mov-002',
    auth: { uid: 'user-owner-1', email_verified: false },
    payload: VALID_BASE_MOVIMIENTO,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity spoofing: ownerId mismatch on create',
    operation: 'create',
    path: '/movimientos/mov-003',
    auth: { uid: 'attacker-uid', email_verified: true },
    payload: { ...VALID_BASE_MOVIMIENTO, ownerId: 'user-owner-1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-user read on another owner movement',
    operation: 'get',
    path: '/movimientos/mov-victim',
    auth: { uid: 'attacker-uid', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow field injection on create (isAdmin)',
    operation: 'create',
    path: '/movimientos/mov-005',
    auth: { uid: 'user-owner-1', email_verified: true },
    payload: { ...VALID_BASE_MOVIMIENTO, isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow field injection on update',
    operation: 'update',
    path: '/movimientos/mov-existing',
    auth: { uid: 'user-owner-1', email_verified: true },
    payload: { ...VALID_BASE_MOVIMIENTO, ghostFlag: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Path ID poisoning with invalid chars and >128 length',
    operation: 'create',
    path: `/movimientos/${'a'.repeat(130)}$%`,
    auth: { uid: 'user-owner-1', email_verified: true },
    payload: VALID_BASE_MOVIMIENTO,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Volumetric resource exhaustion (>1000 chars observaciones)',
    operation: 'create',
    path: '/movimientos/mov-008',
    auth: { uid: 'user-owner-1', email_verified: true },
    payload: { ...VALID_BASE_MOVIMIENTO, observaciones: 'X'.repeat(1500) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Invalid enum value poisoning on tipo_movimiento',
    operation: 'create',
    path: '/movimientos/mov-009',
    auth: { uid: 'user-owner-1', email_verified: true },
    payload: { ...VALID_BASE_MOVIMIENTO, tipo_movimiento: 'merma_no_autorizada' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable ownerId tampering on update',
    operation: 'update',
    path: '/movimientos/mov-existing',
    auth: { uid: 'user-owner-1', email_verified: true },
    payload: { ...VALID_BASE_MOVIMIENTO, ownerId: 'other-user' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Client-forged createdAt timestamp instead of serverTimestamp',
    operation: 'create',
    path: '/movimientos/mov-011',
    auth: { uid: 'user-owner-1', email_verified: true },
    payload: { ...VALID_BASE_MOVIMIENTO, createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Orphaned or cross-owner material creation under victim movement',
    operation: 'create',
    path: '/movimientos/mov-victim/materiales/mat-001',
    auth: { uid: 'attacker-uid', email_verified: true },
    payload: {
      ownerId: 'attacker-uid',
      movimientoId: 'mov-victim',
      codigo: 'SKU-999',
      descripcion_material: 'Material inyectado',
      cantidad: 5,
      unidad: 'caja',
      orden: 0,
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expected: 'PERMISSION_DENIED',
  },
];
