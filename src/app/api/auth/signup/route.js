// src/app/api/auth/signup/route.js

/**
 * POST /api/auth/signup
 *
 * User registration endpoint. Creates a new user account.
 *
 * Flow:
 * 1. Validate email and password format
 * 2. Check if email already exists in database
 * 3. Hash password with bcrypt (never store plain passwords!)
 * 4. Create user document in MongoDB
 * 5. Generate JWT token
 * 6. Set httpOnly cookie with token
 * 7. Return user data (without password)
 *
 * Security:
 * - Password hashed with bcrypt (10 rounds)
 * - JWT stored in httpOnly cookie (prevents XSS attacks)
 * - Email uniqueness enforced at database level
 */

import { NextResponse } from "next/server";
import { createUser } from "@/lib/db";
import { hashPassword, generateToken, setAuthCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    // ===== PARSE REQUEST BODY =====
    const body = await request.json();
    const { email, password, name } = body;

    // ===== VALIDATION =====

    // Check required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Optional: Additional password requirements
    // Uncomment if you want stronger passwords
    // const hasUpperCase = /[A-Z]/.test(password);
    // const hasLowerCase = /[a-z]/.test(password);
    // const hasNumber = /[0-9]/.test(password);
    // if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    //   return NextResponse.json(
    //     { error: 'Password must contain uppercase, lowercase, and number' },
    //     { status: 400 }
    //   );
    // }

    // ===== HASH PASSWORD =====
    // Never store plain text passwords!
    // bcrypt automatically salts the password
    const hashedPassword = await hashPassword(password);
    console.log("Password hashed successfully");

    // ===== CREATE USER IN DATABASE =====
    let userId;
    try {
      userId = await createUser(
        email.toLowerCase().trim(), // Normalize email
        hashedPassword,
        name?.trim() || null // Optional name field
      );
      console.log("User created:", userId);
    } catch (dbError) {
      // Check if error is due to duplicate email
      if (dbError.message.includes("already exists")) {
        return NextResponse.json(
          { error: "Email already registered. Please login instead." },
          { status: 409 } // 409 = Conflict
        );
      }
      throw dbError; // Re-throw other errors
    }

    // ===== GENERATE JWT TOKEN =====
    // Token contains userId and expires in 7 days
    const token = await generateToken(userId);
    console.log("JWT token generated");

    // ===== SET AUTHENTICATION COOKIE =====
    // httpOnly = JavaScript can't access (XSS protection)
    // secure = Only sent over HTTPS in production
    // sameSite = CSRF protection
    setAuthCookie(token);

    // ===== RETURN SUCCESS RESPONSE =====
    // NEVER return the password or hashed password!
    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: {
          id: userId.toString(),
          email: email.toLowerCase(),
          name: name || null,
        },
      },
      { status: 201 }
    ); // 201 = Created
  } catch (error) {
    console.error("Signup error:", error);

    return NextResponse.json(
      {
        error: "Failed to create account",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
