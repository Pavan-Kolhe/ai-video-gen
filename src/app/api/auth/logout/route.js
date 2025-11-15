// src/app/api/auth/logout/route.js

/**
 * POST /api/auth/logout
 *
 * Logs out the current user by clearing the authentication cookie.
 *
 * Flow:
 * 1. Clear the JWT cookie
 * 2. Return success
 *
 * Note: JWT tokens are stateless, so we can't "invalidate" them server-side
 * without a token blacklist. For a hackathon, simply clearing the cookie
 * is sufficient. The token will expire naturally after 7 days.
 *
 * For production: Consider implementing a token blacklist or refresh token system.
 */

import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    // ===== CLEAR AUTHENTICATION COOKIE =====
    // This removes the JWT token from the client
    clearAuthCookie();

    console.log("User logged out");

    // ===== RETURN SUCCESS =====
    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        error: "Logout failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
