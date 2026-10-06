# EMS Support System
## Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Production Planning / Development Ready  
**Product:** EMS Support Ticketing System  
**Parent System:** EMS Portal  
**Frontend:** Next.js + TypeScript  
**Backend:** NestJS + TypeScript  
**Database:** MySQL  
**ORM:** Prisma  
**UI:** Tailwind CSS + shadcn/ui  
**Form Validation:** React Hook Form + Zod  
**Rich Text Editor:** TipTap  
**File Storage:** Cloudinary  
**Communication:** REST API  
**Authentication:** EMS Authentication / JWT  
**Roles:** USER, ADMIN  
**Timezone:** Asia/Dhaka (GMT+6)

---

# 1. Executive Summary

The **EMS Support System** is an integrated support ticketing platform inside the EMS Portal.

The purpose of the system is to provide a structured way for EMS users to report problems, request support, communicate with administrators, track ticket progress, and confirm issue resolution.

Administrators will have a centralized support workspace where they can:

- Receive and review tickets
- Accept or reject tickets
- Change official priority
- Manage ticket status
- Communicate with users
- Add internal notes
- Manage attachments
- Monitor SLA deadlines
- Resolve, close, and reopen tickets
- Manage categories and subcategories
- View statistics and reports
- Review audit logs

The system is intentionally designed as a **REST-based modular support ticketing system**. Real-time WebSocket communication, Socket.IO, Redis, AI, Knowledge Base, and FAQ functionality are outside the scope.

---

# 2. Product Vision

The product should make EMS support:

- Structured
- Traceable
- Secure
- Searchable
- Auditable
- Scalable
- Easy to use
- Transparent to users

A user should never need to rely on informal communication to know what happened to a support request.

Every important ticket action should have a clear record.

The complete support lifecycle should be represented as:

```text
User
  ↓
Create Ticket
  ↓
Ticket Number Generated
  ↓
Pending Review
  ↓
Admin Review
  ├───────────────┐
  ↓               ↓
Accept           Reject
  ↓               ↓
Accepted        Rejected
  ↓
In Progress
  ↓
Waiting for User
  ↓
In Progress
  ↓
Resolved
  ↓
User Confirmation
  ├───────────────┐
  ↓               ↓
Closed          Reopened
                  ↓
             In Progress
```

The source requirements define the same overall lifecycle, including rejection and reopening flows.

---

# 3. Goals

## 3.1 Primary Goals

The system must:

1. Allow users to create support tickets.
2. Allow users to track ticket progress.
3. Provide a unique human-readable ticket number.
4. Provide queue/serial visibility.
5. Allow users and admins to communicate inside a ticket.
6. Support rich text descriptions and comments.
7. Support image/file attachments through Cloudinary.
8. Provide clear ticket statuses.
9. Allow administrators to accept/reject tickets.
10. Allow administrators to change official priority.
11. Provide SLA tracking.
12. Maintain status history.
13. Maintain ticket activity history.
14. Maintain security/audit logs.
15. Provide notifications.
16. Provide user and admin dashboards.
17. Provide search and filtering.
18. Preserve historical ticket integrity.
19. Support large ticket volumes using pagination and indexing.
20. Maintain strict user/admin authorization.

---

# 4. Non-Goals

The following are explicitly outside the current product scope:

- WebSocket
- Socket.IO
- Redis
- AI support
- AI chatbot
- Knowledge Base
- FAQ system
- Automated AI ticket classification
- AI-generated responses
- Real-time socket notifications

The original requirements explicitly exclude these technologies/features.

Notifications will therefore be database-backed, with optional email notification support rather than socket-based real-time delivery.

---

# 5. Technology Architecture

## 5.1 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| Frontend Language | TypeScript |
| UI | Tailwind CSS |
| Component Library | shadcn/ui |
| Forms | React Hook Form |
| Validation | Zod |
| Rich Text | TipTap |
| Backend | NestJS |
| Backend Language | TypeScript |
| API | REST |
| ORM | Prisma |
| Database | MySQL |
| Authentication | EMS Authentication / JWT |
| File Storage | Cloudinary |
| Timezone | Asia/Dhaka |
| Real-time | Not used |

The source architecture explicitly defines Next.js → REST API → NestJS → MySQL/Prisma and Cloudinary as the storage path.

---

# 6. High-Level Architecture

```text
                         EMS PORTAL
                             │
                             ▼
                  ┌─────────────────────┐
                  │       Next.js       │
                  │     TypeScript      │
                  │ Tailwind + shadcn   │
                  └──────────┬──────────┘
                             │
                         REST API
                             │
                             ▼
                  ┌─────────────────────┐
                  │       NestJS        │
                  │     TypeScript      │
                  │ Controller/Service  │
                  └──────────┬──────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
             ┌────────────┐    ┌────────────┐
             │   Prisma   │    │ Cloudinary │
             │    ORM     │    │   Storage  │
             └─────┬──────┘    └────────────┘
                   │
                   ▼
             ┌────────────┐
             │    MySQL   │
             └────────────┘
```

---

# 7. User Roles

The system contains exactly two application roles:

```text
USER
ADMIN
```

The requirements explicitly define only these two roles.

## 7.1 USER

A USER can:

- View support dashboard
- Create tickets
- Select category
- Select subcategory
- Select priority
- Write rich text description
- Upload files/images
- View own tickets
- Search own tickets
- Track ticket status
- View queue position
- View admin replies
- Reply to tickets
- View activity history
- Confirm resolution
- Reopen unresolved tickets
- View notifications

A USER must never access another user's ticket.

## 7.2 ADMIN

An ADMIN can:

- View all tickets
- Search tickets
- Filter tickets
- Accept tickets
- Reject tickets
- Change priority
- Change status
- Reply to users
- Add internal notes
- Resolve tickets
- Close tickets
- Reopen tickets
- Manage categories
- Manage subcategories
- Manage SLA configuration
- View statistics
- View reports
- View audit logs



---

# 8. Authorization Model

Authorization must be enforced at the backend.

## USER

```text
Can access:
    Own profile
    Own tickets
    Own comments
    Own notifications
    Own ticket activity
```

Cannot access:

```text
Other user's tickets
Internal admin notes
Admin audit logs
Admin dashboard
Admin configuration
```

## ADMIN

```text
Can access:
    All tickets
    All ticket conversations
    Internal notes
    Categories
    Subcategories
    SLA configuration
    Statistics
    Reports
    Audit logs
```

Frontend hiding alone is not sufficient.

Every protected endpoint must validate authorization inside NestJS.

---

# 9. Authentication

Authentication will use the EMS authentication/JWT mechanism.

The system should support:

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

The authentication layer should expose the authenticated user's:

- User ID
- Name
- Email
- Role

The backend should use the authenticated identity to determine ownership and authorization.

The client must never be trusted to provide an arbitrary `userId` for ownership-sensitive operations.

---

# 10. Support Dashboard — USER

The user dashboard should display:

- Total Tickets
- Open Tickets
- In Progress
- Resolved
- Closed
- Rejected
- Tickets Added Today
- Tickets Solved Today

The source requirements specify that "today" means the current calendar day, not a rolling 24-hour period. The system day is 12:00 AM–11:59:59 PM in `Asia/Dhaka (GMT+6)`.

## Today's Statistics

Example:

```text
October 5

Tickets Added Today: 18
Tickets Solved Today: 12
```

Implementation must not interpret this as:

```text
last 24 hours
```

Instead:

```text
Asia/Dhaka
00:00:00 → 23:59:59
```

---

# 11. Admin Dashboard

Admin dashboard must provide:

```text
Total Tickets
Open
Pending Review
Accepted
In Progress
Waiting for User
Resolved
Closed
Rejected
```

Today's statistics:

```text
Tickets Created Today
Tickets Resolved Today
Tickets Closed Today
Tickets Rejected Today
```

The original requirements explicitly define these dashboard metrics.

---

# 12. Ticket Creation

A USER creates a ticket from:

```text
Support Center
    ↓
Create New Ticket
```

## Required Fields

```text
Subject *
Category *
Subcategory
Priority *
Description *
Attachment
```

