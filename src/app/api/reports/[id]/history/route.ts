import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reportHistory } from '@/db/schema';
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

        const history = await db
            .select()
            .from(reportHistory)
            .where(eq(reportHistory.reportId, reportId));

        return NextResponse.json({ success: true, data: history }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}