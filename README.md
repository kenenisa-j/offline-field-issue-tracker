# Field Issue Tracker 🛠️🛰️

An offline-capable issue reporting and tracking application for field workers and coordinators operating in environments with unreliable connectivity.

## 📌 What Problem Does This Application Solve?

Field workers may need to report infrastructure problems such as broken water points, damaged equipment, service interruptions, safety concerns, or maintenance requirements while working in areas with unreliable or unavailable internet connectivity.

A network-dependent reporting system can cause several problems:

- **Data Loss:** A report may be lost when a connection fails during submission.
- **Network Dependency:** Workers may be unable to record an issue when there is no internet connection.
- **Duplicate Records:** Retrying a submission after an uncertain network failure can create duplicate records on the server.
- **Invalid Workflow States:** Reports can become difficult to manage if status transitions are not properly controlled.
- **Limited Traceability:** Without a history of important actions, it is difficult to understand when a report was created, synchronized, or updated.

### The Solution

**Field Issue Tracker** uses an offline-capable architecture that allows field workers to continue recording reports without depending on an active network connection.

The application:

1. **Persists Reports Locally**  
   Reports are saved to client-side IndexedDB storage so they remain available after page refreshes or reopening the application.

2. **Synchronizes When Connectivity Returns**  
   Reports that have not reached the server are kept in a pending state and synchronized when a connection becomes available.

3. **Handles Synchronization Failures**  
   Failed synchronization attempts do not delete the local report. The report remains available for retry and its synchronization state is clearly shown.

4. **Prevents Duplicate Server Records**  
   Each report receives a unique client identifier. The backend uses this identifier to make synchronization idempotent, preventing the same report from being created multiple times when a request is retried.

5. **Enforces the Report Workflow**  
   Reports follow controlled status transitions from `Draft` → `Submitted` → `Assigned` → `In Progress` → `Resolved`, with `Rejected` supported where appropriate.

6. **Maintains Report History**  
   Important events such as report creation, synchronization, failures, and status changes are recorded for traceability.

7. **Supports Two Simulated Roles**  
   Field Workers create and submit reports, while Coordinators review reports and manage their workflow.






## 🚀 How to Run Locally

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL

### Setup

```bash
git clone https://github.com/kenenisa-j/offline-field-issue-tracker.git
cd offline-field-issue-tracker
npm install
```

Create a `.env.local` file in the project root:

```env
DATABASE_URL=your_postgresql_connection_string
```

Set up the database:

```bash
npm run db:push
```

Start the application:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Run Tests

```bash
npm test
```

## 🏗️ Architecture

Field Issue Tracker uses an offline-capable client architecture. Report data is first persisted locally, allowing field workers to create reports without network connectivity. When connectivity is available, pending reports are synchronized with the backend API and stored in PostgreSQL.

```text
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Application                     │
│                                                             │
│  ┌─────────────────┐          ┌─────────────────────────┐  │
│  │    Report UI    │          │    Synchronization      │  │
│  │                 │          │        Engine           │  │
│  │ • Create        │          │                         │  │
│  │ • View          │          │ • Pending queue         │  │
│  │ • Details       │          │ • Retry failed sync     │  │
│  │ • Coordinator   │          │ • Sync state tracking   │  │
│  └────────┬────────┘          └────────────┬────────────┘  │
│           │                                │               │
│           └───────────────┬────────────────┘               │
│                           ▼                                │
│                 ┌─────────────────────┐                    │
│                 │  IndexedDB / Dexie   │                    │
│                 │                     │                    │
│                 │ Reports + Sync State │                    │
│                 │ + Local History      │                    │
│                 └──────────┬──────────┘                    │
└────────────────────────────┼────────────────────────────────┘
                             │
                    Internet Available
                             │
                             ▼
                  ┌─────────────────────┐
                  │     Backend API     │
                  │ Next.js Route APIs  │
                  │                     │
                  │ • Validation        │
                  │ • Workflow Rules    │
                  │ • Idempotency       │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │     PostgreSQL      │
                  │                     │
                  │ • Reports           │
                  │ • Report History    │
                  └─────────────────────┘
```

### Offline Data Flow

```text
[ IndexedDB / Dexie.js ]
          │
          │ Local write
          │ + local audit event
          ▼
[ Local Report ]
[ Sync Status: PENDING ]
          │
          │ Connectivity available
          ▼
[ Sync Engine / Queue Manager ]
          │
          │ Idempotent HTTP request
          │ using unique clientId
          ▼
[ Backend API ]
          │
          │ Validate + enforce
          │ workflow + idempotency
          ▼
[ PostgreSQL / Server Database ]
          │
          ▼
[ Synchronization Result ]
     ┌────┴─────┐
     │          │
  Success     Failure
     │          │
     ▼          ▼
  SYNCED      FAILED
                │
                ▼
              Retry
```

## 🔁 Idempotency & Duplicate Prevention

Offline synchronization must account for an important network failure scenario: the server may successfully process a report, but the client may never receive the response because the connection is interrupted.

### The Retry Problem

For example:

```text
Client
  │
  │ POST report (clientId = abc-123)
  ▼
Server
  │
  │ Saves report successfully
  ▼
Database
  │
  X  Response lost because connection fails
  │
  ▼
Client assumes synchronization failed
  │
  ▼
Retry same report
```

## 🧩 Assumptions & Design Decisions

The assignment intentionally leaves several implementation details unspecified. The following assumptions define the scope and behavior of the application.

### Editing

Reports can be edited while they are still local drafts.

Once a report has been submitted, the field worker cannot freely modify the synchronized report. This prevents local changes from conflicting with coordinator workflow changes.

