# Whole-word search plan measurement

Measurement only. No application code or search logic was changed.

## Scratch setup

- Source: `ems_support_test` on loopback; exactly 1,000,000 tickets.
- Scratch schema: `ems_support_test_wholeword_spike`; 1,000,000 rows copied. `description_text` was generated from each source description using the shared `buildTicketDescriptionTextFields` helper.
- Indexes: `(created_at,status_id,category_id)` for the date-first plan; standard-parser FULLTEXT `(subject,description_text)` for plan A. No ngram parser.
- Filters: status `4`, category `3` (the most common pair in the source, 11,353 rows before the time cutoff).
- Result ordering and pagination were held constant: `created_at DESC, ticket_id DESC LIMIT 21`.
- Windows are mandatory `created_at` cutoffs of 30 and 90 days. Each plan × window × term class has five warmups and 100 timed queries. Queries include `MAX_EXECUTION_TIME(5000)`; timeout requests count in p95.
- Plan A uses Boolean FULLTEXT whole-term queries (`+term`) and a word-prefix query (`+pass*`), with date/status/category predicates in the same statement. Plan B scans the date/status/category index range first, then applies case-insensitive whole-word or word-prefix regex matching to `subject` and `description_text`.

Full EXPLAIN ANALYZE plans, query counts, timeout counts, per-class p50/p95/max, scratch copy timing, and index-build timing are in [whole-word-window-results.json](whole-word-window-results.json). The harness is [whole-word-window-measurement.mjs](whole-word-window-measurement.mjs).

## Timings and EXPLAIN access-node row counts

Times are milliseconds. “Rows” is the `actual rows` value of the access node in EXPLAIN ANALYZE: the FULLTEXT node for A and the date-range index scan for B. This is the row count reported by the plan node, not a claim that MySQL exposes every internal posting-list operation. The scratch FULLTEXT index returned 239,926 rows for unfiltered `login`.

| Window | Plan | Class | Access-node rows | p95 ms | Max ms | Timeouts |
|---:|---|---|---:|---:|---:|---:|
| 30d | A FULLTEXT | rare term | 100 | 2.976 | 9.396 | 0 |
| 30d | B date first | rare term | 872 | 36.000 | 43.813 | 0 |
| 30d | A FULLTEXT | no match | 0 | 1.316 | 4.166 | 0 |
| 30d | B date first | no match | 872 | 44.997 | 50.586 | 0 |
| 30d | A FULLTEXT | common `login` | 2,470 | 5,126.526 | 5,245.393 | 100 |
| 30d | B date first | common `login` | 102 | 3.888 | 4.764 | 0 |
| 30d | A FULLTEXT | prefix `pass` | 9,102 | 5,037.839 | 5,062.689 | 100 |
| 30d | B date first | prefix `pass` | 300 | 12.889 | 14.259 | 0 |
| 30d | A FULLTEXT | typo `lgin` | 0 | 2.204 | 6.614 | 0 |
| 30d | B date first | typo `lgin` | 872 | 36.316 | 37.444 | 0 |
| 90d | A FULLTEXT | rare term | 100 | 1.864 | 2.429 | 0 |
| 90d | B date first | rare term | 2,738 | 159.918 | 255.560 | 0 |
| 90d | A FULLTEXT | no match | 0 | 1.508 | 3.207 | 0 |
| 90d | B date first | no match | 2,738 | 255.276 | 525.069 | 0 |
| 90d | A FULLTEXT | common `login` | 60,153 | 5,386.479 | 6,050.483 | 100 |
| 90d | B date first | common `login` | 102 | 7.783 | 8.707 | 0 |
| 90d | A FULLTEXT | prefix `pass` | 33,099 | 5,062.044 | 5,223.360 | 56 |
| 90d | B date first | prefix `pass` | 300 | 11.452 | 14.914 | 0 |
| 90d | A FULLTEXT | typo `lgin` | 0 | 2.201 | 3.815 | 0 |
| 90d | B date first | typo `lgin` | 2,738 | 445.106 | 642.487 | 0 |

## Target assessment

**Plan B (date first) meets all stated targets for both windows in this measurement.** Rare/no-match p95 is below 500 ms, common `login` p95 is below one second, and the largest observed query is 642.487 ms. The typo `lgin` returns no matches under both strategies; it does not get typo correction.

**Plan A (FULLTEXT) meets rare/no-match p95, but fails on common and prefix terms.** Common `login` p95 is above five seconds in both windows. Prefix `pass` p95 is also above five seconds in both windows. Observed max time exceeds five seconds for those classes despite the statement hint, so Plan A fails the “nothing over 5 s” target as well. Typo `lgin` returns HTTP-equivalent empty query results at the SQL layer (zero rows); no application response was exercised.

These results compare the SQL plans on the local scratch dataset only. Plan B's date-first scan is promising for the selected filters and data distribution; validate other categories/statuses and the API contract before adopting it. No production DB was accessed.
