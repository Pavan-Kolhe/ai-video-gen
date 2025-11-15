// src/lib/session.js

import { v4 as uuidv4 } from "uuid";

export function generateSessionId(req) {
  // Create fingerprint from request headers
  const ua = req.headers.get("user-agent") || "";
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Simple hash function
  const hash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  };

  return `session_${hash(ua + ip)}_${uuidv4().slice(0, 8)}`;
}

export function getSessionFromRequest(req) {
  // Try to get from header (sent by frontend)
  const sessionHeader = req.headers.get("x-session-id");
  if (sessionHeader) return sessionHeader;

  // Generate new one
  return generateSessionId(req);
}
