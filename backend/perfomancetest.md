# EMS Support System — Performance seed

This script creates or refreshes synthetic test records compatible with the repository's current Prisma schema:

- 100,000 synthetic users by default (1 test admin + 99,999 regular users)
- 1,000,000 synthetic tickets by default
- valid roles, statuses, SLA policies, categories, subcategories, and foreign-key relations
- randomized priority/status/date fields and realistic varied text; `login` appears in about 20% of descriptions and a rare marker appears once per 10,000 tickets
- skewed ticket ownership (20% of tickets assigned to the heaviest 1% of requesters)
- plain-text `descriptionPreview` values produced by the same helper used by ticket creation
- batches of 1,000 inserts by default

## Safety requirements

The script deliberately refuses to run unless all of these are true:

1. `ALLOW_PERFORMANCE_SEED=YES` is set explicitly.
2. `DATABASE_URL` points to `localhost`, `127.0.0.1`, or `::1`.
3. The database name contains `test` or `perf` (for example `ems_support_test`).
4. Any existing ticket numbers beginning with `PERF-` form a contiguous sequence from `PERF-0000000001`. The script resumes after that sequence so an interrupted or smaller run can be continued safely; it refuses to continue if the existing values look inconsistent.

It never deletes records. Use a separate disposable local test database, not production or your normal development database.

To refresh an already generated complete fixture without adding rows, also set `PERF_REFRESH_EXISTING=YES`. The refresh path verifies the database contains only the expected generated users and contiguous PERF tickets before changing ticket text, preview, and owner distribution in 1,000-row batches.

## Run it

1. Create a separate local database, e.g. `ems_support_test`.
2. From the `backend` directory, point the shell at that test database (URL-encode special characters in username/password):

   ```powershell
   $env:DATABASE_URL = "mysql://<user>:<password>@localhost:3306/ems_support_test"
   ```

3. Run the repository's migrations against that database:

   ```powershell
   npx prisma migrate deploy --config prisma7.config.ts
   ```

   If your local database requires different TLS settings, use the same local development environment settings that already work for this repository's MariaDB adapter. Do not disable TLS for a remote database.

4. The utility is located at `backend/prisma/seed-performance.ts`; no copy is needed.
5. In PowerShell, from `backend`, run a small dry run first:

   ```powershell
   $env:ALLOW_PERFORMANCE_SEED = "YES"
   $env:PERF_USER_COUNT = "50"
   $env:PERF_TICKET_COUNT = "1000"
   $env:PERF_BATCH_SIZE = "1000"
   npm run seed:performance
   ```

   `npx tsx prisma/seed-performance.ts` is equivalent if you prefer not to use the npm script.

6. If the 1,000-ticket test succeeds, increase the target total and rerun:

   ```powershell
   $env:PERF_TICKET_COUNT = "1000000"
   npm run seed:performance
   Remove-Item Env:ALLOW_PERFORMANCE_SEED
   ```

The script resumes from the last contiguous synthetic ticket number, so the second run adds the remaining tickets rather than deleting/recreating the first 1,000. It refuses to continue if existing `PERF-` ticket numbers look inconsistent. Environment variables set in the shell take precedence over values loaded from `.env`.

## Test login

Generated users share a test-only password printed at the end of a successful run. The synthetic admin email is `perf.admin@example.test`. Whether that account can log in through the app depends on the repository's current auth/guard requirements.
