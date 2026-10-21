# Cable Manufacturing Job-Work ERP - Backend Foundation & Data Model Layer

A modular, production-ready backend and comprehensive MongoDB data model layer for a Cable Manufacturing Job-Work Enterprise Resource Planning (ERP) system, built with Node.js, TypeScript, Express.js, MongoDB (Mongoose), and Docker Compose.

> 📖 **Phase 5 Production Workflow Guide:** For the full operational guide on Global Machine selection, multi-material batch consumption, constant auto-scrap calculation, test failure reversal, and automated drum packaging, see [PHASE5_PRODUCTION_WORKFLOW_README.md](file:///e:/Mfolks_BOM/PHASE5_PRODUCTION_WORKFLOW_README.md).

---

## 1. Architecture & Technology Stack

- **Runtime**: Node.js (v20+ / v22) with TypeScript
- **Web Framework**: Express.js with Helmet and CORS
- **Database & ODM**: MongoDB 7.0 with Mongoose ODM
- **Transactions & Concurrency**: Single-node MongoDB Replica Set (`rs0`) for multi-document ACID transactions
- **Validation**: Zod (environment variables and API requests) & Mongoose Schema Validators
- **Logging**: Structured Pino logger with `pino-pretty` in dev and JSON in production
- **Testing**: Vitest with Supertest and MongoDB in-memory replica server
- **Containerization**: Multi-stage Dockerfile and Docker Compose with automated replica-set healthchecks

---

## 2. Model & Module Directory Structure

```
src/
├── models.ts                          # Central export aggregating all 38 domain models
├── modules/
│   ├── shared/                        # Cross-cutting foundational models
│   │   ├── process-stage.model.ts     # Manufacturing stages (Drawing, Stranding, Extrusion, Armouring, etc.)
│   │   ├── document-sequence.model.ts # Sequenced identifiers (IBC, OBC, WO, BATCH, DRUM, etc.)
│   │   ├── approval.model.ts          # Multi-level approval and sign-off tracking
│   │   ├── audit-log.model.ts         # Immutable audit trail of creations, updates, reversals
│   │   ├── attachment.model.ts        # Specs, test certs, purchase order scans
│   │   ├── idempotency-record.model.ts# Prevents double-postings with 24h TTL index
│   │   └── index.ts
│   ├── users/
│   │   ├── user.model.ts              # Protected password hash, roles, departments
│   │   └── index.ts
│   ├── customers/
│   │   ├── customer.model.ts          # Customer codes, GSTIN, addresses, credit & job-work terms
│   │   └── index.ts
│   ├── materials/
│   │   ├── material.model.ts          # Global master raw material catalogue (no free-floating stock)
│   │   ├── material-lot.model.ts      # Traceability by coil/lot, QC status, customer/factory ownership
│   │   └── index.ts
│   ├── products/
│   │   ├── product.model.ts           # Cable master (HT/LT, core count, sq.mm, conductor, insulation, armour)
│   │   └── index.ts
│   ├── bom/
│   │   ├── bom-version.model.ts       # Versioned cable recipe headers (effective dates, status)
│   │   ├── bom-item.model.ts          # Raw material consumption norms per meter cable + scrap tolerance
│   │   └── index.ts
│   ├── warehouses/
│   │   ├── warehouse.model.ts         # Segregated storage (RM, WIP, Finished Goods, Scrap, Customer Stock)
│   │   └── index.ts
│   ├── inventory/
│   │   ├── inbound-challan.model.ts   # Customer material delivery challans (truck, LR, gate entry)
│   │   ├── inbound-challan-line.model.ts # Declared vs received weights & QC inspection status
│   │   ├── opening-balance.model.ts   # Initial inventory setup and migration records
│   │   ├── inventory-transaction.model.ts # Immutable double-entry stock movement ledger
│   │   ├── inventory-balance.model.ts # Real-time stock cache bucketed by warehouse, owner, lot
│   │   ├── material-reservation.model.ts  # Material earmarking for specific work orders
│   │   ├── stock-reconciliation.model.ts  # Physical count audits and variance adjustments
│   │   ├── global-stock-summary.model.ts  # Daily stock reporting with duplicate prevention
│   │   ├── material-reorder-rule.model.ts # Min/max stock and reorder thresholds
│   │   └── index.ts
│   ├── work-orders/
│   │   ├── work-order.model.ts        # Customer job-work contracts, ordered lengths, rates
│   │   └── index.ts
│   ├── machines/
│   │   ├── machine.model.ts           # Global machine master catalogue, speeds & real-time status
│   │   └── index.ts
│   ├── production/
│   │   ├── production-order.model.ts  # Manufacturing orders derived from work orders
│   │   ├── production-batch.model.ts  # Machine shop-floor run batches per process stage
│   │   ├── material-issue.model.ts    # Store-to-shop-floor material issuance
│   │   ├── material-issue-line.model.ts # Itemized lot/weight issue entries
│   │   ├── material-consumption.model.ts# Transformation of raw material into cable output
│   │   ├── production-output.model.ts # Stage yields, lengths, weights, test reports
│   │   ├── scrap-record.model.ts      # Copper/aluminum scrap, PVC lumps, offcuts
│   │   └── index.ts
│   ├── packing/
│   │   ├── drum.model.ts              # Cable drums (length stored separately from tare/gross weights)
│   │   ├── packing-list.model.ts      # Shipment bundle headers
│   │   ├── packing-list-line.model.ts # Drum-by-drum lengths, weights & electrical test values
│   │   ├── drum-movement.model.ts     # Drum tracking between plant bays and customer sites
│   │   └── index.ts
│   ├── dispatch/
│   │   ├── dispatch.model.ts          # Vehicle dispatch, driver details, transporter
│   │   ├── dispatch-line.model.ts     # Dispatched drum items
│   │   ├── outbound-challan.model.ts  # Statutory delivery challans with e-Way Bill tracking
│   │   └── index.ts
│   └── reports/                       # Central reporting aggregator for Prompt 3
```

---

## 3. Detailed Explanation of Collections (38 Models)

| # | Collection / Model | Module | Primary Role & Business Purpose |
| :- | :--- | :--- | :--- |
| 1 | **Customer** | `customers` | Client companies sending raw materials for cable job-work. Tracks GSTIN, billing/shipping addresses, payment credit terms. |
| 2 | **Material** | `materials` | Global raw material master (Copper 8mm rod, Aluminum wire, PVC Type A, XLPE, GI strip, Masterbatch). Never stores unconstrained balances. |
| 3 | **MaterialLot** | `materials` | Individual supplier/customer heat, coil, or lot numbers. Enforces QC status (`PENDING_QC`, `APPROVED`, `REJECTED`) and customer ownership. |
| 4 | **Product** | `products` | Finished cable catalogue (voltage grade, core count, cross-section sq.mm, conductor type, insulation type, armouring, outer sheath). |
| 5 | **BomVersion** | `bom` | Version-controlled cable recipe master (e.g. `BOM-CAB-11KV-3CX240-V1`). Tracks effective dates, approval state, standard batch sizes. |
| 6 | **BomItem** | `bom` | Raw material formula per meter/kilometer of cable including standard scrap tolerances per manufacturing stage. |
| 7 | **Warehouse** | `warehouses` | Physical storage zones segregated by function (`RAW_MATERIAL`, `WIP`, `FINISHED_GOODS`, `SCRAP`, `CUSTOMER_SUPPLIED`). |
| 8 | **ProcessStage** | `shared` | Cable process pipeline: Wire Drawing → Conductor Stranding → Insulation Extrusion → Core Laying → Armouring → Sheathing → Testing. |
| 9 | **User** | `users` | System operators, store keepers, quality inspectors, production heads, and managers with protected password hashes. |
| 10 | **WorkOrder** | `work-orders` | Commercial job-work contracts linking customer PO, ordered cable length, rate per meter, and delivery deadlines. |
| 11 | **InboundChallan** | `inventory` | Vehicle gate-entry receipt for customer-supplied raw materials (truck number, transporter, customer delivery challan). |
| 12 | **InboundChallanLine** | `inventory` | Itemized declared vs factory-weighed receipts linking directly to newly generated `MaterialLot` records. |
| 13 | **OpeningBalance** | `inventory` | Initial stock setup and inventory migration audit records. |
| 14 | **InventoryTransaction** | `inventory` | Immutable double-entry ledger of all posted stock movements (`INWARD`, `OUTWARD`, `TRANSFER`, `ADJUSTMENT`). |
| 15 | **InventoryBalance** | `inventory` | Real-time balance cache bucketed by material, warehouse, owner (Factory vs Customer), and lot. Guarantees non-negative on-hand stock. |
| 16 | **MaterialReservation** | `inventory` | Earmarks specific raw material lots for work orders to prevent double-allocating stock. |
| 17 | **ProductionOrder** | `production` | Shop-floor production work order controlling planned cable lengths and production milestones. |
| 18 | **ProductionBatch** | `production` | Individual machine run batches tracking machine code, operator, shift, start time, and completion yields. |
| 19 | **MaterialIssue** | `production` | Store-to-shop-floor raw material requisition header. |
| 20 | **MaterialIssueLine** | `production` | Itemized raw materials issued to machines; posts outward inventory movement from warehouse stock. |
| 21 | **MaterialConsumption** | `production` | Shop-floor record of raw material transformed into cable. Kept distinct from material issues to avoid double-counting stock reductions. |
| 22 | **ProductionOutput** | `production` | Intermediate or finished cable yields per batch (length in meters, weight in kg, spark test / HV test results). |
| 23 | **ScrapRecord** | `production` | Tracks production waste (copper wire breaks, aluminum scrap, PVC purge lumps, offcuts) transferred to scrap warehouse. |
| 24 | **Drum** | `packing` | Reusable wooden/steel packaging drums. Stores cable length independently from tare weight and gross weight. |
| 25 | **PackingList** | `packing` | Shipping bundle header aggregating packed drums for an approved work order. |
| 26 | **PackingListLine** | `packing` | Drum-specific packing record including drum number, net weight, gross weight, cable length, and conductor/insulation resistance values. |
| 27 | **Dispatch** | `dispatch` | Transport loading record tracking vehicle number, driver details, transporter, and dispatched drum list. |
| 28 | **DispatchLine** | `dispatch` | Dispatched drum items generating final finished-goods outward inventory transactions. |
| 29 | **OutboundChallan** | `dispatch` | Statutory job-work delivery challans (Annexure format) with e-Way Bill numbers and customer acknowledgment tracking. |
| 30 | **DrumMovement** | `packing` | Lifecyle movement of cable drums between winding, finished storage, customer sites, and empty returns. |
| 31 | **DocumentSequence** | `shared` | Thread-safe auto-incrementing serial number generator for all business identifiers. |
| 32 | **Approval** | `shared` | Multi-tier authorization records for work orders, BOM recipes, reconciliations, and dispatches. |
| 33 | **AuditLog** | `shared` | Immutable security audit log tracking user ID, IP address, timestamp, and field-level delta changes. |
| 34 | **Attachment** | `shared` | Metadata and URL references for uploaded test certificates, customer POs, and weight slips. |
| 35 | **StockReconciliation** | `inventory` | Physical stock count sheets tracking system vs physical differences and variance approvals. |
| 36 | **IdempotencyRecord** | `shared` | Request-hash deduplication store with 24-hour TTL index to prevent accidental duplicate transaction submissions. |
| 37 | **GlobalStockSummary** | `inventory` | Daily material snapshot for dashboards and management reporting (Opening + Inward - Issued + Returns - Scrap ± Adjustments = Closing). |
| 38 | **MaterialReorderRule** | `inventory` | Minimum safety stock, reorder points, and automated replenishment thresholds. |

---

## 4. Key Architectural Rules & Differences

### Material vs. MaterialLot vs. InventoryBalance vs. InventoryTransaction

```
   ┌────────────────────────────────────────────────────────┐
   │                     Material                           │
   │  (Catalogue item: Copper 8mm Rod, PVC Compound, etc.)  │
   └──────────────────────────┬─────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
   ┌───────────────────────┐     ┌────────────────────────┐
   │      MaterialLot      │     │  InventoryTransaction  │
   │  (Lot, Heat No, QC,   │     │  (Immutable ledger of  │
   │   Customer Ownership) │     │   all posted movements)│
   └───────────┬───────────┘     └───────────┬────────────┘
               │                             │
               └──────────────┬──────────────┘
                              ▼
                 ┌─────────────────────────┐
                 │    InventoryBalance     │
                 │  (Fast real-time cache  │
                 │   by WH + Owner + Lot)  │
                 └─────────────────────────┘
```

1. **`Material`**: The global master catalog entry. It defines physical specifications, category, HSN code, and base unit. It **never** stores a simple unrestricted quantity.
2. **`MaterialLot`**: The traceability container. It ties specific physical stock to an Inbound Challan, vendor coil number, customer ownership, and quality inspection report.
3. **`InventoryBalance`**: The current on-hand cache. Segregated by `{ materialId, warehouseId, ownerType, customerId, lotId }`. Enforces `quantityOnHand >= 0` and `quantityAvailable = onHand - reserved`.
4. **`InventoryTransaction`**: The source of truth ledger. Every physical addition or subtraction creates an immutable transaction record. Posted transactions cannot be edited; errors must be reversed via adjustment transactions.

---

### The Role of `GlobalStockSummary` and `StockReconciliation`

- **`GlobalStockSummary`**:
  - Provides instant daily stock dashboard reporting without requiring expensive full-ledger aggregation queries.
  - Distinguishes **Issue to Production** (material leaving store) from **Consumption** (material incorporated into cable) to prevent double-counting.
  - Protected by a compound unique index: `{ date: 1, materialId: 1, warehouseId: 1, ownerType: 1, customerId: 1 }`.
- **`StockReconciliation`**:
  - Enables physical stock taking (cycle counting).
  - Holds `systemQuantity`, `physicalQuantity`, and `discrepancyQuantity`.
  - Once reviewed and approved, it triggers an official `STOCK_ADJUSTMENT` `InventoryTransaction` that brings `InventoryBalance` into alignment with physical counts.

---

## 5. Important Indexes & Uniqueness Rules

| Model | Index Definition | Constraint / Purpose |
| :--- | :--- | :--- |
| `Customer` | `{ code: 1 }` | `unique: true` |
| `Material` | `{ code: 1 }` | `unique: true` |
| `Material` | `{ category: 1, isActive: 1 }` | Filtering active materials by category |
| `Product` | `{ code: 1 }` | `unique: true` |
| `BomVersion` | `{ bomNumber: 1 }` | `unique: true` |
| `BomVersion` | `{ productId: 1, versionNumber: 1 }` | `unique: true` (one version number per product) |
| `Warehouse` | `{ code: 1 }` | `unique: true` |
| `ProcessStage` | `{ code: 1 }` | `unique: true` |
| `ProcessStage` | `{ sequenceOrder: 1 }` | Fast sorting by manufacturing stage order |
| `User` | `{ employeeCode: 1 }`, `{ email: 1 }` | `unique: true` |
| `WorkOrder` | `{ workOrderNumber: 1 }` | `unique: true` |
| `InboundChallan` | `{ challanNumber: 1 }` | `unique: true` |
| `InventoryBalance` | `{ materialId: 1, warehouseId: 1, ownerType: 1, customerId: 1, lotId: 1 }` | `unique: true` (strict segregation of customer vs factory stock) |
| `GlobalStockSummary` | `{ date: 1, materialId: 1, warehouseId: 1, ownerType: 1, customerId: 1 }` | `unique: true` (prevents duplicate daily snapshots) |
| `MaterialReorderRule`| `{ materialId: 1, warehouseId: 1 }` | `unique: true` |
| `Drum` | `{ drumNumber: 1 }` | `unique: true` |
| `IdempotencyRecord`| `{ idempotencyKey: 1 }` | `unique: true`, with 24-hour TTL expiration |

---

## 6. How to Run Locally with Docker MongoDB

### If Port 27017 is already allocated on your Windows machine:
If running `npm run docker:mongo` returned:
`Bind for 0.0.0.0:27017 failed: port is already allocated`

This means you already have a local Windows MongoDB service running on port 27017. You have two options:

#### Option 1: Use your existing local MongoDB service (Easiest)
In your [.env](file:///e:/Mfolks_BOM/.env), set:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/erp_db?directConnection=true
```
Then run:
```powershell
npm run dev
```

#### Option 2: Stop the Windows local MongoDB service and use Docker
In PowerShell (as Administrator):
```powershell
net stop MongoDB
npm run docker:mongo
npm run dev
```

#### Option 3: Map Docker to another port (e.g. 27018)
In [docker-compose.yml](file:///e:/Mfolks_BOM/docker-compose.yml), update:
```yaml
ports:
  - "27018:27017"
```
And in [.env](file:///e:/Mfolks_BOM/.env):
```env
MONGODB_URI=mongodb://localhost:27018/erp_db?replicaSet=rs0&directConnection=true
```

---

## 7. Authentication, JWT, & Two-Role Authorization (Prompt 3)

### 7.1 Strictly Enforced Roles
The ERP enforces **only two application roles**:
1. `SUPER_ADMIN`
2. `ADMIN`

No other application roles (such as Manager, Operator, or Staff) exist.

| Capability | `SUPER_ADMIN` | `ADMIN` |
| :--- | :---: | :---: |
| Access ERP Business Modules (Orders, Production, Inventory) | Yes | Yes |
| View & Update Own Profile (`/api/v1/auth/me`) | Yes | Yes |
| Change Own Password (`/api/v1/auth/change-password`) | Yes | Yes |
| Create Admin Accounts (`POST /api/v1/admins`) | Yes | **No** (403) |
| List & View Admin Accounts (`GET /api/v1/admins`) | Yes | **No** (403) |
| Edit Admin Accounts (`PATCH /api/v1/admins/:id`) | Yes | **No** (403) |
| Deactivate / Reactivate Admins (`PATCH /api/v1/admins/:id/status`) | Yes | **No** (403) |
| Reset an Admin's Password (`POST /api/v1/admins/:id/reset-password`)| Yes | **No** (403) |
| Delete an Admin (`DELETE /api/v1/admins/:id`) | Yes (if safe) | **No** (403) |
| Modify Roles / Elevate Privileges | **No** (strictly restricted) | **No** (403) |

### 7.2 Security Safeguards
- **Strict Role Creation**: `POST /api/v1/admins` creates users exclusively with the `ADMIN` role. Client cannot supply role or elevate to `SUPER_ADMIN`.
- **Self-Protection**: Super Admins cannot deactivate or delete their own account via administrative endpoints.
- **Last Active Super Admin Guard**: The system guarantees at least one active Super Admin exists at all times; any attempt to deactivate or delete the last active Super Admin fails with HTTP 400.
- **ERP Referential Integrity**: Permanent deletion of an Admin is blocked if the user is referenced in historical ERP records (`InboundChallan`, `MaterialIssue`, `ProductionOutput`, `WorkOrder`, `Dispatch`). Super Admins are instructed to deactivate the account instead.
- **Secret Protection**: Passwords (`passwordHash`) and refresh tokens (`refreshTokenHash`) are `select: false` in Mongoose and never exposed in responses or logs.
- **Token Invalidation**: Refresh tokens are revoked upon `/auth/logout`, status deactivation, or password changes/resets.

---

## 8. Initial Super Admin Bootstrap

The ERP provides a secure, repeatable, and idempotent bootstrap script to initialize the primary Super Admin account:

```powershell
npm run bootstrap:admin
```

Configuration is read from environment variables:
```env
SUPER_ADMIN_EMAIL=superadmin@mfolks.com
SUPER_ADMIN_PASSWORD=SuperSecurePass123!
SUPER_ADMIN_EMPLOYEE_CODE=EMP-SA-001
SUPER_ADMIN_FIRST_NAME=Super
SUPER_ADMIN_LAST_NAME=Admin
```

- If no Super Admin exists, the account is created with a bcrypt-hashed password and an audit log entry is recorded.
- If a Super Admin already exists, the script safely exits without modifying credentials (idempotent).
- No public API endpoint exists to register a Super Admin.

---

## 9. API Reference

All endpoints return the standardized JSON structure:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

### 9.1 Authentication (`/api/v1/auth`)

#### `POST /api/v1/auth/login` (Public)
Authenticate with email and password to receive JWT access and refresh tokens.
```json
// Request
{
  "email": "superadmin@mfolks.com",
  "password": "SuperSecurePass123!"
}

// Response (200 OK)
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": {
      "id": "60d0fe4f5311236168a109ca",
      "employeeCode": "EMP-SA-001",
      "firstName": "Super",
      "lastName": "Admin",
      "email": "superadmin@mfolks.com",
      "role": "SUPER_ADMIN",
      "isActive": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "tokenType": "Bearer",
      "expiresIn": "15m"
    }
  }
}
```

#### `POST /api/v1/auth/refresh` (Public)
Rotate refresh token and issue a fresh access & refresh token pair.
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

#### `GET /api/v1/auth/me` (Protected: `SUPER_ADMIN`, `ADMIN`)
Get current authenticated user profile. Requires header: `Authorization: Bearer <accessToken>`.

#### `PATCH /api/v1/auth/me` (Protected: `SUPER_ADMIN`, `ADMIN`)
Update authenticated user's permitted profile fields (`firstName`, `lastName`, `phone`).

#### `POST /api/v1/auth/change-password` (Protected: `SUPER_ADMIN`, `ADMIN`)
Change password after verifying `currentPassword`. Invalidates all active refresh tokens.
```json
{
  "currentPassword": "SuperSecurePass123!",
  "newPassword": "NewStrongPassword456!",
  "confirmPassword": "NewStrongPassword456!"
}
```

#### `POST /api/v1/auth/logout` (Protected: `SUPER_ADMIN`, `ADMIN`)
Revoke the authenticated user's active refresh token.

---

### 9.2 Super Admin Account Management (`/api/v1/admins`)
*(Requires Bearer token with `SUPER_ADMIN` role)*

#### `POST /api/v1/admins`
Create a new Admin account. Always assigned the `ADMIN` role.
```json
{
  "employeeCode": "EMP-ADM-002",
  "firstName": "Production",
  "lastName": "Supervisor",
  "email": "prod.admin@mfolks.com",
  "password": "InitialPassword123!",
  "phone": "+919876543210",
  "department": "Production"
}
```

#### `GET /api/v1/admins`
List Admin accounts with pagination and filtering.
- Query parameters: `?page=1&limit=10&role=ADMIN&isActive=true&search=prod`

#### `GET /api/v1/admins/:id`
Get detailed profile for an Admin account by MongoDB ObjectId.

#### `PATCH /api/v1/admins/:id`
Update permitted details (`firstName`, `lastName`, `phone`, `department`). Role cannot be altered.

#### `PATCH /api/v1/admins/:id/status`
Deactivate or reactivate an Admin account. Revokes active refresh token upon deactivation.
```json
{
  "isActive": false,
  "reason": "Temporary medical leave"
}
```

#### `POST /api/v1/admins/:id/reset-password`
Super Admin initiates a password reset for an Admin. Revokes active refresh token.
```json
{
  "newPassword": "NewAdminPassword789!"
}
```

#### `DELETE /api/v1/admins/:id`
Permanently delete an Admin account. Blocked if the Admin is linked to historical ERP documents.

---

## 10. Master Data Modules (Prompt 4)

Prompt 4 establishes the six core master-data modules for the cable manufacturing job-work workflow. Both `SUPER_ADMIN` and `ADMIN` roles are authorized to perform standard master-data management operations.

### 10.1 Summary of Endpoints

| Module | Method | Endpoint | Description |
| :--- | :---: | :--- | :--- |
| **Customers** | `POST` | `/api/v1/customers` | Create a customer profile with GSTIN, addresses, and credit terms. |
| | `GET` | `/api/v1/customers` | List customers with search (`code`, `name`, `phone`, `gstin`) and pagination. |
| | `GET` | `/api/v1/customers/:id` | Get customer details by ID. |
| | `PATCH`| `/api/v1/customers/:id` | Update permitted customer details (code cannot be altered). |
| | `PATCH`| `/api/v1/customers/:id/status`| Deactivate or reactivate a customer. |
| | `DELETE`| `/api/v1/customers/:id` | Safe delete: blocked if referenced in orders, challans, or lots. |
| **Materials** | `POST` | `/api/v1/materials` | Create master raw material identity (never stores stock balances). |
| | `GET` | `/api/v1/materials` | List materials with search, category filtering, and pagination. |
| | `GET` | `/api/v1/materials/:id` | Get material details by ID. |
| | `PATCH`| `/api/v1/materials/:id` | Update material specifications and rates (code cannot be altered). |
| | `PATCH`| `/api/v1/materials/:id/status`| Deactivate or reactivate a material. |
| | `DELETE`| `/api/v1/materials/:id` | Safe delete: blocked if referenced in BOMs, lots, or transactions. |
| **Products** | `POST` | `/api/v1/products` | Create manufactured cable product with full technical specifications. |
| | `GET` | `/api/v1/products` | List cable products with category, voltage, and customer filtering. |
| | `GET` | `/api/v1/products/:id` | Get product details with populated customer and default BOM version. |
| | `GET` | `/api/v1/products/:productId/boms` | Retrieve all BOM versions associated with a cable product. |
| | `PATCH`| `/api/v1/products/:id` | Update permitted product technical specifications. |
| | `PATCH`| `/api/v1/products/:id/status`| Deactivate or reactivate a product. |
| | `DELETE`| `/api/v1/products/:id` | Safe delete: blocked if referenced by BOMs or production orders. |
| **BOMs** | `POST` | `/api/v1/boms` | Create versioned draft BOM with itemized material quantities. |
| | `GET` | `/api/v1/boms` | List BOM versions with product and status filtering. |
| | `GET` | `/api/v1/boms/:id` | Get BOM details populated with material specifications and stage sequences. |
| | `PATCH`| `/api/v1/boms/:id` | Edit draft BOM items or batch size (locked once active). |
| | `POST` | `/api/v1/boms/:id/activate` | Explicit activation: supersedes previous active version; updates product. |
| | `POST` | `/api/v1/boms/:id/archive` | Archive an existing BOM version. |
| | `DELETE`| `/api/v1/boms/:id` | Delete draft BOM (locked if active or linked to work orders). |
| **Warehouses**| `POST` | `/api/v1/warehouses` | Create storage location (`RAW_MATERIAL`, `WIP`, `FINISHED_GOODS`, etc.). |
| | `GET` | `/api/v1/warehouses` | List warehouses with type filtering and pagination. |
| | `GET` | `/api/v1/warehouses/:id` | Get warehouse details with manager profile. |
| | `PATCH`| `/api/v1/warehouses/:id` | Update permitted details (code is immutable). |
| | `PATCH`| `/api/v1/warehouses/:id/status`| Deactivate warehouse (blocked if active inventory balance > 0). |
| | `DELETE`| `/api/v1/warehouses/:id` | Delete warehouse (blocked if referenced in transaction ledger). |
| **Stages** | `POST` | `/api/v1/process-stages` | Create manufacturing stage (e.g. Drawing, Stranding, Extrusion). |
| | `GET` | `/api/v1/process-stages` | List process stages sorted by sequential manufacturing order. |
| | `GET` | `/api/v1/process-stages/:id` | Get stage details by ID. |
| | `PATCH`| `/api/v1/process-stages/:id` | Update stage details and sequence order. |
| | `PATCH`| `/api/v1/process-stages/:id/status`| Deactivate stage (blocked if active production batches are in progress). |
| | `DELETE`| `/api/v1/process-stages/:id` | Delete stage (blocked if referenced by BOM items or batch history). |

---

### 10.2 Sample API Requests

#### 1. Create Customer (`POST /api/v1/customers`)
```json
{
  "code": "CUST-APAR-01",
  "name": "Apar Industries Ltd",
  "legalName": "Apar Industries Private Limited",
  "contactPerson": "Ramesh Patel",
  "email": "ramesh.patel@apar.com",
  "phone": "+919820011223",
  "gstin": "24AAACA1234A1ZB",
  "pan": "AAACA1234A",
  "billingAddress": {
    "street": "Plot 42, GIDC Estate",
    "city": "Vapi",
    "state": "Gujarat",
    "postalCode": "396195",
    "country": "India"
  },
  "creditDays": 45,
  "notes": "Primary customer for HT power cables job-work"
}
```

#### 2. Create Global Material Master (`POST /api/v1/materials`)
```json
{
  "code": "MAT-AL-ROD-08",
  "name": "Aluminium Wire Rod 8mm",
  "category": "ALUMINUM",
  "baseUnit": "KG",
  "sku": "SKU-AL-08MM",
  "altName": "8mm EC Grade Aluminum Wire Rod",
  "description": "Continuous cast EC grade aluminum rod for wire drawing",
  "specifications": {
    "purityPercentage": 99.7,
    "tensileStrength": "110-130 MPa"
  },
  "defaultReorderThreshold": 5000,
  "standardRate": 220
}
```

#### 3. Create Cable Product Master (`POST /api/v1/products`)
```json
{
  "code": "PROD-4CX35-A2XFY",
  "name": "4C x 35 SQMM A2XFY 1.1KV Aluminum XLPE Armoured Cable",
  "description": "1.1 KV grade XLPE insulated, compacted aluminum conductor, strip armoured power cable",
  "cableCategory": "LT_POWER",
  "voltageGrade": "1.1KV",
  "coreCount": 4,
  "crossSectionSqMm": 35,
  "conductorMaterial": "ALUMINUM",
  "insulationType": "XLPE",
  "armourType": "STRIP_ARMOURED",
  "outerSheath": "PVC_ST2",
  "standardSpecification": "IS 7098 Part 1",
  "baseUnit": "METER"
}
```

#### 4. Create Bill of Materials (`POST /api/v1/boms`)
```json
{
  "productId": "60d0fe4f5311236168a109ca",
  "versionNumber": 1,
  "batchSize": 1000,
  "outputUnit": "METER",
  "notes": "Standard manufacturing recipe per 1,000 meters cable basis",
  "items": [
    {
      "materialId": "60d0fe4f5311236168a109cb",
      "quantityPerUnit": 348,
      "scrapTolerancePercentage": 1.5,
      "stageSequence": 1,
      "notes": "Aluminum wire drawing norm"
    },
    {
      "materialId": "60d0fe4f5311236168a109cc",
      "quantityPerUnit": 98,
      "scrapTolerancePercentage": 2.0,
      "stageSequence": 2,
      "notes": "XLPE insulation compound norm"
    }
  ]
}
```

#### 5. Create Warehouse Storage Location (`POST /api/v1/warehouses`)
```json
{
  "code": "WH-MAIN-RM",
  "name": "Main Raw Material Warehouse",
  "type": "RAW_MATERIAL",
  "description": "Receiving store for wire rods, chemical compounds, and armour strips",
  "location": "Bay 1, East Plant",
  "capacity": 500000
}
```

#### 6. Create Process Stage (`POST /api/v1/process-stages`)
```json
{
  "code": "STAGE-DRAWING",
  "name": "Wire Drawing",
  "sequenceOrder": 1,
  "category": "CONDUCTOR_PREPARATION",
  "description": "Drawing 8mm continuous cast wire rod down to specified conductor gauge"
}
```

---

## 11. Quality & Test Pipeline

```powershell
# Run TypeScript compilation
npm run typecheck

