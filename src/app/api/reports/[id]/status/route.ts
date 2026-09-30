import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports, reportHistory } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { canTransition } from '@/lib/workflow/transitions';
import { reportStatusSchema } from '@/lib/validations/report';
import { z } from 'zod';

const updateStatusSchema = z.object({
    nextStatus: reportStatusSchema,
    message: z.string().max(500, 'Message is too long').optional(),
    changedBy: z.string().min(1, 'changedBy is required'),
});

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const reportId = parseInt(params.id, 10);
        if (isNaN(reportId)) {
            return NextResponse.json({ success: false, error: 'Invalid report ID' }, { status: 400 });
        }

        const body = await request.json();

        // Validate request payload against backend Zod schema
        const validationResult = updateStatusSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { success: false, errors: validationResult.error.format() },
                { status: 400 }
            );
        }

        const { nextStatus, message, changedBy } = validationResult.data;

        // Fetch current report state
        const [currentReport] = await db
            .select()
            .from(reports)
            .where(eq(reports.id, reportId))
            .limit(1);

        if (!currentReport) {
            return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
        }

        const currentStatus = currentReport.status as any;

        // Validate workflow transition rules server-side
        if (!canTransition(currentStatus, nextStatus)) {
            return NextResponse.json(
                { success: false, error: `Invalid status transition from ${currentStatus} to ${nextStatus}` },
                { status: 400 }
            );
        }

        // Perform database update and audit log creation
        const [updatedReport] = await db
            .update(reports)
            .set({
                status: nextStatus,
                updatedAt: new Date(),
                version: currentReport.version + 1,
            })
            .where(eq(reports.id, reportId))
            .returning();

        await db.insert(reportHistory).values({
            reportId,
            eventType: 'STATUS_CHANGE',
            fromStatus: currentStatus,
            toStatus: nextStatus,
            message: message || `Status changed from ${currentStatus} to ${nextStatus} by ${changedBy}`,
        });

        return NextResponse.json({ success: true, data: updatedReport }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}