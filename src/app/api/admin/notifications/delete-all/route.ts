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

// DELETE /api/admin/notifications/delete-all - Admin delete all notifications
export async function DELETE(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin' && user.role !== 'SuperAdmin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete all notifications
    const result = await prisma.notifications.deleteMany({});

    // Invalidate admin notification cache
    await invalidateAdminNotificationCache();

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} notifications`,
      count: result.count
    });

  } catch (error: unknown) {
    console.error("Error deleting all notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to delete all notifications", details: errorMessage },
      { status: 500 }
    );
  }
}
