import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { invalidateAdminNotificationCache } from "@/lib/redis";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.userId) {
      const user = await prisma.users.findUnique({
        where: { email: payload.userId as string },
      });
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// PUT /api/admin/notifications/read-all - Admin mark all notifications as read
export async function PUT(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin' && user.role !== 'SuperAdmin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark all unread notifications as read
    const result = await prisma.notifications.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        updatedAt: new Date()
      }
    });

    // Invalidate admin notification cache
    await invalidateAdminNotificationCache();

    return NextResponse.json({
      success: true,
      message: `Marked ${result.count} notifications as read`,
      count: result.count
    });

  } catch (error: unknown) {
    console.error("Error marking all notifications as read:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to mark all notifications as read", details: errorMessage },
      { status: 500 }
    );
  }
}
