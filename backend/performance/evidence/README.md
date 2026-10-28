# Ticket search performance evidence

All measurements in this directory use the disposable local database only. The source database was `ems_support_test` on loopback, MySQL Community Server 26.7.0, InnoDB. No production connection, query, DDL, or benchmark was made. Repository docs specify MySQL 8.x for production, but the actual production engine and patch version remain unconfirmed; verify them from provider/deployment inventory before rollout.

## Dataset

The refreshed synthetic fixture contains exactly 1,000,000 tickets and 100,000 generated users. All 1,000,000 list previews are nonempty, plain text, at most 200 characters, and contain no HTML tags. `login` appears in 200,000 descriptions; `RareSearchTermQzv731` appears in 100 descriptions; the no-match token is absent. There are 99,486 active ticket owners; tickets per owner are p50 6, p95 25, p99 166, maximum 242. The highest-volume owner used for the normal-user plans is `99332`.

## Safety and preview delivery

- Search and requested count reads use `@@SESSION.max_execution_time=5000` inside an interactive MySQL transaction; the previous session setting is restored before release. Local probe confirmed 0 → 5000 → 0.
- Pool acquisition is configured to 3,000 ms; `connectionLimit` remains 20 and no shared `socketTimeout` was added.
- Five concurrent text searches are allowed per process; another request gets 429. Recognized DB statement-timeout and pool-acquisition failures map to 503.
- Ticket writes use the shared sanitized-HTML text helper for previews. List queries select `descriptionPreview` and omit full HTML; detail reads keep the full description.
- The preview migration is `prisma/migrations/20261027120000_ticket_description_preview`. After restoring old application code, rollback with `rollback.sql` to drop the column.
- The owner/date index migration is `prisma/migrations/20261027140000_ticket_owner_created_at_index`. After restoring old application/schema code, rollback with `rollback.sql` to drop the index. Both rollback statements were applied and verified on the separate scratch schema `ems_support_migration_rollback_test`; `migration-rollback-smoke.json` records the before/after schema.

## Baseline and owner/date index

`search-baseline.jsonl` holds six EXPLAIN ANALYZE plans and 100 warmed timing samples for each role × class (rare, no-match, common). The initial normal-user plan used `tickets_user_id_idx` then sorted 242 owned rows. Admin rare/no-match reverse-scanned `tickets_created_at_idx` and timed out.

| Role / class | Before owner/date index p95 | After owner/date index p95 | Result |
|---|---:|---:|---|
| Normal / rare | 3.684 ms | 3.214 ms | Under 500 ms |
| Normal / no-match | 3.166 ms | 2.997 ms | Under 500 ms |
| Normal / common | 3.145 ms | 1.516 ms | Under 1 s |
| Admin / rare | 5,022.512 ms | Not rerun | 100/100 timed out |
| Admin / no-match | 5,017.502 ms | Not rerun | 100/100 timed out |
| Admin / common | 1.468 ms | Not rerun | Under 1 s |

`owner-date-index-comparison.jsonl` compares the temporary `(user_id,created_at)` and `(user_id,created_at,id)` candidates, each with 100 warmed common-term queries. Both remove the filesort. The two-column index p95 was 2.012 ms, the explicit `id` version 1.509 ms. The two-column index is retained because InnoDB secondary indexes carry the primary key and the small timing delta does not justify a larger duplicate key. Local temporary build durations were 8.025 s and 9.824 s. The migration is `prisma/migrations/20261027140000_ticket_owner_created_at_index`; restore the old application/schema first, then apply its `rollback.sql` to drop the index.

`search-after-owner-date-index.jsonl` contains 100 warmed normal-user samples and after-index plans. It uses `(user_id,created_at)` in reverse order and avoids the sort. No other index was added.

## EXPLAIN-only FULLTEXT spike (stop gate)

`fulltext-spike-results.json` contains the plans, selected candidate IDs, and outer result rows from separate local schema `ems_support_ft_spike`. It has a narrow 1,000,000-row table with `ticket_id`, `user_id`, `created_at`, `status_id`, `subject`, and plain-text `description_text`; test-only indexes include `(user_id,status_id,created_at)` and standard-parser FULLTEXT on `(subject,description_text)`. No application FULLTEXT field, code, or cursor was implemented.

With `login`, a 90-day cutoff, and status 1:

- Normal-user owner-first used `idx_user_status_created`, read 12 owner rows, returned 4 text matches, and completed in about 4.2 ms.
- FULLTEXT-first read 239,926 global FULLTEXT matches before applying the user/date/status filters, returned the same 4, and took about 8.3 seconds. Owner-first is the cheaper plan by a wide margin.
- The broad admin-like filter matched 6,456 rows after date/status filtering. `LIMIT 5000 ORDER BY relevance DESC, ticket_id DESC` returned exactly 5,000, but MySQL first read 239,926 FULLTEXT matches. EXPLAIN ANALYZE took about 7.3 seconds; executing the candidate query took about 9.6 seconds.
- The outer CTE materialized 5,000 candidates and date-sorted those rows, but the inner full-text scan and relevance ranking still processed the broader match set. The cap bounds the outer work, not candidate discovery or ranking.
- The deterministic order is relevance descending, then ticket ID descending. The selected 5,000 IDs and SHA-256 digest are in the JSON evidence. The first selected ID is `995670`; the last is `220275`.

The narrow `ticket_search` table was the fallback design under test; its narrow row shape alone did not make broad common-term search meet the latency target. The baseline acceptance targets are therefore **not met**: admin rare/no-match p95 exceeds five seconds (and maps to a 503 at the application cap), while the broad FULLTEXT spike also exceeded five seconds. Admin common `LIKE` p95 did meet one second in this baseline. These are database statement timings; HTTP overhead is additional.

Before production DDL, confirm the provider's actual engine/version. The implementation uses MySQL `MAX_EXECUTION_TIME`; MariaDB requires `max_statement_time`. Production index build duration and write impact were not measured. Local owner/date index builds took about 8–10 seconds. The one-million-row standard-parser FULLTEXT build took approximately 4–5 minutes locally; plan for additional storage, I/O load, and write impact in production.

## Search behavior and next gate

Current text search remains substring `LIKE` and therefore supports mid-word matches. The gated FULLTEXT behavior would remove mid-word substring matching and typo tolerance. Continue with application FULLTEXT or cursor changes only after review of this spike. If a bounded DB-only design still misses the one-million-ticket p95/5-second targets after filters and candidate strategies are implemented, that measured failure is the requirement that justifies reconsidering an external search engine.

The local spike server reports `innodb_ft_min_token_size=3`, `innodb_ft_enable_stopword=ON`, and no custom `innodb_ft_server_stopword_table`, so it uses MySQL's default InnoDB stopword list. The gated API contract remains: require at least three characters for text search; exact numeric ID and ticket-number lookup continue to work for shorter terms; a short or stopword-only term with no identifier match returns HTTP 200 with empty data. This describes the planned contract only; the application still uses its current substring search until the spike is reviewed.