# Run ESLint
npm run lint

# Check Prettier formatting
npm run format:check

# Run all 97 Vitest integration tests (Models, Health, Ready, Auth, Admins, Master-Data, Inventory)
npm test

# Build production bundle to dist/
npm run build
```

---

## 12. Inventory Management, Stock Ledger, and Global Stock Dashboard (Prompt 5)

Prompt 5 implements the core inventory management engine, immutable double-entry stock ledger, and reporting dashboards for the Cable Manufacturing Job-Work ERP backend.

### 12.1 Core Inventory Architecture & Concepts

```
   ┌──────────────────────────────────────────────────────────────┐
   │                   Inbound Challan (Draft)                    │
   │      (Records vehicle, supplier/customer, lines, lots)       │
   └──────────────────────────────┬───────────────────────────────┘
                                  │ POST /inbound-challans/:id/post
                                  ▼
           ┌──────────────────────────────────────────────┐
           │     MongoDB Multi-Document ACID Transaction  │
           ├──────────────────────────────────────────────┤
           │ 1. Verify challan state & document lock      │
           │ 2. Create MaterialLot records (traceable)    │
           │ 3. Create immutable InventoryTransaction     │
           │ 4. Atomically update InventoryBalance cache  │
           │ 5. Transition Challan status to POSTED       │
           │ 6. Append entry to AuditLog                  │
           └──────────────────────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│   InventoryTransaction Ledger   │       │     InventoryBalance Cache      │