The source requirement defines Subject, Category, Priority, and Description as required, with Subcategory and Attachment optional.

## Ticket Creation Flow

```text
User opens Create Ticket
        ↓
Select Category
        ↓
Load Subcategories
        ↓
Select Priority
        ↓
Enter Subject
        ↓
Write Description
        ↓
Upload optional attachments
        ↓
Validate
        ↓
Submit
        ↓
Backend validation
        ↓
Generate Ticket Number
        ↓
Create Ticket
        ↓
Create initial status history
        ↓
Create activity log
        ↓
Create notification
        ↓
Return ticket details
```

Ticket creation should be performed transactionally where applicable so that core ticket creation and required history/activity records remain consistent.

---

# 13. Ticket Number

Every ticket must have a unique human-readable ticket number.

Recommended format:

```text
EMS-SUP-100001
EMS-SUP-100002
EMS-SUP-100003
```

Ticket number must be:

- Unique
- Searchable
- Immutable
- Human-readable

The original report explicitly defines these requirements.

Database requirement:

```text
ticket_number UNIQUE
```

The internal numeric primary key and public ticket number are separate concepts.

---

# 14. Ticket Priority

The system supports:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

A ticket contains two priority concepts:

```text
user_priority
admin_priority
```

The user's selection represents the requested priority.

The administrator may override it with the official priority.

The effective priority should be interpreted as:

```text
IF admin_priority IS NOT NULL
    effective_priority = admin_priority
ELSE
    effective_priority = user_priority
```

This effective priority should be used for queue ordering and administrative prioritization.

---

# 15. Rich Text Description

The ticket description uses TipTap.

Supported formatting:

```text
Bold
Italic
Underline
Strike
H1
H2
H3
Bullet List
Numbered List
Text Color
Highlight
Link
Image
Attachment
Code Block
Emoji
```

The requirements explicitly specify these editing capabilities.

## Security

Rich text cannot be trusted simply because it originated from the frontend.

Backend processing must protect against:

- XSS
- Malicious HTML
- Unsafe scripts
- Unsafe URLs
- Unsupported HTML structures

Only the approved TipTap schema/features should be persisted/rendered.

---

# 16. Attachment System

Users can attach files/images to tickets.

Attachment metadata:

```text
File Name
File URL
Cloudinary Public ID
MIME Type
File Size
Uploaded By
Uploaded At
Resource Type
```

The actual file is stored in Cloudinary.

MySQL stores metadata and references.

## Storage Flow

```text
User
  ↓
Next.js
  ↓
NestJS
  ↓
Cloudinary
  ↓
Cloudinary URL
  ↓
MySQL metadata
```

The source explicitly states that actual image/file content should not be stored in MySQL.

## Attachment Validation

Backend must validate:

- File type
- MIME type
- File size
- File name
- Upload authorization

---

# 17. Ticket Queue / Serial System

Queue position is **calculated dynamically**.

It must not be stored as a permanent database column because queue position can change whenever another ticket:

- Enters the queue
- Changes priority
- Gets resolved
- Gets rejected
- Gets closed
- Is reopened

The requirements specify that queue calculation depends on:

- Ticket status
- Priority
- Creation time

Resolved, closed, and rejected tickets are excluded from the active queue.

## Recommended Ordering

Priority:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

Within the same effective priority:

```text
Older ticket first
```

Therefore:

```text
effective priority DESC
created_at ASC
```

Conceptually:

```text
Ticket A → CRITICAL → 10:00
Ticket B → CRITICAL → 10:05
Ticket C → HIGH     → 09:00
Ticket D → MEDIUM   → 08:00
```

Queue:

```text
A
B
C
D
```

---

# 18. Active Queue

Recommended active statuses:

```text
PENDING_REVIEW
ACCEPTED
IN_PROGRESS
WAITING_FOR_USER
REOPENED
```

Statuses that should not count as active:

```text
RESOLVED
CLOSED
REJECTED
```

The exact active-status set should be implemented as a centralized application constant so that queue logic is consistent across the system.

---

# 19. Ticket Status Model

System-defined statuses:

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

The status lifecycle defined by the requirements includes normal progression, rejection, and reopening.

## Status Meaning

### OPEN

Ticket has been submitted/opened.

### PENDING_REVIEW

Waiting for admin review.

### ACCEPTED

Admin has accepted the request.

### IN_PROGRESS

Admin is actively working on the issue.

### WAITING_FOR_USER

Additional information/action is required from the user.

### RESOLVED

Admin considers the problem solved.

### CLOSED

Ticket lifecycle has been completed.

### REJECTED

Admin rejected the request.

### REOPENED

User reported that the issue still exists after resolution.

---

# 20. Status Transition Rules

Recommended valid transitions:

```text
PENDING_REVIEW
    ├── ACCEPTED
    └── REJECTED

ACCEPTED
    └── IN_PROGRESS

IN_PROGRESS
    ├── WAITING_FOR_USER
    └── RESOLVED

WAITING_FOR_USER
    └── IN_PROGRESS

RESOLVED
    ├── CLOSED
    └── REOPENED

REOPENED
    └── IN_PROGRESS
```

Invalid arbitrary transitions should be rejected by the backend.

For example:

```text
CLOSED → ACCEPTED
REJECTED → IN_PROGRESS
PENDING_REVIEW → CLOSED
```

should not be allowed unless a future business rule explicitly permits it.

---

# 21. Initial Status

The current database design uses:

```text
status_id DEFAULT 2
```

where:

```text
2 = PENDING_REVIEW
```

Therefore a newly created ticket should enter:

```text
PENDING_REVIEW
```

If `OPEN` remains in the system status lookup, its exact application usage should be explicitly defined. It should not exist as an ambiguous unused status.

---

# 22. Ticket Details

A user should see:

```text
Ticket ID
Subject
Category
Subcategory
Priority
Status
Description
Attachments
Created Date
Updated Date
Queue Position
```

The source requirements define these ticket-detail fields.

Additional useful display information:

```text
Effective Priority
SLA Status
First Response Deadline
Resolution Deadline
Resolution Summary
Conversation
Activity Timeline
```

---

# 23. Ticket Timeline

Every ticket should provide a visual progress timeline.

Example:

```text
✓ Ticket Submitted
       ↓
✓ Request Accepted
       ↓
✓ In Progress
       ↓
● Current Status
       ↓
○ Resolved
       ↓
○ Closed
```

Each event should expose:

```text
Action
Actor
Date
Time
```

The source requirements explicitly require actor and timestamp information for timeline events.

---

# 24. Accept Ticket

Admin receives a ticket in `PENDING_REVIEW`.

Action:

```text
Accept Ticket
```

Transition:

```text
PENDING_REVIEW
        ↓
     ACCEPTED
```

The user receives a notification/message that the request has been accepted.

The action should create:

1. Status history record
2. Activity log
3. User notification
4. Appropriate SLA/response tracking update

---

# 25. Reject Ticket

Admin can reject a ticket.

A rejection reason is mandatory.

Example:

```text
This request is outside the scope of EMS support.
```

Transition:

```text
PENDING_REVIEW
        ↓
     REJECTED
```

The user must be able to see the rejection reason.

The rejection should create:

- Status history
- Activity log
- Notification
- `rejection_reason`

---

# 26. Ticket Conversation

Each ticket contains a User ↔ Admin conversation.

Example:

```text
User:
I cannot login to EMS.

Admin:
Please provide a screenshot.

User:
[error.png]

Admin:
We are checking the issue.
```

Conversation supports:

- Rich text
- Images
- File attachments

Communication is REST API based. No WebSocket or Socket.IO is required.

---

# 27. Comments

Every comment belongs to:

```text
ticket
user
```

The author can be either:

```text
USER
ADMIN
```

The system must authorize comment creation based on ticket access.

Users can comment only on their own tickets.

Admins can comment on any ticket.

---

# 28. Internal Admin Notes

Admins can create private notes inside tickets.

Example:

```text
Checked application logs.
Issue is related to authentication.
```

Internal notes are visible only to admins.

