This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.






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











