# Admin Search Resume Measurement

Scratch-only run on `ems_support_test_wholeword_spike` (1,000,000 rows). The run reused `idx_created_ticket` and `ft_subject_description`; no schema/index rebuild or application code change was made. Ordering is `created_at DESC, ticket_id DESC`, page size 10 (`limit + 1` = 11). Each case had 3 warmups followed by 20 timed requests. Statement ceiling was 5 seconds; the FULLTEXT fallback used a 500 ms MySQL execution hint.

The terms are those already measured in `admin-hybrid-no-window-results.json`: no-match and `lgin` have 0 matches; `RareSearchTermQzv731` has 100; `login account email` has 1,244; `issue problem account` has 6,237; `login account issue` has 18,800; and `login` has 239,926.

| Case | Strategy | p50 (ms) | p95 (ms) | Max (ms) | Scanned rows p50 | Returned candidates p50 | FULLTEXT timeouts | Budget exhausted / `hasMore` |
|---|---|---:|---:|---:|---:|---:|---:|
| No-match (0) | Date scan, 5,000 | 52.44 | 80.17 | 82.46 | 5,000 | 0 | 20/20 |
| `lgin` typo (0) | Date scan, 5,000 | 67.66 | 75.08 | 76.15 | 5,000 | 0 | 20/20 |
| 6,237 matches | Date scan, 5,000 | 26.56 | 33.20 | 33.75 | 2,000 | 11 | 0/20 `hasMore` |
| 18,800 matches | Date scan, 5,000 | 6.79 | 9.18 | 12.77 | 500 | 11 | 0/20 `hasMore` |
| No-match (0) | Date scan 2,000, then FULLTEXT | 18.34 | 22.70 | 23.79 | 2,000 | 0 | 0 timeouts; 0/20 `hasMore` |
| Rare (100) | Date scan 2,000, then FULLTEXT | 28.80 | 34.96 | 42.31 | 2,000 | 11 | 0 timeouts; 20/20 `hasMore` |
| 1,244 matches | Date scan 2,000, then FULLTEXT | 1,126.60 | 1,775.04 | 1,868.38 | 2,000 | 3 | 20/20; 20/20 `hasMore` |
| 6,237 matches | Date scan 2,000, then FULLTEXT | 25.22 | 29.98 | 30.00 | 2,000 | 11 | 0 timeouts; 0/20 budget exhaustion |
| `login` (239,926) | Date scan 2,000, then FULLTEXT | 6.98 | 7.88 | 8.07 | 500 | 11 | 0 timeouts; 0/20 budget exhaustion |

When the date scan exhausts its row budget before finding 11 matches, the response contains matches found so far, sets `hasMore: true`, and carries the last scanned `(created_at, ticket_id)` cursor. This happened on all 20 no-match and typo date-only queries: both returned zero rows, but neither can claim that the entire table has no later match. The reverse strategy resolves no-match with FULLTEXT and returns empty data with `hasMore: false`. Its 1,244-match case timed out on every FULLTEXT attempt; it returned the three scan matches it had found with `hasMore: true` rather than a false “not found.”

All measured logical requests completed below 5 seconds. The reverse strategy met the latency target for no-match, rare, 6,237-match, and `login`; the 1,244-match case failed the 1-second mid-frequency target. Its FULLTEXT query hint was 500 ms, but the client-observed p95 for the timed-out query-plus-fallback request was 1.775 seconds.

Raw timings and per-request samples: `admin-hybrid-resume-results.json`; incremental records: `admin-hybrid-resume-results.jsonl`. The larger prior matrix, including saved EXPLAIN ANALYZE plans, is in `admin-hybrid-no-window-results.json` and `admin-hybrid-no-window-progress.jsonl`.
