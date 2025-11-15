// src/models/chat.model.js

import { ObjectId } from "mongodb";

export const ChatSchema = {
  _id: ObjectId,
  chatId: String, // Unique identifier
  userId: ObjectId, // Reference to users collection
  messages: [
    // Array of messages
    {
      role: String, // "user" | "assistant"
      content: String,
      timestamp: Date,
    },
  ],
  lastPrompt: String, // Last user message
  videoJobId: String, // Linked video (null if just chat)
  createdAt: Date,
  updatedAt: Date,
};

export const ChatIndexes = [
  { key: { chatId: 1 }, unique: true },
  { key: { userId: 1, updatedAt: -1 } },
];