Users must never receive internal note data through any endpoint.

This must be enforced at the backend query/serialization level, not merely hidden in the frontend.

---

# 29. Activity Log

Ticket activity records important business events.

Examples:

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

The original report defines these activity types.

Activity timeline example:

```text
10:20 AM
User created the ticket.

10:21 AM
User uploaded error.png.

10:25 AM
Admin accepted the ticket.

10:30 AM
Priority changed: Medium → High.

10:35 AM
Ticket moved to In Progress.

11:20 AM
Admin replied.
```

---

# 30. Status History

`ticket_status_history` is different from the general activity log.

It specifically records status transitions:

```text
old_status
new_status
changed_by
reason
created_at
```

Example:

```text
PENDING_REVIEW → ACCEPTED
```

Then:

```text
ACCEPTED → IN_PROGRESS
```

Then:

```text
IN_PROGRESS → RESOLVED
```

For ticket creation, an initial history record may use:

```text
old_status_id = NULL
new_status_id = PENDING_REVIEW
reason = "Ticket created"
```

---

# 31. Activity Log vs Status History vs Audit Log

These three must remain conceptually separate.

## Ticket Activity Log

Business activity related to a ticket.

Examples:

```text
Comment added
Attachment added
Priority changed
Ticket resolved
```

## Ticket Status History

Only status transitions.

Example:

```text
IN_PROGRESS → RESOLVED
```

## Audit Log

Security/compliance/admin activity.

Examples:

```text
Admin changed category
Admin changed SLA policy
Admin changed user status
Admin performed privileged action
```

This separation prevents duplicate or confusing event data.

---

# 32. Resolution

Admin marks the ticket as resolved.

Action:

```text
Mark as Resolved
```

A resolution summary is mandatory.

Example:

```text
Authentication service issue was fixed.
User should now be able to login normally.
```

The requirements explicitly require a resolution summary.

Transition:

```text
IN_PROGRESS
      ↓
  RESOLVED
```

At resolution:

```text
resolved_at = current timestamp
sla_status = COMPLETED
```

if the product's SLA completion policy defines resolution as SLA completion.

---

# 33. User Resolution Confirmation

After resolution, the user sees:

```text
Your issue has been marked as resolved.
```

Actions:

```text
Confirm Resolution
Issue Still Exists
```

## Confirm

```text
RESOLVED
    ↓
 CLOSED
```

## Issue Still Exists

```text
RESOLVED
    ↓
REOPENED
    ↓
IN_PROGRESS
```

The source requirements define both branches.

---

# 34. Search

## USER Search

A user can search own tickets by:

```text
Ticket ID
Subject
```

## ADMIN Search

Admin can search by:

```text
Ticket ID
Email
User Name
Subject
```

The original requirements define these search dimensions.

If unauthenticated external lookup is ever enabled, ticket ID + email verification must be required.

---

# 35. Filtering

Admin filters:

```text
Status
Priority
Category
Subcategory
Date Range
User
```

Sorting:

```text
Newest
Oldest
Highest Priority
Recently Updated
SLA Deadline
```

Pagination is mandatory.

---

# 36. Pagination

No large collection should be returned without pagination.

Applicable resources:

```text
Tickets
Comments
Attachments
Activity Logs
Status History
Notifications
Audit Logs
```

Recommended API structure:

```text
?page=1
&limit=20
```

Response:

```json
{
  "success": true,
  "message": "Tickets retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

# 37. Notifications

Notifications are database-backed.

## USER Notifications

```text
Ticket created
Ticket accepted
Ticket rejected
Admin replied
Status changed
Ticket resolved
Ticket closed
Ticket reopened
```

## ADMIN Notifications

```text
New ticket
User replied
Ticket reopened
SLA warning
SLA breached
```

The source requirements define these notification events.

Notification fields:

```text
user_id
ticket_id
title
message
type
is_read
created_at
```

---

# 38. Notification Delivery

Primary mechanism:

```text
Database
```

Optional:

```text
Email
```

Not supported:

```text
WebSocket
Socket.IO
```

The frontend should retrieve notifications through REST APIs.

---

# 39. SLA Management

SLA is priority-based.

Example configuration:

| Priority | First Response | Resolution |
|---|---:|---:|
| Critical | 15 min | 2 hours |
| High | 30 min | 4 hours |
| Medium | 2 hours | 12 hours |
| Low | 8 hours | 48 hours |

These are example policy values from the requirements and should be treated as configurable rather than hard-coded business values.

---

# 40. SLA Policy

Each priority has an SLA policy.

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Each policy contains:

```text
first_response_minutes
resolution_minutes
is_active
```

The selected SLA policy should be attached to the ticket through:

```text
sla_policy_id
```

This allows a ticket to retain the policy context that was applied when it was created.

---

# 41. SLA Deadlines

Ticket-level SLA timestamps:

```text
first_response_at
first_response_due_at
resolution_due_at
```

The system calculates deadlines from:

```text
ticket creation time
+
SLA policy duration
```

The exact business-hours vs elapsed-time calculation should be formally finalized before implementation. The current requirement specifies duration and timezone but does not define a business-calendar model.

---

# 42. SLA Status

System-calculated SLA states:

```text
1 = ON_TRACK
2 = WARNING
3 = BREACHED
4 = COMPLETED
```

This is an application-level status mapping.

It is not admin-editable.

Suggested behavior:

```text
ON_TRACK
    ↓
WARNING
    ↓
BREACHED
```

On successful completion:

```text
COMPLETED
```

---

# 43. SLA Policy Changes

Changing an SLA policy should not silently recalculate deadlines for existing tickets.

Recommended behavior:

```text
Existing ticket
    ↓
Keep assigned sla_policy_id
    ↓
Keep existing due timestamps
```

New tickets should use the new policy configuration.

This preserves historical SLA accuracy.

---

# 44. Category Management

Admin can manage:

```text
Categories
Subcategories
```

Operations:

```text
Create
Update
Activate
Deactivate
```

Permanent deletion is discouraged because historical tickets depend on category references. The original requirements explicitly recommend deactivation instead of deleting categories.

---

# 45. Category/Subcategory Relationship

Relationship:

```text
ticket_categories
       │
       │ 1:N
       ▼
ticket_sub_categories
```

A subcategory belongs to exactly one category.

When creating/updating a ticket:

```text
sub_category.category_id
       ==
ticket.category_id
```

must be validated.

This prevents invalid combinations such as:

```text
Category: Network
Subcategory: Payroll
```

---

# 46. Database Scope

The current production ERD contains **14 tables**.

## System / Lookup Tables

1. `user_roles`
2. `ticket_statuses`

## Configurable Tables

3. `ticket_categories`
4. `ticket_sub_categories`
5. `sla_policies`

## Core Tables

6. `users`
7. `tickets`
8. `ticket_comments`
9. `ticket_attachments`
10. `ticket_internal_notes`
11. `ticket_status_history`
12. `ticket_activity_logs`
13. `notifications`
14. `audit_logs`

---

# 47. Database — user_roles

Purpose:

System-defined role lookup.

Fields:

```text
id
name
```

Example:

```text
1 → USER
2 → ADMIN
```

Relationship:

```text
user_roles 1:N users
```

Roles are system-defined and should not be freely created/deleted through the admin UI.

---

# 48. Database — users

Purpose:

Authentication, authorization, and identity.

Core fields:

```text
id
name
email
password
role_id
is_active
email_verified_at
last_login_at
created_at
updated_at
```

Relationships:

```text
user_roles → users
users → tickets
users → comments
users → attachments
users → internal notes
users → status history
users → activity logs
users → notifications
users → audit logs
```

Password must always be securely hashed.

Email normalization rules should be defined at the application level.

---

# 49. Database — ticket_categories

Purpose:

Main support category.

Fields:

```text
id
name
description
is_active
sort_order
created_at
updated_at
```

Relationship:

```text
ticket_categories 1:N ticket_sub_categories
ticket_categories 1:N tickets
```

Category records should be deactivated rather than deleted when historical records depend on them.

---

# 50. Database — ticket_sub_categories

Fields:

```text
id
category_id
name
description
is_active
sort_order
created_at
updated_at
```

Relationship:

```text
ticket_categories 1:N ticket_sub_categories
ticket_sub_categories 1:N tickets
```

Unique rule:

```text
(category_id, name)
```

---

# 51. Database — sla_policies

Fields:

```text
id
priority
first_response_minutes
resolution_minutes
is_active
created_at
updated_at
```

Priority:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Each priority should have one active policy.

---

# 52. Database — ticket_statuses

System-defined status lookup.

Fields:

```text
id
name
```

Values:

```text
1 OPEN
2 PENDING_REVIEW
3 ACCEPTED
4 IN_PROGRESS
5 WAITING_FOR_USER
6 RESOLVED
7 CLOSED
8 REJECTED
9 REOPENED
```

Relationships:

```text
ticket_statuses → tickets
ticket_statuses → ticket_status_history.old_status_id
ticket_statuses → ticket_status_history.new_status_id
```

Statuses are system-defined and should not be treated as arbitrary admin-created values.

---

# 53. Database — tickets

The central entity.

Core fields:

```text
id
ticket_number

