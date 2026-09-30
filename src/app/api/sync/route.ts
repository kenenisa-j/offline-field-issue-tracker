import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports, reportHistory } from '@/db/schema';
import { reportSchema } from '@/lib/validations/report';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { items } = body; // Expects an array of offline reports to sync

        if (!Array.isArray(items)) {
            return NextResponse.json({ success: false, error: 'Payload must contain an items array' }, { status: 400 });
        }

        const results = [];

        for (const item of items) {
            const validationResult = reportSchema.safeParse(item);
            if (!validationResult.success) {
                results.push({ clientId: item?.clientId, success: false, error: 'Validation failed' });
                continue;
            }

            const data = validationResult.data;

            try {
                // Check if already exists (idempotency)
                const existing = await db
                    .select()
                    .from(reports)
                    .where(eq(reports.clientId, data.clientId))
                    .limit(1);

                if (existing.length > 0) {
                    results.push({ clientId: data.clientId, success: true, status: 'ALREADY_EXISTS' });
                    continue;
                }

                const [inserted] = await db
                    .insert(reports)
                    .values({
                        clientId: data.clientId,
                        category: data.category,
                        description: data.description,
                        location: data.location,
                        priority: data.priority,
                        status: data.status,
                        reportedAt: new Date(data.reportedAt),
                        syncStatus: 'SYNCED',
                        version: data.version,
                    })
                    .returning();

                await db.insert(reportHistory).values({
                    reportId: inserted.id,
                    eventType: 'SYNCED',
                    fromStatus: null,
                    toStatus: data.status,
                    message: 'Synced from offline queue',
                });

                results.push({ clientId: data.clientId, success: true, id: inserted.id });
            } catch (err: any) {
                results.push({ clientId: data.clientId, success: false, error: err.message });
            }
        }

        return NextResponse.json({ success: true, results }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}