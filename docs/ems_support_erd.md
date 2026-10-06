# EMS Support System

> **Database:** MySQL 8.x  
> **ORM:** None  
> **Data Access:** Raw SQL  
> **Backend:** NestJS + TypeScript  
> **Frontend:** Next.js + TypeScript  
> **File Storage:** Cloudinary  
> **API:** REST API  
> **Timezone:** Asia/Dhaka (GMT+6)

---

## 1. Database Architecture

This document defines the relational database design for the EMS Support System.

The system is a REST-based support ticketing platform integrated with an EMS portal. The database is **MySQL only** and the NestJS backend accesses it using **raw SQL through a MySQL driver such as `mysql2`**.

There is **no ORM** in this architecture.

```text
EMS Portal
    │
    ▼
Next.js + TypeScript
    │
    │ REST API
    ▼
NestJS + TypeScript
    │
    │ Repository / Raw SQL
    ▼
mysql2 / MySQL Driver
    │
    ▼
MySQL 8.x
```

File/image flow:

```text
Next.js
   │
   ▼
NestJS
   │
   ├──────────────► Cloudinary
   │                    └── Actual image/file
   │
   └──────────────► MySQL
                        └── File metadata + Cloudinary reference
```


---

# 2. ERD Scope

The database contains these **12 core tables**:

| # | Table | Purpose |
|---|---|---|
| 1 | `users` | Authentication, authorization and user/admin identity |
| 2 | `ticket_categories` | Main ticket categories |
| 3 | `ticket_sub_categories` | Category-specific subcategories |
| 4 | `sla_policies` | Priority-based SLA configuration |
| 5 | `tickets` | Central support ticket entity |
| 6 | `ticket_comments` | User/Admin conversation |
| 7 | `ticket_attachments` | Ticket file/image metadata |
| 8 | `ticket_internal_notes` | Admin-only internal notes |
| 9 | `ticket_status_history` | Complete status transition history |
| 10 | `ticket_activity_logs` | Complete ticket activity history |
| 11 | `notifications` | Database-backed notifications |
| 12 | `audit_logs` | System/security audit trail |

---

# 3. High-Level ERD

```text
                                  ┌──────────────────────┐
                                  │        USERS         │
                                  ├──────────────────────┤
                                  │ PK id                │
                                  │ name                 │
                                  │ UQ email             │
                                  │ password             │
                                  │ role                 │
                                  │ is_active            │
                                  └──────────┬───────────┘
                                             │
                  ┌──────────────────────────┼──────────────────────────┐
                  │                          │                          │
                  ▼                          ▼                          ▼
          ┌──────────────┐          ┌────────────────┐          ┌──────────────┐
          │   TICKETS    │          │ NOTIFICATIONS  │          │ AUDIT_LOGS   │
          └──────┬───────┘          └────────────────┘          └──────────────┘
                 │
       ┌─────────┼─────────────┬──────────────┬───────────────┐
       │         │             │              │               │
       ▼         ▼             ▼              ▼               ▼
 ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌──────────────┐
 │ COMMENTS │ │ ATTACHMENTS│ │ INTERNAL   │ │ STATUS       │ │ ACTIVITY     │
 │          │ │            │ │ NOTES      │ │ HISTORY      │ │ LOGS         │
 └──────────┘ └────────────┘ └────────────┘ └──────────────┘ └──────────────┘

┌────────────────────────┐
│ TICKET_CATEGORIES      │
└───────────┬────────────┘
            │ 1:N
            ▼
┌────────────────────────┐
│ TICKET_SUB_CATEGORIES  │
└───────────┬────────────┘
            │ 1:N
            ▼
       ┌───────────┐
       │  TICKETS  │
       └───────────┘

┌────────────────────────┐
│ SLA_POLICIES           │
└───────────┬────────────┘
            │ 1:N
            ▼
       ┌───────────┐
       │  TICKETS  │
       └───────────┘
```

---

# 4. Complete Relationship Map

```text
USERS
 │
 ├── 1:N ──► TICKETS
 ├── 1:N ──► TICKET_COMMENTS
 ├── 1:N ──► TICKET_ATTACHMENTS
 ├── 1:N ──► TICKET_INTERNAL_NOTES
 ├── 1:N ──► TICKET_STATUS_HISTORY
 ├── 1:N ──► TICKET_ACTIVITY_LOGS
 ├── 1:N ──► NOTIFICATIONS
 └── 1:N ──► AUDIT_LOGS

TICKET_CATEGORIES
 │
 ├── 1:N ──► TICKET_SUB_CATEGORIES
 └── 1:N ──► TICKETS

TICKET_SUB_CATEGORIES
 │
 └── 1:N ──► TICKETS

SLA_POLICIES
 │
 └── 1:N ──► TICKETS

TICKETS
 │
 ├── 1:N ──► TICKET_COMMENTS
 ├── 1:N ──► TICKET_ATTACHMENTS
 ├── 1:N ──► TICKET_INTERNAL_NOTES
 ├── 1:N ──► TICKET_STATUS_HISTORY
 ├── 1:N ──► TICKET_ACTIVITY_LOGS
 └── 1:N ──► NOTIFICATIONS
```

---

# 5. `users`

Stores both system users and administrators.

## Columns