For this exercise, editing already-synchronized reports is outside the primary scope.

### Conflicts

The application is designed primarily around offline report creation rather than concurrent editing of the same report from multiple devices.

Once a report has been synchronized, the server becomes the authoritative source for its workflow state.

Complex multi-device conflict resolution is outside the scope of this six-hour exercise. Instead, editing is restricted after submission to reduce the possibility of conflicting changes.

### Reopening Reports

Resolved and rejected reports cannot be reopened by field workers.

The implemented workflow does not include a reopening transition:

```text
Resolved → Reopened
Rejected → Reopened
```

## ⚠️ Known Limitations

The application is intentionally scoped to the core requirements of the exercise. The following capabilities are not included in the current implementation:

- **No Authentication:** Field Worker and Coordinator roles are simulated. There is no user account, login, or production authentication system.

- **No Background Service Worker Sync:** Synchronization is handled by the application while the client is active. A production version could use Service Workers and the Background Sync API to improve synchronization when the application is not actively open.

- **No File Attachments:** Reports currently contain structured data such as category, description, location, priority, and timestamps. Offline photos, audio recordings, documents, and other binary attachments are not supported.

- **No Advanced Conflict Resolution:** The system focuses on offline report creation and synchronization rather than concurrent editing of the same report across multiple devices. More advanced conflict-resolution strategies could be added in a future version.

- **No Native Mobile Application:** The current implementation is a web application designed to work across desktop and mobile browsers. A dedicated Android or iOS application is outside the scope of this exercise.

- **Limited Reopening Workflow:** Resolved and rejected reports cannot be reopened by field workers. Supporting controlled reopening would require additional workflow rules and permissions.

- **Simulated Role Permissions:** Because authentication is not implemented, role separation is a workflow/UI concern rather than a security boundary.

## 🧪 Manual QA Checklist

The following scenarios can be used to verify the application's behavior in a real browser environment.

### Offline Report Creation

- [ ] Start the application while online.
- [ ] Switch the browser's network state to **Offline** using DevTools.
- [ ] Create and submit a new field issue.
- [ ] Verify the report is saved locally.
- [ ] Verify the report shows a `PENDING` sync state.
- [ ] Refresh the page while still offline.
- [ ] Verify the report is still available.

### Synchronization

- [ ] Restore the browser's network state to **Online**.
- [ ] Trigger synchronization.
- [ ] Verify the pending report is sent to the backend.
- [ ] Verify the report changes from `PENDING` to `SYNCED`.
- [ ] Verify the report exists in the server database.

### Failed Synchronization and Retry

- [ ] Create or use a pending report.
- [ ] Make the synchronization request fail.
- [ ] Verify the report changes to `FAILED`.
- [ ] Verify the local report is not deleted.
- [ ] Restore the backend/network.
- [ ] Retry synchronization.
- [ ] Verify the report synchronizes successfully.

### Duplicate Prevention

- [ ] Attempt to synchronize the same report more than once.
- [ ] Verify the same `clientId` is used for each attempt.
- [ ] Verify repeated synchronization does not create duplicate server records.

### Workflow Validation

- [ ] Verify `Draft → Submitted` works.
- [ ] Verify `Submitted → Assigned` works.
- [ ] Verify `Submitted → Rejected` works.
- [ ] Verify `Assigned → In Progress` works.
- [ ] Verify `In Progress → Resolved` works.
- [ ] Attempt an invalid transition such as `Draft → Resolved`.
- [ ] Verify the invalid transition is rejected.

### History

- [ ] Create a report and verify the creation event is recorded.
- [ ] Synchronize a report and verify the synchronization event is recorded.
- [ ] Cause a synchronization failure and verify the failure is recorded.
- [ ] Change the report status and verify the status change is recorded.

## 🧪 Automated Testing

### Running the Tests

Install dependencies:

```bash
npm install
```

### Unit Tests (Vitest)

Run all unit tests:

```bash
npm test
```

The automated test suite contains 20 tests across 11 test files covering workflow state transitions, input validation, offline persistence, refresh persistence, synchronization success and failure, synchronization retries, duplicate prevention, report history, and pulling server updates.

## 🔮 Future Improvements

If this were developed beyond the exercise scope, possible improvements would include:

- Background synchronization using Service Workers and the Background Sync API.
- Authentication and real role-based authorization.
- Offline photo and file attachments.
- More advanced multi-device conflict resolution.
- Controlled reopening of resolved or rejected reports.
- Push notifications for coordinators and field workers.
- A dedicated mobile application for Android and iOS.
- More comprehensive integration and end-to-end testing.
## 🤖 AI & Development Tool Disclosure

AI was used as a supporting development tool during this project.

### AI-Assisted Areas

AI assistance was mainly used for:

- **Code Writing:** Assisting with portions of the implementation and providing code suggestions. The project also contains code written directly by me.
- **Code Review & Debugging:** Reviewing implementation, identifying potential issues, and discussing possible fixes.
- **Documentation:** Helping structure, review, and refine the README and technical documentation.

### Developer-Led Areas

The following areas were primarily designed and decided by me:

- **Architecture:** I designed the overall application architecture and technology choices.
- **Design Decisions:** I made the main decisions around offline persistence, synchronization, workflow states, duplicate prevention, and failure handling.
- **Testing Strategy:** I decided which core behaviors and edge cases needed to be tested.

AI-generated suggestions and code were reviewed, adapted, and tested during development. I also wrote and modified code independently throughout the project. I remained responsible for the implementation, technical decisions, testing, and final result.

AI was used as an engineering assistant rather than as a substitute for understanding or verification.




## ⏱️ Approximate Development Time

Approximately 6 hours of active development and testing.









