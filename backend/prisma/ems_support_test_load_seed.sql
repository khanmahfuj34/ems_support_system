-- EMS Support System local load-test seed
-- Target: ems_support_test ONLY
-- Creates 100,000 synthetic users + 1,000,000 related operational rows.
-- All identities/emails/files are synthetic; no real customer data is used.
-- IMPORTANT:
--   1) Apply backend/prisma/migrations/20261007065120_init/migration.sql to ems_support_test first.
--   2) Run this script only against your LOCAL MySQL instance and the ems_support_test schema.
--   3) This script refuses to run if operational tables already contain rows.
--   4) The shared test password hash below is for load-test rows only; do not use in production.

USE ems_support_test;

DROP PROCEDURE IF EXISTS seed_ems_support_loadtest;
DELIMITER $$
CREATE PROCEDURE seed_ems_support_loadtest()
BEGIN
    DECLARE v_db_name VARCHAR(128);
    SET v_db_name = DATABASE();

    IF v_db_name IS NULL OR v_db_name <> 'ems_support_test' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Safety stop: current database must be ems_support_test.';
    END IF;

    -- Never seed over existing test/business data.
    IF (SELECT COUNT(*) FROM users) > 0
       OR (SELECT COUNT(*) FROM tickets) > 0
       OR (SELECT COUNT(*) FROM ticket_comments) > 0
       OR (SELECT COUNT(*) FROM ticket_attachments) > 0
       OR (SELECT COUNT(*) FROM ticket_internal_notes) > 0
       OR (SELECT COUNT(*) FROM ticket_status_history) > 0
       OR (SELECT COUNT(*) FROM ticket_activity_logs) > 0
       OR (SELECT COUNT(*) FROM notifications) > 0
       OR (SELECT COUNT(*) FROM audit_logs) > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Safety stop: operational tables are not empty. Use a clean ems_support_test schema; no rows were inserted by this run.';
    END IF;

    -- Static lookup rows; safe when seed.ts has already created the same IDs.
    INSERT INTO user_roles (id, name) VALUES (1, 'USER'), (2, 'ADMIN')
    ON DUPLICATE KEY UPDATE name = VALUES(name);

    INSERT INTO ticket_statuses (id, name) VALUES
      (1, 'OPEN'), (2, 'PENDING_REVIEW'), (3, 'ACCEPTED'),
      (4, 'IN_PROGRESS'), (5, 'WAITING_FOR_USER'), (6, 'RESOLVED'),
      (7, 'CLOSED'), (8, 'REJECTED'), (9, 'REOPENED')
    ON DUPLICATE KEY UPDATE name = VALUES(name);

    -- Ensure the fixed role/status IDs match the project seed definitions.
    IF (SELECT COUNT(*) FROM user_roles WHERE (id = 1 AND name = 'USER') OR (id = 2 AND name = 'ADMIN')) <> 2 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Safety stop: user_roles IDs/names conflict with project seed definitions.';
    END IF;
    IF (SELECT COUNT(*) FROM ticket_statuses WHERE
        (id = 1 AND name = 'OPEN') OR (id = 2 AND name = 'PENDING_REVIEW') OR
        (id = 3 AND name = 'ACCEPTED') OR (id = 4 AND name = 'IN_PROGRESS') OR
        (id = 5 AND name = 'WAITING_FOR_USER') OR (id = 6 AND name = 'RESOLVED') OR
        (id = 7 AND name = 'CLOSED') OR (id = 8 AND name = 'REJECTED') OR
        (id = 9 AND name = 'REOPENED')) <> 9 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Safety stop: ticket_statuses IDs/names conflict with project seed definitions.';
    END IF;

    INSERT INTO sla_policies
      (id, priority, first_response_minutes, resolution_minutes, is_active, created_at, updated_at)
    VALUES
      (1, 'LOW', 480, 2880, TRUE, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (2, 'MEDIUM', 120, 720, TRUE, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (3, 'HIGH', 30, 240, TRUE, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (4, 'CRITICAL', 15, 120, TRUE, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE
      first_response_minutes = VALUES(first_response_minutes),
      resolution_minutes = VALUES(resolution_minutes),
      is_active = VALUES(is_active),
      updated_at = VALUES(updated_at);

    -- Ten categories and four subcategories per category.
    INSERT INTO ticket_categories
      (id, name, description, is_active, sort_order, created_at, updated_at)
    VALUES
      (1, 'Account Access', 'Login, account recovery and permission issues.', TRUE, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (2, 'Hardware', 'Laptop, desktop, monitor and peripheral issues.', TRUE, 2, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (3, 'Software', 'Application installation and software errors.', TRUE, 3, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (4, 'Network', 'Connectivity, VPN and network access issues.', TRUE, 4, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (5, 'Email and Calendar', 'Email delivery, mailbox and calendar issues.', TRUE, 5, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (6, 'Security', 'Security alerts and access review requests.', TRUE, 6, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (7, 'Data and Reports', 'Data access, exports and reporting issues.', TRUE, 7, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (8, 'Printing', 'Printer setup, queues and print quality.', TRUE, 8, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (9, 'HR Systems', 'Employee portal and HR application issues.', TRUE, 9, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (10, 'Other', 'General requests and uncategorized support issues.', TRUE, 10, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE
      name = VALUES(name), description = VALUES(description), is_active = VALUES(is_active),
      sort_order = VALUES(sort_order), updated_at = VALUES(updated_at);

    INSERT INTO ticket_sub_categories
      (id, category_id, name, description, is_active, sort_order, created_at, updated_at)
    VALUES
      (1,1,'Login problem','Unable to sign in.',TRUE,1,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (2,1,'Password reset','Password reset or recovery.',TRUE,2,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (3,1,'MFA issue','Multi-factor authentication problem.',TRUE,3,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (4,1,'Account permission','Account roles and access.',TRUE,4,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (5,2,'Laptop','Laptop performance or failure.',TRUE,1,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (6,2,'Desktop','Desktop workstation issue.',TRUE,2,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (7,2,'Monitor','Display or monitor issue.',TRUE,3,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (8,2,'Peripheral','Keyboard, mouse or dock issue.',TRUE,4,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (9,3,'Installation','Install or update an application.',TRUE,1,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (10,3,'Application crash','Application crash or freeze.',TRUE,2,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (11,3,'License','Software license issue.',TRUE,3,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (12,3,'Compatibility','Compatibility problem.',TRUE,4,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (13,4,'Wi-Fi','Wireless connection problem.',TRUE,1,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (14,4,'VPN','Remote access or VPN issue.',TRUE,2,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (15,4,'LAN','Wired network problem.',TRUE,3,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (16,4,'DNS','Name resolution problem.',TRUE,4,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (17,5,'Email delivery','Mail send or receive problem.',TRUE,1,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (18,5,'Mailbox quota','Mailbox space issue.',TRUE,2,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (19,5,'Calendar','Calendar and meeting issue.',TRUE,3,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (20,5,'Shared mailbox','Shared mailbox access.',TRUE,4,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (21,6,'Security alert','Potential security alert.',TRUE,1,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (22,6,'MFA and identity','Identity verification issue.',TRUE,2,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (23,6,'Access review','Access review request.',TRUE,3,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (24,6,'Suspicious activity','Report suspicious activity.',TRUE,4,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (25,7,'Data correction','Request data correction.',TRUE,1,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (26,7,'Export','Export or download issue.',TRUE,2,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (27,7,'Report access','Report permissions.',TRUE,3,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (28,7,'Dashboard','Dashboard data or display issue.',TRUE,4,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (29,8,'Printer setup','Install or configure printer.',TRUE,1,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (30,8,'Print queue','Stuck or failed print queue.',TRUE,2,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (31,8,'Print quality','Quality or paper issue.',TRUE,3,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (32,8,'Scanner','Scanner setup or failure.',TRUE,4,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (33,9,'Employee portal','Employee portal access.',TRUE,1,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (34,9,'Leave request','Leave workflow issue.',TRUE,2,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (35,9,'Payroll view','Payroll display/access issue.',TRUE,3,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (36,9,'Profile update','Employee profile update.',TRUE,4,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (37,10,'General question','General assistance.',TRUE,1,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (38,10,'Service request','General service request.',TRUE,2,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (39,10,'Suggestion','Product or service suggestion.',TRUE,3,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
      (40,10,'Other request','Other support request.',TRUE,4,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE
      category_id = VALUES(category_id), name = VALUES(name), description = VALUES(description),
      is_active = VALUES(is_active), sort_order = VALUES(sort_order), updated_at = VALUES(updated_at);

    -- Generate integer keys 1..1,000,000 in a temporary table for set-based inserts.
    DROP TEMPORARY TABLE IF EXISTS tmp_loadtest_digits;
    CREATE TEMPORARY TABLE tmp_loadtest_digits (d TINYINT UNSIGNED NOT NULL PRIMARY KEY);
    INSERT INTO tmp_loadtest_digits (d) VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9);

    DROP TEMPORARY TABLE IF EXISTS tmp_loadtest_numbers;
    CREATE TEMPORARY TABLE tmp_loadtest_numbers (n INT UNSIGNED NOT NULL PRIMARY KEY) ENGINE=InnoDB;
    INSERT INTO tmp_loadtest_numbers (n)
    SELECT 1 + d0.d + d1.d * 10 + d2.d * 100 + d3.d * 1000 + d4.d * 10000 + d5.d * 100000
    FROM tmp_loadtest_digits d0
    CROSS JOIN tmp_loadtest_digits d1
    CROSS JOIN tmp_loadtest_digits d2
    CROSS JOIN tmp_loadtest_digits d3
    CROSS JOIN tmp_loadtest_digits d4
    CROSS JOIN tmp_loadtest_digits d5;

    -- 100,000 synthetic users. Shared bcrypt hash corresponds to the test password "password".
    INSERT INTO users
      (id, name, email, password, role_id, is_active, email_verified_at, last_login_at, created_at, updated_at)
    SELECT
      n,
      CONCAT('Load Test User ', LPAD(n, 6, '0')),
      CONCAT('loadtest+', LPAD(n, 6, '0'), '@example.test'),
      '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      CASE WHEN n <= 50 THEN 2 ELSE 1 END,
      CASE WHEN MOD(n, 50) = 0 THEN FALSE ELSE TRUE END,
      CASE WHEN MOD(n, 10) = 0 THEN NULL ELSE DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 13, 8760) HOUR) END,
      CASE WHEN MOD(n, 3) = 0 THEN DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 7, 720) HOUR) ELSE NULL END,
      DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 13, 8760) HOUR),
      DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 13, 8760) HOUR)
    FROM tmp_loadtest_numbers WHERE n <= 100000;

    -- 250,000 tickets.
    INSERT INTO tickets
      (id, ticket_number, user_id, category_id, sub_category_id, sla_policy_id,
       subject, description, user_priority, admin_priority, status_id,
       rejection_reason, resolution_summary, first_response_at, first_response_due_at,
       resolution_due_at, sla_status, resolved_at, closed_at, created_at, updated_at)
    SELECT
      n,
      CONCAT('LT-', DATE_FORMAT(CURRENT_DATE(), '%y%m'), '-', LPAD(n, 10, '0')),
      MOD(n - 1, 100000) + 1,
      MOD(n - 1, 10) + 1,
      (MOD(n - 1, 10) * 4) + MOD(n - 1, 4) + 1,
      MOD(n, 4) + 1,
      CONCAT('Synthetic support request ', LPAD(n, 7, '0')),
      CONCAT('Load-test ticket #', n, '. Synthetic content only; no real customer information.'),
      CASE MOD(n, 4) WHEN 0 THEN 'LOW' WHEN 1 THEN 'MEDIUM' WHEN 2 THEN 'HIGH' ELSE 'CRITICAL' END,
      CASE WHEN MOD(n, 5) = 0 THEN NULL ELSE CASE MOD(n, 4) WHEN 0 THEN 'LOW' WHEN 1 THEN 'MEDIUM' WHEN 2 THEN 'HIGH' ELSE 'CRITICAL' END END,
      MOD(n - 1, 9) + 1,
      CASE WHEN MOD(n - 1, 9) + 1 = 8 THEN 'Synthetic rejection reason for load testing.' ELSE NULL END,
      CASE WHEN MOD(n - 1, 9) + 1 IN (6, 7) THEN 'Synthetic resolution summary for load testing.' ELSE NULL END,
      CASE WHEN MOD(n, 3) = 0 THEN DATE_ADD(created_at, INTERVAL 15 MINUTE) ELSE NULL END,
      DATE_ADD(created_at, INTERVAL 120 MINUTE),
      DATE_ADD(created_at, INTERVAL 720 MINUTE),
      MOD(n - 1, 4) + 1,
      CASE WHEN MOD(n - 1, 9) + 1 IN (6, 7) THEN LEAST(CURRENT_TIMESTAMP(3), DATE_ADD(created_at, INTERVAL 4 HOUR)) ELSE NULL END,
      CASE WHEN MOD(n - 1, 9) + 1 = 7 THEN LEAST(CURRENT_TIMESTAMP(3), DATE_ADD(created_at, INTERVAL 1 DAY)) ELSE NULL END,
      created_at,
      LEAST(CURRENT_TIMESTAMP(3), DATE_ADD(created_at, INTERVAL 1 HOUR))
    FROM (
      SELECT n, DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 17, 8760) HOUR) AS created_at
      FROM tmp_loadtest_numbers WHERE n <= 250000
    ) AS ticket_seed;

    -- 300,000 ticket comments.
    INSERT INTO ticket_comments (id, ticket_id, user_id, content, created_at, updated_at)
    SELECT n, MOD(n - 1, 250000) + 1, MOD(n * 7 - 1, 100000) + 1,
           CONCAT('Synthetic comment ', n, ' for performance and search testing.'),
           DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 11, 8760) HOUR),
           DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 11, 8760) HOUR)
    FROM tmp_loadtest_numbers WHERE n <= 300000;

    -- 20,000 attachment metadata rows. URLs use reserved example.test domain; no real files are uploaded.
    INSERT INTO ticket_attachments
      (id, ticket_id, uploaded_by, file_name, file_url, cloudinary_public_id, mime_type, file_size, resource_type, created_at)
    SELECT n, MOD(n - 1, 250000) + 1, MOD(n * 3 - 1, 100000) + 1,
           CONCAT('loadtest-file-', LPAD(n, 6, '0'), CASE WHEN MOD(n, 3) = 0 THEN '.pdf' WHEN MOD(n, 3) = 1 THEN '.png' ELSE '.txt' END),
           CONCAT('https://example.test/loadtest/attachments/', LPAD(n, 6, '0')),
           NULL,
           CASE WHEN MOD(n, 3) = 0 THEN 'application/pdf' WHEN MOD(n, 3) = 1 THEN 'image/png' ELSE 'text/plain' END,
           1024 + MOD(n * 97, 5242880),
           CASE WHEN MOD(n, 3) = 1 THEN 'image' ELSE 'raw' END,
           DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 19, 8760) HOUR)
    FROM tmp_loadtest_numbers WHERE n <= 20000;

    -- 15,000 internal admin notes; user IDs 1..50 have the ADMIN role.
    INSERT INTO ticket_internal_notes (id, ticket_id, admin_id, content, created_at, updated_at)
    SELECT n, MOD(n - 1, 250000) + 1, MOD(n - 1, 50) + 1,
           CONCAT('Synthetic internal note ', n, '. Internal-only load-test content.'),
           DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 23, 8760) HOUR),
           DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 23, 8760) HOUR)
    FROM tmp_loadtest_numbers WHERE n <= 15000;

    -- 200,000 ticket status history rows.
    INSERT INTO ticket_status_history (id, ticket_id, changed_by, old_status_id, new_status_id, reason, created_at)
    SELECT n, MOD(n - 1, 250000) + 1, MOD(n * 13 - 1, 100000) + 1,
           CASE WHEN MOD(n, 9) = 0 THEN NULL ELSE MOD(n + 6, 9) + 1 END,
           MOD(n - 1, 9) + 1,
           CONCAT('Synthetic status change event ', n, '.'),
           DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 29, 8760) HOUR)
    FROM tmp_loadtest_numbers WHERE n <= 200000;

    -- 120,000 JSON activity log rows.
    INSERT INTO ticket_activity_logs
      (id, ticket_id, actor_id, action, old_value, new_value, metadata, created_at)
    SELECT n, MOD(n - 1, 250000) + 1, MOD(n * 17 - 1, 100000) + 1,
           CASE MOD(n, 4) WHEN 0 THEN 'STATUS_CHANGED' WHEN 1 THEN 'COMMENT_ADDED' WHEN 2 THEN 'PRIORITY_CHANGED' ELSE 'TICKET_VIEWED' END,
           JSON_OBJECT('synthetic', TRUE, 'previousSequence', n - 1),
           JSON_OBJECT('synthetic', TRUE, 'sequence', n),
           JSON_OBJECT('source', 'load-test-seed', 'batch', FLOOR((n - 1) / 1000) + 1),
           DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 31, 8760) HOUR)
    FROM tmp_loadtest_numbers WHERE n <= 120000;

    -- 50,000 notifications.
    INSERT INTO notifications (id, user_id, ticket_id, title, message, type, is_read, created_at)
    SELECT n, MOD(n * 19 - 1, 100000) + 1,
           CASE WHEN MOD(n, 5) = 0 THEN NULL ELSE MOD(n - 1, 250000) + 1 END,
           CASE MOD(n, 3) WHEN 0 THEN 'Ticket status updated' WHEN 1 THEN 'New comment on ticket' ELSE 'Support ticket notification' END,
           CONCAT('Synthetic notification ', n, ' generated for load testing.'),
           CASE MOD(n, 3) WHEN 0 THEN 'STATUS' WHEN 1 THEN 'COMMENT' ELSE 'GENERAL' END,
           CASE WHEN MOD(n, 4) = 0 THEN TRUE ELSE FALSE END,
           DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 37, 8760) HOUR)
    FROM tmp_loadtest_numbers WHERE n <= 50000;

    -- 45,000 audit log rows.
    INSERT INTO audit_logs
      (id, actor_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent, created_at)
    SELECT n, MOD(n * 23 - 1, 100000) + 1,
           CASE MOD(n, 4) WHEN 0 THEN 'ticket.created' WHEN 1 THEN 'ticket.updated' WHEN 2 THEN 'user.updated' ELSE 'comment.created' END,
           CASE WHEN MOD(n, 2) = 0 THEN 'ticket' ELSE 'user' END,
           CASE WHEN MOD(n, 2) = 0 THEN MOD(n - 1, 250000) + 1 ELSE MOD(n - 1, 100000) + 1 END,
           JSON_OBJECT('synthetic', TRUE, 'beforeSequence', n - 1),
           JSON_OBJECT('synthetic', TRUE, 'afterSequence', n),
           CONCAT('192.0.2.', MOD(n - 1, 254) + 1),
           'EMS-Support-LoadTest/1.0',
           DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL MOD(n * 41, 8760) HOUR)
    FROM tmp_loadtest_numbers WHERE n <= 45000;

    DROP TEMPORARY TABLE IF EXISTS tmp_loadtest_numbers;
    DROP TEMPORARY TABLE IF EXISTS tmp_loadtest_digits;
END$$
DELIMITER ;

CALL seed_ems_support_loadtest();
DROP PROCEDURE IF EXISTS seed_ems_support_loadtest;

-- Verification: counts should match the planned dataset exactly.
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'tickets', COUNT(*) FROM tickets
UNION ALL SELECT 'ticket_comments', COUNT(*) FROM ticket_comments
UNION ALL SELECT 'ticket_attachments', COUNT(*) FROM ticket_attachments
UNION ALL SELECT 'ticket_internal_notes', COUNT(*) FROM ticket_internal_notes
UNION ALL SELECT 'ticket_status_history', COUNT(*) FROM ticket_status_history
UNION ALL SELECT 'ticket_activity_logs', COUNT(*) FROM ticket_activity_logs
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;

SELECT
  (SELECT COUNT(*) FROM users) AS users_created,
  ((SELECT COUNT(*) FROM tickets) +
   (SELECT COUNT(*) FROM ticket_comments) +
   (SELECT COUNT(*) FROM ticket_attachments) +
   (SELECT COUNT(*) FROM ticket_internal_notes) +
   (SELECT COUNT(*) FROM ticket_status_history) +
   (SELECT COUNT(*) FROM ticket_activity_logs) +
   (SELECT COUNT(*) FROM notifications) +
   (SELECT COUNT(*) FROM audit_logs)) AS related_records_created,
  ((SELECT COUNT(*) FROM users) +
   (SELECT COUNT(*) FROM tickets) +
   (SELECT COUNT(*) FROM ticket_comments) +
   (SELECT COUNT(*) FROM ticket_attachments) +
   (SELECT COUNT(*) FROM ticket_internal_notes) +
   (SELECT COUNT(*) FROM ticket_status_history) +
   (SELECT COUNT(*) FROM ticket_activity_logs) +
   (SELECT COUNT(*) FROM notifications) +
   (SELECT COUNT(*) FROM audit_logs)) AS total_generated_rows_including_users;
