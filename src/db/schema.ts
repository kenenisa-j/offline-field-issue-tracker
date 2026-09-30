import { pgTable, serial, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core';

export const reports = pgTable('reports', {
    id: serial('id').primaryKey(),
    clientId: uuid('client_id').notNull().unique(), // Enforces strict unique constraint for offline idempotency
    category: text('category').notNull(),
    description: text('description').notNull(),
    location: text('location').notNull(),
    priority: text('priority').notNull(),
    status: text('status').notNull(),
    reportedAt: timestamp('reported_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    syncStatus: text('sync_status').notNull().default('PENDING'),
    syncError: text('sync_error'),
    version: integer('version').notNull().default(1),
});

export const reportHistory = pgTable('report_history', {
    id: serial('id').primaryKey(),
    reportId: integer('report_id')
        .notNull()
        .references(() => reports.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    fromStatus: text('from_status'),              // Nullable for initial creation events
    toStatus: text('to_status').notNull(),
    message: text('message'),                     // Optional context message
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type DBReport = typeof reports.$inferSelect;
export type NewDBReport = typeof reports.$inferInsert;
export type DBReportHistory = typeof reportHistory.$inferSelect;