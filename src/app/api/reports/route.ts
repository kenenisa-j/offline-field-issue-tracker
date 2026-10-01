import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports, reportHistory } from '@/db/schema';
import { reportSchema } from '@/lib/validations/report';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const allReports = await db.select().from(reports);
        return NextResponse.json({ success: true, data: allReports }, { status: 200 });
    } catch (error: any) {
        console.error('Database connection error in GET /api/reports:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Could not connect to central database. Please verify your internet connection or server availability.',
            },
            { status: 503 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request payload against Zod schema
        const validationResult = reportSchema.safeParse(body);
        if (!validationResult.success) {
            const firstError = validationResult.error.issues?.[0]?.message || 'Validation failed';
            return NextResponse.json(
                { success: false, error: firstError, errors: validationResult.error.format() },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        // Idempotency check: Ensure clientId doesn't already exist
        const existing = await db
            .select()
            .from(reports)
            .where(eq(reports.clientId, data.clientId))
            .limit(1);

        if (existing.length > 0) {
            // Return existing record gracefully to support offline sync retries idempotently
            return NextResponse.json(
                { success: true, data: existing[0], message: 'Report already synced (idempotent response)' },
                { status: 200 }
            );
        }

        // Insert new report
        const [insertedReport] = await db
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

        // Log initial history event
        await db.insert(reportHistory).values({
            reportId: insertedReport.id,
            eventType: 'CREATED',
            fromStatus: null,
            toStatus: data.status,
            message: 'Report created and synced to server',
        });

        return NextResponse.json({ success: true, data: insertedReport }, { status: 201 });
    } catch (error: any) {
        console.error('Database connection error in POST /api/reports:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Could not synchronize report to central database. Please verify your network connection.',
            },
            { status: 500 }
        );
    }
}