│  - Immutable source of truth    │       │  - Real-time stock projection   │
│  - Append-only stock movements  │       │  - Bucketed by WH+Owner+Lot     │
│  - RECEIPT, TRANSFER, etc.      │       │  - Available = OnHand - Reserved│
└─────────────────────────────────┘       └─────────────────────────────────┘
```

#### 1. Strict Stock Ownership Model
- **`CUSTOMER_OWNED`**: Material delivered by clients for job-work cable production. **Mandatory** customer reference (`customerId`).
- **`FACTORY_OWNED`**: Material purchased or owned directly by the factory. Does **not** require a customer reference (`customerId: null`).
- **Strict Segregation**: Customer-owned stock is **never** combined with factory-owned stock into a single freely available balance. Customer stock cannot be used for factory reorder calculations or unauthorized customer orders.

#### 2. Immutable Transaction Ledger (`InventoryTransaction`)
- Every physical addition, movement, deduction, or adjustment writes an immutable record to the ledger.
- Supported transaction types:
  - `RECEIPT`: Inbound receipt from challan posting
  - `OPENING_BALANCE`: Verified inventory migrated into the ERP
  - `TRANSFER_IN` / `TRANSFER_OUT`: Warehouse-to-warehouse stock transfers
  - `ADJUSTMENT_IN` / `ADJUSTMENT_OUT`: Physical stock count reconciliation adjustments
  - `RESERVATION` / `RESERVATION_RELEASE`: Earmarking / un-earmarking stock for work orders
  - `REVERSAL`: Controlled reversal of erroneous postings
- **Immutability Guarantee**: No standard `PUT`, `PATCH`, or `DELETE` endpoints exist for transaction ledger entries. Corrections must occur via approved adjustment or reversal workflows.

#### 3. Real-Time Balance Projections (`InventoryBalance`)
- Compound unique index: `{ materialId: 1, warehouseId: 1, ownerType: 1, customerId: 1, lotId: 1 }`
- Arithmetic:
  $$\text{Quantity Available} = \text{Quantity On-Hand} - \text{Quantity Reserved} - \text{Quantity Blocked}$$
- Database atomic operators (`$inc` with conditional query filters like `{ quantityAvailable: { $gte: qty } }`) prevent negative stock or over-reservation under high concurrency.

#### 4. Traceable Material Lots (`MaterialLot`)
- Tracks heat/coil numbers, inspection status (`PENDING_QC`, `APPROVED`, `REJECTED`), warehouse location, receipt challan, and ownership.
- Multiple lots of the same material code remain distinct entities.

---

### 12.2 Prompt 5 Endpoints Summary

Both `SUPER_ADMIN` and `ADMIN` roles are authorized to access and execute inventory operations.

| Module | Method | Endpoint | Description |
| :--- | :---: | :--- | :--- |
| **Inbound Challans** | `POST` | `/api/v1/inbound-challans` | Create draft receipt challan with multi-line items. |
| | `GET` | `/api/v1/inbound-challans` | List challans with status, warehouse, and owner filtering. |
| | `GET` | `/api/v1/inbound-challans/:id` | Get full challan details and populated line items. |
| | `PATCH`| `/api/v1/inbound-challans/:id` | Update draft challan fields (locked if posted). |
| | `DELETE`| `/api/v1/inbound-challans/:id` | Cancel/delete draft challan (does not affect stock). |
| | `POST` | `/api/v1/inbound-challans/:id/post` | **Post receipt atomically**: creates lots, transactions, and balances. |
| **Opening Balances** | `POST` | `/api/v1/opening-balances` | Create draft opening balance record. |
| | `GET` | `/api/v1/opening-balances` | List opening balance records. |
| | `GET` | `/api/v1/opening-balances/:id` | Get opening balance details. |
| | `POST` | `/api/v1/opening-balances/:id/post` | **Post opening balance atomically** to transaction ledger and balance. |
| **Stock Transfers** | `POST` | `/api/v1/stock-transfers` | Create draft warehouse-to-warehouse transfer document. |
| | `GET` | `/api/v1/stock-transfers` | List stock transfers with source/destination warehouse filtering. |
| | `GET` | `/api/v1/stock-transfers/:id` | Get transfer details. |
| | `POST` | `/api/v1/stock-transfers/:id/post` | **Post transfer atomically**: creates matching OUT/IN ledger entries. |
| **Reservations** | `POST` | `/api/v1/material-reservations` | Reserve stock for a work order (reduces available, keeps on-hand). |
| | `GET` | `/api/v1/material-reservations` | List reservations by material, warehouse, or work order. |
| | `GET` | `/api/v1/material-reservations/:id`| Get reservation details. |
| | `POST` | `/api/v1/material-reservations/:id/release` | **Release reservation**: restores available stock exactly once. |
| **Reorder Rules** | `POST` | `/api/v1/material-reorder-rules` | Set minimum threshold and target quantity for factory stock. |
| | `GET` | `/api/v1/material-reorder-rules` | List reorder rules. |
| | `GET` | `/api/v1/material-reorder-rules/:id`| Get reorder rule details. |
| | `PATCH`| `/api/v1/material-reorder-rules/:id`| Update thresholds or active/inactive status. |
| **Reconciliations** | `POST` | `/api/v1/stock-reconciliations` | Record physical stock count discrepancy sheet. |
| | `GET` | `/api/v1/stock-reconciliations` | List stock reconciliation sheets. |
| | `GET` | `/api/v1/stock-reconciliations/:id`| Get reconciliation details. |
| | `POST` | `/api/v1/stock-reconciliations/:id/approve` | **Approve count sheet**: records approval in `Approval` model. |
| | `POST` | `/api/v1/stock-reconciliations/:id/post` | **Post adjustment atomically**: creates `ADJUSTMENT` ledger entry. |
| **Dashboard & Ledger** | `GET` | `/api/v1/inventory/summary` | Global stock KPIs, totals, and owner breakdown. |
| | `GET` | `/api/v1/inventory/materials/:materialId` | Detailed stock metrics for a single raw material. |
| | `GET` | `/api/v1/inventory/balances` | Query real-time balance cache with dimension filters. |
| | `GET` | `/api/v1/inventory/transactions` | Query immutable transaction ledger with audit filters. |
| | `GET` | `/api/v1/inventory/daily-summary` | Retrieve daily stock summaries by date. |
| | `POST` | `/api/v1/inventory/daily-summary/rebuild`| Rebuild daily summaries from authoritative ledger data. |
| | `GET` | `/api/v1/inventory/low-stock` | Alert endpoint comparing factory available stock to reorder rules. |

---

### 12.3 How to Inspect Balances and the Transaction Ledger

#### 1. Inspect Real-Time Balances (`GET /api/v1/inventory/balances`)
Retrieve balance projections filtered by material, warehouse, or ownership:
```http
GET /api/v1/inventory/balances?materialId=60d0fe4f5311236168a109cb&warehouseId=60d0fe4f5311236168a109cc&ownerType=CUSTOMER
Authorization: Bearer <accessToken>
```
Response:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "balances": [
      {
        "materialId": "60d0fe4f5311236168a109cb",
        "warehouseId": "60d0fe4f5311236168a109cc",
        "ownerType": "CUSTOMER",
        "customerId": "60d0fe4f5311236168a109ca",
        "lotId": "60d0fe4f5311236168a109cd",
        "quantityOnHand": 5000,
        "quantityReserved": 1500,
        "quantityAvailable": 3500,
        "quantityQuarantined": 0,
        "unit": "KG"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

#### 2. Inspect the Immutable Transaction Ledger (`GET /api/v1/inventory/transactions`)
Query audit trail movements by date range, transaction type, or source document:
```http
GET /api/v1/inventory/transactions?transactionType=RECEIPT&limit=10
Authorization: Bearer <accessToken>
```
Response:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "transactions": [
      {
        "transactionNumber": "TXN-2026-000001",
        "materialId": "60d0fe4f5311236168a109cb",
        "lotId": "60d0fe4f5311236168a109cd",
        "warehouseId": "60d0fe4f5311236168a109cc",
        "ownerType": "CUSTOMER",
        "customerId": "60d0fe4f5311236168a109ca",
        "transactionType": "RECEIPT",
        "quantity": 5000,
        "unit": "KG",
        "sourceDocumentType": "INBOUND_CHALLAN",
        "sourceDocumentId": "60d0fe4f5311236168a109ce",
        "postingDate": "2026-10-15T10:00:00.000Z",
        "postedBy": "60d0fe4f5311236168a109cf"
      }
    ]
  }
}
```

