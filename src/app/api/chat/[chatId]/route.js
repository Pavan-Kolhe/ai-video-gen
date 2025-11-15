// src/app/api/chat/[chatId]/route.js

/**
 * GET /api/chat/[chatId]
 *
 * Retrieves full conversation history for a specific chat.
 *
 * Flow:
 * 1. Verify user authentication
 * 2. Get chatId from URL params
 * 3. Fetch chat from database
 * 4. Verify user owns this chat
 * 5. Return full message history
 *
 * Used when user clicks on a previous chat from sidebar
 * to continue the conversation or view history.
 */

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getChatById } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    // ===== VERIFY AUTHENTICATION =====
    const userId = await getUserFromRequest();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ===== EXTRACT CHAT ID FROM URL =====
    const { chatId } = params;

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    // ===== GET CHAT FROM DATABASE =====
    const chat = await getChatById(chatId);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // ===== VERIFY OWNERSHIP =====
    // Security: Users can only view their own chats
    if (chat.userId.toString() !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Access denied" },
        { status: 403 }
      );
    }

    // ===== PROCESS CHAT DATA =====
    // Add computed fields for frontend convenience
    const processedChat = {
      id: chat._id.toString(),
      chatId: chat.chatId,
      lastPrompt: chat.lastPrompt,
      videoJobId: chat.videoJobId,

      // Full conversation history
      messages: chat.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        // Format timestamp for display
        timeFormatted: new Date(msg.timestamp).toLocaleString(),
      })),

      // Metadata
      messageCount: chat.messages.length,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,

      // Status flags
      hasVideo: !!chat.videoJobId,
      isActive: !chat.videoJobId, // Chat is active until video is generated
    };

    // ===== RETURN CHAT DATA =====
    return NextResponse.json({
      success: true,
      chat: processedChat,
    });
  } catch (error) {
    console.error("Get chat error:", error);

    return NextResponse.json(
      {
        error: "Failed to get chat",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
