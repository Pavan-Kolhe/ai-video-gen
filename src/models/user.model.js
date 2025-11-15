// src/models/user.model.js

import { ObjectId } from "mongodb";

export const UserSchema = {
  _id: ObjectId,
  email: String, // Unique, required
  password: String, // Hashed with bcrypt
  name: String, // Optional
  createdAt: Date,
  lastLoginAt: Date,
};

// Indexes to create
export const UserIndexes = [{ key: { email: 1 }, unique: true }];