user_id
category_id
sub_category_id
sla_policy_id

subject
description

user_priority
admin_priority

status_id

rejection_reason
resolution_summary

first_response_at
first_response_due_at
resolution_due_at

sla_status

resolved_at
closed_at

created_at
updated_at
```

Relationships:

```text
users → tickets
ticket_categories → tickets
ticket_sub_categories → tickets
sla_policies → tickets
ticket_statuses → tickets
```

---

# 54. Ticket Foreign Key Rules

Recommended behavior:

```text
tickets.user_id
    → users.id
    ON DELETE RESTRICT

tickets.category_id
    → ticket_categories.id
    ON DELETE RESTRICT

tickets.sub_category_id
    → ticket_sub_categories.id
    ON DELETE SET NULL

tickets.sla_policy_id
    → sla_policies.id
    ON DELETE SET NULL

tickets.status_id
    → ticket_statuses.id
    ON DELETE RESTRICT
```

This protects historical ticket integrity.

---

# 55. Database — ticket_comments

Purpose:

User/Admin conversation.

Fields:

```text
id
ticket_id
user_id
content
created_at
updated_at
```

Relationships:

```text
tickets → ticket_comments
users → ticket_comments
```

Ticket deletion policy:

```text
ON DELETE CASCADE
```

User deletion should normally be restricted where historical conversation ownership must remain intact.

---

# 56. Database — ticket_attachments

Fields:

```text
id
ticket_id
uploaded_by

file_name
file_url
cloudinary_public_id

mime_type
file_size
resource_type

created_at
```

Relationships:

```text
tickets → ticket_attachments
users → ticket_attachments
```

Actual files:

```text
Cloudinary
```

Database:

```text
metadata only
```

---

# 57. Database — ticket_internal_notes

Fields:

```text
id
ticket_id
admin_id
content
created_at
updated_at
```

Relationship:

```text
tickets → ticket_internal_notes
users → ticket_internal_notes
```

`admin_id` references `users.id`, while NestJS authorization must verify that the actor has the ADMIN role.

---

# 58. Database — ticket_status_history

Fields:

```text
id
ticket_id
changed_by

old_status_id
new_status_id

reason
created_at
```

Relationships:

```text
tickets → status history

ticket_statuses → old_status_id
ticket_statuses → new_status_id

users → changed_by
```

This creates a complete status-transition history.

---

# 59. Database — ticket_activity_logs

Fields:

```text
id
ticket_id
actor_id

action

old_value
new_value
metadata

created_at
```

JSON fields allow structured information for different event types.

Example:

```json
{
  "oldPriority": "MEDIUM",
  "newPriority": "HIGH"
}
```

Activity logs should not be used to store huge rich-text documents or actual files.

---

# 60. Database — notifications

Fields:

```text
id
user_id
ticket_id

title
message
type

is_read
created_at
```

Relationships:

```text
users → notifications
tickets → notifications
```

A notification may optionally reference a ticket.

---

# 61. Database — audit_logs

Purpose:

Security/compliance/admin audit trail.

Fields:

```text
id
actor_id

action
entity
entity_id

old_value
new_value

ip_address
user_agent

created_at
```

`actor_id` may be nullable so historical audit records can survive user deletion.

Audit logs should be treated as append-only from the normal application layer.

---

# 62. Complete ERD Relationship Map

```text
user_roles
    │
    │ 1:N
    ▼
 users
    │
    ├─────────────── 1:N ──────────────► tickets
    │                                      │
    │                                      ├── N:1 → ticket_categories
    │                                      │
    │                                      ├── N:1 → ticket_sub_categories
    │                                      │
    │                                      ├── N:1 → ticket_statuses
    │                                      │
    │                                      ├── N:1 → sla_policies
    │                                      │
    │                                      ├── 1:N → ticket_comments
    │                                      │
    │                                      ├── 1:N → ticket_attachments
    │                                      │
    │                                      ├── 1:N → ticket_internal_notes
    │                                      │
    │                                      ├── 1:N → ticket_status_history
    │                                      │
    │                                      ├── 1:N → ticket_activity_logs
    │                                      │
    │                                      └── 1:N → notifications
    │
    ├── 1:N → ticket_comments
    ├── 1:N → ticket_attachments
    ├── 1:N → ticket_internal_notes
    ├── 1:N → ticket_status_history
    ├── 1:N → ticket_activity_logs
    ├── 1:N → notifications
    └── 1:N → audit_logs

ticket_categories
    │
    ├── 1:N → ticket_sub_categories
    │
    └── 1:N → tickets

ticket_statuses
    ├── 1:N → tickets
    ├── 1:N → status_history.old_status_id
    └── 1:N → status_history.new_status_id

sla_policies
    └── 1:N → tickets
```

---

# 63. Indexing Strategy

The system should use indexes based on real query patterns.

Important indexes include:

```text
users:
    role_id
    created_at

ticket_categories:
    is_active, sort_order

ticket_sub_categories:
    category_id, is_active, sort_order

tickets:
    user_id
    category_id
    sub_category_id
    status_id
    user_priority
    admin_priority
    created_at
    resolution_due_at
    sla_status
    user_id, status_id, created_at

ticket_comments:
    user_id
    ticket_id, created_at

ticket_attachments:
    ticket_id
    uploaded_by

ticket_internal_notes:
    admin_id
    ticket_id, created_at

ticket_status_history:
    ticket_id, created_at
    changed_by

ticket_activity_logs:
    ticket_id, created_at
    actor_id

notifications:
    ticket_id
    user_id, is_read, created_at

audit_logs:
    actor_id
    action
    entity, entity_id
    created_at
```

Indexes should be reviewed against actual query patterns rather than blindly indexing every column.

---

# 64. ORM Architecture

The backend architecture should follow:

```text
Controller
    ↓
Service
    ↓
Prisma
    ↓
MySQL
```

The original backend structure also describes modular separation using controller, service, repository, DTO, validation, interface, and constants.

Recommended NestJS modules:

```text
auth/
users/
tickets/
categories/
comments/
attachments/
notifications/
sla/
activity/
audit/
admin/
common/
prisma/
```

---

# 65. Backend Module Responsibilities

## Auth Module

Handles:

- Login
- Logout
- Current user
- Authentication guards
- JWT validation

## Users Module

Handles:

- User information
- User status
- User lookup

## Tickets Module

Handles:

- Ticket creation
- Ticket retrieval
- Ticket updates
- Ticket lifecycle
- Priority
- Queue
- Resolution

## Categories Module

Handles:

- Categories
- Subcategories

## Comments Module

Handles:

- Ticket conversation

## Attachments Module

Handles:

- Upload
- Metadata
- Cloudinary integration

## Notifications Module

Handles:

- Notification creation
- Notification listing
- Read/unread state

## SLA Module

Handles:

- SLA policies
- Deadline calculation
- SLA status

## Activity Module

Handles:

- Ticket activity timeline

## Audit Module

Handles:

- Security/admin audit logs

## Admin Module

Handles:

- Admin dashboard
- Statistics
- Reports
- Admin-specific operations

---

# 66. DTO Architecture

Each input should use dedicated DTOs.

Examples:

```text
CreateTicketDto
UpdateTicketDto
UpdateTicketPriorityDto
UpdateTicketStatusDto
RejectTicketDto
ResolveTicketDto
CreateCommentDto
CreateInternalNoteDto
CreateCategoryDto
UpdateCategoryDto
CreateSubCategoryDto
UpdateSubCategoryDto
CreateSlaPolicyDto
UpdateSlaPolicyDto
```

DTO validation should happen before business logic.

---

# 67. Validation

Validation must occur at:

```text
Frontend
+
Backend
```

Backend remains authoritative.

Required ticket fields:

```text
subject
category
priority
description
```

Attachment validation:

```text
File Type
File Size
MIME Type
File Name
```

The source requirements explicitly require frontend/backend validation and attachment validation.

---

# 68. API Design

Base path:

```text
/api/v1
```

The source report defines the following API groups.

## Authentication

```http
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

