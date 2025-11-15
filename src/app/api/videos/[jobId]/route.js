// src/app/api/videos/[jobId]/route.js

/**
 * DELETE /api/videos/[jobId]
 *
 * Deletes a video from user's library.
 * Also removes video file from Cloudinary to free up storage.
 *
 * Flow:
 * 1. Verify user owns this video (TODO: Check JWT userId matches video.userId)
 * 2. Delete video file from Cloudinary
 * 3. Delete document from MongoDB
 * 4. Return success
 *
 * Security: Must verify ownership before deletion!
 */

import { NextResponse } from "next/server";
import { getVideoByJobId } from "@/lib/db";
import { getDb } from "@/lib/mongodb";
import cloudinary from "@/lib/cloudinary";
import { getUserFromRequest } from "@/lib/auth";

export async function DELETE(request, { params }) {
  try {
    const { jobId } = params;

    const userId = await getUserFromRequest();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      );
    }
    // ===== FIND VIDEO =====
    const video = await getVideoByJobId(jobId);

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // ===== VERIFY OWNERSHIP =====
    // IMPORTANT: User can only delete their own videos
    // TODO: Compare with JWT userId instead
    if (video.userId.toString() !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own videos" },
        { status: 403 }
      );
    }

    // ===== DELETE FROM CLOUDINARY =====
    // Extract public_id from Cloudinary URL
    if (video.videoUrl) {
      try {
        const publicId = extractPublicId(video.videoUrl);
        await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
        console.log(`Deleted from Cloudinary: ${publicId}`);
      } catch (cloudinaryError) {
        console.error("Cloudinary deletion failed:", cloudinaryError);
        // Continue with DB deletion even if Cloudinary fails
      }
    }

    // ===== DELETE FROM MONGODB =====
    const db = await getDb();
    const result = await db.collection("videos").deleteOne({ jobId });

    if (result.deletedCount === 0) {
      throw new Error("Failed to delete from database");
    }

    console.log(`Video deleted: ${jobId}`);

    // ===== RETURN SUCCESS =====
    return NextResponse.json({
      success: true,
      message: "Video deleted successfully",
      jobId,
    });
  } catch (error) {
    console.error("Delete video error:", error);

    return NextResponse.json(
      {
        error: "Failed to delete video",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTION =====

/**
 * Extract Cloudinary public_id from full URL
 * Example:
 * Input: "https://res.cloudinary.com/demo/video/upload/v1234/ai-video-gen/outputs/video_abc.mp4"
 * Output: "ai-video-gen/outputs/video_abc"
 */
function extractPublicId(url) {
  const parts = url.split("/upload/");
  if (parts.length < 2) return null;

  const pathPart = parts[1].split("/").slice(1).join("/"); // Remove version number
  return pathPart.replace(/\.[^/.]+$/, ""); // Remove file extension
}
