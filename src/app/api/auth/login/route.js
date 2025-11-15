// src/app/api/auth/login/route.js

/**
 * POST /api/auth/login
 *
 * User authentication endpoint. Logs in existing user.
 *
 * Flow:
 * 1. Validate email and password provided
 * 2. Find user by email in database
 * 3. Compare provided password with stored hash
 * 4. If match: Generate JWT token
 * 5. Set httpOnly cookie with token
 * 6. Update lastLoginAt timestamp
 * 7. Return user data (without password)
 *
 * Security:
 * - Uses bcrypt.compare() for constant-time comparison (prevents timing attacks)
 * - JWT expires in 7 days
 * - Rate limiting recommended (TODO: Add after hackathon)
 */

import { NextResponse } from "next/server";
import { getUserByEmail, updateLastLogin } from "@/lib/db";
import { verifyPassword, generateToken, setAuthCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    // ===== PARSE REQUEST BODY =====
    const body = await request.json();
    const { email, password } = body;

    // ===== VALIDATION =====
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // ===== FIND USER IN DATABASE =====
    const user = await getUserByEmail(email.toLowerCase().trim());

    // Generic error message (don't reveal if email exists or not)
    // This prevents email enumeration attacks
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 } // 401 = Unauthorized
      );
    }

    // ===== VERIFY PASSWORD =====
    // bcrypt.compare() is safe against timing attacks
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      console.log("Invalid password attempt for:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    console.log("User authenticated:", user._id);

    // ===== GENERATE JWT TOKEN =====
    const token = await generateToken(user._id);

    // ===== SET AUTHENTICATION COOKIE =====
    setAuthCookie(token);

    // ===== UPDATE LAST LOGIN TIMESTAMP =====
    // Fire and forget - don't wait for this
    updateLastLogin(user._id).catch((err) =>
      console.error("Failed to update lastLoginAt:", err)
    );

    // ===== RETURN SUCCESS RESPONSE =====
    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        error: "Login failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