## Tickets

```http
POST  /api/v1/tickets
GET   /api/v1/tickets
GET   /api/v1/tickets/:id
PATCH /api/v1/tickets/:id
```

## Ticket Actions

```http
PATCH /api/v1/tickets/:id/status
PATCH /api/v1/tickets/:id/priority
PATCH /api/v1/tickets/:id/accept
PATCH /api/v1/tickets/:id/reject
PATCH /api/v1/tickets/:id/resolve
PATCH /api/v1/tickets/:id/reopen
```

## Conversation

```http
GET  /api/v1/tickets/:id/comments
POST /api/v1/tickets/:id/comments
```

## Attachments

```http
POST   /api/v1/tickets/:id/attachments
GET    /api/v1/tickets/:id/attachments
DELETE /api/v1/tickets/:id/attachments/:attachmentId
```

## Activity

```http
GET /api/v1/tickets/:id/activity
```

## Notifications

```http
GET   /api/v1/notifications
PATCH /api/v1/notifications/:id/read
```

## Admin

```http
GET /api/v1/admin/tickets
GET /api/v1/admin/statistics
GET /api/v1/admin/reports
GET /api/v1/admin/audit-logs
```

---

# 69. API Response Standard

Success:

```json
{
  "success": true,
  "message": "Ticket created successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Ticket not found",
  "errorCode": "TICKET_NOT_FOUND"
}
```

This response format is defined in the project requirements.

---

# 70. HTTP Status Codes

Recommended usage:

```text
200 OK
201 Created
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests

500 Internal Server Error
```

Examples:

```text
401 → Invalid/missing authentication
403 → Authenticated but unauthorized
404 → Ticket not found
409 → Duplicate ticket number / conflicting operation
422 → Validation failure
429 → Rate limit exceeded
```

---

# 71. Error Codes

Recommended standardized codes:

```text
AUTH_REQUIRED
INVALID_CREDENTIALS
FORBIDDEN
USER_NOT_FOUND

TICKET_NOT_FOUND
TICKET_ACCESS_DENIED
INVALID_TICKET_STATUS
INVALID_STATUS_TRANSITION
TICKET_ALREADY_RESOLVED
TICKET_ALREADY_CLOSED

CATEGORY_NOT_FOUND
SUBCATEGORY_NOT_FOUND
INVALID_SUBCATEGORY

ATTACHMENT_NOT_FOUND
INVALID_FILE_TYPE
FILE_TOO_LARGE
UPLOAD_FAILED

COMMENT_NOT_FOUND

SLA_POLICY_NOT_FOUND

VALIDATION_ERROR
INTERNAL_SERVER_ERROR
```

---

# 72. Frontend Structure

Recommended Next.js structure:

```text
app/
├── support/
│   ├── page.tsx
│   ├── create/
│   ├── tickets/
│   │   └── [ticketId]/
│   └── search/
│
└── admin/
    └── support/
        ├── page.tsx
        ├── tickets/
        ├── categories/
        ├── reports/
        └── audit-logs/
```

This follows the project report's frontend structure.

---

# 73. Reusable Frontend Components

Recommended components:

```text
SupportDashboard
TicketCard
TicketTable
TicketStatusBadge
PriorityBadge
TicketTimeline
TicketActivity
TicketConversation
RichTextEditor
AttachmentUploader
AttachmentPreview
TicketSearch
TicketFilters
QueuePosition
SlaIndicator
NotificationDropdown
RejectTicketDialog
ResolutionDialog
```

These components are aligned with the existing project report.

---

# 74. UX Principles

The UI should prioritize:

- Clear status visibility
- Clear priority visibility
- Minimal steps to submit tickets
- Easy ticket tracking
- Strong distinction between user-visible and admin-only content
- Responsive design
- Accessible forms
- Clear error states
- Loading states
- Empty states
- Confirmation dialogs for destructive actions

---

# 75. Create Ticket UX

Recommended form layout:

```text
Subject
Category
Subcategory
Priority
Description
Attachments

[Submit Ticket]
```

Subcategory should dynamically update after category selection.

Example:

```text
Category:
Technical Issue

Subcategory:
Login Problem
Password Problem
System Error
```

---

# 76. Ticket Detail UX

Recommended layout:

```text
┌─────────────────────────────────────┐
│ Ticket ID                           │
│ Subject                             │
│ Status       Priority       SLA     │
├─────────────────────────────────────┤
│ Description                         │
├─────────────────────────────────────┤
│ Attachments                         │
├─────────────────────────────────────┤
│ Timeline                            │
├─────────────────────────────────────┤
│ Conversation                        │
│                                     │
│ [Write reply...]                    │
└─────────────────────────────────────┘
```

Admin additionally sees:

```text
Accept
Reject
Change Priority
Change Status
Internal Note
Resolve
Close
Reopen
```

---

# 77. Admin Ticket Table

Columns:

```text
Ticket ID
User
Subject
Category
Priority
Status
Created At
Updated At
```

The source report explicitly defines these fields.

Filters should be available without leaving the ticket management page.

---

# 78. Security Requirements

The system must implement:

- Authentication
- Role-based authorization
- DTO validation
- Input sanitization
- Rich text sanitization
- XSS protection
- SQL injection protection
- File validation
- File size limits
- Secure Cloudinary upload
- Rate limiting
- Secure API headers
- Audit logging
- User-level ticket access control

The original report explicitly lists these requirements.

---

# 79. Ticket Ownership Security

For USER requests:

```text
authenticatedUser.id
        ==
ticket.user_id
```

must be verified.

Never rely on:

```text
client-provided userId
```

for access control.

For ADMIN:

```text
role === ADMIN
```

must be verified by NestJS authorization guards.

---

# 80. Rich Text Security

The backend must sanitize all rich text.

Unsafe content includes:

```text
<script>
javascript:
unsafe iframe
unsafe HTML
malicious event handlers
```

The system should maintain a strict allowed-content policy.

---

# 81. Cloudinary Security

Cloudinary uploads should be controlled by the backend.

The server should validate:

```text
MIME type
file extension
file size
resource type
authenticated uploader
ticket ownership/access
```

The application should never trust a client-provided Cloudinary public ID without validation.

---

# 82. Audit Logging

Important administrative actions should generate audit records.

Audit information:

```text
Actor
Action
Entity
Entity ID
Old Value
New Value
IP Address
User Agent
Timestamp
```

This is explicitly defined in the requirements.

Example:

```text
Admin changed:

Status:
IN_PROGRESS → RESOLVED

Ticket:
EMS-SUP-1005

Time:
Oct 5, 2026 11:30 AM
```

---

# 83. Activity vs Audit Rules

Ticket-level action:

```text
Priority changed
```

→ `ticket_activity_logs`

Security/configuration action:

```text
Admin changed SLA policy
```

→ `audit_logs`

Status transition:

```text
IN_PROGRESS → RESOLVED
```

→ `ticket_status_history`

A single business operation may intentionally create multiple records:

```text
Status change
    ↓
status_history
    +
activity_log
    +
audit_log (when the action is security/compliance relevant)
    +
notification
```