| Column | Type | Key | Nullable | Description |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO | User ID |
| `name` | VARCHAR(150) | | NO | Full name |
| `email` | VARCHAR(255) | UQ | NO | Login/search email |
| `password` | VARCHAR(255) | | NO | Hashed password |
| `role` | ENUM('USER','ADMIN') | IDX | NO | System role |
| `is_active` | BOOLEAN | IDX | NO | Account status |
| `email_verified_at` | DATETIME | | YES | Verification timestamp |
| `last_login_at` | DATETIME | | YES | Last successful login |
| `created_at` | TIMESTAMP | IDX | NO | Creation time |
| `updated_at` | TIMESTAMP | | NO | Last update |

## SQL

```sql

-- =========================
-- USER ROLES
-- =========================

CREATE TABLE user_roles (
    id INT UNSIGNED PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO user_roles (id, name) VALUES
    (1, 'USER'),
    (2, 'ADMIN');


-- =========================
-- USERS
-- =========================

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    role_id INT UNSIGNED NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    email_verified_at DATETIME NULL,
    last_login_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id)
        REFERENCES user_roles(id)
        ON DELETE RESTRICT,

    INDEX idx_users_role (role_id),
    INDEX idx_users_created_at (created_at)
);
```

---

# 6. `ticket_categories`

Main support categories.

Examples:

```text
Technical Issue
Account & Access
Payment
System Issue
Hardware
Software
Network
Other
```

| Column | Type | Key | Nullable | Description |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO | Category ID |
| `name` | VARCHAR(100) | UQ | NO | Category name |
| `description` | TEXT | | YES | Description |
| `is_active` | BOOLEAN | IDX | NO | Active/inactive |
| `sort_order` | INT | IDX | NO | Display ordering |
| `created_at` | TIMESTAMP | | NO | Creation time |
| `updated_at` | TIMESTAMP | | NO | Last update |

## SQL

```sql
CREATE TABLE ticket_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_categories_active_sort (is_active, sort_order)
);
```

Relationship:

```text
ticket_categories 1 ───── N ticket_sub_categories
ticket_categories 1 ───── N tickets
```

---

# 7. `ticket_sub_categories`

Each subcategory belongs to one main category.

| Column | Type | Key | Nullable | Description |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO | Subcategory ID |
| `category_id` | BIGINT UNSIGNED | FK | NO | Parent category |
| `name` | VARCHAR(100) | | NO | Subcategory name |
| `description` | TEXT | | YES | Description |
| `is_active` | BOOLEAN | IDX | NO | Active/inactive |
| `sort_order` | INT | | NO | Display order |
| `created_at` | TIMESTAMP | | NO | Creation time |
| `updated_at` | TIMESTAMP | | NO | Last update |

## SQL

```sql
CREATE TABLE ticket_sub_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    category_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_subcategory_category
        FOREIGN KEY (category_id)
        REFERENCES ticket_categories(id)
        ON DELETE RESTRICT,

    UNIQUE KEY uq_subcategory_category_name (category_id, name),

    INDEX idx_subcategories_category_active_sort
        (category_id, is_active, sort_order)
);
```

### Delete policy

Use `ON DELETE RESTRICT`. Do not physically delete categories that are referenced by historical tickets. Deactivate them instead.

---

# 8. `sla_policies`

Stores priority-based Service Level Agreement configuration.

## Supported priorities

```text
LOW
MEDIUM
HIGH
CRITICAL
```

| Column | Type | Key | Nullable | Description |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO | SLA ID |
| `priority` | ENUM | UQ | NO | Priority |
| `first_response_minutes` | INT UNSIGNED | | NO | Response target |
| `resolution_minutes` | INT UNSIGNED | | NO | Resolution target |
| `is_active` | BOOLEAN | IDX | NO | Policy status |
| `created_at` | TIMESTAMP | | NO | Creation time |
| `updated_at` | TIMESTAMP | | NO | Last update |

## SQL

```sql
CREATE TABLE sla_policies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    priority ENUM(
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
    ) NOT NULL UNIQUE,

    first_response_minutes INT UNSIGNED NOT NULL,
    resolution_minutes INT UNSIGNED NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_sla_active (is_active)
);
```

Example configuration:

```text
CRITICAL → 15 minutes response → 2 hours resolution
HIGH     → 30 minutes response → 4 hours resolution
MEDIUM   → 2 hours response     → 12 hours resolution
LOW      → 8 hours response     → 48 hours resolution
```

---

# 9. `tickets` — Central Entity

`tickets` is the central entity of the entire support system.

Every major ticket-related table references this table.

## Columns

| Column | Type | Key | Nullable | Description |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO | Internal ID |
| `ticket_number` | VARCHAR(30) | UQ | NO | Public ticket number |
| `user_id` | BIGINT UNSIGNED | FK | NO | Ticket owner |
| `category_id` | BIGINT UNSIGNED | FK | NO | Category |
| `sub_category_id` | BIGINT UNSIGNED | FK | YES | Subcategory |
| `sla_policy_id` | BIGINT UNSIGNED | FK | YES | Applied SLA |
| `subject` | VARCHAR(255) | IDX | NO | Ticket subject |
| `description` | LONGTEXT | | NO | Rich-text description |
| `user_priority` | ENUM | IDX | NO | User-selected priority |
| `admin_priority` | ENUM | IDX | YES | Admin-adjusted priority |
| `status` | ENUM | IDX | NO | Current status |
| `rejection_reason` | TEXT | | YES | Rejection reason |
| `resolution_summary` | LONGTEXT | | YES | Resolution details |
| `first_response_at` | DATETIME | | YES | Actual first response |
| `first_response_due_at` | DATETIME | | YES | SLA response deadline |
| `resolution_due_at` | DATETIME | IDX | YES | SLA resolution deadline |
| `sla_status` | ENUM | IDX | NO | Current SLA state |
| `resolved_at` | DATETIME | IDX | YES | Resolution time |
| `closed_at` | DATETIME | IDX | YES | Closure time |
| `created_at` | TIMESTAMP | IDX | NO | Creation time |
| `updated_at` | TIMESTAMP | | NO | Last update |