---

### 12.4 Sample Walkthrough: Receipt to Balance, Transfer, and Reservation

Below is a complete test-data walkthrough demonstrating the inventory lifecycle.

#### Step 1: Create a Draft Inbound Challan
```http
POST /api/v1/inbound-challans
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "supplierChallanNumber": "CH-APAR-2026-881",
  "challanDate": "2026-10-15T09:00:00Z",
  "warehouseId": "60d0fe4f5311236168a109cc",
  "ownerType": "CUSTOMER_OWNED",
  "customerId": "60d0fe4f5311236168a109ca",
  "vehicleNumber": "GJ-15-XY-9012",
  "transporterName": "Vapi Roadways Ltd",
  "driverContact": "+919876543210",
  "lines": [
    {
      "materialId": "60d0fe4f5311236168a109cb",
      "declaredQuantity": 5000,
      "receivedQuantity": 5000,
      "unit": "KG",
      "supplierLotNumber": "HEAT-CU-9912",
      "remarks": "Continuous cast copper rod coil"
    }
  ]
}
```
*Result*: Challan created with status `DRAFT` and auto-generated internal document number `IBC-2026-000001`. **Stock balances are unchanged.**

#### Step 2: Post the Inbound Challan
```http
POST /api/v1/inbound-challans/60d0fe4f5311236168a109ce/post
Authorization: Bearer <accessToken>
Idempotency-Key: post-ibc-2026-000001-v1
```
*Result*:
- Status changes to `POSTED`.
- `MaterialLot` created with code `LOT-2026-000001` and supplier heat `HEAT-CU-9912`.
- `InventoryTransaction` posted with number `TXN-2026-000001` (`RECEIPT`, 5,000 KG).
- `InventoryBalance` atomically increased: `quantityOnHand = 5000`, `quantityAvailable = 5000`.
- Repeated requests with the same idempotency key return the cached result without duplicate posting.

