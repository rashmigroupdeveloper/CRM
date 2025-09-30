import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/lib/emailService";

function getYesterdayWindow() {
  const now = new Date();
  // Get yesterday's date
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const start = new Date(yesterday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(yesterday);
  end.setHours(23, 59, 59, 999);
  return { start, end, date: yesterday };
}

function authorize(request: Request) {
  const key = process.env.CRON_SECRET;
  if (!key) return true; // If no secret set, allow (development convenience)
  const url = new URL(request.url);
  const qsKey = url.searchParams.get('key');
  const headerKey = request.headers.get('x-cron-secret');
  return qsKey === key || headerKey === key;
}

export async function GET(request: Request) {
  try {
    if (!authorize(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const dryRun = url.searchParams.get('dryRun') === 'true';
    const targetDate = url.searchParams.get('date'); // Optional: specify a specific date

    let { start, end, date } = getYesterdayWindow();

    // If a specific date is provided, use that instead
    if (targetDate) {
      date = new Date(targetDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date format. Expected YYYY-MM-DD' }, { status: 400 });
      }
      start = new Date(date);
      start.setHours(0, 0, 0, 0);
      end = new Date(date);
      end.setHours(23, 59, 59, 999);
    }

    // Fetch all active members (non-admin users)
    const allMembers = await prisma.users.findMany({
      where: {
        role: { not: "admin" },
        enableNotifications: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true
      }
    });

    // Fetch yesterday's attendance submissions
    const attendanceRecords = await prisma.attendances.findMany({
      where: {
        date: { gte: start, lte: end }
      },
      select: {
        userId: true,
        submittedAt: true,
        status: true
      }
    });

    // Create a map of userId to attendance record
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      attendanceMap.set(record.userId, {
        submittedAt: record.submittedAt,
        status: record.status
      });
    });

    // Build attendance summary
    const attendanceList = allMembers.map(member => {
      const attendance = attendanceMap.get(member.id);
      return {
        name: member.name || 'Unknown',
        employeeCode: member.employeeCode || 'N/A',
        status: attendance ? 'Present' : 'Absent' as 'Present' | 'Absent',
        submittedAt: attendance?.submittedAt
          ? new Date(attendance.submittedAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit'
            })
          : undefined
      };
    });

    const present = attendanceList.filter(item => item.status === 'Present').length;
    const absent = attendanceList.filter(item => item.status === 'Absent').length;

    const attendanceSummary = {
      totalMembers: allMembers.length,
      present,
      absent,
      attendanceList
    };

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        date: date.toISOString().substring(0, 10),
        summary: attendanceSummary,
        sampleEmails: allMembers.slice(0, 3).map(m => m.email)
      });
    }

    // Verify SMTP before sending
    const verify = await emailService.verifyTransport();
    if (!verify.success) {
      return NextResponse.json({ error: 'SMTP verification failed', details: verify.details }, { status: 500 });
    }

    let sent = 0;
    const errors: string[] = [];

    // Send daily attendance summary to all members
    for (const member of allMembers) {
      if (!member.email) continue;

      try {
        const html = emailService.generateDailyAttendanceSummaryEmail(
          member.name || 'Team Member',
          date,
          attendanceSummary
        );

        const ok = await emailService.sendEmail({
          to: member.email,
          subject: `Daily Attendance Summary - ${date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}`,
          html
        });

        if (ok) sent += 1;
      } catch (error) {
        console.error(`Failed to send attendance summary to ${member.email}:`, error);
        errors.push(`${member.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      date: date.toISOString().substring(0, 10),
      totalMembers: allMembers.length,
      sent,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalMembers: attendanceSummary.totalMembers,
        present: attendanceSummary.present,
        absent: attendanceSummary.absent,
        attendanceRate: Math.round((attendanceSummary.present / attendanceSummary.totalMembers) * 100)
      }
    });

  } catch (error: unknown) {
    console.error('Daily attendance report cron error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal error', details: msg }, { status: 500 });
  }
}
