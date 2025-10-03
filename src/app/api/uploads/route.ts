// This API route is deprecated and serverless-incompatible.
// All file uploads now use /api/upload (Cloudinary-based)
// This file is kept for backwards compatibility but should not be used.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json({
    error: "This upload endpoint is deprecated. Use /api/upload instead."
  }, { status: 410 });
}