## Ticket statuses

```text
OPEN
PENDING_REVIEW
ACCEPTED
IN_PROGRESS
WAITING_FOR_USER
RESOLVED
CLOSED
REJECTED
REOPENED
```

## SLA statuses

```text
ON_TRACK
WARNING
BREACHED
COMPLETED
```

## SQL

```sql
-- =========================================================
-- TICKET STATUSES
-- =========================================================

CREATE TABLE ticket_statuses (
    id INT UNSIGNED PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO ticket_statuses (id, name) VALUES
    (1, 'OPEN'),
    (2, 'PENDING_REVIEW'),
    (3, 'ACCEPTED'),
    (4, 'IN_PROGRESS'),
    (5, 'WAITING_FOR_USER'),
    (6, 'RESOLVED'),
    (7, 'CLOSED'),
    (8, 'REJECTED'),
    (9, 'REOPENED');


-- =========================================================
-- TICKETS
-- =========================================================

CREATE TABLE tickets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    ticket_number VARCHAR(30) NOT NULL UNIQUE,

    user_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    sub_category_id BIGINT UNSIGNED NULL,
    sla_policy_id BIGINT UNSIGNED NULL,

    subject VARCHAR(255) NOT NULL,
    description LONGTEXT NOT NULL,

    user_priority ENUM(
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
    ) NOT NULL DEFAULT 'MEDIUM',

    admin_priority ENUM(
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
    ) NULL,

    status_id INT UNSIGNED NOT NULL DEFAULT 2,

    rejection_reason TEXT NULL,
    resolution_summary LONGTEXT NULL,

    first_response_at DATETIME NULL,
    first_response_due_at DATETIME NULL,
    resolution_due_at DATETIME NULL,

    -- 1 = ON_TRACK
    -- 2 = WARNING
    -- 3 = BREACHED
    -- 4 = COMPLETED
    sla_status INT UNSIGNED NOT NULL DEFAULT 1,

    resolved_at DATETIME NULL,
    closed_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,


    -- =====================================================
    -- FOREIGN KEYS
    -- =====================================================

    -- User → Tickets
    CONSTRAINT fk_ticket_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    -- Category → Tickets
    CONSTRAINT fk_ticket_category
        FOREIGN KEY (category_id)
        REFERENCES ticket_categories(id)
        ON DELETE RESTRICT,

    -- Subcategory → Tickets
    CONSTRAINT fk_ticket_subcategory
        FOREIGN KEY (sub_category_id)
        REFERENCES ticket_sub_categories(id)
        ON DELETE SET NULL,

    -- SLA Policy → Tickets
    CONSTRAINT fk_ticket_sla
        FOREIGN KEY (sla_policy_id)
        REFERENCES sla_policies(id)
        ON DELETE SET NULL,

    -- Status → Tickets
    CONSTRAINT fk_ticket_status
        FOREIGN KEY (status_id)
        REFERENCES ticket_statuses(id)
        ON DELETE RESTRICT,


    -- =====================================================
    -- INDEXES
    -- =====================================================

    INDEX idx_tickets_user (user_id),
    INDEX idx_tickets_category (category_id),
    INDEX idx_tickets_subcategory (sub_category_id),
    INDEX idx_tickets_status (status_id),
    INDEX idx_tickets_user_priority (user_priority),
    INDEX idx_tickets_admin_priority (admin_priority),
    INDEX idx_tickets_created_at (created_at),
    INDEX idx_tickets_resolution_due (resolution_due_at),
    INDEX idx_tickets_sla_status (sla_status),

    INDEX idx_tickets_user_status_created
        (user_id, status_id, created_at)
);
```

---

# 10. Ticket Number Design

The internal numeric ID and public ticket number are intentionally different.

```text
id            = 1528
ticket_number = EMS-SUP-100001
```

The public ticket number must be:

- Unique
- Searchable
- Human-readable
- Stable
- Immutable
- Safe to expose to users

Recommended format:

```text
EMS-SUP-100001
EMS-SUP-100002
EMS-SUP-100003
```

`ticket_number` must have a unique constraint.

---

# 11. Queue Position Design

Do **not** permanently store `queue_position` inside `tickets`.

Queue position is dynamic and should be calculated from active tickets.

Queue ordering:

```text
CRITICAL
   ↓
HIGH
   ↓
MEDIUM
   ↓
LOW
```

Within the same priority:

```text
Older ticket
   ↓
Newer ticket
```

Resolved, closed and rejected tickets should not occupy the active queue.

This avoids stale queue numbers and synchronization problems.

---

# 12. `ticket_comments`

Stores user/admin conversation messages.

| Column | Type | Key | Nullable |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO |
| `ticket_id` | BIGINT UNSIGNED | FK | NO |
| `user_id` | BIGINT UNSIGNED | FK | NO |
| `content` | LONGTEXT | | NO |
| `created_at` | TIMESTAMP | | NO |
| `updated_at` | TIMESTAMP | | NO |

## SQL

```sql
CREATE TABLE ticket_comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    ticket_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,

    content LONGTEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_comment_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comment_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    INDEX idx_comments_ticket_created (ticket_id, created_at),
    INDEX idx_comments_user (user_id)
);
```

