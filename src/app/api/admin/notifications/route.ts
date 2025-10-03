import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

// Dynamic import for web-push to avoid build issues
let webpush: typeof import('web-push') | null = null;
try {
  webpush = require('web-push');
} catch (error) {
  console.warn('web-push not available:', error);
}

// Configure web-push with VAPID keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

if (webpush && vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:admin@crm.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload: decoded } = await jwtVerify(token, secret);

    if (decoded.userId) {
      const user = await prisma.users.findUnique({
        where: { email: decoded.userId as string },
      });
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET /api/admin/notifications - Get all notifications (admin only)
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin' && user.role !== 'SuperAdmin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Direct database query without caching
    const notifications = await prisma.notifications.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        url: true,
        isRead: true,
        createdAt: true,
        updatedAt: true,
        senderId: true,
        users_notifications_senderIdTousers: {
          select: {
            name: true,
            email: true
          }
        },
        users_notifications_userIdTousers: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Transform notifications to include recipient info
    const transformedNotifications = notifications.map((notification: any) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      url: notification.url,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      sender: notification.users_notifications_senderIdTousers ? {
        name: notification.users_notifications_senderIdTousers.name,
        email: notification.users_notifications_senderIdTousers.email
      } : undefined,
      recipient: notification.users_notifications_userIdTousers ? {
        name: notification.users_notifications_userIdTousers.name,
        email: notification.users_notifications_userIdTousers.email,
        role: notification.users_notifications_userIdTousers.role
      } : undefined
    }));

    // Get counts using optimized aggregate queries
    const [totalCountResult, unreadCountResult] = await Promise.all([
      prisma.notifications.aggregate({
        _count: { id: true }
      }),
      prisma.notifications.aggregate({
        where: { isRead: false },
        _count: { id: true }
      })
    ]);

    const totalCount = totalCountResult._count.id;
    const unreadCount = unreadCountResult._count.id;

    const responseData = {
      notifications: transformedNotifications,
      totalCount,
      unreadCount,
      hasMore: offset + limit < totalCount
    };

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    console.error("Error fetching notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch notifications", details: errorMessage },
      { status: 500 }
    );
  }
}
