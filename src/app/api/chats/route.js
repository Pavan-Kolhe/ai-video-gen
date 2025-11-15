// src/app/api/chats/route.js

/**
 * GET /api/chats
 *
 * Returns list of all chats for the current user.
 * Used to populate the chat sidebar/history.
 *
 * Flow:
 * 1. Verify user authentication
 * 2. Query all chats for this user
 * 3. Sort by most recent first
 * 4. Return chat summaries (not full messages)
 *
 * Each chat summary includes: chatId, lastPrompt, message count,
 * timestamps, and whether video was generated.
 */

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getUserChats } from "@/lib/db";

export async function GET(request) {
  try {
    // ===== VERIFY AUTHENTICATION =====
    const userId = await getUserFromRequest();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ===== QUERY PARAMETERS (Optional) =====
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit")) || 20;
    const onlyActive = searchParams.get("onlyActive") === "true"; // Chats without videos

    // ===== GET USER'S CHATS =====
    let chats = await getUserChats(userId, limit);

    // Optional: Filter to only show active chats (no video generated yet)
    if (onlyActive) {
      chats = chats.filter((chat) => !chat.videoJobId);
    }

    // ===== PROCESS CHATS =====
    // Return summaries, not full message history (for performance)
    const processedChats = chats.map((chat) => ({
      id: chat._id.toString(),
      chatId: chat.chatId,

      // Summary info
      lastPrompt: chat.lastPrompt,
      preview: chat.messages[0]?.content.slice(0, 100) + "...", // First message preview

      // Counts
      messageCount: chat.messages.length,

      // Status
      hasVideo: !!chat.videoJobId,
      videoJobId: chat.videoJobId,

      // Timestamps
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      timeAgo: getTimeAgo(chat.updatedAt),

      // Last message info (for preview)
      lastMessage:
        chat.messages[chat.messages.length - 1]?.content.slice(0, 50) + "...",
      lastMessageRole: chat.messages[chat.messages.length - 1]?.role,
    }));

    // ===== GROUP CHATS BY STATUS =====
    const grouped = {
      active: processedChats.filter((c) => !c.hasVideo), // Still chatting
      completed: processedChats.filter((c) => c.hasVideo), // Video generated
    };

    // ===== RETURN RESPONSE =====
    return NextResponse.json({
      success: true,
      total: processedChats.length,
      chats: processedChats,
      grouped,
      stats: {
        totalActive: grouped.active.length,
        totalCompleted: grouped.completed.length,
      },
    });
  } catch (error) {
    console.error("Get chats error:", error);

    return NextResponse.json(
      {
        error: "Failed to get chats",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTION =====
function getTimeAgo(timestamp) {
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