Rich text content must be sanitized before storage/rendering to prevent XSS.

---

# 13. `ticket_attachments`

Actual files/images are stored in Cloudinary. MySQL stores only metadata and Cloudinary references.

| Column | Type | Key | Nullable |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO |
| `ticket_id` | BIGINT UNSIGNED | FK | NO |
| `uploaded_by` | BIGINT UNSIGNED | FK | NO |
| `file_name` | VARCHAR(255) | | NO |
| `file_url` | TEXT | | NO |
| `cloudinary_public_id` | VARCHAR(255) | | YES |
| `mime_type` | VARCHAR(100) | | NO |
| `file_size` | BIGINT UNSIGNED | | NO |
| `resource_type` | VARCHAR(50) | | YES |
| `created_at` | TIMESTAMP | | NO |

## SQL

```sql
CREATE TABLE ticket_attachments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    ticket_id BIGINT UNSIGNED NOT NULL,
    uploaded_by BIGINT UNSIGNED NOT NULL,

    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    cloudinary_public_id VARCHAR(255) NULL,

    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    resource_type VARCHAR(50) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attachment_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attachment_user
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    INDEX idx_attachments_ticket (ticket_id),
    INDEX idx_attachments_uploaded_by (uploaded_by)
);
```

---

# 14. `ticket_internal_notes`

Admin-only notes. Users must never receive these through user-facing APIs.

| Column | Type | Key | Nullable |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO |
| `ticket_id` | BIGINT UNSIGNED | FK | NO |
| `admin_id` | BIGINT UNSIGNED | FK | NO |
| `content` | LONGTEXT | | NO |
| `created_at` | TIMESTAMP | | NO |
| `updated_at` | TIMESTAMP | | NO |

## SQL

```sql
CREATE TABLE ticket_internal_notes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    ticket_id BIGINT UNSIGNED NOT NULL,
    admin_id BIGINT UNSIGNED NOT NULL,

    content LONGTEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_internal_note_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_internal_note_admin
        FOREIGN KEY (admin_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    INDEX idx_internal_notes_ticket_created (ticket_id,created_at),
    INDEX idx_internal_notes_admin (admin_id)
);
```

Application-level authorization must verify that `admin_id` belongs to an `ADMIN` user.

---

# 15. `ticket_status_history`

Stores every ticket status transition.

| Column | Type | Key | Nullable |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO |
| `ticket_id` | BIGINT UNSIGNED | FK | NO |
| `changed_by` | BIGINT UNSIGNED | FK | NO |
| `old_status_id` | INT UNSIGNED | | YES |
| `new_status_id` | INT UNSIGNED | | NO |
| `reason` | TEXT | | YES |
| `created_at` | TIMESTAMP | | NO |

## SQL

```sql
CREATE TABLE ticket_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    ticket_id BIGINT UNSIGNED NOT NULL,
    changed_by BIGINT UNSIGNED NOT NULL,

    old_status_id INT UNSIGNED NULL,
    new_status_id INT UNSIGNED NOT NULL,

    reason TEXT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_status_history_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_status_history_changed_by
        FOREIGN KEY (changed_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_status_history_old_status
        FOREIGN KEY (old_status_id)
        REFERENCES ticket_statuses(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_status_history_new_status
        FOREIGN KEY (new_status_id)
        REFERENCES ticket_statuses(id)
        ON DELETE RESTRICT,

    INDEX idx_status_history_ticket_created
        (ticket_id, created_at),

    INDEX idx_status_history_changed_by
        (changed_by)
);
```

---

# 16. Ticket Status Lifecycle

```text
USER
  │
  ▼
CREATE TICKET
  │
  ▼
PENDING_REVIEW
  │
  ├──────────────► REJECTED
  │
  ▼
ACCEPTED
  │
  ▼
IN_PROGRESS
  │
  ▼
WAITING_FOR_USER
  │
  ▼
IN_PROGRESS
  │
  ▼
RESOLVED
  │
  ├──────────────► CLOSED
  │
  └──────────────► REOPENED
                         │
                         ▼
                    IN_PROGRESS
```

Status transition rules must be enforced in the service/business layer and every transition must be recorded in `ticket_status_history`.

---

# 17. `ticket_activity_logs`

Stores broad ticket activity. This is intentionally different from status history.

Possible actions:

```text
TICKET_CREATED
TICKET_ACCEPTED
TICKET_REJECTED
STATUS_CHANGED
PRIORITY_CHANGED
ATTACHMENT_ADDED
COMMENT_ADDED
INTERNAL_NOTE_ADDED
TICKET_RESOLVED
TICKET_REOPENED
TICKET_CLOSED
```

| Column | Type | Key | Nullable |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO |
| `ticket_id` | BIGINT UNSIGNED | FK | NO |
| `actor_id` | BIGINT UNSIGNED | FK | NO |
| `action` | VARCHAR(100) | IDX | NO |
| `old_value` | JSON | | YES |
| `new_value` | JSON | | YES |
| `metadata` | JSON | | YES |
| `created_at` | TIMESTAMP | IDX | NO |

## SQL

```sql
CREATE TABLE ticket_activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    ticket_id BIGINT UNSIGNED NOT NULL,
    actor_id BIGINT UNSIGNED NOT NULL,

    action VARCHAR(100) NOT NULL,

    old_value JSON NULL,
    new_value JSON NULL,
    metadata JSON NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_activity_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_activity_actor
        FOREIGN KEY (actor_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    INDEX idx_activity_ticket_created (ticket_id, created_at),
    INDEX idx_activity_actor (actor_id),
    INDEX idx_activity_action (action)
    
);
```

