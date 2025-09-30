import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

// Redis cache TTL in seconds (5 minutes)
const CACHE_TTL = 300;

// Notification cache keys
export const CACHE_KEYS = {
  userNotifications: (userId: number, limit: number, offset: number) =>
    `notifications:user:${userId}:limit:${limit}:offset:${offset}`,
  userUnreadCount: (userId: number) => `notifications:user:${userId}:unread_count`,
  adminNotifications: (limit: number, offset: number) =>
    `notifications:admin:limit:${limit}:offset:${offset}`,
  adminUnreadCount: () => `notifications:admin:unread_count`,
  notificationById: (id: number) => `notification:id:${id}`
};

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 60000,
      },
    });

    redisClient.on('error', (err) => {
      console.warn('Redis Client Error:', err.message);
      // Don't throw error, just log it to allow app to continue without Redis
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    try {
      await redisClient.connect();
    } catch (error) {
      console.warn('Failed to connect to Redis:', error);
      redisClient = null;
    }
  }

  return redisClient!;
}

export async function setCache(key: string, value: any, ttl: number = CACHE_TTL): Promise<void> {
  try {
    if (!redisClient) return;

    const serializedValue = JSON.stringify(value);
    await redisClient.setEx(key, ttl, serializedValue);
  } catch (error) {
    console.warn('Redis set error:', error);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    if (!redisClient) return null;

    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    console.warn('Redis get error:', error);
  }
  return null;
}

export async function deleteCache(key: string): Promise<void> {
  try {
    if (!redisClient) return;
    await redisClient.del(key);
  } catch (error) {
    console.warn('Redis delete error:', error);
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    if (!redisClient) return;

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.warn('Redis delete pattern error:', error);
  }
}

// Notification-specific cache functions
export async function invalidateUserNotificationCache(userId: number): Promise<void> {
  try {
    await deleteCachePattern(`notifications:user:${userId}:*`);
  } catch (error) {
    console.warn('Error invalidating user notification cache:', error);
  }
}

export async function invalidateAdminNotificationCache(): Promise<void> {
  try {
    await deleteCachePattern('notifications:admin:*');
  } catch (error) {
    console.warn('Error invalidating admin notification cache:', error);
  }
}

export async function invalidateNotificationCache(notificationId?: number): Promise<void> {
  try {
    if (notificationId) {
      await deleteCache(CACHE_KEYS.notificationById(notificationId));
    }
    // Invalidate all user and admin caches when a notification is modified
    await deleteCachePattern('notifications:*');
  } catch (error) {
    console.warn('Error invalidating notification cache:', error);
  }
}

// Initialize Redis connection on module load
if (typeof window === 'undefined') { // Only on server side
  getRedisClient().catch(console.warn);
}
