# EMS Support System — Backend Architecture & Folder Structure

## 1. Backend Stack

- NestJS
- TypeScript
- Prisma ORM
- MySQL 8.x
- REST API
- JWT Authentication
- Cloudinary for images/files

Excluded:
- WebSocket / Socket.IO
- Redis
- AI Support
- Knowledge Base
- FAQ System

## 2. Architecture

```text
Client / Next.js
      │
      │ REST API
      ▼
   NestJS
      │
      ├── Middleware
      ├── Authentication
      ├── Authorization
      ├── Controller
      ├── DTO Validation
      ├── Service
      └── Repository
             │
             ▼
          Prisma
             │
             ▼
          MySQL
```

File flow:

```text
Client
  ↓
NestJS
  ↓
Attachment Service
  ↓
Cloudinary
  ↓
File URL + Metadata
  ↓
Prisma
  ↓
MySQL
```

## 3. Complete Backend Folder Structure

```text
backend/
│
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── cloudinary.config.ts
│   │   └── env.validation.ts
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── constants/
│   │       └── auth.constant.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   ├── constants/
│   │   └── types/
│   │
│   ├── tickets/
│   │   ├── tickets.module.ts
│   │   ├── tickets.controller.ts
│   │   ├── tickets.service.ts
│   │   ├── tickets.repository.ts
│   │   ├── dto/
│   │   │   ├── create-ticket.dto.ts
│   │   │   ├── update-ticket.dto.ts
│   │   │   ├── update-status.dto.ts
│   │   │   ├── update-priority.dto.ts
│   │   │   ├── reject-ticket.dto.ts
│   │   │   ├── resolve-ticket.dto.ts
│   │   │   └── reopen-ticket.dto.ts
│   │   ├── validators/
│   │   │   ├── status-transition.validator.ts
│   │   │   ├── category.validator.ts
│   │   │   └── priority.validator.ts
│   │   ├── policies/
│   │   │   ├── ticket-access.policy.ts
│   │   │   └── ticket-action.policy.ts
│   │   ├── utils/
│   │   │   ├── ticket-number.util.ts
│   │   │   └── queue.util.ts
│   │   ├── interfaces/
│   │   └── constants/
│   │       ├── ticket.constant.ts
│   │       ├── status.constant.ts
│   │       └── priority.constant.ts
│   │
│   ├── comments/
│   │   ├── comments.module.ts
│   │   ├── comments.controller.ts
│   │   ├── comments.service.ts
│   │   ├── comments.repository.ts
│   │   ├── dto/
│   │   │   └── create-comment.dto.ts
│   │   ├── validators/
│   │   └── constants/
│   │
│   ├── attachments/
│   │   ├── attachments.module.ts
│   │   ├── attachments.controller.ts
│   │   ├── attachments.service.ts
│   │   ├── attachments.repository.ts
│   │   ├── dto/
│   │   │   └── upload-attachment.dto.ts
│   │   ├── validators/
│   │   │   └── file.validator.ts
│   │   ├── cloudinary/
│   │   │   ├── cloudinary.service.ts
│   │   │   └── cloudinary.types.ts
│   │   └── constants/
│   │
│   ├── categories/
│   │   ├── categories.module.ts
│   │   ├── categories.controller.ts
│   │   ├── categories.service.ts
│   │   ├── categories.repository.ts
│   │   ├── dto/
│   │   │   ├── create-category.dto.ts
│   │   │   ├── update-category.dto.ts
│   │   │   ├── create-sub-category.dto.ts
│   │   │   └── update-sub-category.dto.ts
│   │   ├── validators/
│   │   └── constants/
│   │
│   ├── sla/
│   │   ├── sla.module.ts
│   │   ├── sla.controller.ts
│   │   ├── sla.service.ts
│   │   ├── sla.repository.ts
│   │   ├── dto/
│   │   │   ├── create-sla-policy.dto.ts
│   │   │   └── update-sla-policy.dto.ts
│   │   ├── calculators/
│   │   │   ├── sla-deadline.calculator.ts
│   │   │   └── sla-status.calculator.ts
│   │   └── constants/
│   │       └── sla.constant.ts
│   │
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── notifications.repository.ts
│   │   ├── dto/
│   │   │   └── mark-notification-read.dto.ts
│   │   └── constants/
│   │
│   ├── activity/
│   │   ├── activity.module.ts
│   │   ├── activity.controller.ts
│   │   ├── activity.service.ts
│   │   ├── activity.repository.ts
│   │   ├── interfaces/
│   │   └── constants/
│   │       └── activity.constant.ts
│   │
│   ├── status-history/
│   │   ├── status-history.module.ts
│   │   ├── status-history.service.ts
│   │   └── status-history.repository.ts
│   │
│   ├── internal-notes/
│   │   ├── internal-notes.module.ts
│   │   ├── internal-notes.controller.ts
│   │   ├── internal-notes.service.ts
│   │   ├── internal-notes.repository.ts
│   │   ├── dto/
│   │   │   └── create-internal-note.dto.ts
│   │   └── policies/
│   │       └── admin-only.policy.ts
│   │
│   ├── dashboard/
│   │   ├── dashboard.module.ts
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.service.ts
│   │   └── dashboard.repository.ts
│   │
│   ├── admin/
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   ├── dashboard/
│   │   │   ├── dashboard.service.ts
│   │   │   └── dashboard.repository.ts
│   │   ├── reports/
│   │   │   ├── reports.service.ts
│   │   │   └── reports.repository.ts
│   │   └── dto/
│   │
│   ├── audit/
│   │   ├── audit.module.ts
│   │   ├── audit.controller.ts
│   │   ├── audit.service.ts
│   │   ├── audit.repository.ts
│   │   ├── dto/
│   │   │   └── audit-filter.dto.ts
│   │   └── constants/
│   │       └── audit-action.constant.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   ├── pipes/
│   │   ├── middleware/
│   │   ├── exceptions/
│   │   ├── serializers/
│   │   ├── pagination/
│   │   ├── responses/
│   │   ├── constants/
│   │   └── types/
│   │
│   └── health/
│       ├── health.module.ts
│       └── health.controller.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

## 4. Core Domain Responsibilities

### Auth

- Login
- Logout
- JWT generation/validation
- Current user
- Authentication guards
- Role authorization

### Users

- User profile
- Account status
- User lookup
- User information

### Tickets

The central business module.

- Create ticket
- List tickets
- Ticket details
- Update ticket
- Generate ticket number
- Queue position
- Priority
- Status lifecycle
- Accept
- Reject
- Resolve
- Reopen
- Access control

### Comments

- User/Admin conversation
- Rich-text replies
- Comment history

### Attachments

- File upload
- Image upload
- File validation
- Cloudinary integration
- Attachment metadata
- Attachment deletion

### Categories

- Categories
- Subcategories
- Create/update
- Activate/deactivate
- Category/subcategory validation

### SLA

- SLA policy management
- First response deadline
- Resolution deadline
- SLA status calculation

SLA status:

```text
1 = ON_TRACK
2 = WARNING
3 = BREACHED
4 = COMPLETED
```

### Notifications

Database-backed notifications for:

```text
Ticket Created
Ticket Accepted
Ticket Rejected
Admin Replied
Status Changed
Ticket Resolved
Ticket Closed
Ticket Reopened
New Ticket
User Replied
SLA Warning
SLA Breached
```

### Activity

Ticket/business activity timeline.

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

### Status History

Stores ticket status transitions.

### Internal Notes

Admin-only private notes. Never expose them through user APIs.

### Dashboard

Aggregated dashboard statistics, including today's statistics.

Daily window:

```text
00:00:00 → 23:59:59
Asia/Dhaka
```

### Admin

- Ticket management
- Search/filter
- Reports
- Dashboard operations

### Audit

Security, administrative and compliance audit records.

```text
Activity Log
→ Ticket/business activity

