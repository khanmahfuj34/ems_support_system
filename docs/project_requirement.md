# EMS Support System

An integrated enterprise support ticketing system for the EMS Portal. It
allows users to submit support requests, track the complete ticket
lifecycle, communicate with administrators, and monitor ticket progress.
Administrators can manage tickets, priorities, statuses, conversations,
SLAs, categories, reports, and audit logs.

## Table of Contents

-   [Project Overview](#project-overview)
-   [Technology Stack](#technology-stack)
-   [Roles & Permissions](#roles--permissions)
-   [User Features](#user-features)
-   [Admin Features](#admin-features)
-   [Support Dashboard](#support-dashboard)
-   [Ticket Creation](#ticket-creation)
-   [Priority Management](#priority-management)
-   [Rich Text Editor](#rich-text-editor)
-   [Attachment System](#attachment-system)
-   [Ticket ID](#ticket-id)
-   [Queue & Serial System](#queue--serial-system)
-   [Ticket Status Lifecycle](#ticket-status-lifecycle)
-   [Ticket Details](#ticket-details)
-   [Progress Timeline](#progress-timeline)
-   [Accept & Reject](#accept--reject)
-   [Ticket Conversation](#ticket-conversation)
-   [Internal Notes](#internal-notes)
-   [Activity & Audit Timeline](#activity--audit-timeline)
-   [Resolution & Reopening](#resolution--reopening)
-   [Search & Filtering](#search--filtering)
-   [Notifications](#notifications)
-   [Admin Dashboard](#admin-dashboard)
-   [SLA Management](#sla-management)
-   [Category Management](#category-management)
-   [Database Structure](#database-structure)
-   [API Structure](#api-structure)
-   [Frontend Structure](#frontend-structure)
-   [Backend Structure](#backend-structure)
-   [Validation & Error Handling](#validation--error-handling)
-   [Security](#security)
-   [Performance](#performance)
-   [Data Integrity](#data-integrity)
-   [Main Workflow](#main-workflow)
-   [MVP Scope](#mvp-scope)
-   [Architecture](#architecture)
-   [Excluded Technologies](#excluded-technologies)

------------------------------------------------------------------------

## Project Overview

**EMS Support System** is an integrated support ticketing module for the
EMS Portal.

When a user faces a problem or needs assistance, they can create a
support ticket containing the problem category, priority, description,
and attachments. The user can then track the complete ticket lifecycle,
including submission, review, acceptance/rejection, processing,
resolution, and closure.

Administrators can manage all submitted tickets and communicate with
users through ticket-based conversations.

### Core Objectives

-   Provide a centralized support mechanism inside EMS.
-   Replace informal/manual support requests with structured tickets.
-   Generate a unique ticket number for every request.
-   Allow users to track their tickets from submission to closure.
-   Display the user's current support queue position.
-   Support rich-text descriptions and conversations.
-   Store images/files securely through Cloudinary.
-   Maintain complete activity and audit history.
-   Monitor SLA deadlines.
-   Provide daily support statistics.
-   Enforce secure role-based access.

------------------------------------------------------------------------

## Technology Stack

  Layer                Technology
  -------------------- --------------------------
  Frontend             Next.js + TypeScript
  Backend              NestJS + TypeScript
  Database             MySQL
  ORM                  Prisma
  UI                   Tailwind CSS + shadcn/ui
  Forms                React Hook Form + Zod
  Rich Text Editor     TipTap
  File/Image Storage   Cloudinary
  Communication        REST API
  Authentication       EMS Authentication / JWT
  Roles                `USER`, `ADMIN`
  Timezone             `Asia/Dhaka` (GMT+6)

------------------------------------------------------------------------

## Roles & Permissions

The system contains only two roles:

``` text
USER
ADMIN
```

There are no separate support-agent, manager, moderator, or super-admin
roles.

### USER

A user can:

-   View the support dashboard.
-   Create new tickets.
-   Select categories and subcategories.
-   Set ticket priority.
-   Write rich-text descriptions.
-   Upload images/files.
-   View and search their own tickets.
-   Track ticket status.
-   View queue/serial position.
-   View administrator responses.
-   Reply to tickets.
-   View activity history.
-   Confirm ticket resolution.
-   Reopen unresolved tickets.
-   View notifications.

A user cannot access another user's tickets or admin-only information.

### ADMIN

An administrator can:

-   View all tickets.
-   Search and filter tickets.
-   Accept or reject tickets.
-   Change ticket priority.
-   Change ticket status.
-   Communicate with users.
-   Add internal notes.
-   Resolve, close, and reopen tickets.
-   Manage categories and subcategories.
-   Monitor SLA.
-   View statistics and reports.
-   View audit logs.

------------------------------------------------------------------------

## User Features

### Support Dashboard

The user dashboard provides an overview of support activity:

-   Total Tickets
-   Open Tickets
-   In Progress
-   Resolved
-   Closed
-   Rejected
-   Tickets Added Today
-   Tickets Solved Today

### Ticket Management

Users can:

-   Create tickets.
-   View ticket lists.
-   View ticket details.
-   Search tickets.
-   Track status.
-   Track queue position.
-   View progress timeline.
-   Communicate with admins.
-   Upload attachments.
-   View activity history.
-   Confirm resolution.
-   Reopen unresolved tickets.

------------------------------------------------------------------------

## Support Dashboard

The dashboard displays ticket summary cards such as:

``` text
Total Tickets
Open Tickets
In Progress
Resolved
Closed
Rejected
```

### Today's Support Statistics

The dashboard also shows:

``` text
Tickets Added Today
Tickets Solved Today
```

**Important:** "Today" does not mean a rolling 24-hour period.

The system day is:

``` text
12:00 AM → 11:59:59 PM
```

All daily statistics use:

``` text
Asia/Dhaka (GMT+6)
```

At midnight, the system starts calculating statistics for the new
calendar day.

Example:

``` text
October 5

Tickets Added: 18
Tickets Solved: 12
```

------------------------------------------------------------------------

## Ticket Creation

Users can create a ticket using the **Create New Ticket** option.

### Fields

``` text
Subject *
Category *
Subcategory
Priority *
Description *
Attachment
```

### Example Categories

``` text
Technical Issue
Account & Access
Payment
HR / Employee
System Issue
Hardware
Software
Network
Other
```

Subcategories are loaded dynamically according to the selected category.

------------------------------------------------------------------------

## Priority Management

Users can select:

``` text
LOW
MEDIUM
HIGH
CRITICAL
```

The system maintains two priority values:

``` text
userPriority
adminPriority
```

The user's selected priority represents the requested priority. An
administrator can change the official priority when required.

------------------------------------------------------------------------

## Rich Text Editor

Ticket descriptions use **TipTap** as the rich text editor.

Supported features include:

``` text
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

Users can also insert screenshots/images inside the description.

### Rich Text Security

Rich text submitted by users must be sanitized on the backend to
prevent:

-   XSS attacks
-   Malicious HTML
-   Unsafe scripts
-   Unsafe URLs

The same security rules apply to ticket replies and administrator
responses.

------------------------------------------------------------------------

## Attachment System

Users and administrators can attach files where permitted.

The supported file types will be configurable according to project
requirements.

Attachment metadata includes:

``` text
File Name
File URL
Cloudinary Public ID
MIME Type
File Size
Uploaded By
Uploaded At
```

### Storage Flow

``` text
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
MySQL
```

The actual binary file is not stored in MySQL. MySQL stores the file
metadata and Cloudinary reference.

------------------------------------------------------------------------

## Ticket ID

Every ticket receives a unique, human-readable ticket number.

Recommended format:

``` text
SUP-10000001
SUP-10000002
SUP-10000003
```

Ticket numbers must be:

-   Unique
-   Searchable
-   Immutable
-   Human-readable

The internal database primary key and public ticket number should
preferably be separate.

------------------------------------------------------------------------

## Queue & Serial System

After submitting a ticket, the user can view their current queue
position.

Example:

``` text
Ticket: EMS-SUP-1005

Your Queue Position: #3

2 active tickets are ahead of you.
```

Example:

``` text
1003 → Open
1004 → In Progress
1005 → Your Ticket
```

Closed, resolved, and rejected tickets are excluded from the active
queue.

Queue calculation considers:

-   Ticket status
-   Priority
-   Creation time

The final queue algorithm should be deterministic and consistent.

------------------------------------------------------------------------

## Ticket Status Lifecycle

The primary lifecycle is:

``` text
OPEN
  ↓
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

``` text
OPEN → REJECTED
```

Reopening:

``` text
RESOLVED → REOPENED → IN_PROGRESS
```

### Status Definitions

  -----------------------------------------------------------------------
  Status                              Description
  ----------------------------------- -----------------------------------
  `OPEN`                              User has submitted the ticket.

  `PENDING_REVIEW`                    Ticket is waiting for admin review.

  `ACCEPTED`                          Admin has accepted the request.

  `IN_PROGRESS`                       Admin is actively working on the
                                      issue.

  `WAITING_FOR_USER`                  Additional information/action is
                                      required from the user.

  `RESOLVED`                          Admin believes the issue has been
                                      solved.

  `CLOSED`                            The ticket has been fully
                                      completed.

  `REJECTED`                          Admin has rejected the request.

  `REOPENED`                          User reports that the issue is
                                      still unresolved.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## Ticket Details

A user can view:

``` text
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

------------------------------------------------------------------------

## Progress Timeline

Each ticket includes a visual progress timeline:

``` text
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

Each timeline event contains:

-   Action
-   Actor
-   Date
-   Time

------------------------------------------------------------------------

## Accept & Reject

When an administrator receives a new ticket, the administrator can:

``` text
[Accept Ticket]
[Reject Ticket]
```

### Accept

The ticket moves from:

``` text
PENDING_REVIEW → ACCEPTED
```

The user sees:

> Your request has been accepted.

### Reject

The administrator must provide a rejection reason.

Example:

> This request is outside the scope of EMS support.

The rejection reason is visible to the user.

------------------------------------------------------------------------

## Ticket Conversation

Each ticket contains a User ↔ Admin conversation.

Example:

``` text
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

-   Rich text
-   Images
-   File attachments

Communication is completely REST API based.

------------------------------------------------------------------------

## Internal Notes

Administrators can add private internal notes to tickets.

Example:

``` text
Internal Note:
Checked application logs.
Issue is related to authentication.
```

Internal notes are visible only to administrators and are never exposed
to users.

------------------------------------------------------------------------

## Activity & Audit Timeline

Every important ticket action is recorded.

Example:

``` text
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

### Activity Types

``` text
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

------------------------------------------------------------------------

## Resolution & Reopening

When an administrator solves a ticket, they can select:

``` text
[Mark as Resolved]
```

A resolution summary is required.

Example:

``` text
Resolution:
Authentication service issue was fixed.
User should now be able to login normally.
```

### User Confirmation

After resolution, the user sees:

> Your issue has been marked as resolved.

Options:

``` text
[Confirm Resolution]
[Issue Still Exists]
```

### Confirm Resolution

``` text
RESOLVED → CLOSED
```

### Issue Still Exists

``` text
RESOLVED → REOPENED → IN_PROGRESS
```

------------------------------------------------------------------------

## Search & Filtering

### User Search

Users can search their own tickets by:

``` text
Ticket ID
Subject
```

### Admin Search

Administrators can search by:

``` text
Ticket ID
Email
User Name
Subject
```

If an external/unauthenticated ticket lookup is required, Ticket ID +
Email verification should be used.

### Admin Filters

``` text
Status
Priority
Category
Subcategory
Date Range
User
```

### Sorting

``` text
Newest
Oldest
Highest Priority
Recently Updated
SLA Deadline
```

Pagination is mandatory.

------------------------------------------------------------------------

## Notifications

### User Notifications

Users receive notifications for:

-   Ticket created
-   Ticket accepted
-   Ticket rejected
-   Admin replied
-   Status changed
-   Ticket resolved
-   Ticket closed
-   Ticket reopened

### Admin Notifications

Administrators receive notifications for:

-   New ticket
-   User replied
-   Ticket reopened
-   SLA warning
-   SLA breached

Notifications are database-based. Optional email notifications may also
be implemented.

No real-time socket notification is required.

------------------------------------------------------------------------

## Admin Dashboard

The admin dashboard provides:

``` text
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

### Today's Statistics

``` text
Tickets Created Today
Tickets Resolved Today
Tickets Closed Today
Tickets Rejected Today
```

Daily calculations use:

``` text
00:00:00 → 23:59:59
```

Timezone:

``` text
Asia/Dhaka
```

------------------------------------------------------------------------

## Admin Ticket Management

The admin ticket table includes:

``` text
Ticket ID
User
Subject
Category
Priority
Status
Created At
Updated At
```

Administrators can:

-   Accept
-   Reject
-   Change priority
-   Change status
-   Reply
-   Add internal notes
-   Resolve
-   Close
-   Reopen

------------------------------------------------------------------------

## SLA Management

SLA policies can be configured according to ticket priority.

Example:

  Priority     First Response   Resolution
  ---------- ---------------- ------------
  Critical             15 min      2 hours
  High                 30 min      4 hours
  Medium              2 hours     12 hours
  Low                 8 hours     48 hours

The system tracks:

``` text
Response Deadline
Resolution Deadline
SLA Status
```

### SLA Status

``` text
ON_TRACK
WARNING
BREACHED
COMPLETED
```

------------------------------------------------------------------------

## Category Management

Administrators can manage ticket categories and subcategories.

Operations:

``` text
Create
Update
Activate
Deactivate
```

Existing categories should preferably be deactivated rather than
permanently deleted so that historical tickets remain valid.

------------------------------------------------------------------------

## Database Structure

Core database tables:

``` text
users
tickets
ticket_categories
ticket_sub_categories
ticket_attachments
ticket_comments
ticket_internal_notes
ticket_activity_logs
ticket_status_history
notifications
sla_policies
audit_logs
```

### Users

``` text
id
name
email
password
role
isActive
createdAt
updatedAt
```

Role:

``` text
USER
ADMIN
```

### Tickets

``` text
id
ticketNumber
userId
categoryId
subCategoryId
subject
description
userPriority
adminPriority
status
queuePosition
slaDeadline
resolvedAt
closedAt
createdAt
updatedAt
```

### Ticket Attachments

``` text
id
ticketId
uploadedBy
fileName
fileUrl
cloudinaryPublicId
mimeType
fileSize
resourceType
createdAt
```

### Ticket Comments

``` text
id
ticketId
userId
content
createdAt
updatedAt
```

### Ticket Activity Logs

``` text
id
ticketId
actorId
action
oldValue
newValue
metadata
createdAt
```

### Notifications

``` text
id
userId
ticketId
title
message
type
isRead
createdAt
```

------------------------------------------------------------------------

## API Structure

Base URL:

``` text
/api/v1
```

### Authentication

``` http
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### Tickets

``` http
POST  /tickets
GET   /tickets
GET   /tickets/:id
PATCH /tickets/:id
```

### Ticket Actions

``` http
PATCH /tickets/:id/status
PATCH /tickets/:id/priority
PATCH /tickets/:id/accept
PATCH /tickets/:id/reject
PATCH /tickets/:id/resolve
PATCH /tickets/:id/reopen
```

### Conversation

``` http
GET  /tickets/:id/comments
POST /tickets/:id/comments
```

### Attachments

``` http
POST   /tickets/:id/attachments
GET    /tickets/:id/attachments
DELETE /tickets/:id/attachments/:attachmentId
```

### Activity

``` http
GET /tickets/:id/activity
```

### Notifications

``` http
GET   /notifications
PATCH /notifications/:id/read
```

### Admin

``` http
GET /admin/tickets
GET /admin/statistics
GET /admin/reports
GET /admin/audit-logs
```

------------------------------------------------------------------------

## Frontend Structure

``` text
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

### Reusable Components

``` text
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

------------------------------------------------------------------------

## Backend Structure

NestJS modular architecture:

``` text
src/
├── auth/
├── users/
├── tickets/
├── categories/
├── comments/
├── attachments/
├── notifications/
├── sla/
├── activity/
├── audit/
├── admin/
├── common/
└── prisma/
```

Major modules should follow separation of concerns:

``` text
Controller
Service
Repository
DTO
Validation
Interface
Constant
```

------------------------------------------------------------------------

## Validation & Error Handling

Validation must be implemented on both frontend and backend.

### Required Fields

``` text
Subject
Category
Priority
Description
```

### Attachment Validation

``` text
File Type
File Size
MIME Type
File Name
```

### Success Response

``` json
{
  "success": true,
  "message": "Ticket created successfully",
  "data": {}
}
```

### Error Response

``` json
{
  "success": false,
  "message": "Ticket not found",
  "errorCode": "TICKET_NOT_FOUND"
}
```

------------------------------------------------------------------------

## Security

The system must implement:

-   Authentication
-   Role-based authorization
-   DTO validation
-   Input sanitization
-   Rich-text sanitization
-   XSS protection
-   SQL injection protection
-   File validation
-   File size limits
-   Secure Cloudinary uploads
-   Rate limiting
-   Secure API headers
-   Audit logging
-   User-level ticket access control

### Access Rules

``` text
USER
  → Own tickets only

ADMIN
  → All tickets
```

Internal notes and administrative data must never be exposed to users.

------------------------------------------------------------------------

## Performance

The production system should implement:

-   Pagination
-   Database indexing
-   Optimized queries
-   Efficient filtering
-   Efficient searching
-   Cloudinary image optimization
-   Lazy loading where appropriate

Important indexes should include:

``` text
ticketNumber
userId
status
priority
categoryId
createdAt
```

The frontend must not load the entire ticket dataset at once.

------------------------------------------------------------------------

## Data Integrity

The system must ensure:

-   Unique ticket numbers
-   Valid foreign keys
-   Transaction-safe ticket creation
-   Valid status transitions
-   Consistent activity logs
-   Consistent status history
-   Valid attachment references

Category changes or deactivation must not break historical ticket
records.

------------------------------------------------------------------------

## Main Workflow

``` text
USER
  ↓
Create Ticket
  ↓
Unique Ticket ID
  ↓
Queue Position
  ↓
PENDING_REVIEW
  ↓
ADMIN
  ├───────────────┐
  ↓               ↓
ACCEPT          REJECT
  ↓               ↓
IN_PROGRESS     REJECTED
  ↓
WAITING_FOR_USER
  ↓
IN_PROGRESS
  ↓
RESOLVED
  ↓
USER CONFIRMATION
  ├───────────────┐
  ↓               ↓
CLOSED         REOPENED
                  ↓
              IN_PROGRESS
```

------------------------------------------------------------------------

## MVP Scope

### User

-   Support Dashboard
-   Today's Added/Solved Statistics
-   Create Ticket
-   Category/Subcategory
-   Priority
-   Rich Text Editor
-   Cloudinary Attachments
-   Unique Ticket ID
-   Queue Position
-   Ticket List
-   Ticket Details
-   Status Timeline
-   Conversation
-   Activity History
-   Notifications
-   Resolution Confirmation
-   Reopen Ticket
-   Search

### Admin

-   Admin Dashboard
-   Today's Statistics
-   Ticket Management
-   Search & Filter
-   Accept/Reject
-   Priority Management
-   Status Management
-   Conversation
-   Internal Notes
-   Resolve/Close/Reopen
-   Category Management
-   SLA Management
-   Audit Logs
-   Reports

------------------------------------------------------------------------

## Final Architecture

``` text
                         EMS PORTAL
                              │
                              ▼
                    ┌──────────────────┐
                    │     Next.js      │
                    │    TypeScript    │
                    └────────┬─────────┘
                             │
                          REST API
                             │
                             ▼
                    ┌──────────────────┐
                    │      NestJS      │
                    │    TypeScript    │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    ▼                  ▼
             ┌────────────┐     ┌────────────┐
             │   MySQL    │     │ Cloudinary │
             │  + Prisma  │     │   Storage  │
             └────────────┘     └────────────┘
```

------------------------------------------------------------------------

## Excluded Technologies

The project intentionally does **not** include:

``` text
WebSocket
Socket.IO
Redis
AI Support
Knowledge Base
FAQ System
```

The system is fully based on REST APIs and database-driven
communication.

------------------------------------------------------------------------

## Core Principle

The EMS Support System is a **REST-based modular enterprise support
ticketing system** where users can submit and track support requests
while administrators manage the complete ticket lifecycle.

Every important ticket action is recorded through activity and audit
logs, while uploaded images and files are stored securely in Cloudinary
and their metadata/references are maintained in MySQL.
