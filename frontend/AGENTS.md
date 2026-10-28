# Frontend Agent Guide â€” EMS Support System

## Mandatory Agent Rules

1. Read this file and applicable parent/nested `AGENTS.md` files before starting; follow their instructions.
2. Inspect relevant code and existing patterns before editing. Keep changes scoped to the requested task.
3. After meaningful work, append a concise 1â€“3-bullet summary under **Task Notes** below. Combine related work, avoid duplicates, and keep notes minimal.
4. Preserve existing instructions and the Next.js-generated block below. Do not rewrite unrelated UI, routes, auth, or behavior.
5. Never assume a feature is implemented from the PRD alone; verify the actual code/API first. Do not invent endpoints or silently mock backend data.
6. Run relevant checks when applicable (at minimum `npm run lint`; also `npm run build` for routing/build/config or broad changes). Report actual results and blockers.
7. Do not edit backend files for a frontend-only task. Coordinate API contract changes explicitly.
8. Do not put credentials, tokens, secrets, or real personal data in source code, logs, or this file.
9. For new or modified Next.js behavior, respect the installed Next.js version and its generated rules. Read local docs only when needed to resolve version-specific uncertainty.

## Project Context

EMS Support System is a REST-based helpdesk/ticketing UI integrated with a NestJS API. The repo's PRD describes intended product scope; this guide separates verified frontend implementation from planned functionality.

- Framework: Next.js App Router, TypeScript, React.
- Installed versions in `frontend/package.json`: Next.js 16.4.2, React/React DOM 19.3.0, TypeScript 5.x.
- Styling/UI: Tailwind CSS 4, local shadcn-style primitives, lucide-react.
- Forms/validation: React Hook Form + Zod.
- Rich text: TipTap; HTML sanitization helpers use DOMPurify.
- HTTP: Axios through a shared client. API requests use the `/api/v1` base path and bearer access token; `next.config.ts` rewrites `/api/v1/:path*` to `NEXT_PUBLIC_API_URL` or the local backend default.
- Next configuration currently enables `cacheComponents`, `partialPrefetching`, and `experimental.agentFeedback`, plus the Tailwind Turbopack CSS loader. Some route pages intentionally export `instant = false`; investigate the specific route/component before changing this.
- No frontend test script is defined in `package.json`; scripts are `dev`, `build`, `start`, and `lint`.

## Route Map

Route groups in parentheses are organizational only; they do not appear in the URL.

- `src/app/(public)/page.tsx`: public landing page.
- `src/app/(auth)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`: auth screens.
- `src/app/(auth)/admin/login/page.tsx`: admin login entry point; it reuses the login flow and requires the authenticated account role to be ADMIN.
- `src/app/(user)/layout.tsx`: protected shared workspace layout for USER and ADMIN.
- `src/app/(user)/dashboard/page.tsx`: user dashboard route.
- `src/app/(user)/support-desk/new/page.tsx`: USER ticket creation route.
- `src/app/(user)/support-desk/[id]/page.tsx`: ticket details route; service enforces user ownership/admin access.
- `src/app/(user)/support-desk/page.tsx`: despite its route-group location, this is the ADMIN support-desk console and has an ADMIN page guard.
- `src/app/(admin)/admin/layout.tsx`: ADMIN-protected workspace layout.
- `src/app/(admin)/admin/dashboard/page.tsx`: admin review dashboard entry point.

Keep route URLs stable unless the task explicitly requests a route change. Pay special attention to `/support-desk` being admin-only while `/support-desk/new` is the user ticket form.

## Feature/Folder Map

- `src/components/ui/`: reusable UI primitives (button, card, input, dialog, select, table, toaster, etc.).
- `src/components/layout/public-layout/`: public site navigation/layout.
- `src/components/layout/workspace-layout/`: shared authenticated workspace shell.
- `src/providers/auth-provider.tsx`: client-side auth context, user refresh, login/logout, and 401 handling.
- `src/lib/api/client.ts`, `endpoints.ts`, `api-errors.ts`: shared HTTP client, endpoint constants, and API error handling.
- `src/features/auth/`: auth forms, Zod schemas, token helper, user types, route guard, role-based redirects.
- `src/features/tickets/`: ticket form, TipTap editor, ticket detail UI, types, validation, API service, and sanitization.
- `src/features/attachments/`: attachment picker/batch upload UI, upload hook/service, attachment types.
- `src/features/comments/`: ticket conversation UI, comment service, and types.
- `src/features/categories/`: category/subcategory API service and types.
- `src/features/admin/`: review dashboard, support-desk queue/detail panels, hooks, API service, types, constants, formatting, pagination.
- `src/features/dashboard/`, `src/features/landing/`: dashboard and public landing UI.
- Global styles and root shell are in `src/app/globals.css` and `src/app/layout.tsx`.

Feature folders should own their business components/services/types. Keep App Router pages thin and use `components/ui` only for cross-feature primitives.

## Authentication & API Contracts

- Auth API service uses `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, and `GET /api/v1/auth/me`.
- Access token is managed by `features/auth/services/token.ts`; the Axios request interceptor attaches it as `Authorization: Bearer <token>`.
- A 401 clears the token and dispatches `supportdesk:unauthorized`; the provider redirects to login.
- Login redirects by database role through `dashboardForRole`; post-login `next` targets are passed through `sanitizeRedirectTarget`.
- Frontend role guards are for routing/UX only. Backend authorization and ticket ownership checks remain authoritative.
- Categories are loaded from the authenticated categories endpoints.
- Ticket service currently creates, lists indirectly through admin service, and fetches ticket details; attachments use multipart `POST /api/v1/uploads`; comments use `/api/v1/tickets/:ticketId/comments`.
- Admin UI currently implements ticket listing/filters, queue summary counts, and accept/reject review actions. The backend's confirmed admin ticket actions are accept/reject; do not imply the remaining full lifecycle is wired.

## Current Implementation Boundaries

The PRD describes a larger target system than the currently verified routes/API. Before adding UI, inspect backend controllers and services. In particular, do not assume category administration, user/department management, SLA configuration screens, notifications, internal admin notes, audit-log views, or every status transition are implemented just because they appear in requirements/docs.

The login form currently uses React Hook Form with empty password defaults. Avoid hardcoding credentials; preserve empty-by-default input and password visibility behavior. Browser password managers can still autofill fields independently of React state.

## Working & Verification

From `frontend/`:
- `npm run lint`
- `npm run build`

Use the lockfile/package manager already present. Don't update dependencies solely for a routine feature. For route/rendering issues, reproduce the route and inspect the terminal's first/root error before suppressing framework validation. `export const instant = false` opts a route out of Instant Navigation validation; do not use it as a blind substitute for root-cause analysis.

## Task Notes

- Ticket search uses the cursor-paginated API with server-side admin filters; global search shows the backend's plain-text description preview.
- Notifications use the shared notification hook and API for unread state, paging, mark-read actions, and ticket navigation.
- The admin overview dashboard uses live ticket API data with loading, empty, retry, and narrow-layout states.
- Global search now shows cursor-paginated admin user results alongside the existing ticket results; user lookup uses the guarded admin API and links to `/admin/users/:id`.
- The `/admin/users/:id` route is protected by the admin layout and loads the safe profile fields plus cursor-paginated ticket history from the guarded admin APIs.
- The root body suppresses hydration warnings for browser-extension attributes injected before React hydrates.
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes â€” APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` â€” verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
