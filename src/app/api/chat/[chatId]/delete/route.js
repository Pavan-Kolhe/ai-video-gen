// src/app/api/chat/[chatId]/delete/route.js

/**
 * DELETE /api/chat/[chatId]
 *
 * Deletes a chat conversation.
 *
 * Flow:
 * 1. Verify user authentication
 * 2. Verify user owns this chat
 * 3. Delete chat document from MongoDB
 * 4. Return success
 *
 * Note: This only deletes the chat conversation, not any generated videos.
 * Videos are managed separately via /api/videos/[jobId] endpoint.
 */

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getChatById } from "@/lib/db";
import { getDb } from "@/lib/mongodb";

export async function DELETE(request, { params }) {
  try {
    // ===== VERIFY AUTHENTICATION =====
    const userId = await getUserFromRequest();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ===== EXTRACT CHAT ID =====
    const { chatId } = params;

    // ===== GET CHAT =====
    const chat = await getChatById(chatId);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // ===== VERIFY OWNERSHIP =====
    if (chat.userId.toString() !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own chats" },
        { status: 403 }
      );
    }

    // ===== DELETE FROM DATABASE =====
    const db = await getDb();
    const result = await db.collection("chats").deleteOne({ chatId });

    if (result.deletedCount === 0) {
      throw new Error("Failed to delete chat");
    }

    console.log(`Chat deleted: ${chatId}`);

    // ===== RETURN SUCCESS =====
    return NextResponse.json({
      success: true,
      message: "Chat deleted successfully",
      chatId,
    });
  } catch (error) {
    console.error("Delete chat error:", error);

    return NextResponse.json(
      {
        error: "Failed to delete chat",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
