// src/app/api/status/[jobId]/route.js

/**
 * GET /api/status/[jobId]
 *
 * Polling endpoint for checking video generation progress.
 * Frontend calls this every 3 seconds to get real-time updates.
 *
 * Flow:
 * 1. Extract jobId from URL params
 * 2. Query MongoDB for current status
 * 3. If completed, return video URLs
 * 4. If processing, return progress percentage
 * 5. If failed, return error details
 *
 * Called repeatedly until status = "completed" or "failed"
 */

import { NextResponse } from "next/server";
import { getVideoByJobId } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    // Extract jobId from URL path
    // Example: /api/status/veo3_job_abc123 -> jobId = "veo3_job_abc123"
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // ===== QUERY DATABASE =====
    // Get video document from MongoDB
    const video = await getVideoByJobId(jobId);

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // ===== BUILD RESPONSE BASED ON STATUS =====

    // Case 1: Video generation completed successfully
    if (video.status === "completed") {
      return NextResponse.json({
        success: true,
        status: "completed",
        jobId: video.jobId,
        videoUrl: video.videoUrl, // Cloudinary URL
        thumbnailUrl: video.thumbnailUrl, // Video thumbnail
        progress: 100,
        prompt: video.prompt,
        enhancedPrompt: video.enhancedPrompt,
        duration: video.duration,
        createdAt: video.createdAt,
        completedAt: video.completedAt,
        // Calculate generation time
        generationTime: Math.round(
          (new Date(video.completedAt) - new Date(video.createdAt)) / 1000
        ),
      });
    }

    // Case 2: Video generation failed
    if (video.status === "failed") {
      return NextResponse.json({
        success: false,
        status: "failed",
        jobId: video.jobId,
        error: "Video generation failed",
        message: video.error || "Unknown error occurred",
        progress: video.progress,
      });
    }

    // Case 3: Video is still processing (most common case)
    // This is what frontend polls for
    return NextResponse.json({
      success: true,
      status: "processing",
      jobId: video.jobId,
      progress: video.progress, // 0-100
      currentStep: getCurrentStep(video.progress), // Friendly message
      estimatedTimeRemaining: estimateTimeRemaining(
        video.createdAt,
        video.progress
      ),
    });
  } catch (error) {
    console.error("Status check error:", error);

    return NextResponse.json(
      {
        error: "Failed to check status",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Convert progress percentage to user-friendly message
 */
function getCurrentStep(progress) {
  if (progress < 10) return "Initializing video generation...";
  if (progress < 30) return "Analyzing prompt and preparing scene...";
  if (progress < 50) return "Generating video frames...";
  if (progress < 70) return "Rendering high-quality output...";
  if (progress < 90) return "Adding final touches...";
  if (progress < 100) return "Finalizing video...";
  return "Complete!";
}

/**
 * Estimate time remaining based on elapsed time and progress
 */
function estimateTimeRemaining(createdAt, progress) {
  if (progress === 0 || progress === 100) return 0;

  const elapsed = Date.now() - new Date(createdAt).getTime();
  const elapsedSeconds = Math.floor(elapsed / 1000);

  // Estimate total time based on current progress
  const estimatedTotal = (elapsedSeconds / progress) * 100;
  const remaining = Math.max(0, Math.floor(estimatedTotal - elapsedSeconds));

  return remaining;
}
