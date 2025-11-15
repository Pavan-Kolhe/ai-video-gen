// src/lib/db.js

import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";

// ============================================
// VIDEO OPERATIONS
// ============================================

export async function createVideo(data) {
  const db = await getDb();

  const video = {
    jobId: data.jobId,
    status: "processing",
    userId: new ObjectId(data.userId),
    prompt: data.prompt,
    enhancedPrompt: data.enhancedPrompt,
    duration: data.duration || 20,
    aspectRatio: data.aspectRatio || "9:16",
    inputImageUrl: data.inputImageUrl || null,
    videoUrl: null,
    thumbnailUrl: null,
    progress: 0,
    createdAt: new Date(),
    completedAt: null,
  };

  const result = await db.collection("videos").insertOne(video);
  return result.insertedId.toString();
}

export async function updateVideo(jobId, update) {
  const db = await getDb();

  return db.collection("videos").updateOne({ jobId }, { $set: update });
}

export async function getVideoByJobId(jobId) {
  const db = await getDb();
  return db.collection("videos").findOne({ jobId });
}

export async function getUserVideos(userId, limit = 20) {
  const db = await getDb();

  return db
    .collection("videos")
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

// ============================================
// SESSION OPERATIONS (Rate Limiting)
// ============================================

export async function checkRateLimit(sessionId) {
  const db = await getDb();

  const session = await db.collection("sessions").findOne({ sessionId });

  if (!session) {
    // Create new session
    await db.collection("sessions").insertOne({
      userId: new ObjectId(sessionId),
      todayCount: 0,
      lastGenAt: new Date(),
      createdAt: new Date(),
      lastActiveAt: new Date(),
    });
    return { allowed: true, remaining: 10 };
  }

  // Check if it's a new day (reset counter)
  const today = new Date().setHours(0, 0, 0, 0);
  const lastGen = new Date(session.lastGenAt).setHours(0, 0, 0, 0);

  if (today > lastGen) {
    // Reset for new day
    await db.collection("sessions").updateOne(
      { sessionId },
      {
        $set: {
          todayCount: 0,
          lastActiveAt: new Date(),
        },
      }
    );
    return { allowed: true, remaining: 10 };
  }

  // Check limit (10 videos per day)
  const DAILY_LIMIT = 10;
  if (session.todayCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(today + 24 * 60 * 60 * 1000), // Tomorrow midnight
    };
  }

  return {
    allowed: true,
    remaining: DAILY_LIMIT - session.todayCount,
  };
}

export async function incrementRateLimit(sessionId) {
  const db = await getDb();

  return db.collection("sessions").updateOne(
    { sessionId },
    {
      $inc: { todayCount: 1 },
      $set: {
        lastGenAt: new Date(),
        lastActiveAt: new Date(),
      },
    },
    { upsert: true }
  );
}

// user operations

export async function createUser(email, hashedPassword, name) {
  const db = await getDb();

  // Check if user exists
  const existing = await db.collection("users").findOne({ email });
  if (existing) {
    throw new Error("Email already exists");
  }

  const user = {
    email,
    password: hashedPassword,
    name: name || null,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  const result = await db.collection("users").insertOne(user);
  return result.insertedId;
}

export async function getUserByEmail(email) {
  const db = await getDb();
  return db.collection("users").findOne({ email });
}

export async function getUserById(userId) {
  const db = await getDb();
  return db.collection("users").findOne({ _id: new ObjectId(userId) });
}

export async function updateLastLogin(userId) {
  const db = await getDb();
  return db
    .collection("users")
    .updateOne(
      { _id: new ObjectId(userId) },
      { $set: { lastLoginAt: new Date() } }
    );
}
