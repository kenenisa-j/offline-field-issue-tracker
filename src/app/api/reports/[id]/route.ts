import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const reportId = parseInt(id, 10);
        if (isNaN(reportId)) {
            return NextResponse.json({ success: false, error: 'Invalid report ID' }, { status: 400 });
        }

        const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);

        if (!report) {
            return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: report }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}