// src/app/api/generate/route.js

/**
 * POST /api/generate
 *
 * Main video generation endpoint. Orchestrates the entire video creation process.
 *
 * Flow:
 * 1. Validate user session (TODO: Add JWT auth later)
 * 2. Check rate limiting (10 videos per day)
 * 3. Upload input image to Cloudinary (if provided)
 * 4. Call FastAPI service to start video generation
 * 5. Save job to MongoDB
 * 6. Return jobId to frontend for polling
 *
 * This route acts as a coordinator between frontend, database, and AI service.
 */

import { NextResponse } from "next/server";
import { createVideo, checkRateLimit, incrementRateLimit } from "@/lib/db";
import { uploadImage } from "@/lib/cloudinary";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request) {
  try {
    // Parse request body and form data (for image upload)
    const formData = await request.formData();

    const prompt = formData.get("prompt");
    const enhancedPrompt = formData.get("enhancedPrompt");
    const userId = await getUserFromRequest();

    // ===== VALIDATION =====
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      );
    }

    const duration = parseInt(formData.get("duration")) || 20;
    const aspectRatio = formData.get("aspectRatio") || "9:16";
    const imageFile = formData.get("image"); // Optional

    // ===== VALIDATION =====
    if (!prompt || !enhancedPrompt) {
      return NextResponse.json(
        { error: "Prompt and enhanced prompt are required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" }, // TODO: Will come from JWT
        { status: 401 }
      );
    }

    // ===== RATE LIMITING =====
    // Check if user has exceeded daily limit (10 videos/day)
    const rateLimitCheck = await checkRateLimit(userId);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Daily limit reached",
          message: "You can generate up to 10 videos per day",
          remaining: 0,
          resetAt: rateLimitCheck.resetAt,
        },
        { status: 429 } // 429 = Too Many Requests
      );
    }

    // ===== IMAGE UPLOAD (Optional) =====
    let inputImageUrl = null;

    if (imageFile && imageFile.size > 0) {
      try {
        // Convert file to buffer
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const filename = `input_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`;

        // Upload to Cloudinary
        const uploadResult = await uploadImage(buffer, filename);
        inputImageUrl = uploadResult.secure_url;

        console.log("Image uploaded:", inputImageUrl);
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        // Continue without image rather than failing completely
      }
    }

    // ===== CALL FASTAPI SERVICE =====
    // This triggers the actual video generation using Google Veo 3
    const fastApiUrl = process.env.FASTAPI_URL || "http://localhost:8000";

    const fastApiResponse = await fetch(`${fastApiUrl}/generate-video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        imageUrl: inputImageUrl,
        duration: duration,
        aspectRatio: aspectRatio,
      }),
    });

    if (!fastApiResponse.ok) {
      const errorData = await fastApiResponse.json();
      throw new Error(errorData.detail || "FastAPI service error");
    }

    const fastApiData = await fastApiResponse.json();
    const jobId = fastApiData.jobId; // Unique job ID from Veo 3

    // ===== SAVE TO MONGODB =====
    // Store video metadata for tracking and user library
    const videoDocId = await createVideo({
      jobId,
      userId,
      prompt,
      enhancedPrompt,
      duration,
      aspectRatio,
      inputImageUrl,
    });

    console.log(`Video generation started: ${jobId} (DB ID: ${videoDocId})`);

    // ===== INCREMENT RATE LIMIT =====
    // Update user's daily counter
    await incrementRateLimit(userId);

    // ===== RETURN SUCCESS RESPONSE =====
    return NextResponse.json({
      success: true,
      jobId, // For polling status
      estimatedTime: 180, // ~3 minutes (in seconds)
      message: "Video generation started",
      remaining: rateLimitCheck.remaining - 1, // Videos left today
    });
  } catch (error) {
    console.error("Generate video error:", error);

    return NextResponse.json(
      {
        error: "Failed to start video generation",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
