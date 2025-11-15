// src/app/api/enhance-prompt/route.js

/**
 * POST /api/enhance-prompt
 *
 * Takes a simple user prompt and enhances it using Groq AI (Llama 3)
 * to make it more detailed and suitable for video generation.
 *
 * Flow:
 * 1. Receive user's basic prompt + settings (style, mood, duration)
 * 2. Build a detailed system prompt for Groq
 * 3. Call Groq API to enhance the prompt
 * 4. Return enhanced prompt with quality predictions
 *
 * Example:
 * Input: "fitness app promo"
 * Output: "Dynamic 20-second vertical video showcasing modern fitness app..."
 */

import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// Initialize Groq client with API key from environment
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request) {
  try {
    // Parse incoming JSON data from frontend
    const body = await request.json();
    const {
      prompt, // User's original prompt
      style = [], // Array like ["modern", "minimal"]
      mood = [], // Array like ["energetic", "calm"]
      duration = 20, // Video duration in seconds
      aspectRatio = "9:16", // Aspect ratio
    } = body;

    // Validation: Check if prompt exists
    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Build system prompt to guide Groq on how to enhance
    const systemPrompt = `You are a professional video prompt engineer. 
Your job is to enhance user prompts for AI video generation.

Rules:
- Add cinematic details (camera angles, lighting, transitions)
- Include visual atmosphere and mood
- Specify quality (4K, professional)
- Keep under 300 characters
- Make it vivid and specific
- DO NOT add any preamble or explanation, just return the enhanced prompt`;

    // Build user message with context
    const userMessage = `Enhance this video prompt:
Original: "${prompt}"
Style: ${style.join(", ") || "none specified"}
Mood: ${mood.join(", ") || "none specified"}
Duration: ${duration} seconds
Aspect Ratio: ${aspectRatio}

Return ONLY the enhanced prompt, nothing else.`;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      model: "llama-3.1-70b-versatile", // Free, fast Llama model
      temperature: 0.7, // Balance creativity and coherence
      max_tokens: 250, // Limit response length
      top_p: 1,
    });

    // Extract enhanced prompt from response
    const enhancedPrompt = completion.choices[0]?.message?.content?.trim();

    if (!enhancedPrompt) {
      throw new Error("No response from Groq API");
    }

    // Calculate estimated quality score (simple heuristic)
    // Based on prompt length and keyword presence
    const qualityKeywords = [
      "4K",
      "cinematic",
      "professional",
      "detailed",
      "smooth",
    ];
    const hasQualityKeywords = qualityKeywords.some((keyword) =>
      enhancedPrompt.toLowerCase().includes(keyword.toLowerCase())
    );
    const estimatedQuality = hasQualityKeywords ? 4.5 : 4.0;

    // Generate helpful tips based on prompt
    const tips = [];
    if (!enhancedPrompt.toLowerCase().includes("4k")) {
      tips.push('Add "4K quality" for sharper output');
    }
    if (enhancedPrompt.length < 100) {
      tips.push("More details = better results");
    }

    // Return success response
    return NextResponse.json({
      success: true,
      original: prompt,
      enhanced: enhancedPrompt,
      estimatedQuality, // 1-5 rating
      tips,
      metadata: {
        style,
        mood,
        duration,
        aspectRatio,
      },
    });
  } catch (error) {
    console.error("Enhance prompt error:", error);

    // Return error response
    return NextResponse.json(
      {
        error: "Failed to enhance prompt",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
