/**
 * SQLite stub for serverless compatibility
 * SQLite is not compatible with Vercel serverless environments
 * All file uploads now use Cloudinary instead
 */

// Disable SQLite for serverless compatibility
const db = null;

console.log('SQLite disabled for serverless compatibility - using Cloudinary for file uploads');

// Mock database interface for production
const mockDb = {
  prepare: (sql: string) => ({
    run: (...args: any[]) => ({
      lastInsertRowid: Date.now(), // Mock ID
      changes: 1
    }),
    all: (...args: any[]) => [],
    get: (...args: any[]) => null
  })
};

export default db || mockDb;
