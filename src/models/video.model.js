// src/models/video.model.js

import { ObjectId } from "mongodb";

export const VideoSchema = {
  _id: ObjectId,
  jobId: String, // Unique, from Veo 3
  status: String, // "processing" | "completed" | "failed"
  userId: ObjectId, // Reference to users collection
  prompt: String,
  enhancedPrompt: String,
  duration: Number, // 20 seconds
  aspectRatio: String, // "9:16"
  inputImageUrl: String, // Cloudinary URL or null
  videoUrl: String, // Cloudinary URL or null
  thumbnailUrl: String, // Cloudinary URL or null
  progress: Number, // 0-100
  createdAt: Date,
  completedAt: Date, // null until done
};

export const VideoIndexes = [
  { key: { jobId: 1 }, unique: true },
  { key: { userId: 1, createdAt: -1 } },
  { key: { status: 1 } },
];
