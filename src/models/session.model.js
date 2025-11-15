// src/models/session.model.js

import { ObjectId } from "mongodb";

export const SessionSchema = {
  _id: ObjectId,
  userId: ObjectId, // Reference to users collection
  todayCount: Number, // Videos generated today
  lastGenAt: Date,
  createdAt: Date,
  lastActiveAt: Date,
};

export const SessionIndexes = [{ key: { userId: 1 }, unique: true }];
