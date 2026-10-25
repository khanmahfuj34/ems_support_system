# Backend Agent Guide — EMS Support System

## Mandatory Agent Rules

1. Read this file and applicable parent/nested `AGENTS.md` files before starting; follow their instructions.
2. Inspect the relevant controller, service, DTO, guard, Prisma schema, and tests before changing behavior.
3. After meaningful work, add a concise 1–3-bullet summary under **Task Notes**. Merge related work, avoid duplicates, and keep notes minimal.
4. Preserve existing architecture and unrelated behavior. A requirement in a PRD is not proof that the feature is implemented.
5. Validate inputs through DTOs and the global validation pipe. Enforce authorization/ownership in backend code, never only in the UI.
6. For Prisma 7 work, follow repo guidance in `.agents/skills/` and the existing MariaDB adapter. Never reset, destructively migrate, or seed a real DB without explicit approval.
7. Never commit secrets, passwords, access tokens, real user data, or environment files. Use environment variables and redacted logs.
8. Run relevant checks and report actual results: `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` as applicable. Never claim unverified success.
9. Keep backend tasks within `backend/` unless an explicitly coordinated API contract change requires frontend updates.

## Project Context & Stack

EMS Support System is a REST-based helpdesk/ticketing system for the EMS Portal. The PRD files in the repository describe intended scope; use code and controllers as the source of truth for what currently works.

- NestJS 12, Node.js, TypeScript 6.x, ESM (`backend/package.json` has `"type": "module"`; relative source imports typically end in `.js`).
- MySQL/MariaDB through Prisma 7.10 and `@prisma/adapter-mariadb`.
- JWT authentication via Passport/`@nestjs/jwt`; bcrypt password hashing.
- Multer memory upload + Cloudinary storage.
- DTO validation: global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Oxlint (`npm run lint`), Vitest (`npm test`), Nest CLI (`npm run build`).
- Optional `@nestjs/observe` is configured through environment variables in `src/app.module.ts`.

## Bootstrap & Database

- Entry: `src/main.ts`; modules assembled in `src/app.module.ts`. API controllers specify the `api/v1` prefix themselves.
- Global config loads from `.env`.
- `src/database/prisma/prisma.module.ts` provides `PrismaService`; it connects/disconnects in Nest lifecycle hooks.
- `src/database/prisma/mariadb-adapter.ts` creates `PrismaMariaDb` from `DATABASE_URL`; TLS certificate verification defaults on, with optional `DATABASE_SSL_CA`.
- `DATABASE_SSL=false`, `DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL=true`, and `DATABASE_CACHING_RSA_PUBLIC_KEY` are restricted to development on loopback hosts. Do not weaken TLS verification to work around production connectivity problems.
- Keep role/status lookup IDs consistent with `prisma/seed.ts`. Main record IDs are unsigned BigInt; convert BigInt values to strings before JSON responses.
- See `.agents/skills/` for bundled Prisma CLI, client, adapter, and ORM guidance.

## Schema Overview

Source of truth: `prisma/schema.prisma`.

- `UserRole` and `User`: IDs 1 USER and 2 ADMIN; users have `isActive`, `emailVerifiedAt`, and `lastLoginAt`.
- `TicketStatus`: numeric lookup. Seed values: 1 OPEN, 2 PENDING_REVIEW, 3 ACCEPTED, 4 IN_PROGRESS, 5 WAITING_FOR_USER, 6 RESOLVED, 7 CLOSED, 8 REJECTED, 9 REOPENED.
- `TicketCategory` and `TicketSubCategory`: active categorized ticket classification with sort order.
- `SlaPolicy`: priority-specific first-response and resolution limits.
- `Ticket`: ticket number, owner/category/subcategory, user/admin priority, status, rejection/resolution data, SLA deadlines/status, and lifecycle timestamps.
- `TicketComment`: ticket conversation.
- `TicketAttachment`: Cloudinary references and file metadata.
- `TicketInternalNote`: private-note schema; do not assume corresponding API exists.
- `TicketStatusHistory` and `TicketActivityLog`: lifecycle history/activity records.
- `Notification` and `AuditLog`: database models exist; verify service/controller coverage before treating them as operational.
- Priority enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

## Verified API Surface

All paths are relative to the backend host and include `/api/v1`.

### Auth — `src/module/auth/`

- `POST /api/v1/auth/register`: public registration; server forces role USER and hashes password with bcrypt.
- `POST /api/v1/auth/login`: checks credentials and active account, updates `lastLoginAt`, returns a Bearer JWT with 15-minute expiry and user summary.
- `GET /api/v1/auth/me`: JWT-protected current profile.

### Tickets — `src/module/tickets/` (JWT required)

- `POST /api/v1/tickets`: creates a ticket for the authenticated user. It checks active account/category/subcategory, requires an active SLA policy, sanitizes rich-text description, generates a unique ticket number, sets PENDING_REVIEW and writes initial status history/activity in a Prisma transaction.
- `GET /api/v1/tickets`: paginated list with status/priority/category and sort filters. Users are scoped to own tickets; ADMIN can see all.
- `GET /api/v1/tickets/:id`: ticket details with status history, comments, attachment metadata and SLA/category data. Users are scoped to own tickets. Internal notes are deliberately excluded.

### Categories — `src/module/categories/` (JWT required)

