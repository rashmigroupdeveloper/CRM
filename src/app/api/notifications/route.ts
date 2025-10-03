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

// GET /api/notifications - Get notifications for user
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Direct database query without caching
    const notifications = await prisma.notifications.findMany({
      where: {
        userId: user.id,
      },
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
        categoryId: true,
        users_notifications_senderIdTousers: {
          select: {
            name: true,
            email: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true
          }
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        }
      }
    });

    // Get counts using optimized aggregate queries
    const [totalCountResult, unreadCountResult] = await Promise.all([
      prisma.notifications.aggregate({
        where: { userId: user.id },
        _count: { id: true }
      }),
      prisma.notifications.aggregate({
        where: {
          userId: user.id,
          isRead: false
        },
        _count: { id: true }
      })
    ]);

    const totalCount = totalCountResult._count.id;
    const unreadCount = unreadCountResult._count.id;

    const responseData = {
      notifications,
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

// POST /api/notifications - Send notification
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, message, type, recipientId, recipientIds, url, sendPush = true, categoryId, tagIds } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    // Determine recipients
    let recipients: number[] = [];
    if (recipientId) {
      recipients = [recipientId];
    } else if (recipientIds && Array.isArray(recipientIds)) {
      recipients = recipientIds;
    } else if (user.role === 'admin' || user.role === 'SuperAdmin') {
      // Admin can send to all users
      const allUsers = await prisma.users.findMany({
        select: { id: true }
      });
      recipients = allUsers.map((u: { id: number }) => u.id);
    } else {
      recipients = [user.id];
    }

    // Create notifications in database
    const notifications = await Promise.all(
      recipients.map(recipientId =>
        prisma.notifications.create({
          data: {
            title,
            message,
            type: type || 'info',
            userId: recipientId,
            senderId: user.id,
            url: url || '/dashboard',
            categoryId: categoryId || null,
            isRead: false,
            updatedAt: new Date(),
            tags: tagIds && tagIds.length > 0 ? {
              create: tagIds.map((tagId: string | number) => ({
                tagId: tagId
              }))
            } : undefined
          },
          include: {
            users_notifications_senderIdTousers: {
              select: { name: true, email: true }
            },
            category: {
              select: {
                id: true,
                name: true,
                color: true,
                icon: true
              }
            },
            tags: {
              include: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    color: true
                  }
                }
              }
            }
          }
        })
      )
    );

    // Note: Real-time broadcasting removed - clients will poll for updates

    // Send push notifications if requested
    if (sendPush && webpush && vapidKeys.publicKey && vapidKeys.privateKey) {
      try {
        // Get push subscriptions for recipients
        const pushSubscriptions = await prisma.push_subscriptions.findMany({
          where: {
            userId: {
              in: recipients
            }
          }
        });

        // Send push notifications
        const pushPromises = pushSubscriptions.map(async (subscription: any) => {
          try {
            if (typeof subscription.endpoint === 'string' && subscription.endpoint.includes('notify.windows.com')) {
              console.warn('Detected Windows Notification Service endpoint; removing unsupported subscription.', {
                subscriptionId: subscription.id,
                endpoint: subscription.endpoint
              });
              await prisma.push_subscriptions.delete({
                where: { id: subscription.id }
              });
              return;
            }
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth
                }
              },
              JSON.stringify({
                title,
                body: message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                url: url || '/dashboard',
                primaryKey: notifications[0]?.id || 1
              })
            );
          } catch (error) {
            console.error('Error sending push notification:', error);
            // Remove invalid subscriptions
            const status = (error as any)?.statusCode;

            if (status === 410 || status === 404) {
              await prisma.push_subscriptions.delete({
                where: { id: subscription.id }
              });
            }

            if (status === 401) {
              console.warn('Received 401 from push service; marking subscription as unsupported and removing.', {
                subscriptionId: subscription.id,
                endpoint: subscription.endpoint
              });
              await prisma.push_subscriptions.delete({
                where: { id: subscription.id }
              });
            }
          }
        });

        await Promise.all(pushPromises);
      } catch (error) {
        console.error('Error sending push notifications:', error);
      }
    }

    return NextResponse.json({
      success: true,
      notifications,
      message: `Notification sent to ${recipients.length} recipient(s)`
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Error sending notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to send notification", details: errorMessage },
      { status: 500 }
    );
  }
}
