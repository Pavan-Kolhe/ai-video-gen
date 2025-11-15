// src/app/api/chat/message/route.js

/**
 * POST /api/chat/message
 *
 * Adds a new message to existing chat and gets AI response.
 *
 * Flow:
 * 1. Verify user authentication
 * 2. Verify user owns this chat (security check)
 * 3. Add user's message to chat
 * 4. Call Groq AI to generate assistant response
 * 5. Add AI response to chat
 * 6. Return updated conversation
 *
 * This is the core interactive chat endpoint where user refines
 * their video prompt through conversation with AI.
 */

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getChatById, addMessageToChat } from "@/lib/db";
import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request) {
  try {
    // ===== VERIFY AUTHENTICATION =====
    const userId = await getUserFromRequest();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ===== PARSE REQUEST BODY =====
    const body = await request.json();
    const { chatId, message } = body;

    // ===== VALIDATION =====
    if (!chatId || !message) {
      return NextResponse.json(
        { error: "Chat ID and message are required" },
        { status: 400 }
      );
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    // ===== VERIFY CHAT OWNERSHIP =====
    // Security: User can only add messages to their own chats
    const chat = await getChatById(chatId);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userId.toString() !== userId) {
      return NextResponse.json(
        { error: "Forbidden: This chat belongs to another user" },
        { status: 403 }
      );
    }

    // ===== ADD USER MESSAGE TO CHAT =====
    await addMessageToChat(chatId, "user", message.trim());
    console.log(`Message added to chat ${chatId}`);

    // ===== GENERATE AI RESPONSE =====
    // Build conversation history for context
    const conversationHistory = [
      ...chat.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message.trim() },
    ];

    // System prompt: Guides AI on how to respond
    const systemPrompt = `You are a helpful AI assistant specializing in video creation.
Help users refine their video prompts by asking clarifying questions about:
- Video style (modern, retro, minimal, etc.)
- Mood/tone (energetic, calm, professional, fun)
- Target audience
- Key message or call-to-action
- Duration and aspect ratio preferences

Keep responses concise (2-3 sentences). Be friendly and encouraging.
When the prompt seems complete, offer to generate the video.`;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.7,
      max_tokens: 200,
      top_p: 1,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    // ===== ADD AI RESPONSE TO CHAT =====
    await addMessageToChat(chatId, "assistant", aiResponse);
    console.log("AI response added to chat");

    // ===== CHECK IF USER IS READY TO GENERATE =====
    // Simple heuristic: If conversation has 4+ messages and AI suggests generation
    const isReadyToGenerate =
      conversationHistory.length >= 4 &&
      aiResponse.toLowerCase().includes("generate");

    // ===== RETURN UPDATED CHAT =====
    return NextResponse.json({
      success: true,
      message: aiResponse,
      isReadyToGenerate, // Hint to frontend to show "Generate Video" button
      totalMessages: conversationHistory.length + 1,
    });
  } catch (error) {
    console.error("Chat message error:", error);

    return NextResponse.json(
      {
        error: "Failed to process message",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