#### Step 3: Transfer Stock to WIP Warehouse
```http
POST /api/v1/stock-transfers
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "sourceWarehouseId": "60d0fe4f5311236168a109cc",
  "destinationWarehouseId": "60d0fe4f5311236168a109d0",
  "materialId": "60d0fe4f5311236168a109cb",
  "lotId": "60d0fe4f5311236168a109cd",
  "ownerType": "CUSTOMER_OWNED",
  "customerId": "60d0fe4f5311236168a109ca",
  "quantity": 2000,
  "unit": "KG",
  "notes": "Move copper rods to drawing bay store"
}
```
Post the transfer:
```http
POST /api/v1/stock-transfers/60d0fe4f5311236168a109d1/post
Authorization: Bearer <accessToken>
```
*Result*:
- Source warehouse balance: `quantityOnHand = 3000`, `quantityAvailable = 3000`.
- Destination warehouse balance: `quantityOnHand = 2000`, `quantityAvailable = 2000`.
- Matching `TRANSFER_OUT` and `TRANSFER_IN` ledger transactions created. Total customer stock remains exactly 5,000 KG.

#### Step 4: Earmark Stock via Material Reservation
```http
POST /api/v1/material-reservations
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "materialId": "60d0fe4f5311236168a109cb",
  "warehouseId": "60d0fe4f5311236168a109d0",
  "ownerType": "CUSTOMER_OWNED",
  "customerId": "60d0fe4f5311236168a109ca",
  "quantity": 1200,
  "unit": "KG",
  "notes": "Reserve for Work Order WO-2026-0001"
}
```
*Result*:
- Reservation created with status `ACTIVE`.
- In destination warehouse: `quantityOnHand = 2000` (unchanged), `quantityReserved = 1200`, `quantityAvailable = 800`.
- `RESERVATION` ledger entry posted.

#### Step 5: Release the Reservation
```http
POST /api/v1/material-reservations/60d0fe4f5311236168a109d2/release
Authorization: Bearer <accessToken>
```
*Result*:
- Reservation status updated to `RELEASED`.
- Destination warehouse stock restored: `quantityReserved = 0`, `quantityAvailable = 2000`.
- `RESERVATION_RELEASE` ledger entry posted. Available stock restored exactly once.

---

## 7. Work Orders, Production, Material Consumption & Customer-Wise Reconciliation (Prompt 6)

### 7.1 Architecture & Core Business Workflows

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                            CUSTOMER INBOUND RECEIPTS                        │
  │     (Multiple Challans: CH-001, CH-002 -> All eligible for same customer)   │
  └──────────────────────────────────────┬──────────────────────────────────────┘
                                         ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                           WORK ORDER MANAGEMENT                             │
  │  1. Create Work Order (DRAFT) -> Confirm (Captures Immutable BOM Snapshot)   │
  │  2. Planned Requirement = (BOM Norm * OrderedLength / BatchSize) * (1 + Scrap)│
  │  3. Check Availability & Report Shortages across all eligible challans       │
  │  4. Atomic Stock Reservation / Automatic Release on Cancellation             │
  └──────────────────────────────────────┬──────────────────────────────────────┘
                                         ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                        PRODUCTION EXECUTION & WIP                           │
  │  1. Production Order & Multi-Stage Production Batches                       │
  │  2. Material Issue: Store -> WIP (Atomic transfer; NOT actual consumption)  │
  │  3. Actual Consumption: Consumed <= Issued - Prior Consumed - Returned - Scrap│
  │  4. Unused Material Return: WIP -> Store (Restores warehouse available stock)│
  │  5. Scrap Recording: Reusable / Saleable / Process Loss / Rejected           │
  │  6. Good Production Output: Finished cable length (Meters) & quality report │
  └──────────────────────────────────────┬──────────────────────────────────────┘
                                         ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                   CUSTOMER-WISE MATERIAL RECONCILIATION                     │
  │  Authoritative ledger reconciliation:                                       │
  │  Closing Stores = Opening + Receipts + Returns - Issues                     │
  │  Closing WIP    = Issues - Actual Consumption - Returns - Scraps            │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 API Endpoints Reference

#### Work Orders
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/work-orders` | Create draft work order (`WO-YYYY-XXXX`) |
| `GET` | `/api/v1/work-orders` | List work orders with pagination, customer, product & status filters |
| `GET` | `/api/v1/work-orders/:id` | Get work order details and captured BOM snapshot |
| `PATCH`| `/api/v1/work-orders/:id` | Update work order fields (locked if in production) |
| `POST` | `/api/v1/work-orders/:id/confirm` | Confirm work order and snapshot active BOM items & norms |
| `POST` | `/api/v1/work-orders/:id/hold` | Place confirmed work order on hold |
| `POST` | `/api/v1/work-orders/:id/resume` | Resume held work order to confirmed/in-progress |
| `POST` | `/api/v1/work-orders/:id/cancel` | Cancel work order and safely release active reservations |
| `POST` | `/api/v1/work-orders/:id/complete` | Complete work order (validates 0 outstanding WIP unless forced) |
| `GET` | `/api/v1/work-orders/:id/material-requirements` | Planned BOM vs actual issued, consumed, returned, WIP |
| `GET` | `/api/v1/work-orders/:id/material-availability` | Check eligible customer stock & itemized shortages |
| `POST` | `/api/v1/work-orders/:id/reserve-materials` | Atomically reserve available customer-owned stock |
| `POST` | `/api/v1/work-orders/:id/release-reservations` | Release reservations back to available pool |
| `GET` | `/api/v1/work-orders/:id/completion-summary` | Compare good output, fulfillment %, and material variance |
| `GET` | `/api/v1/work-orders/:id/material-reconciliation` | Reconcile work order transactions |

#### Production Orders & Batches
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/work-orders/:id/production-orders` | Create production order for confirmed work order |
| `GET` | `/api/v1/production-orders` | List production orders |
| `GET` | `/api/v1/production-orders/:id` | Get production order details |
| `POST` | `/api/v1/production-orders/:id/start` | Start production order (sets WO to `IN_PROGRESS`) |
| `POST` | `/api/v1/production-orders/:id/complete` | Mark production order complete |
| `POST` | `/api/v1/production-orders/:id/batches` | Create traceable manufacturing run batch |
| `GET` | `/api/v1/production-batches/:id` | Get batch status and machine assignments |
| `PATCH`| `/api/v1/production-batches/:id` | Update batch progress and completed quantity |
| `GET` | `/api/v1/production-batches/:id/material-reconciliation` | Batch-level consumptions, returns, and scrap |