- `GET /api/v1/categories`: active categories.
- `GET /api/v1/categories/:categoryId/subcategories`: active subcategories for an active category.
- No category/subcategory admin CRUD endpoints were found in the current controller.

### Comments — `src/module/comments/` (JWT required)

- `GET /api/v1/tickets/:ticketId/comments`: chronological conversation after ownership/admin access check.
- `POST /api/v1/tickets/:ticketId/comments`: inserts a comment and COMMENT_ADDED activity log transactionally.

### Admin — `src/module/admin/` (JWT + ADMIN role required)

- `GET /api/v1/admin/test`: protected authorization test.
- `PATCH /api/v1/admin/tickets/:id/accept`: accepts only tickets in PENDING_REVIEW; updates status/history/activity transactionally.
- `PATCH /api/v1/admin/tickets/:id/reject`: requires a non-empty reason and records status/history/activity transactionally.

### Uploads — `src/module/uploads/` (JWT required)

- `POST /api/v1/uploads`: multipart fields `file` and `ticketId`; controller allows one file up to 5 MB. Service currently allowlists JPG, PNG, WEBP, PDF; checks ticket existence and ownership for regular users; uploads using authenticated Cloudinary storage and records metadata in MySQL. If metadata persistence fails, it attempts to delete the orphaned Cloudinary upload.
- The service notes that MIME type alone is insufficient and signature inspection remains a hardening opportunity. Do not document signature validation as already implemented.

## Authentication, Authorization & Security

- `JwtStrategy` extracts Bearer tokens and reloads current user/account status from the database.
- `UserRoleId` in `src/common/decorators/roles.decorator.ts` must match the seed IDs: USER=1, ADMIN=2.
- `RolesGuard` reloads current role/active state from DB; admin controller uses `JwtAuthGuard`, `RolesGuard`, and `@Roles(ADMIN)`.
- Use the authenticated request identity for ownership. Never accept user IDs or roles from untrusted request bodies to decide permissions.
- Keep rich-text sanitization in `src/module/tickets/utils/sanitize-html.ts` covered by tests.
- Do not return password hashes, private internal notes, or secret configuration. Convert BigInt IDs/file sizes before JSON output.
- Preserve conditional status updates and transactions for review actions to avoid duplicate concurrent decisions.

## Current Gaps — Do Not Assume Implemented

- `src/module/users/users.module.ts` and `src/module/departments/departments.module.ts` are empty placeholder modules.
- The admin controller currently supports review accept/reject only; the full PRD lifecycle (status changes, resolve/close/reopen, official-priority override, internal notes, SLA admin) is not exposed there at present.
- Prisma models for notifications, audit logs, and internal notes exist, but this inspection did not find corresponding feature controllers/modules in `AppModule`.
- SLA policies are seeded and consulted at ticket creation; a scheduler/background SLA monitor was not verified.
- No email, WebSocket, Socket.IO, Redis, AI assistant, Knowledge Base, or FAQ feature should be assumed. PRD explicitly excludes real-time sockets, Redis, AI, and KB/FAQ scope.
- Do not infer any capability solely from `docs/project_prd.md`, `docs/project_requirement.md`, `docs/ems_support_backend_architecture.md`, or the ERD. Check the implementation and tests first.

## Key Files & Commands

- Schema/seed: `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/seed-admins.ts`.
- DB adapter/client: `src/database/prisma/mariadb-adapter.ts`, `src/database/prisma/prisma.service.ts`.
- Auth: `src/module/auth/`; tickets: `src/module/tickets/`; review: `src/module/admin/`; categories: `src/module/categories/`; comments: `src/module/comments/`; uploads: `src/module/uploads/`.
- Tests currently exist for auth, tickets, comments, and ticket HTML sanitization.

From `backend/`:
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:e2e` for integration changes.
Use the configured package manager and existing lockfile. Review migration SQL before applying changes; never reset a DB by default.

## Task Notes

- Keep only recent meaningful backend changes here (1–3 bullets); merge related updates and remove stale/duplicate summaries.
- Added admin ticket lifecycle management with validated transitions, required reasons/resolution summaries, and transactional status history/activity logging; expanded specs for review accept/reject, not-found, validation guards, reopen SLA breach/on-track, and concurrency conflicts.
- Integrated requester notifications: `NotificationsModule` is registered in `AppModule`, imported by `AdminModule`, and `AdminService` creates `TICKET_ACCEPTED`/`TICKET_REJECTED`/`TICKET_STATUS_CHANGED` notifications via `NotificationsService.createTicketNotification(tx, ...)` inside the ticket transactions, so notifications commit/roll back with status updates.
- Notification-focused specs (`notifications.controller.spec.ts`, `notifications.service.spec.ts`, and rollback cases in `admin.service.spec.ts`) cover JWT-guarded routes, user scoping, unread filtering, pagination/unread count, invalid IDs, ownership 404s, accept/reject/lifecycle notification payloads, and aborting the ticket transaction when the notification write fails.
- Unit-test runner (`vitest.config.ts`) sets `test.fileParallelism: false` so `npm test` runs reliably without parallel test workers; tsconfig path resolution uses Vite's native `resolve: { tsconfigPaths: true }` (Vite 8+), not the removed `vite-tsconfig-paths` package. Do not raise hook timeouts to mask parallelism-related `beforeEach` flakiness.
