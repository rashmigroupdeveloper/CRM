/**
 * Redis stub for serverless compatibility
 * This file imports are disabled to ensure serverless deployment works
 * All Redis functionality has been removed for Vercel/serverless compatibility
 */

// Disabled Redis imports to prevent build failures in serverless environments
// import { createClient, RedisClientType } from 'redis';

// Cache TTL placeholder (no longer used)
const CACHE_TTL = 300;

// Notification cache keys (kept for interface compatibility)
export const CACHE_KEYS = {
  userNotifications: (userId: number, limit: number, offset: number) =>
    `notifications:user:${userId}:limit:${limit}:offset:${offset}`,
  userUnreadCount: (userId: number) => `notifications:user:${userId}:unread_count`,
  adminNotifications: (limit: number, offset: number) =>
    `notifications:admin:limit:${limit}:offset:${offset}`,
  adminUnreadCount: () => `notifications:admin:unread_count`,
  notificationById: (id: number) => `notification:id:${id}`
};

// Stub functions that do nothing (for serverless compatibility)
export async function getRedisClient(): Promise<any> {
  return null;
}

export async function setCache(key: string, value: any, ttl: number = CACHE_TTL): Promise<void> {
  // No-op for serverless
  return Promise.resolve();
}

export async function getCache<T>(key: string): Promise<T | null> {
  // Always return null for serverless (no caching)
  return Promise.resolve(null);
}

export async function deleteCache(key: string): Promise<void> {
  // No-op for serverless
  return Promise.resolve();
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  // No-op for serverless
  return Promise.resolve();
}

// Notification-specific cache functions (no-op for serverless)
export async function invalidateUserNotificationCache(userId: number): Promise<void> {
  return Promise.resolve();
}

export async function invalidateAdminNotificationCache(): Promise<void> {
  return Promise.resolve();
}

export async function invalidateNotificationCache(notificationId?: number): Promise<void> {
  return Promise.resolve();
}