---

# 84. Performance Requirements

Production system must support:

- Pagination
- Database indexing
- Optimized Prisma queries
- Efficient filtering
- Efficient search
- Cloudinary image optimization
- Large ticket datasets

The original report explicitly requires pagination, indexing, optimized queries and efficient filtering/search.

The frontend must never load the entire ticket dataset at once.

---

# 85. Database Query Performance

Important query patterns:

```text
Get user's tickets
Get ticket by ticket number
Get ticket by ID
Get active queue
Get admin ticket list
Filter by status
Filter by priority
Filter by category
Filter by date
Get ticket timeline
Get unread notifications
Get audit logs
```

Indexes should correspond to these patterns.

---

# 86. Prisma Considerations

The project uses Prisma ORM.

Database types such as:

```text
BIGINT UNSIGNED
```

map to Prisma:

```text
BigInt
```

Therefore API serialization of BigInt must be handled consistently.

MySQL ENUM values should be represented through Prisma enums where appropriate.

Foreign keys and deletion behavior should be represented in Prisma relations.

---

# 87. Date/Time Policy

The product uses:

```text
Asia/Dhaka
GMT+6
```

for calendar-day reporting.

The implementation should establish a consistent storage policy for timestamps.

Recommended production approach:

```text
Store timestamps consistently
+
Convert/display according to Asia/Dhaka
```

All "today" calculations must explicitly use:

```text
Asia/Dhaka
```

rather than server-local timezone.

---

# 88. Data Integrity

The system must guarantee:

- Unique ticket number
- Valid foreign keys
- Transaction-safe ticket creation
- Valid status transitions
- Consistent activity logs
- Consistent status history
- Proper attachment references
- Historical category integrity

These integrity requirements are explicitly present in the source report.

---

# 89. Transaction-Safe Ticket Creation

Ticket creation should be treated as a transactional business operation.

Conceptually:

```text
BEGIN TRANSACTION

Create Ticket
Create Initial Status History
Create Ticket Activity
Create Notification

COMMIT
```

If a critical operation fails:

```text
ROLLBACK
```

This prevents partially created tickets.

Cloudinary upload should be handled carefully because external storage is not part of the MySQL transaction.

---

# 90. Cloudinary Failure Handling

Possible sequence:

```text
Upload file
    ↓
Cloudinary success
    ↓
Create DB metadata
```

If database creation fails after Cloudinary upload, orphaned Cloudinary files may exist.

Therefore the implementation should define cleanup/reconciliation behavior.

For example:

```text
Cloudinary upload
      ↓
DB operation fails
      ↓
Attempt Cloudinary cleanup
```

If cleanup fails, the system should log the orphaned asset for later reconciliation.

---

# 91. Category Historical Integrity

Existing tickets must not become invalid because an admin deactivates a category.

Therefore:

```text
Category
    ↓
is_active = false
```

rather than:

```text
DELETE category
```

This preserves historical ticket references.

---

# 92. User Active Status

`users.is_active` should control whether an account can actively use the system.

Inactive users should not be able to perform normal authenticated operations.

Historical ticket records should remain intact.

---

# 93. Ticket Deletion Policy

Tickets are historical support records.

Recommended policy:

```text
Do not expose normal ticket deletion.
```

Instead use lifecycle states:

```text
REJECTED
RESOLVED
CLOSED
```

This preserves support history and auditability.

---

# 94. Queue Business Rules

Queue position must be calculated dynamically.

Rules:

1. Only active statuses participate.
2. Resolved tickets do not participate.
3. Closed tickets do not participate.
4. Rejected tickets do not participate.
5. Effective priority determines ordering.
6. Older tickets win when priority is equal.
7. Admin priority overrides user priority.
8. Queue position changes dynamically.
9. Queue position is not persisted as authoritative data.

---

# 95. Priority Business Rules

User:

```text
Can choose requested priority.
```

Admin:

```text
Can set official priority.
```

Effective priority:

```text
admin_priority ?? user_priority
```

The system should preserve both values so that the user's original request is not lost.

---

# 96. Status Business Rules

Only valid transitions are allowed.

Status updates must:

1. Validate current status.
2. Validate requested next status.
3. Update ticket status.
4. Create status history.
5. Create activity log.
6. Create notification where appropriate.
7. Update related timestamps.
8. Update SLA state when required.

These operations should preferably occur inside a transaction.

---

# 97. Reject Business Rules

Reject operation requires:

```text
rejection_reason
```

Minimum requirements:

```text
reason must not be empty
```

After rejection:

```text
status = REJECTED
```

The ticket should no longer appear in the active queue.

---

# 98. Resolve Business Rules

Resolve operation requires:

```text
resolution_summary
```

After resolving:

```text
status = RESOLVED
resolved_at = now
```

User receives notification.

User can:

```text
Confirm
```

or:

```text
Issue Still Exists
```

---

# 99. Close Business Rules

Only a resolved ticket should normally be closable.

Transition:

```text
RESOLVED → CLOSED
```

After closing:

```text
closed_at = now
```

Closed tickets leave the active queue.

---

# 100. Reopen Business Rules

A resolved ticket can be reopened when the user indicates the issue still exists.

Transition:

```text
RESOLVED
    ↓
REOPENED
    ↓
IN_PROGRESS
```

Reopening should create:

- Status history
- Activity log
- Notification
- Updated SLA handling if applicable

---

# 101. Notification Business Rules

Notification should be generated for important events.

Example:

```text
Ticket Created
    → User confirmation
    → Admin notification

Ticket Accepted
    → User notification

Ticket Rejected
    → User notification

Admin Reply
    → User notification

User Reply
    → Admin notification

Ticket Resolved
    → User notification

Ticket Reopened
    → Admin notification
```

---

# 102. SLA Warning

When the resolution deadline approaches:

```text
SLA status:
ON_TRACK → WARNING
```

Admin should receive a notification.

When the deadline is exceeded:

```text
WARNING → BREACHED
```

Admin should receive an SLA-breach notification.

Exact warning threshold should be configurable as a business rule if required.

---

# 103. Reporting

Admin reports may include:

```text
Total tickets
Tickets by status
Tickets by priority
Tickets by category
Tickets created per day
Tickets resolved per day
Tickets closed per day
Tickets rejected per day
SLA performance
Average resolution time
Average first-response time
```

The current requirement explicitly includes reports but does not define a final report metric catalog, so the final report set should be finalized during implementation planning.

---

# 104. Daily Statistics

"Today" must always mean:

```text
Asia/Dhaka
00:00:00
    →
23:59:59
```

Not:

```text
last 24 hours
```

For example:

```text
October 6 00:00
```

starts a new reporting day.

---

# 105. Observability

Production implementation should log:

```text
Request ID
User ID
HTTP method
Endpoint
Response status
Execution duration
Error code
Timestamp
```

Sensitive information such as passwords, JWT secrets, or private rich-text content should not be logged.

---

# 106. Rate Limiting

Rate limiting should protect:

```text
Login
Ticket creation
Comment creation
Attachment upload
Search
Notification endpoints
```

Particularly sensitive endpoints:

```text
/auth/login
/tickets
/comments
/attachments
```

---

# 107. API Security

Recommended controls:

```text
JWT authentication
Role guards
DTO validation
CORS policy
Secure headers
Rate limiting
Input sanitization
Output filtering
```

Admin endpoints must never rely on frontend route protection alone.

---

# 108. Data Privacy

Users should only receive:

```text
Their own ticket data
Their own notifications
Their own conversation
User-visible activity
```

Users must never receive:

```text
Internal notes
Other users' tickets
Admin audit logs
Sensitive administrative metadata
```

---

# 109. Admin Privacy

Internal notes must remain administrator-only.

Even if a user knows the endpoint URL, backend authorization must prevent access.

Example:

```text
GET /tickets/:id/internal-notes
```

must verify:

```text
role === ADMIN
```

before returning any data.

---

# 110. Frontend State Requirements

Frontend must handle:

```text
Loading
Success
Empty
Error
Unauthorized
Forbidden
Not Found
Validation Error
Upload Progress
Submission State
```

