# Security Specification — Control de Almacén (WMS)

## 1. Data Invariants

1. **Ownership Isolation**: Every `MovimientoAlmacen` document at `/movimientos/{movimientoId}` and every `MaterialMovimiento` sub-document at `/movimientos/{movimientoId}/materiales/{materialId}` belongs to a single verified authenticated user (`ownerId == request.auth.uid`). No user may read, list, create, update, or delete another user's records.
2. **Verified Identity Mandate**: All write operations (`create`, `update`, `delete`) require `request.auth != null && request.auth.token.email_verified == true`.
3. **Master Gate Relational Integrity**: A `MaterialMovimiento` document cannot be created unless its parent `/movimientos/{movimientoId}` exists (or is created atomically in the same batch via `getAfter()`) and belongs to `request.auth.uid`. Updates and deletes require the parent to exist and belong to `request.auth.uid` via `get()`.
4. **Immutable Ownership & Timestamps**: `ownerId`, `createdAt`, and (on materials) `movimientoId` are immutable after creation. `createdAt == request.time` on create; `updatedAt == request.time` on both create and update.
5. **Volumetric & Schema Bounds**: Every string field enforces strict `.size()` bounds and regex patterns (`isValidId`, `fecha`, `rfc`), enums (`tipo_movimiento`, `unidad`) are strictly allowlisted, numeric fields (`cantidad`, `total_partidas`, `total_cantidad`, `orden`) enforce range limits, and shadow/ghost fields are rejected via `keys().hasAll(...) && keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`.
6. **Secure List Queries**: `allow list` on both `/movimientos` and `/movimientos/{movimientoId}/materiales` enforces `existing().ownerId == request.auth.uid` directly on `resource.data` without any `get()` or `exists()` calls.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path | Malicious Payload / Context | Expected Result |
|---|---|---|---|---|
| 1 | Unauthenticated Read/Write | `/movimientos/mov-1` | `auth: null`, create/get/list | `PERMISSION_DENIED` |
| 2 | Unverified Email Write | `/movimientos/mov-1` | `email_verified: false` creating valid movement | `PERMISSION_DENIED` |
| 3 | Identity Spoofing on Create | `/movimientos/mov-1` | `ownerId: "victim-uid"` while signed in as `"attacker-uid"` | `PERMISSION_DENIED` |
| 4 | Cross-User Read / Update / Delete | `/movimientos/victim-mov` | Signed in as `"attacker-uid"` reading or updating `"victim-uid"` doc | `PERMISSION_DENIED` |
| 5 | Shadow / Ghost Field Injection (Create) | `/movimientos/mov-1` | Valid movement + `{ "isAdmin": true }` | `PERMISSION_DENIED` |
| 6 | Shadow / Ghost Field Injection (Update) | `/movimientos/mov-1` | Update `folio` + `{ "verifiedBySystem": true }` | `PERMISSION_DENIED` |
| 7 | Path ID Poisoning | `/movimientos/<200-char-junk-$#%>` | Document ID exceeding 128 chars or containing invalid characters | `PERMISSION_DENIED` |
| 8 | Volumetric Resource Exhaustion | `/movimientos/mov-1` | `observaciones` string of 5,000 characters (> 1,000 max) | `PERMISSION_DENIED` |
| 9 | Invalid Enum / Value Poisoning | `/movimientos/mov-1` | `tipo_movimiento: "robo"` or `rfc: "bad rfc!"` or `fecha: "19-11-2026"` | `PERMISSION_DENIED` |
| 10 | Immutable Field Tampering | `/movimientos/mov-1` | Update changing `ownerId` or `createdAt` | `PERMISSION_DENIED` |
| 11 | Client Timestamp Forgery | `/movimientos/mov-1` | `createdAt` or `updatedAt` set to past client timestamp instead of `request.time` | `PERMISSION_DENIED` |
| 12 | Orphaned / Cross-Owner Material Write | `/movimientos/victim-mov/materiales/mat-1` | Creating a material under another user's movement or non-existent movement | `PERMISSION_DENIED` |

## 3. Red Team Audit Checklist

- **Shadow Update Test**: Enforced by `data.keys().hasAll(...) && data.keys().hasOnly(...)` in `isValidMovimiento` / `isValidMaterial` plus `affectedKeys().hasOnly(...)` on every `allow update`.
- **Email Spoofing Test**: `isVerified()` explicitly enforces `request.auth.token.email_verified == true`.
- **PII Blanket Test**: No blanket `isSignedIn()` read rules exist anywhere; every `get` and `list` checks `existing().ownerId == request.auth.uid`.
- **Query Trust Test**: Both `allow list` rules explicitly enforce `existing().ownerId == request.auth.uid` on `resource.data`.
- **Value Poisoning Test**: Every `allow update` begins with `isValidMovimiento(incoming())` or `isValidMaterial(incoming(), movimientoId)`.
