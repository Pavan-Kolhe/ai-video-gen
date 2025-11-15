// src/app/api/auth/me/route.js

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's information.
 * Used by frontend to check if user is logged in and get user data.
 *
 * Flow:
 * 1. Extract JWT token from cookie
 * 2. Verify token is valid
 * 3. Get userId from token payload
 * 4. Fetch user data from database
 * 5. Return user info (without password)
 *
 * This endpoint is called on app load to restore user session.
 * If token is invalid/expired, frontend redirects to login.
 */

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getUserById } from "@/lib/db";

export async function GET(request) {
  try {
    // ===== VERIFY AUTHENTICATION =====
    // Extract userId from JWT cookie
    const userId = await getUserFromRequest();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // ===== GET USER FROM DATABASE =====
    const user = await getUserById(userId);

    if (!user) {
      // User was deleted but token still exists
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ===== RETURN USER DATA =====
    // NEVER include password in response!
    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return NextResponse.json(
      {
        error: "Failed to get user data",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