Audit Log
→ Security/admin/compliance activity
```

## 5. Request Lifecycle

```text
HTTP Request
     ↓
Middleware
     ↓
JWT Authentication
     ↓
Role Authorization
     ↓
Controller
     ↓
DTO Validation
     ↓
Service
     ↓
Business Rules
     ↓
Repository
     ↓
Prisma
     ↓
MySQL
```

## 6. Ticket Creation Flow

```text
POST /api/v1/tickets
          ↓
TicketController
          ↓
CreateTicketDto
          ↓
TicketService
          ├── Validate category
          ├── Validate subcategory
          ├── Validate priority
          ├── Generate ticket number
          ├── Find SLA policy
          └── Calculate SLA deadlines
          ↓
Prisma Transaction
          ├── Create ticket
          ├── Create status history
          ├── Create activity
          └── Create notification
          ↓
API Response
```

## 7. Ticket Lifecycle

```text
PENDING_REVIEW
      ↓
   ACCEPTED
      ↓
 IN_PROGRESS
      ↓
WAITING_FOR_USER
      ↓
 IN_PROGRESS
      ↓
  RESOLVED
      ↓
   CLOSED
```

Rejection:

```text
PENDING_REVIEW → REJECTED
```

Reopening:

```text
RESOLVED → REOPENED → IN_PROGRESS
```

## 8. Repository Rule

Repositories are responsible for **data access only**.

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma
    ↓
MySQL
```

Business rules should remain inside services.

## 9. Service Rule

Services contain business logic and coordinate related domains.

Example:

```text
TicketService
   ├── SlaService
   ├── NotificationService
   ├── ActivityService
   └── StatusHistoryService
```

## 10. Authorization

### USER

```text
Create tickets
View own tickets
View own ticket details
Comment on own tickets
Upload permitted attachments
Reopen eligible tickets
Confirm resolution
View own notifications
```

### ADMIN

```text
View all tickets
Accept
Reject
Change priority
Change status
Reply
Add internal notes
Resolve
Close
Reopen
Manage categories
Manage SLA policies
View reports
View audit logs
```

## 11. Prisma Structure

```text
prisma/
├── schema.prisma
├── seed.ts
└── migrations/
```

Prisma service:

```text
src/prisma/
├── prisma.module.ts
└── prisma.service.ts
```

System seed data:

### Roles

```text
1 → USER
2 → ADMIN
```

### Ticket Statuses

```text
1 → OPEN
2 → PENDING_REVIEW
3 → ACCEPTED
4 → IN_PROGRESS
5 → WAITING_FOR_USER
6 → RESOLVED
7 → CLOSED
8 → REJECTED
9 → REOPENED
```

Roles and ticket statuses are system-defined lookup data, not freely editable admin configuration.

## 12. API Groups

Base URL:

```text
/api/v1
```

```text
/auth
/users
/tickets
/comments
/attachments
/categories
/sla
/notifications
/activity
/dashboard
/admin
/audit
```

## 13. Architecture Principles

The backend follows a **modular monolith** architecture with clear domain separation.

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma
    ↓
MySQL
```

Principles:

- Keep controllers thin.
- Keep business logic in services.
- Keep database access in repositories.
- Use DTOs for request validation.
- Use guards for authentication/authorization.
- Keep Prisma centralized.
- Keep Cloudinary integration isolated.
- Keep activity logs separate from audit logs.
- Centralize ticket status transition rules.
- Use transactions for multi-step ticket operations.
- Never expose admin internal notes to users.
- Use pagination for ticket and log lists.
- Keep system-defined roles/statuses separate from admin-managed configuration.
