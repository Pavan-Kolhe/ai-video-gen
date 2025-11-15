// src/app/api/chat/create/route.js

/**
 * POST /api/chat/create
 *
 * Creates a new chat conversation. Called when user starts a new video project.
 *
 * Flow:
 * 1. Verify user is authenticated (get userId from JWT)
 * 2. Validate initial message
 * 3. Create chat document in MongoDB with first message
 * 4. Return chatId for frontend to use
 *
 * A chat is a conversation thread where user refines their prompt
 * before generating the final video.
 */

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { createChat } from "@/lib/db";

export async function POST(request) {
  try {
    // ===== VERIFY AUTHENTICATION =====
    const userId = await getUserFromRequest();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      );
    }

    // ===== PARSE REQUEST BODY =====
    const body = await request.json();
    const { message } = body;

    // ===== VALIDATION =====
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Initial message is required" },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: "Message too long. Maximum 500 characters." },
        { status: 400 }
      );
    }

    // ===== CREATE CHAT IN DATABASE =====
    // This creates a new conversation thread
    const chatId = await createChat(userId, message.trim());

    console.log(`Chat created: ${chatId} for user: ${userId}`);

    // ===== RETURN SUCCESS =====
    return NextResponse.json(
      {
        success: true,
        chatId,
        message: "Chat created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create chat error:", error);

    return NextResponse.json(
      {
        error: "Failed to create chat",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