Buttons should prevent accidental duplicate submissions.

Example:

```text
Create Ticket
      ↓
Submitting...
      ↓
Disable button
      ↓
Success
```

---

# 111. Empty States

Examples:

```text
No tickets found.

No notifications.

No conversation yet.

No activity recorded.

No attachments.

No matching search results.
```

Each empty state should provide useful context rather than a blank page.

---

# 112. Error UX

Examples:

```text
Ticket not found.
You do not have permission to view this ticket.
File type is not supported.
File size exceeds the allowed limit.
Your session has expired.
This status transition is not allowed.
```

---

# 113. Accessibility

The UI should support:

- Keyboard navigation
- Accessible form labels
- Visible focus states
- Appropriate ARIA attributes
- Color-independent status indication
- Readable contrast
- Accessible dialogs
- Accessible rich text editor controls

---

# 114. Mobile/Responsive Behavior

Support pages must remain usable on:

```text
Desktop
Tablet
Mobile
```

Admin tables should have responsive behavior such as:

```text
horizontal scroll
responsive card view
```

rather than breaking the layout.

---

# 115. API Ownership Rules

For a USER:

```text
GET /tickets
```

must automatically scope results to:

```text
WHERE user_id = authenticatedUser.id
```

For ADMIN:

```text
GET /tickets
```

may return all authorized tickets with filtering and pagination.

---

# 116. Ticket Number Search

Ticket number must be unique.

Example:

```text
EMS-SUP-100001
```

Search should be optimized using the unique index.

Ticket number should never be modified after creation.

---

# 117. Database Naming Convention

Recommended database naming:

```text
snake_case
```

Examples:

```text
ticket_number
user_id
category_id
created_at
updated_at
first_response_at
resolution_due_at
```

Prisma application fields can use camelCase while mapping to snake_case database columns if desired.

---

# 118. Prisma Naming Convention

Recommended application-level naming:

```text
ticketNumber
userId
categoryId
createdAt
updatedAt
```

Database:

```text
ticket_number
user_id
category_id
created_at
updated_at
```

This keeps TypeScript conventions clean while maintaining database readability.

---

# 119. API Serialization

Because the database uses `BIGINT UNSIGNED`, Prisma may return JavaScript `bigint`.

API responses must normalize these values before JSON serialization.

For public identifiers, the API should expose string-safe values when appropriate.

---

# 120. Migration Strategy

Database schema changes should be managed through:

```text
Prisma Migrate
```

Recommended flow:

```text
Update Prisma schema
      ↓
Create migration
      ↓
Review migration
      ↓
Apply migration
      ↓
Generate Prisma Client
      ↓
Run tests
```

Production migrations must be reviewed before deployment.

---

# 121. Seed Data

Initial system seed data should include:

## Roles

```text
1 USER
2 ADMIN
```

## Statuses

```text
1 OPEN
2 PENDING_REVIEW
3 ACCEPTED
4 IN_PROGRESS
5 WAITING_FOR_USER
6 RESOLVED
7 CLOSED
8 REJECTED
9 REOPENED
```

## SLA Policies

Initial policy values can follow the configured project defaults.

---

# 122. System-Defined vs Admin-Configurable Data

## System Defined

```text
user_roles
ticket_statuses
sla_status mapping
priority enum
```

## Admin Configurable

```text
ticket_categories
ticket_sub_categories
sla_policies
```

Admins should not arbitrarily delete system status definitions or application roles.

---

# 123. Complete Ticket Lifecycle

```text
                    ┌─────────────┐
                    │   CREATED   │
                    └──────┬──────┘
                           │
                           ▼
                  PENDING_REVIEW
                    │          │
                 ACCEPT       REJECT
                    │          │
                    ▼          ▼
                ACCEPTED    REJECTED
                    │
                    ▼
                IN_PROGRESS
                 │       │
                 │       └──────────────┐
                 ▼                      │
          WAITING_FOR_USER             │
                 │                      │
                 └──────────┐           │
                            ▼           │
                       IN_PROGRESS ◄────┘
                            │
                            ▼
                         RESOLVED
                         │      │
                    CONFIRM    REOPEN
                         │      │
                         ▼      ▼
                       CLOSED  REOPENED
                                  │
                                  ▼
                             IN_PROGRESS
```

---

# 124. End-to-End User Flow

```text
Login
  ↓
Support Center
  ↓
Dashboard
  ↓
Create Ticket
  ↓
Select Category
  ↓
Select Subcategory
  ↓
Select Priority
  ↓
Write Description
  ↓
Attach Files
  ↓
Submit
  ↓
Ticket Number
  ↓
Queue Position
  ↓
Pending Review
  ↓
Admin Accepts
  ↓
In Progress
  ↓
Conversation
  ↓
Resolution
  ↓
User Confirmation
  ├── Confirm → Closed
  └── Issue Exists → Reopened → In Progress
```

---

# 125. End-to-End Admin Flow

```text
Admin Login
    ↓
Admin Dashboard
    ↓
Ticket Queue
    ↓
Open Ticket
    ↓
Review Details
    ↓
Accept / Reject
    ↓
Assign Official Priority
    ↓
Work on Ticket
    ↓
Reply / Internal Note
    ↓
Request User Information if required
    ↓
Resolve
    ↓
Wait for User Confirmation
    ├── Confirm → Closed
    └── Issue Exists → Reopened
```

---

# 126. Acceptance Criteria — Authentication

- User can authenticate successfully.
- Invalid credentials are rejected.
- Unauthenticated users cannot access protected endpoints.
- USER cannot access ADMIN endpoints.
- ADMIN can access admin endpoints.
- User identity is derived from authentication context.

---

# 127. Acceptance Criteria — Ticket Creation

A ticket is successfully created when:

- Subject is valid.
- Category is valid.
- Subcategory belongs to selected category.
- Priority is valid.
- Description is valid.
- Attachments pass validation.
- Ticket number is unique.
- Initial status is created.
- Status history is created.
- Activity log is created.
- Appropriate notification is created.

---

# 128. Acceptance Criteria — Ticket Access

USER:

```text
Can access own ticket
Cannot access another user's ticket
```

ADMIN:

```text
Can access all authorized tickets
```

Internal notes:

```text
ADMIN only
```

Audit logs:

```text
ADMIN only
```

---

# 129. Acceptance Criteria — Status

The system must:

- Reject invalid transitions.
- Store every valid transition.
- Record actor.
- Record timestamp.
- Record optional reason.
- Update ticket status.
- Generate required notifications.

---

# 130. Acceptance Criteria — Queue

Queue must:

- Exclude resolved tickets.
- Exclude closed tickets.
- Exclude rejected tickets.
- Use effective priority.
- Use creation time as tie-breaker.
- Update dynamically.
- Not rely on a stored queue position.

---

# 131. Acceptance Criteria — SLA

The system must:

- Associate tickets with SLA policy.
- Calculate response deadline.
- Calculate resolution deadline.
- Track SLA status.
- Generate warning/breach notifications.
- Mark completed when applicable.
- Preserve existing ticket SLA context after policy changes.

---

# 132. Acceptance Criteria — Attachments

The system must:

- Validate MIME type.
- Validate size.
- Upload to Cloudinary.
- Store metadata in MySQL.
- Associate attachment with ticket.
- Track uploader.
- Reject unauthorized access.
- Avoid storing actual binary file content in MySQL.

---

# 133. Acceptance Criteria — Notifications

The system must:

- Create notification records for defined events.
- Associate notifications with users.
- Optionally associate with tickets.
- Track read/unread state.
- Allow marking notification as read.
- Support database-backed delivery.

---

# 134. Acceptance Criteria — Audit

Important administrative/security operations must:

- Record actor.
- Record action.
- Record entity.
- Record entity ID.
- Record old value when applicable.
- Record new value when applicable.
- Record IP when available.
- Record user agent when available.
- Record timestamp.

---

# 135. Performance Acceptance Criteria

The system should:

