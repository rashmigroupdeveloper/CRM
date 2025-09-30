import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  // This route is just a placeholder for Socket.IO
  // The actual WebSocket connection is handled by the server setup
  return new Response('Socket.IO server running', { status: 200 });
}