#### Material Issues, Actual Consumption, Returns & Scrap
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/production-orders/:id/material-issues` | Create draft store-to-WIP material issue |
| `GET` | `/api/v1/material-issues` | List material issues |
| `GET` | `/api/v1/material-issues/:id` | Get material issue and line items |
| `POST` | `/api/v1/material-issues/:id/post` | Atomically post issue: Store-out, WIP-in |
| `POST` | `/api/v1/production-batches/:id/consumption` | Record actual material consumption (reduces WIP) |
| `GET` | `/api/v1/production-batches/:id/consumption` | List consumptions for a batch |
| `POST` | `/api/v1/production-batches/:id/material-returns` | Return unused material from WIP to Store |
| `POST` | `/api/v1/production-batches/:id/outputs` | Record good finished cable length (Meters) |
| `GET` | `/api/v1/production-batches/:id/outputs` | List good cable outputs for a batch |
| `POST` | `/api/v1/production-batches/:id/scrap` | Record scrap (Reusable, Saleable, Process Loss) |
| `GET` | `/api/v1/production-batches/:id/scrap` | List scrap records for a batch |

#### Customer Material Reconciliation
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/customers/:customerId/material-reconciliation` | Complete customer stock & WIP ledger reconciliation |

---

### 7.3 Step-by-Step API Walkthrough

#### Step 1: Create and Confirm Work Order
```http
POST /api/v1/work-orders
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "customerId": "60d0fe4f5311236168a109ca",
  "productId": "60d0fe4f5311236168a109cf",
  "bomVersionId": "60d0fe4f5311236168a109d4",
  "orderedLengthMeters": 2000,
  "customerPoNumber": "PO-POLY-2026-001",
  "targetDeliveryDate": "2026-11-15T00:00:00.000Z",
  "priority": "HIGH"
}
```
*Result*: Work Order created in `DRAFT` status with number `WO-2026-27-0001`.

Confirm the Work Order:
```http
POST /api/v1/work-orders/60d0fe4f5311236168a109d5/confirm
Authorization: Bearer <accessToken>
```
*Result*: Status changes to `CONFIRMED`. An immutable snapshot of the active BOM version and its material items (norms, scrap tolerance %, sequence) is permanently saved in `bomSnapshot`. Subsequent changes to the BOM master will not alter this Work Order.

#### Step 2: Check Material Availability Across Multiple Inbound Challans
```http
GET /api/v1/work-orders/60d0fe4f5311236168a109d5/material-availability
Authorization: Bearer <accessToken>
```
*Result*: Returns itemized planned requirements, stock available from all posted challans for this customer, and shortage quantities.

#### Step 3: Material Issue from Store to WIP
```http
POST /api/v1/production-orders/60d0fe4f5311236168a109d6/material-issues
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "sourceWarehouseId": "60d0fe4f5311236168a109cc",
  "destinationWarehouseId": "60d0fe4f5311236168a109d0",
  "lines": [
    {
      "materialId": "60d0fe4f5311236168a109cb",
      "ownerType": "CUSTOMER_OWNED",
      "customerId": "60d0fe4f5311236168a109ca",
      "issuedQuantity": 400,
      "unit": "KG"
    }
  ]
}
```
Post the issue:
```http
POST /api/v1/material-issues/60d0fe4f5311236168a109d7/post
Authorization: Bearer <accessToken>
```
*Result*:
- Store warehouse stock decreased: `400 KG`.
- WIP warehouse balance increased: `400 KG`.
- `ISSUE_TO_PRODUCTION` ledger transaction posted.
- Note: Stock is **NOT** counted as actual consumption yet.

#### Step 4: Record Actual Consumption
```http
POST /api/v1/production-batches/60d0fe4f5311236168a109d8/consumption
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "materialId": "60d0fe4f5311236168a109cb",
  "warehouseId": "60d0fe4f5311236168a109d0",
  "ownerType": "CUSTOMER_OWNED",
  "customerId": "60d0fe4f5311236168a109ca",
  "consumedQuantity": 300,
  "unit": "KG"
}
```
*Result*:
- WIP inventory reduced from 400 KG to 100 KG.
- `CONSUMPTION` ledger transaction posted.
- Attempting to consume more than remaining WIP (e.g. 150 KG) is rejected with `400 Bad Request`.

#### Step 5: Unused Material Return & Scrap Recording
```http
POST /api/v1/production-batches/60d0fe4f5311236168a109d8/material-returns
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "materialId": "60d0fe4f5311236168a109cb",
  "sourceWarehouseId": "60d0fe4f5311236168a109d0",
  "destinationWarehouseId": "60d0fe4f5311236168a109cc",
  "ownerType": "CUSTOMER_OWNED",
  "customerId": "60d0fe4f5311236168a109ca",
  "returnQuantity": 40,
  "unit": "KG",
  "reason": "Excess copper rod returned after run completion"
}
```
*Result*: WIP balance reduced to 60 KG; Store warehouse balance increased by 40 KG.

Record saleable scrap:
```http
POST /api/v1/production-batches/60d0fe4f5311236168a109d8/scrap
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "materialId": "60d0fe4f5311236168a109cb",
  "sourceWarehouseId": "60d0fe4f5311236168a109d0",
  "scrapWarehouseId": "60d0fe4f5311236168a109ce",
  "ownerType": "CUSTOMER_OWNED",
  "customerId": "60d0fe4f5311236168a109ca",
  "scrapType": "COPPER_SCRAP",
  "scrapCategory": "SALEABLE",
  "scrapQuantity": 10,
  "unit": "KG"
}
```
*Result*: WIP balance reduced to 50 KG; Scrap yard stock increased by 10 KG.

#### Step 6: Customer-Wise Material Reconciliation
```http
GET /api/v1/customers/60d0fe4f5311236168a109ca/material-reconciliation
Authorization: Bearer <accessToken>
```
*Result*:
```json
{
  "success": true,
  "data": {
    "customerId": "60d0fe4f5311236168a109ca",
    "customerCode": "CUST-POLYCAB",
    "customerName": "Polycab Wires Ltd",
    "reconciliationDate": "2026-10-15T11:25:22.000Z",
    "materials": [
      {
        "materialId": "60d0fe4f5311236168a109cb",
        "materialCode": "MAT-CU-ROD-08",
        "materialName": "Copper Wire Rod 8mm",
        "unit": "KG",
        "openingQuantity": 0,
        "receivedQuantity": 900,
        "issuedToProductionQuantity": 400,
        "actualConsumedQuantity": 300,
        "returnedToStoreQuantity": 40,
        "saleableScrapQuantity": 10,
        "closingStoreQuantity": 540,
        "closingWipQuantity": 50,
        "totalAvailableQuantity": 540,
        "challans": [
          { "transactionNumber": "TXN-2026-27-0001", "quantity": 500, "unit": "KG" },
          { "transactionNumber": "TXN-2026-27-0002", "quantity": 400, "unit": "KG" }
        ]
      }
    ]
  }
}
```
Reconciliation mathematical balance:
- Physical Store: 900 (Received) - 400 (Issued) + 40 (Returned) = 540 KG (Matches closingStoreQuantity).
- Production WIP: 400 (Issued) - 300 (Consumed) - 40 (Returned) - 10 (Scrap) = 50 KG (Matches closingWipQuantity).

---

## 14. Cable Packing, Drum Tracking, Dispatch, and Outbound Challans (Prompt 7)

### 14.1 Architecture & Stock-Accounting Rules

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                         FINISHED GOODS STOCK                           │
  │  (Posted ProductionOutput records from final process stage, PASSED QC)  │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                         PACKING LIST WORKFLOW                          │
  │  1. Check eligible unallocated finished output length                  │
  │  2. Group & validate individual Drums (wooden/steel/plastic)           │
  │  3. Calculate lengths, tare weights, net weights, gross weights        │
  │  4. POST /pack: Locks drums -> status: 'PACKED', logs 'PACKING' move   │
  │  *CRITICAL: Packing does NOT issue inventory or double-count stock!*   │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           DISPATCH WORKFLOW                            │
  │  1. Group eligible PACKED drums under work order & customer            │
  │  2. Record transporter, vehicle number, LR number, E-way bill details   │
  │  3. POST /dispatch: ATOMIC MongoDB Multi-Document Transaction          │
  │     - Transition drums -> status: 'DISPATCHED'                         │
  │     - Record 'DISPATCH' drum movements in history                      │
  │     - Post immutable OUTWARD / DISPATCH InventoryTransaction           │
  │     - Decrement Finished Goods InventoryBalance exactly once           │
  │     - Mark associated PackingLists as DISPATCHED                       │
  │     - Idempotent execution (duplicate prevention & rollback on error)  │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                       OUTBOUND DELIVERY CHALLAN                        │
  │  1. Generated strictly from finalized DISPATCH documents               │
  │  2. Sequential numbering via DocumentSequence: OBC-YYYY-YY-XXXX        │
  │  3. Prevent duplicate challan generation for the same dispatch         │
  │  4. Embedded items snapshot for immutable audit & print traceability   │
  │  5. GET /print-data provides structured payload for printable PDFs     │
  └────────────────────────────────────────────────────────────────────────┘
