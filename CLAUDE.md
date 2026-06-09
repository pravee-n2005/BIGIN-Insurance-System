# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Internal insurance operations system (BIGIN Insurance Brokers Pvt Ltd, Tamil Nadu) replacing Excel/PDF ledger workflows. Startup MVP — simplicity and production-safety over abstraction.

## Commands

```bash
# Backend
cd backend
npm run dev          # Start with nodemon (hot-reload)
npm start            # Production start
npx prisma studio    # Visual DB browser at localhost:5555
npx prisma migrate dev --name <name>   # Create migration
npx prisma generate  # Regenerate client after schema change
npx prisma migrate deploy              # Apply migrations (production)
node prisma/seed-masters.js            # Seed insurers, products, lead members
node prisma/seed-invoice-profiles.js   # Seed invoice profiles
node prisma/seed-products.js           # Re-point products to canonical insurers

# Frontend
cd frontend
npm run dev          # Vite dev server (hot-reload)
npm run build        # Production build
npm run lint         # ESLint
```

Backend runs on port 5000. Frontend Vite dev server proxies `/api` to it. Database is PostgreSQL 18 running as a local Windows service on port 5432, database name `begin_insurance`.

## Hard Constraints — Do NOT Violate

- **CommonJS only.** No TypeScript, no ESM. Every file uses `require()`/`module.exports`.
- **Prisma 6 only.** Prisma 7 is explicitly banned.
- **Additive migrations only.** Never DROP columns, never rename columns, never ALTER TYPE destructively. Add new columns as nullable or with defaults.
- **All financial calculations happen in backend service files only.** Never in controllers, never in frontend. The frontend displays values; it never computes GST, commission, TDS, or totals.
- **Never delete production records.** Invoices are cancelled (status change), never deleted. Policies have no delete endpoint.
- **Preserve the existing Policy schema.** Policy keeps free-text `insurerName`/`productName`/`leadSource` strings — no FK columns to master tables. Master dropdowns populate these strings.

## Architecture

### Backend (`backend/src/`)

**Entry:** `server.js` → `app.js` (Express wiring) → module routers.

**Every module follows the same 3-4 file pattern:**
```
src/modules/<name>/
  <name>.routes.js       — Express router, middleware chain
  <name>.controller.js   — Request/response handling, input validation
  <name>.service.js      — Business logic, Prisma queries, calculations
  <name>.validation.js   — (policy only) Manual validation, no library
```

**Middleware chain for every route:** `authenticate` → role guard (`adminOnly` or `ownerOrAdmin`) → controller → service.

**Auth:** JWT (jsonwebtoken + bcryptjs). Two roles: ADMIN (full CRUD) and OWNER (read-only). Token in `Authorization: Bearer <token>` header. `req.user = { id, email, role }` set by `authenticate` middleware.

### API Routes

| Prefix | Module | Access |
|---|---|---|
| `/api/auth` | Register, login, me | Public (register/login), authenticated (me) |
| `/api/policies` | CRUD policies | ADMIN write, OWNER read |
| `/api/reports` | Monthly, insurer, lead, category aggregations | Both roles |
| `/api/masters` | Insurers, products, lead members | ADMIN write, OWNER read |
| `/api/invoice-profiles` | Insurer GST/address profiles | ADMIN only |
| `/api/invoices` | Draft, save, list, detail, cancel, PDF download | ADMIN write, OWNER read |
| `/api/import` | CSV bulk import | ADMIN only |
| `/api/pdf` | Policy report PDF export | Both roles |

### Invoice System (Critical Business Logic)

**Data flow:** Policy.commissionAmount → `SUM()` aggregation by insurer+month → taxable value → GST split → frozen snapshot on save → PDF from snapshot only.

**Key rules:**
- `invoice.service.js` contains `INSURER_ALIASES` — maps canonical insurer names to legacy aliases used in imported Policy data. Both canonical and alias names are queried when aggregating.
- GST split: supplier state is hardcoded as `'Tamil Nadu'`. If `InsurerInvoiceProfile.state` matches → CGST 9% + SGST 9% (intra-state). Otherwise → IGST 18% (inter-state).
- Invoice numbers are sequential `BG###`, continuing from the highest across both `Invoice.invoiceNumber` and `Policy.invoiceNumber` (legacy ledger numbers).
- `saveInvoice()` regenerates the draft inside a `prisma.$transaction` — never trusts frontend values. Duplicate check (insurer+month) + unique constraint on invoiceNumber guard against races.
- Cancelled policies (`status = 'CANCELLED'`) are excluded from invoice aggregation.
- `invoice.pdf.js` reads ONLY from frozen Invoice columns — never calls `generateDraft()`, never recalculates.
- Status lifecycle: `DRAFT` → `FINALIZED` → `CANCELLED`. Legacy `ISSUED` kept in enum for backward compatibility.

### Frontend (`frontend/src/`)

React 19 + Vite + Tailwind CSS + React Router v6. No state management library.

**Layout:** `DashboardLayout` wraps all authenticated pages with a sidebar. `ProtectedRoute` checks auth. `AdminRoute` checks `role === 'ADMIN'`.

**API layer:** `api/axios.js` creates a configured Axios instance with base URL and auth token interceptor. Module-specific API files (`api/invoices.js`, `api/masters.js`, etc.) export functions that return promises.

### Database Schema (Prisma)

**Tables:** `users`, `policies`, `insurers`, `products`, `lead_members`, `insurer_invoice_profiles`, `invoices`.

**Money fields:** Always `Decimal @db.Decimal(18,2)`. Financial calculations use `round2()` helper: `Math.round((n + Number.EPSILON) * 100) / 100`.

**Enums:** `Role`, `InsuranceCategory` (7 values), `PaymentFrequency`, `PolicyStatus`, `LeadType`, `InvoiceStatus` (DRAFT/ISSUED/FINALIZED/CANCELLED).

**Snapshot pattern for invoices:** All recipient details (name, address, GSTIN, state) are copied as plain text into Invoice columns at save time. Future edits to `InsurerInvoiceProfile` do not affect saved invoices.

## Seed Data

- 14 canonical insurers + legacy inactive entries for historical lookup
- 71 products linked to canonical insurers
- 18 lead members (3 Leadership / 5 Lead Executive / 10 POSP)
- 6 GST invoice profiles seeded from real invoice PDFs
- 160+ policies imported from CSV ledger (some have `commissionPercent = 0` — known data quality issue from import)

## Known Data Issues

Many imported policies have `commissionPercent = 0`, causing zero-value invoices. This is a source data problem, not a system bug. Affected insurers: HDFC Ergo (32%), ICICI Lombard (49%), United India (65%). The system correctly computes `commissionAmount = netPremium × 0/100 = 0`. Fix requires updating `commissionPercent` on individual policy records from the original paper ledger.