---

# 18. Activity Log vs Status History

Keep these tables separate.

### `ticket_status_history`

Only status transitions:

```text
PENDING_REVIEW → ACCEPTED
ACCEPTED → IN_PROGRESS
IN_PROGRESS → RESOLVED
```

### `ticket_activity_logs`

All ticket business activities:

```text
Ticket created
Attachment added
Priority changed
Admin accepted
Comment added
Internal note added
Ticket resolved
```

---

# 19. `notifications`

Database-backed notification system. No WebSocket or Socket.IO is required.

| Column | Type | Key | Nullable |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO |
| `user_id` | BIGINT UNSIGNED | FK | NO |
| `ticket_id` | BIGINT UNSIGNED | FK | YES |
| `title` | VARCHAR(255) | | NO |
| `message` | TEXT | | NO |
| `type` | VARCHAR(50) | IDX | NO |
| `is_read` | BOOLEAN | IDX | NO |
| `created_at` | TIMESTAMP | IDX | NO |

## SQL

```sql
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,
    ticket_id BIGINT UNSIGNED NULL,

    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    INDEX idx_notifications_ticket (ticket_id),
    INDEX idx_notifications_user_read_created (user_id, is_read, created_at)
    
);
```

### User notification types

```text
TICKET_CREATED
TICKET_ACCEPTED
TICKET_REJECTED
ADMIN_REPLIED
STATUS_CHANGED
TICKET_RESOLVED
TICKET_CLOSED
TICKET_REOPENED
```

### Admin notification types

```text
NEW_TICKET
USER_REPLIED
TICKET_REOPENED
SLA_WARNING
SLA_BREACHED
```

---

# 20. `audit_logs`

System/security/compliance audit trail.

| Column | Type | Key | Nullable |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | PK | NO |
| `actor_id` | BIGINT UNSIGNED | FK | YES |
| `action` | VARCHAR(100) | IDX | NO |
| `entity` | VARCHAR(100) | IDX | NO |
| `entity_id` | BIGINT UNSIGNED | IDX | YES |
| `old_value` | JSON | | YES |
| `new_value` | JSON | | YES |
| `ip_address` | VARCHAR(45) | | YES |
| `user_agent` | TEXT | | YES |
| `created_at` | TIMESTAMP | IDX | NO |

## SQL

```sql
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    actor_id BIGINT UNSIGNED NULL,

    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,

    old_value JSON NULL,
    new_value JSON NULL,

    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_actor
        FOREIGN KEY (actor_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    INDEX idx_audit_actor (actor_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity, entity_id),
    INDEX idx_audit_created_at (created_at)
);
```

---

# 21. Activity Log vs Audit Log

### Ticket Activity Log

```text
ticket_activity_logs
```

Business-level ticket events:

```text
COMMENT_ADDED
STATUS_CHANGED
ATTACHMENT_ADDED
PRIORITY_CHANGED
TICKET_RESOLVED
```

### Audit Log

```text
audit_logs
```

System/security/compliance events:

```text
LOGIN
LOGOUT
USER_CREATED
USER_UPDATED
ROLE_CHANGED
CATEGORY_CREATED
CATEGORY_UPDATED
CATEGORY_DEACTIVATED
SLA_UPDATED
TICKET_UPDATED
```

---

# 22. Foreign Key Relationship Matrix

| Parent | Child | Relationship | Foreign Key |
|---|---|---|---|
| `users` | `tickets` | 1:N | `tickets.user_id` |
| `users` | `ticket_comments` | 1:N | `ticket_comments.user_id` |
| `users` | `ticket_attachments` | 1:N | `ticket_attachments.uploaded_by` |
| `users` | `ticket_internal_notes` | 1:N | `ticket_internal_notes.admin_id` |
| `users` | `ticket_status_history` | 1:N | `ticket_status_history.changed_by` |
| `users` | `ticket_activity_logs` | 1:N | `ticket_activity_logs.actor_id` |
| `users` | `notifications` | 1:N | `notifications.user_id` |
| `users` | `audit_logs` | 1:N | `audit_logs.actor_id` |
| `ticket_categories` | `ticket_sub_categories` | 1:N | `ticket_sub_categories.category_id` |
| `ticket_categories` | `tickets` | 1:N | `tickets.category_id` |
| `ticket_sub_categories` | `tickets` | 1:N | `tickets.sub_category_id` |
| `sla_policies` | `tickets` | 1:N | `tickets.sla_policy_id` |
| `tickets` | `ticket_comments` | 1:N | `ticket_comments.ticket_id` |
| `tickets` | `ticket_attachments` | 1:N | `ticket_attachments.ticket_id` |
| `tickets` | `ticket_internal_notes` | 1:N | `ticket_internal_notes.ticket_id` |
| `tickets` | `ticket_status_history` | 1:N | `ticket_status_history.ticket_id` |
| `tickets` | `ticket_activity_logs` | 1:N | `ticket_activity_logs.ticket_id` |
| `tickets` | `notifications` | 1:N | `notifications.ticket_id` |

---

# 23. Index Strategy

## `users`

```text
UNIQUE(email)
INDEX(role)
INDEX(is_active)
INDEX(created_at)
```

## `ticket_categories`

```text
UNIQUE(name)
INDEX(is_active)
INDEX(sort_order)
```