```

#### Critical Measurement Principles
- **Cable Length (Meters):** Actual physical conductor/cable length stored and transported. Length cannot be assumed from weight without an approved product conversion.
- **Tare Weight (KG):** Weight of the empty physical drum. Must be strictly positive.
- **Net Cable Weight (KG):** Pure weight of the manufactured cable wound onto the drum.
- **Gross Weight (KG):** Total weighed physical unit (empty drum + cable + packaging materials/flange covers). Validated separately from tare and net weight.

#### Finished Goods Stock-Accounting Rule Distinction
- **Draft Packing List:** Zero stock impact.
- **Finalized Packing List (`POST /pack`):** Logical allocation only. Locks drums and changes drum status to `PACKED`. Does **NOT** issue stock from finished goods or affect raw material consumption.
- **Draft Dispatch:** Zero stock impact.
- **Posted Dispatch (`POST /dispatch`):** Physical exit from plant gates. Atomically updates drums to `DISPATCHED`, records `DISPATCH` drum movements, posts `OUTWARD` / `DISPATCH` inventory ledger transaction, and decreases on-hand stock exactly once.
- **Outbound Challan:** Delivery documentation referencing the posted dispatch; does not post secondary stock movements.

---

### 14.2 API Endpoint Reference

| Method | Endpoint | Description | Auth Roles |
|---|---|---|---|
| `POST` | `/api/v1/drums` | Register physical cable drum | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/drums` | List drums with search/status filters | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/drums/:id` | Get drum details | `SUPER_ADMIN`, `ADMIN` |
| `PATCH` | `/api/v1/drums/:id` | Update drum (restricted if packed/dispatched) | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/drums/:id/history` | Get complete drum movement history | `SUPER_ADMIN`, `ADMIN` |
| `POST` | `/api/v1/packing-lists` | Create draft packing list | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/packing-lists` | List packing lists with filters | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/packing-lists/:id` | Get packing list details with lines | `SUPER_ADMIN`, `ADMIN` |
| `PATCH` | `/api/v1/packing-lists/:id` | Update draft packing list | `SUPER_ADMIN`, `ADMIN` |
| `POST` | `/api/v1/packing-lists/:id/pack` | Finalize & lock packed drums | `SUPER_ADMIN`, `ADMIN` |
| `POST` | `/api/v1/packing-lists/:id/cancel` | Cancel packing list & release drums | `SUPER_ADMIN`, `ADMIN` |
| `POST` | `/api/v1/dispatches` | Create draft dispatch document | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/dispatches` | List dispatches with filters | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/dispatches/:id` | Get dispatch details with lines | `SUPER_ADMIN`, `ADMIN` |
| `PATCH` | `/api/v1/dispatches/:id` | Update draft dispatch details | `SUPER_ADMIN`, `ADMIN` |
| `POST` | `/api/v1/dispatches/:id/dispatch` | Post dispatch & deduct stock atomically | `SUPER_ADMIN`, `ADMIN` |
| `POST` | `/api/v1/dispatches/:id/cancel` | Cancel draft dispatch | `SUPER_ADMIN`, `ADMIN` |
| `POST` | `/api/v1/dispatches/:id/generate-outbound-challan` | Generate outbound delivery challan | `SUPER_ADMIN`, `ADMIN` |
| `POST` | `/api/v1/outbound-challans` | Create outbound challan from dispatch ID | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/outbound-challans` | List outbound delivery challans | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/outbound-challans/:id` | Get outbound challan details | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/outbound-challans/:id/print-data` | Structured print payload for PDF rendering | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/customers/:customerId/dispatch-history` | Full customer dispatch traceability | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/work-orders/:id/packing-summary` | Work order packing status & output balance | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/v1/work-orders/:id/dispatch-summary` | Work order dispatch & fulfillment percentage | `SUPER_ADMIN`, `ADMIN` |

---

### 14.3 Step-by-Step Test Walkthrough

#### Step 1: Register Physical Cable Drums
```http
POST /api/v1/drums
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "drumNumber": "DRM-2026-001",
  "drumType": "WOODEN",
  "serialNumber": "SN-W-1001",
  "tareWeightKg": 150,
  "netWeightKg": 250,
  "grossWeightKg": 405,
  "cableLengthMeters": 1000,
  "currentProductId": "60d0fe4f5311236168a109ca",
  "customerId": "60d0fe4f5311236168a109cb",
  "workOrderId": "60d0fe4f5311236168a109cc",
  "currentWarehouseId": "60d0fe4f5311236168a109cd",
  "status": "AVAILABLE"
}
```
*Result*: Drum created in `AVAILABLE` status. Initial `CREATED` movement recorded in `DrumMovement`.

#### Step 2: Create Draft Packing List
```http
POST /api/v1/packing-lists
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "workOrderId": "60d0fe4f5311236168a109cc",
  "customerId": "60d0fe4f5311236168a109cb",
  "packingWarehouseId": "60d0fe4f5311236168a109cd",
  "remarks": "First batch of 2500m for Polycab PO-889",
  "lines": [
    { "drumId": "60d0fe4f5311236168a109d1", "lengthMeters": 1000, "tareWeightKg": 150, "netWeightKg": 250, "grossWeightKg": 405 },
    { "drumId": "60d0fe4f5311236168a109d2", "lengthMeters": 1500, "tareWeightKg": 180, "netWeightKg": 375, "grossWeightKg": 555 }
  ]
}
```
*Result*: Packing list created in `DRAFT` status (`totalLengthMeters: 2500`, `totalGrossWeightKg: 960`). Finished goods inventory is **NOT** changed.

#### Step 3: Finalize Packing List
```http
POST /api/v1/packing-lists/60d0fe4f5311236168a109e0/pack
Authorization: Bearer <accessToken>
```
*Result*:
- Status updated to `PACKED`.
- Drums marked `PACKED` and assigned `packingListId`.
- `PACKING` drum movement recorded.
- Attempting to edit drum contents while packed is prevented (`400 Bad Request`).
- Finished goods inventory balance remains unchanged.

#### Step 4: Create Draft Dispatch & Post Physical Shipment
Create draft dispatch:
```http
POST /api/v1/dispatches
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "workOrderId": "60d0fe4f5311236168a109cc",
  "customerId": "60d0fe4f5311236168a109cb",
  "sourceWarehouseId": "60d0fe4f5311236168a109cd",
  "destinationAddress": "Polycab Logistics Depot, Halol GIDC, Gujarat",
  "vehicleNumber": "GJ-06-AX-4421",
  "transporter": "V-Trans Express",
  "driverName": "Ramesh Patel",
  "driverPhone": "+919898989898",
  "lrNumber": "LR-2026-9901",
  "eWayBillNumber": "EWB-241234567890",
  "lines": [
    { "drumId": "60d0fe4f5311236168a109d1", "lengthMeters": 1000, "grossWeightKg": 405 },
    { "drumId": "60d0fe4f5311236168a109d2", "lengthMeters": 1500, "grossWeightKg": 555 }
  ]
}
```

Post physical dispatch atomically:
```http
POST /api/v1/dispatches/60d0fe4f5311236168a109f0/dispatch
Authorization: Bearer <accessToken>
Idempotency-Key: IDEMP-DSP-POST-001
```
*Result*:
- Drums atomically transitioned to `DISPATCHED`.
- `DISPATCH` drum movements logged.
- `OUTWARD` / `DISPATCH` ledger transaction posted.
- Finished Goods stock balance decremented by 2500m exactly once.
- Associated packing list status transitioned to `DISPATCHED`.
- Duplicate dispatch requests rejected (`409 Conflict`).

#### Step 5: Generate Outbound Delivery Challan
```http
POST /api/v1/dispatches/60d0fe4f5311236168a109f0/generate-outbound-challan
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "deliveryTerms": "Job Work Return Under Rule 4(5)(a) of CENVAT / CGST Rules",
  "remarks": "Consignment of 2 drums containing 2500m LT power cable"
}
```
*Result*:
- Unique sequential document `OBC-2026-27-0001` issued.
- Embedded snapshot of items, vehicle, and work order details preserved.
- Duplicate generation for the same dispatch blocked (`409 Conflict`).

#### Step 6: Fetch Structured Print Data for PDF / Printable Template
```http
GET /api/v1/outbound-challans/60d0fe4f5311236168a109f5/print-data
Authorization: Bearer <accessToken>
```
*Result*:
```json
{
  "success": true,
  "data": {
    "companyHeader": {
      "companyName": "Mfolks Cables Private Limited",
      "plantAddress": "Plot 42, GIDC Industrial Estate, Vadodara, Gujarat - 390010",
      "gstin": "24AAACM1234F1Z1",
      "documentTitle": "DELIVERY CHALLAN (JOB-WORK RETURN / CABLE DISPATCH)"
    },
    "challanHeader": {
      "challanNumber": "OBC-2026-27-0001",
      "challanDate": "2026-10-15T12:00:00.000Z",
      "eWayBillNumber": "EWB-241234567890",
      "deliveryTerms": "Job Work Return Under Rule 4(5)(a)",
      "status": "ISSUED"
    },
    "consignee": {
      "customerCode": "CUST-POLYCAB",
      "customerName": "Polycab Wires Ltd",
      "gstin": "24AAACP1234A1Z1",
      "deliveryAddress": "Polycab Logistics Depot, Halol GIDC, Gujarat"
    },
    "workOrder": {
      "workOrderNumber": "WO-2026-001",
      "customerPoNumber": "PO-HVL-2026-889",
      "orderedLengthMeters": 5000
    },
    "transport": {
      "dispatchNumber": "DSP-2026-27-0001",
      "transporter": "V-Trans Express",
      "vehicleNumber": "GJ-06-AX-4421",
      "lrNumber": "LR-2026-9901",
      "driverName": "Ramesh Patel",
      "driverPhone": "+919898989898"
    },
    "items": [
      {
        "srNo": 1,
        "drumNumber": "DRM-2026-001",
        "productCode": "CBL-3C-2.5",
        "productName": "1.1kV 3C x 2.5 sqmm XLPE Armoured Cable",
        "lengthMeters": 1000,
        "tareWeightKg": 150,
        "netWeightKg": 250,
        "grossWeightKg": 405
      },
      {
        "srNo": 2,
        "drumNumber": "DRM-2026-002",
        "productCode": "CBL-3C-2.5",
        "productName": "1.1kV 3C x 2.5 sqmm XLPE Armoured Cable",
        "lengthMeters": 1500,
        "tareWeightKg": 180,
        "netWeightKg": 375,
        "grossWeightKg": 555
      }
    ],
    "totals": {
      "totalDrums": 2,
      "totalLengthMeters": 2500,
      "totalTareWeightKg": 330,
      "totalNetWeightKg": 625,
      "totalGrossWeightKg": 960
    },
    "signatories": {
      "checkedBy": "Authorized Dispatch Supervisor",
      "authorizedSignatory": "For Mfolks Cables Pvt. Ltd.",
      "receiverAcknowledgement": "Customer Stamp & Signature"
    }
  }
}
```

