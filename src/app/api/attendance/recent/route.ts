import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { prisma } from "@/lib/prisma";
import { DATA_BACKEND } from "@/lib/config";

const MAX_DAYS = 31;
const DEFAULT_DAYS = 7;

interface AuthenticatedUser {
  id: number;
  email: string;
  role: string | null;
  name?: string | null;
}

const isPrivilegedRole = (role?: string | null) => {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === "admin" || normalized === "superadmin";
};

async function getUserFromToken(request: Request): Promise<AuthenticatedUser | null> {
  try {
    const token = request.headers
      .get("cookie")
      ?.split("token=")[1]
      ?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.userId) {
      const user = await prisma.users.findUnique({
        where: { email: payload.userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
      return user;
    }
    return null;
  } catch (error) {
    console.error("Attendance recent: token verification failed", error);
    return null;
  }
}

const toISODate = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().split("T")[0];
};

export async function GET(request: Request) {
  try {
    if (DATA_BACKEND !== "prisma") {
      return NextResponse.json(
        { error: "Attendance range endpoint is only available with Prisma backend" },
        { status: 501 }
      );
    }

    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const userIdParam = searchParams.get("userId");

    const requestedDays = daysParam ? Math.max(1, Math.min(MAX_DAYS, parseInt(daysParam, 10))) : DEFAULT_DAYS;
    const effectiveDays = Number.isFinite(requestedDays) ? requestedDays : DEFAULT_DAYS;

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (effectiveDays - 1));

    const isAdmin = isPrivilegedRole(user.role || undefined);
    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (userIdParam && isAdmin) {
      where.userId = parseInt(userIdParam, 10);
    } else if (!isAdmin) {
      where.userId = user.id;
    }

    const attendanceRecords = await prisma.attendances.findMany({
      where,
      include: {
        users_attendances_userIdTousers: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            role: true,
            department: true,
            location: true,
          },
        },
        users_attendances_reviewerIdTousers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { submittedAt: "desc" }],
    });

    const transformed = attendanceRecords.map((record) => {
      const dateIST = record.date.toISOString().split("T")[0];
      return {
        id: record.id.toString(),
        userId: record.userId.toString(),
        dateIST,
        dateUTC: record.date.toISOString(),
        date: dateIST,
        status: record.status,
        note: record.visitReport ?? "",
        timelineUrl: record.timelineUrl ?? undefined,
        timelineScreenshotUrl: record.timelineUrl ?? undefined,
        selfieUrl: record.photoUrl ?? undefined,
        submittedAtUTC: record.submittedAt?.toISOString(),
        submittedAt: record.submittedAt?.toISOString(),
        reviewedAtUTC: record.reviewedAt?.toISOString(),
        reviewedAt: record.reviewedAt?.toISOString(),
        reviewerId: record.reviewerId ? record.reviewerId.toString() : undefined,
        reviewNotes: record.reviewNotes ?? undefined,
        users_attendances_userIdTousers: record.users_attendances_userIdTousers,
        users_attendances_reviewerIdTousers:
          record.users_attendances_reviewerIdTousers ?? undefined,
        clientLat: record.latitude ?? undefined,
        clientLng: record.longitude ?? undefined,
        clientAccuracyM: record.accuracy ?? undefined,
        clientAltitude: record.altitude ?? undefined,
        clientSpeed: record.speed ?? undefined,
        clientHeading: record.heading ?? undefined,
        clientLocationTimestamp: record.locationTimestamp?.toISOString(),
        clientLocationMethod: record.locationSource ?? undefined,
        clientLocationAccuracyLevel: record.locationAccuracyLevel ?? undefined,
        clientAddress: record.address ?? undefined,
        clientCity: record.city ?? undefined,
        clientState: record.state ?? undefined,
        clientCountry: record.country ?? undefined,
        clientPostalCode: record.postalCode ?? undefined,
        clientLocationProvider: record.locationProvider ?? undefined,
        clientLocationWarnings: record.locationValidationWarnings ?? undefined,
      };
    });

    const rangeLabel = {
      startDate: toISODate(startDate),
      endDate: toISODate(endDate),
      days: effectiveDays,
    };

    const attendanceByDate = new Map<string, typeof transformed>();
    transformed.forEach((item) => {
      const bucket = attendanceByDate.get(item.dateIST) ?? [];
      bucket.push(item);
      attendanceByDate.set(item.dateIST, bucket);
    });

    const dailySummary = Array.from({ length: effectiveDays }, (_, offset) => {
      const day = new Date(endDate);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      const dateKey = toISODate(day);
      const records = attendanceByDate.get(dateKey) ?? [];
      const submitted = records.length;
      const approved = records.filter((record) => record.status === "APPROVED").length;
      const rejected = records.filter((record) => record.status === "REJECTED").length;
      const flagged = records.filter((record) => record.status === "AUTO_FLAGGED").length;

      return {
        date: dateKey,
        submitted,
        approved,
        rejected,
        flagged,
      };
    }).reverse();

    return NextResponse.json({
      attendance: transformed,
      range: rangeLabel,
      summary: dailySummary,
    });
  } catch (error) {
    console.error("Attendance recent endpoint error", error);
    return NextResponse.json(
      { error: "Failed to fetch recent attendance" },
      { status: 500 }
    );
  }
}