## `ticket_sub_categories`

```text
UNIQUE(category_id, name)
INDEX(category_id)
INDEX(is_active)
```

## `sla_policies`

```text
UNIQUE(priority)
INDEX(is_active)
```

## `tickets`

```text
UNIQUE(ticket_number)
INDEX(user_id)
INDEX(category_id)
INDEX(sub_category_id)
INDEX(status)
INDEX(user_priority)
INDEX(admin_priority)
INDEX(created_at)
INDEX(resolution_due_at)
INDEX(sla_status)
INDEX(user_id, status, created_at)
```

## `ticket_comments`

```text
INDEX(ticket_id)
INDEX(user_id)
INDEX(ticket_id, created_at)
```

## `ticket_attachments`

```text
INDEX(ticket_id)
INDEX(uploaded_by)
```

## `ticket_internal_notes`

```text
INDEX(ticket_id)
INDEX(admin_id)
INDEX(ticket_id, created_at)
```

## `ticket_status_history`

```text
INDEX(ticket_id)
INDEX(changed_by)
INDEX(ticket_id, created_at)
```

## `ticket_activity_logs`

```text
INDEX(ticket_id)
INDEX(actor_id)
INDEX(action)
INDEX(ticket_id, created_at)
```

## `notifications`

```text
INDEX(user_id)
INDEX(ticket_id)
INDEX(is_read)
INDEX(user_id, is_read, created_at)
```

## `audit_logs`

```text
INDEX(actor_id)
INDEX(action)
INDEX(entity, entity_id)
INDEX(created_at)
```

---

# 24. Delete Strategy

Delete behavior is intentionally different for different entities.

| Relationship | Delete behavior | Reason |
|---|---|---|
| User → Ticket | `RESTRICT` | Preserve ticket ownership/history |
| Category → Ticket | `RESTRICT` | Preserve historical category |
| Subcategory → Ticket | `SET NULL` | Ticket survives subcategory removal |
| Ticket → Comments | `CASCADE` | Child belongs to ticket |
| Ticket → Attachments | `CASCADE` | Child belongs to ticket |
| Ticket → Internal Notes | `CASCADE` | Child belongs to ticket |
| Ticket → Status History | `CASCADE` | Child belongs to ticket |
| Ticket → Activity Logs | `CASCADE` | Child belongs to ticket |
| Ticket → Notifications | `CASCADE` | Ticket-specific notification |
| User → Audit Logs | `SET NULL` | Preserve audit history |

---

# 25. Soft Delete / Deactivation Strategy

Important business data should not normally be physically deleted.

Use deactivation for:

```text
users
    → is_active

ticket_categories
    → is_active

ticket_sub_categories
    → is_active

sla_policies
    → is_active
```

Tickets should remain as historical records. Filter by status rather than deleting resolved/closed tickets.

---

# 26. Rich Text Data

The support form uses a rich text editor.

Supported content may include:

```text
Headings
Paragraphs
Bold
Italic
Underline
Strike
Bullet lists
Numbered lists
Links
Text color
Highlight
Code blocks
Images
Formatted text
```

Database fields:

```text
tickets.description
ticket_comments.content
ticket_internal_notes.content
```

Use `LONGTEXT` for rich-text content.

The backend must sanitize rich-text HTML/content before rendering or persisting it to prevent XSS.

---

# 27. Attachment Storage

Actual files are not stored in MySQL.

### MySQL stores

```text
file_name
file_url
cloudinary_public_id
mime_type
file_size
resource_type
uploaded_by
ticket_id
```

### Cloudinary stores

```text
Actual image/file
```

### Flow

```text
User
  │
  ▼
Upload
  │
  ▼
NestJS
  │
  ├── Validate file type
  ├── Validate MIME type
  ├── Validate file size
  └── Upload to Cloudinary
          │
          ▼
      Cloudinary
          │
          ▼
    URL + public ID
          │
          ▼
     MySQL metadata
```

---

# 28. Ticket Creation Transaction

Ticket creation should be transaction-safe.

Recommended transaction:

```text
BEGIN TRANSACTION

1. Validate user
2. Validate category
3. Validate subcategory
4. Resolve applicable SLA policy
5. Generate unique ticket number
6. INSERT ticket
7. INSERT initial status history
8. INSERT TICKET_CREATED activity
9. INSERT notification
10. COMMIT
```

If a critical operation fails:

```text
ROLLBACK
```

This prevents partial ticket creation.

---

# 29. Ticket Status Update Transaction

```text
BEGIN TRANSACTION

1. SELECT ticket FOR UPDATE
2. Validate current status
3. Validate requested new status
4. UPDATE tickets.status
5. INSERT ticket_status_history
6. INSERT ticket_activity_logs
7. INSERT notification
8. INSERT audit_logs
9. COMMIT
```

On failure:

```text
ROLLBACK
```

Using `SELECT ... FOR UPDATE` prevents concurrent updates from corrupting ticket state.

---

# 30. Priority Change

The database keeps both the original user priority and the admin-adjusted priority.

```text
tickets.user_priority
tickets.admin_priority
```

Example:

```text
User Priority  = HIGH
Admin Priority = CRITICAL
```

When Admin changes priority:

```text
1. UPDATE tickets.admin_priority
2. Record ticket activity
3. Record audit log
4. Recalculate applicable SLA if required
5. Create notification if required
```

Example activity:

```json
{
  "action": "PRIORITY_CHANGED",
  "old_value": {
    "priority": "HIGH"
  },
  "new_value": {
    "priority": "CRITICAL"
  }
}
```

---

# 31. SLA Design

Each ticket may reference the SLA policy that applied to it:

```text
tickets.sla_policy_id
```

Ticket-specific SLA timestamps:

```text
first_response_due_at
resolution_due_at
```

Actual timestamps:

```text
first_response_at
resolved_at
closed_at
```

Current SLA state:

```text
ON_TRACK
WARNING
BREACHED
COMPLETED
```

Keeping the policy reference on the ticket preserves historical SLA context if the global SLA configuration changes later.

---

# 32. Daily Dashboard Statistics

The dashboard's **Today** means a calendar day:

```text
12:00:00 AM
      ↓
11:59:59 PM
```

It does **not** mean a rolling 24-hour period.

Timezone:

```text
Asia/Dhaka (GMT+6)
```

Possible metrics:

```text
Today's Added Tickets
Today's Solved Tickets
Today's Pending Tickets
Today's Rejected Tickets
Today's Reopened Tickets
```

For production reporting, date boundaries should be calculated consistently in the business timezone before querying MySQL.

---

# 33. Search Requirements

Primary searchable identifiers:

```text
ticket_number
user email
```

Example:

```text
EMS-SUP-100001
user@example.com
```

`ticket_number` has a unique index and `users.email` has a unique index.

Large ticket datasets should use indexed filtering/pagination rather than loading every ticket.

---

# 34. Access Control

## USER

Can access:

```text
Own tickets
Own comments
Own ticket attachments
Own notifications
User-visible ticket activity/history
```

Cannot access:

```text
Other users' tickets
Internal notes
Admin-only audit information
Other users' private information
```

## ADMIN

Can access:

```text
All tickets
All ticket conversations
Internal notes
Ticket activity
Ticket status history
Category management
SLA management
Audit logs
Reports
```

---

# 35. Security Requirements

The application/database layer must implement:

```text
Authentication
Role-based authorization
DTO validation
Input validation
Rich-text sanitization
XSS protection
SQL injection protection
File validation
MIME validation
File size limitation
Secure Cloudinary upload
Rate limiting
Secure HTTP headers
Audit logging
User-level ticket access control
```

Because this project uses Raw SQL, SQL injection protection is especially important.

### Correct

```sql
SELECT *
FROM tickets
WHERE ticket_number = ?;
```

### Incorrect

```text
"SELECT * FROM tickets WHERE id = " + userInput
```

Always use prepared statements / parameter binding through the MySQL driver.

---

# 36. Raw SQL Repository Architecture

Recommended NestJS architecture:

```text
src/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── tickets/
│   ├── categories/
│   ├── comments/
│   ├── attachments/
│   ├── notifications/
│   ├── sla/
│   ├── activity/
│   └── audit/
│
├── database/
│   ├── database.module.ts
│   ├── database.service.ts
│   ├── migrations/
│   └── seeds/
│
└── common/
```

Feature flow:

```text
Controller
   ↓
Service
   ↓
Repository
   ↓
Raw SQL
   ↓
MySQL
```

No ORM model/schema layer exists.

---

# 37. Database Connection Layer

Use a reusable MySQL connection pool.

```text
NestJS
   │
   ▼
DatabaseService
   │
   ▼
MySQL Connection Pool
   │
   ▼
Repositories
```

The repository layer executes parameterized SQL queries.

---

# 38. Migration Strategy

Because there is no ORM migration system, database migrations should be maintained as version-controlled SQL files.

```text
database/
└── migrations/
    ├── 001_create_users.sql
    ├── 002_create_ticket_categories.sql
    ├── 003_create_ticket_sub_categories.sql
    ├── 004_create_sla_policies.sql
    ├── 005_create_tickets.sql
    ├── 006_create_ticket_comments.sql
    ├── 007_create_ticket_attachments.sql
    ├── 008_create_ticket_internal_notes.sql
    ├── 009_create_ticket_status_history.sql
    ├── 010_create_ticket_activity_logs.sql
    ├── 011_create_notifications.sql
    └── 012_create_audit_logs.sql
```

Rules:

- Never edit an already-applied production migration.
- Add a new migration for schema changes.
- Keep migrations in Git.
- Test migrations against a clean database and an upgraded database.

---

# 39. Seed Data

Initial seed data may include:

### Roles

```text
USER
ADMIN
```

### Priorities

```text
LOW
MEDIUM
HIGH
CRITICAL
```

### Initial SLA policies

```text
LOW
MEDIUM
HIGH
CRITICAL
```

### Initial categories

```text
Technical Issue
Account & Access
Payment
System Issue
Hardware
Software
Network
Other
```

---

# 40. SQL Creation Order

Because of foreign keys, create parent tables before child tables.

```text
1.  users
2.  ticket_categories
3.  ticket_sub_categories
4.  sla_policies
5.  tickets
6.  ticket_comments
7.  ticket_attachments
8.  ticket_internal_notes
9.  ticket_status_history
10. ticket_activity_logs
11. notifications
12. audit_logs
```

---

# 41. Complete Dependency Tree

```text
users
│
├── tickets
│   │
│   ├── ticket_comments
│   ├── ticket_attachments
│   ├── ticket_internal_notes
│   ├── ticket_status_history
│   ├── ticket_activity_logs
│   └── notifications
│
├── ticket_comments
├── ticket_attachments
├── ticket_internal_notes
├── ticket_status_history
├── ticket_activity_logs
├── notifications
└── audit_logs


ticket_categories
│
├── ticket_sub_categories
└── tickets


ticket_sub_categories
└── tickets


sla_policies
└── tickets
```