#### Step 7: Order-Wise & Customer Traceability Reports
1. **Work Order Packing Summary (`GET /api/v1/work-orders/:id/packing-summary`)**:
   - `goodOutputMeters`: 5000m
   - `totalPackedMeters`: 5000m
   - `remainingUnpackedMeters`: 0m
   - Itemized list of all packing lists and drum numbers.

2. **Work Order Dispatch Summary (`GET /api/v1/work-orders/:id/dispatch-summary`)**:
   - `orderedLengthMeters`: 5000m
   - `totalDispatchedMeters`: 5000m
   - `totalDrumsDispatched`: 4 drums
   - `fulfillmentPercentage`: 100%
   - Itemized list of dispatch documents and associated Outbound Challan numbers.

3. **Customer Dispatch History (`GET /api/v1/customers/:customerId/dispatch-history`)**:
   - Complete chronological log of shipments, transporter vehicles, dispatched drums, and challan references.

---

## 15. Global Stock Dashboard, Reports, Reconciliation & Traceability (Prompt 8)

Prompt 8 introduces a comprehensive, high-performance reporting, reconciliation, and traceability system under `/api/v1/reports/*` (with `/api/reports/*` supported as an alias).

### 15.1 Core Domain Principles & Calculation Rules

1. **Strictly Read-Only Guarantee**:
   - Reporting and analytics endpoints are completely read-only.
   - They never mutate balances, create ledger transactions, or alter historical records.

2. **Measurement & Unit Segregation**:
   - Cable lengths in **METERS** are never combined with raw material weights in **KILOGRAMS**.
   - Specific consumption variances are computed as `kg consumed / meters good output` (kg/m) and compared to the BOM recipe norm.

3. **Ownership Model Segregation**:
   - Customer-owned material is tracked strictly separate from factory-owned inventory across all reports.
   - Low-stock and replenishment reports never mix customer stock to conceal a factory shortage.

4. **Stock Definitions & Mathematical Formulas**:
   - **On-Hand Stock**: Total physical quantity stored in warehouse balances.
   - **Reserved Stock**: Earmarked for active work orders (`MaterialReservationModel`).
   - **Blocked Stock**: Quarantined or quality holds.
   - **Available Stock**: Calculated as `quantityOnHand - quantityReserved - quantityBlocked`.
   - **Opening Stock**: Authoritative net ledger position immediately before the selected `startDate` (`sum(inward) - sum(outward)` posted prior to `startDate`).
   - **Closing Stock**: `Opening Stock + Received + Transfers In - Transfers Out - Issued To Production + Unused Returned + Net Adjustments`.

5. **Material Issue vs. Actual Consumption**:
   - **Material Issue**: Transfers raw material from store warehouse to WIP shopfloor.
   - **Actual Consumption**: Physically consumes WIP material into production batches.
   - **Unused Material Returned**: Returns surplus WIP material back into store stock.
   - **Scrap & Process Loss**: Quantifies process waste and non-reusable scrap.

6. **Customer Material Reconciliation Formula**:
   $$\text{Store On-Hand} + \text{WIP Balance} = \text{Total Received} - \text{Total Consumed} - \text{Total Scrap}$$
   Where $\text{WIP Balance} = \text{Total Issued} - \text{Total Consumed} - \text{Total Returned} - \text{Total Scrap}$.

7. **Full Bidirectional Traceability Chain**:
   $$\text{Inbound Challan} \rightarrow \text{Receipt Line} \rightarrow \text{Material Lot} \rightarrow \text{Ledger Txn} \rightarrow \text{Reservation} \rightarrow \text{Issue} \rightarrow \text{Batch} \rightarrow \text{Consumption/Scrap/Return} \rightarrow \text{Output} \rightarrow \text{Drum} \rightarrow \text{Packing} \rightarrow \text{Dispatch} \rightarrow \text{Outbound Challan}$$

---

### 15.2 Report Endpoints Reference

All endpoints require JWT Bearer token authentication and are accessible by both `SUPER_ADMIN` and `ADMIN` roles.

| Method | Endpoint | Description | Key Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/dashboard` | Overall factory inventory position, movements, alerts, breakdowns | `startDate`, `endDate`, `warehouseId`, `materialId`, `ownerType`, `customerId` |
| `GET` | `/api/v1/reports/inventory-summary` | Current stock balances by warehouse and material with shortage calculations | `page`, `limit`, `warehouseId`, `materialId`, `ownerType`, `customerId`, `belowReorderOnly` |
| `GET` | `/api/v1/reports/daily-stock-movement` | Daily material movement reconciliations (opening, in, out, closing) | `startDate`, `endDate`, `date`, `warehouseId`, `materialId`, `ownerType`, `customerId`, `lotId` |
| `GET` | `/api/v1/reports/customer-material-reconciliation` | Customer reconciliation across multi-challan receipts, WIP & Store stock | `customerId`, `materialId`, `startDate`, `endDate`, `inboundChallanId`, `workOrderId` |
| `GET` | `/api/v1/reports/work-orders` | Work order progress, BOM snapshot requirements, production & dispatch | `workOrderId`, `customerId`, `productId`, `status`, `priority`, `startDate`, `endDate` |
| `GET` | `/api/v1/reports/production-batches` | Batch inputs, returns, scrap, output meters, specific consumption (kg/m) | `batchId`, `workOrderId`, `productionOrderId`, `processStageId`, `status` |
| `GET` | `/api/v1/reports/finished-goods` | Drum tracking, tare/net/gross weights, cable length, packing & dispatch | `workOrderId`, `customerId`, `productId`, `drumStatus`, `warehouseId` |
| `GET` | `/api/v1/reports/packing-dispatch` | Packing lists & dispatch summaries with partial fulfillment tracking | `customerId`, `workOrderId`, `status`, `startDate`, `endDate` |
| `GET` | `/api/v1/reports/low-stock` | Reorder rule evaluations, shortage quantities, and threshold breach status | `materialId`, `warehouseId`, `ownerType`, `customerId`, `status` (`ALL`, `BELOW_REORDER`, `OUT_OF_STOCK`) |
| `GET` | `/api/v1/reports/traceability` | Bidirectional search engine across lots, challans, work orders, drums, dispatches | `search`, `lotNumber`, `inboundChallanNumber`, `workOrderNumber`, `drumNumber`, `dispatchNumber`, `outboundChallanNumber` |
| `GET` | `/api/v1/reports/discrepancies` | Read-only integrity audit detecting ledger drifts, over-reservations, negative stock | `type`, `severity` (`CRITICAL`, `WARNING`, `INFO`), `page`, `limit` |

---

### 15.3 Example Responses

#### Example 1: Global Dashboard (`GET /api/v1/reports/dashboard`)

```json
{
  "success": true,
  "message": "Global inventory dashboard retrieved successfully",
  "data": {
    "stockPosition": {
      "totalOnHand": 4500,
      "totalReserved": 500,
      "totalBlocked": 0,
      "totalAvailable": 4000,
      "factoryOwned": {
        "onHand": 500,
        "reserved": 0,
        "available": 500
      },
      "customerOwned": {
        "onHand": 4000,
        "reserved": 500,
        "available": 3500
      },
      "unitBreakdown": [
        { "unit": "KG", "onHand": 4500, "reserved": 500, "available": 4000 }
      ]
    },
    "periodMovements": {
      "stockReceived": 5500,
      "issuedToProduction": 1000,
      "actualConsumption": 600,
      "unusedReturned": 100,
      "scrapAndLoss": 20,
      "transfersBetweenWarehouses": 0,
      "finishedGoodsProduced": 1000,
      "finishedGoodsPacked": 1000,
      "finishedGoodsDispatched": 1000
    },
    "alerts": {
      "materialsBelowReorderLevel": 1,
      "materialsZeroOrNegativeAvailable": 0,
      "totalLotsTracked": 3
    }
  }
}
```

#### Example 2: Customer Material Reconciliation (`GET /api/v1/reports/customer-material-reconciliation?customerId=...`)

```json
{
  "success": true,
  "message": "Customer-owned material reconciliation report retrieved successfully",
  "data": [
    {
      "customer": { "_id": "...", "code": "CUST-REP-01", "name": "PowerGrid Solutions Ltd" },
      "material": { "_id": "...", "code": "MAT-CU-8MM", "name": "8mm Copper Wire Rod", "baseUnit": "KG" },
      "inboundReceipts": [
        {
          "challanNumber": "IBC-2026-0001",
          "customerChallanNumber": "PG-DC-101",
          "lotNumber": "LOT-CU-CUST-001",
          "declaredQuantity": 3000,
          "receivedQuantity": 3000,
          "unit": "KG"
        },
        {
          "challanNumber": "IBC-2026-0002",
          "customerChallanNumber": "PG-DC-102",
          "lotNumber": "LOT-CU-CUST-002",
          "declaredQuantity": 2000,
          "receivedQuantity": 2000,
          "unit": "KG"
        }
      ],
      "summary": {
        "totalReceived": 5000,
        "materialReservedForWorkOrders": 500,
        "materialIssuedToProduction": 1000,
        "actualMaterialConsumption": 600,
        "unusedMaterialReturnedToStores": 100,
        "scrapAndProcessLoss": 20,
        "currentStoreOnHand": 4000,
        "currentWipBalance": 280,
        "totalCustomerMaterialRemaining": 4280,
        "availableBalance": 3500
      },
      "reconciliation": {
        "expectedTotalRemaining": 4380,
        "actualTotalRemaining": 4280,
        "discrepancy": 0,
        "isBalanced": true,
        "formula": "Store On-Hand + WIP Balance == Total Received - Actual Consumed - Total Scrap (Strict Customer Segregation)"
      }
    }
  ]
}
```

#### Example 3: Discrepancy & Reconciliation Audit (`GET /api/v1/reports/discrepancies`)

```json
{
  "success": true,
  "message": "Discrepancy and reconciliation report retrieved successfully",
  "data": {
    "discrepancies": [],
    "summary": {
      "totalDetected": 0,
      "criticalCount": 0,
      "warningCount": 0,
      "infoCount": 0
    },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 0,
      "totalPages": 1
    }
  }
}
```





#   B O M _ a p p  
 