- Paginate large datasets.
- Use indexes for common queries.
- Avoid N+1 Prisma queries.
- Avoid loading unnecessary relations.
- Select only required fields when appropriate.
- Use efficient filtering.
- Optimize Cloudinary assets.
- Avoid loading full ticket histories unnecessarily.

---

# 136. Testing Strategy

Testing should cover:

## Unit Tests

- Ticket service
- Status transition logic
- Queue calculation
- SLA calculation
- Priority resolution
- Validation
- Authorization logic

## Integration Tests

- Prisma/MySQL operations
- Ticket creation transaction
- Status history
- Activity logs
- Notification creation

## API Tests

- Authentication
- Ticket endpoints
- Comment endpoints
- Attachment endpoints
- Admin endpoints

## E2E Tests

Complete flows:

```text
Login
Create Ticket
Admin Accept
Admin Reply
User Reply
Admin Resolve
User Confirm
```

And:

```text
Resolve
→ Issue Still Exists
→ Reopen
→ In Progress
```

---

# 137. Critical Negative Test Cases

The system must reject:

```text
Unauthorized ticket access
Invalid status transition
Invalid category
Invalid subcategory
Subcategory from another category
Invalid priority
Missing rejection reason
Missing resolution summary
Invalid attachment
Oversized attachment
Duplicate ticket number
Inactive category selection
Inactive user operations
Unauthorized internal-note access
Unauthorized audit-log access
```

---

# 138. Logging Requirements

Application logs should capture:

```text
Request
Response status
Error
User ID
Ticket ID
Execution duration
```

Do not log:

```text
Password
JWT secret
Sensitive tokens
Private credentials
```

---

# 139. Deployment Architecture

Production deployment concept:

```text
Internet
   ↓
EMS Portal / Next.js
   ↓
NestJS API
   ↓
Prisma
   ↓
MySQL

NestJS
   ↓
Cloudinary
```

The system should keep environment-specific configuration outside source code.

---

# 140. Environment Variables

Typical configuration:

```text
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN

CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

APP_URL
API_URL

TIMEZONE
```

Secrets must never be committed to Git.

---

# 141. Production Configuration

The application should have separate environments:

```text
Development
Testing
Production
```

Each environment should have separate:

```text
Database
Cloudinary configuration
JWT secrets
API URLs
```

where practical.

---

# 142. Backup and Recovery

Database backup strategy should cover:

```text
users
tickets
comments
attachments metadata
status history
activity
notifications
audit logs
categories
SLA policies
```

Actual files are stored in Cloudinary and therefore require a separate media retention/recovery strategy.

---

# 143. Data Retention

Historical support information should not be casually deleted.

Recommended retention categories:

```text
Tickets → long-term
Status History → long-term
Activity Logs → long-term
Audit Logs → long-term
Comments → long-term
Attachments metadata → long-term
Notifications → configurable retention
```

Exact retention duration should be decided according to EMS organizational policy.

---

# 144. Scalability Strategy

The system should scale primarily through:

```text
Database indexing
Pagination
Query optimization
Stateless NestJS API
Cloudinary for file storage
Efficient Prisma queries
```

Redis and WebSockets are intentionally not part of the current architecture.

If future traffic requirements demand them, they can be introduced as separate architectural evolution rather than being required for MVP.

---

# 145. MVP Scope

## USER MVP

- Support Dashboard
- Today's Added/Solved Statistics
- Create Ticket
- Category/Subcategory
- Priority
- Rich Text Editor
- Cloudinary Attachment
- Unique Ticket ID
- Queue Position
- Ticket List
- Ticket Details
- Status Timeline
- Conversation
- Activity History
- Notifications
- Resolution Confirmation
- Reopen Ticket
- Search

## ADMIN MVP

- Dashboard
- Today's Statistics
- Ticket Management
- Search & Filter
- Accept/Reject
- Priority Management
- Status Management
- Conversation
- Internal Notes
- Resolve/Close/Reopen
- Category Management
- SLA
- Audit Logs
- Reports

These scopes are directly aligned with the source MVP definition.

---

# 146. Future Expansion — Not MVP

Potential future features:

```text
Email automation
Advanced reports
Department-based assignment
Multiple admin teams
Support agents
Escalation rules
Business-hour SLA
Attachment virus scanning
Advanced analytics
External support portal
Customer satisfaction rating
```

These should not be implemented unless added to the approved product scope.

---

# 147. Important Architecture Decisions

## Decision 1 — Prisma

Use:

```text
NestJS → Prisma → MySQL
```

instead of direct raw SQL as the primary application data-access layer.

## Decision 2 — Roles

Use:

```text
user_roles
```

with:

```text
USER
ADMIN
```

rather than storing the role as a free-form string.

## Decision 3 — Status

Use:

```text
ticket_statuses
```

with:

```text
tickets.status_id
```

rather than an ENUM column inside `tickets`.

## Decision 4 — Queue

Do not persist:

```text
queue_position
```

as authoritative data.

Calculate it dynamically.

## Decision 5 — Files

Store files in:

```text
Cloudinary
```

Store metadata in:

```text
MySQL
```

## Decision 6 — Notifications

Use:

```text
Database-backed notifications
```

rather than WebSocket.

## Decision 7 — Internal Notes

Store separately from normal comments.

## Decision 8 — Audit

Keep security/compliance audit separate from ticket activity.

---

# 148. Final Database Table Summary

| # | Table | Type | Main Responsibility |
|---:|---|---|---|
| 1 | `user_roles` | System | User role lookup |
| 2 | `users` | Core | User/admin identity |
| 3 | `ticket_statuses` | System | Ticket status lookup |
| 4 | `ticket_categories` | Configurable | Ticket categories |
| 5 | `ticket_sub_categories` | Configurable | Ticket subcategories |
| 6 | `sla_policies` | Configurable | Priority-based SLA |
| 7 | `tickets` | Core | Main ticket entity |
| 8 | `ticket_comments` | Child | User/admin conversation |
| 9 | `ticket_attachments` | Child | File metadata |
| 10 | `ticket_internal_notes` | Child | Admin-only notes |
| 11 | `ticket_status_history` | Child | Status transitions |
| 12 | `ticket_activity_logs` | Child | Ticket activity |
| 13 | `notifications` | Supporting | User/admin notifications |
| 14 | `audit_logs` | Supporting | Security/compliance audit |

---

# 149. Final Product Architecture

```text
                         EMS PORTAL
                              │
                              ▼
                    ┌───────────────────┐
                    │      Next.js      │
                    │    TypeScript     │
                    │ Tailwind/shadcn   │
                    └─────────┬─────────┘
                              │
                           REST API
                              │
                              ▼
                    ┌───────────────────┐
                    │      NestJS       │
                    │    TypeScript     │
                    └─────────┬─────────┘
                              │
                   ┌──────────┴──────────┐
                   │                     │
                   ▼                     ▼
            ┌──────────────┐      ┌──────────────┐
            │    Prisma    │      │  Cloudinary  │
            │     ORM      │      │ File Storage │
            └──────┬───────┘      └──────────────┘
                   │
                   ▼
            ┌──────────────┐
            │     MySQL    │
            │ 14 Tables    │
            └──────────────┘
```

---

# 150. Final Product Principle

The EMS Support System is a:

> **REST-based, modular, role-secured, auditable support ticketing system integrated with the EMS Portal.**

The product provides a complete support lifecycle:

```text
SUBMIT
  ↓
IDENTIFY
  ↓
QUEUE
  ↓
REVIEW
  ↓
ACCEPT / REJECT
  ↓
PROCESS
  ↓
COMMUNICATE
  ↓
RESOLVE
  ↓
CONFIRM
  ↓
CLOSE / REOPEN
```

Every important operation is traceable through:

```text
Ticket
Status History
Activity Log
Conversation
Internal Notes
Notifications
Audit Log
```

The database is designed around **14 tables**, with clear separation between system lookup data, configurable support data, core ticket data, communication data, operational history, notifications, and security auditing.

The system therefore provides a strong foundation for a production-grade EMS support platform while intentionally avoiding unnecessary complexity such as Redis, WebSocket infrastructure, AI services, or a knowledge-base subsystem.