---

# 42. Complete Enterprise ERD

```text
                                      ┌───────────────────────┐
                                      │        USERS          │
                                      ├───────────────────────┤
                                      │ PK id                 │
                                      │ name                  │
                                      │ UQ email              │
                                      │ password              │
                                      │ role                  │
                                      │ is_active             │
                                      │ email_verified_at     │
                                      │ last_login_at         │
                                      │ created_at            │
                                      │ updated_at            │
                                      └───────────┬───────────┘
                                                  │
             ┌────────────────────────────────────┼─────────────────────────────────┐
             │                                    │                                 │
             ▼                                    ▼                                 ▼
     ┌────────────────┐                   ┌─────────────────┐                ┌────────────────┐
     │    TICKETS     │                   │  NOTIFICATIONS  │                │   AUDIT_LOGS   │
     ├────────────────┤                   └─────────────────┘                └────────────────┘
     │ PK id          │
     │ UQ ticket_no   │
     │ FK user_id     │
     │ FK category_id │
     │ FK subcat_id   │
     │ FK sla_id      │
     │ subject        │
     │ description    │
     │ user_priority  │
     │ admin_priority │
     │ status         │
     │ SLA fields     │
     │ resolved_at    │
     │ closed_at      │
     │ created_at     │
     │ updated_at     │
     └───────┬────────┘
             │
      ┌──────┼──────────────┬─────────────────┬──────────────────┐
      │      │              │                 │                  │
      ▼      ▼              ▼                 ▼                  ▼
 ┌────────┐ ┌───────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────────┐
 │COMMENTS│ │ATTACHMENTS│ │INTERNAL NOTES │ │STATUS HISTORY │ │ACTIVITY LOGS    │
 └────────┘ └───────────┘ └───────────────┘ └───────────────┘ └─────────────────┘

 ┌──────────────────────┐
 │ TICKET_CATEGORIES    │
 ├──────────────────────┤
 │ PK id                │
 │ UQ name              │
 │ description          │
 │ is_active            │
 │ sort_order           │
 │ created_at           │
 │ updated_at           │
 └──────────┬───────────┘
            │ 1:N
            ▼
 ┌──────────────────────────┐
 │ TICKET_SUB_CATEGORIES    │
 ├──────────────────────────┤
 │ PK id                    │
 │ FK category_id           │
 │ name                     │
 │ description              │
 │ is_active                │
 │ sort_order               │
 │ created_at               │
 │ updated_at               │
 └──────────┬───────────────┘
            │ 1:N
            ▼
         TICKETS

 ┌──────────────────────┐
 │    SLA_POLICIES      │
 ├──────────────────────┤
 │ PK id                │
 │ UQ priority          │
 │ first_response_min   │
 │ resolution_min       │
 │ is_active            │
 │ created_at           │
 │ updated_at            │
 └──────────┬───────────┘
            │ 1:N
            ▼
         TICKETS
```

---

# 43. Enterprise Design Principles

### 1. Normalization

Business entities are separated into dedicated relational tables.

### 2. Referential Integrity

Foreign keys protect relationships between business entities.

### 3. Historical Integrity

Historical ticket information must not be destroyed unnecessarily.

### 4. Auditability

Important business and system operations are traceable.

### 5. Scalability

Indexes, pagination and optimized queries support large ticket volumes.

### 6. Transaction Safety

Critical multi-table operations run inside MySQL transactions.

### 7. Security

Parameterized Raw SQL and strict role/ownership authorization are mandatory.

### 8. Separation of Concerns

The database intentionally distinguishes:

```text
Ticket
Conversation
Internal Note
Status History
Activity Log
Audit Log
Notification
```

### 9. External File Storage

Cloudinary handles actual file storage while MySQL stores metadata.

### 10. Dynamic Queue

Queue position is calculated rather than persisted as a stale number.

---

# 44. Final Table Summary

```text
┌──────────────────────────────┬─────────────────────────────────────────┐
│ TABLE                        │ RESPONSIBILITY                          │
├──────────────────────────────┼─────────────────────────────────────────┤
│ users                        │ Users + Admins                          │
│ ticket_categories            │ Main categories                         │
│ ticket_sub_categories        │ Category subdivisions                   │
│ sla_policies                 │ SLA configuration                       │
│ tickets                      │ Core support ticket                     │
│ ticket_comments              │ User/Admin conversation                 │
│ ticket_attachments           │ Cloudinary file metadata                │
│ ticket_internal_notes        │ Admin-only notes                        │
│ ticket_status_history        │ Status transitions                      │
│ ticket_activity_logs         │ Ticket business activities              │
│ notifications                │ Database notifications                  │
│ audit_logs                   │ System/security audit trail             │
└──────────────────────────────┴─────────────────────────────────────────┘
```

---

# 45. Final Technology Constraint

```text
Database:
MySQL 8.x

ORM:
NONE

Query Method:
RAW SQL

Node.js Driver:
mysql2

Backend:
NestJS

Frontend:
Next.js

Storage:
Cloudinary

API:
REST

Real-time:
NONE

WebSocket:
NONE

Socket.IO:
NONE

Redis:
NONE

AI:
NONE

Knowledge Base:
NONE

FAQ:
NONE
```

This ERD is the production-oriented relational database design for the EMS Support System using **MySQL only and Raw SQL, with no ORM dependency**.
