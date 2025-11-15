// src/lib/cloudinary.js

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(buffer, filename) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "video-gen/inputs",
          public_id: filename,
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(buffer);
  });
}

export async function uploadVideo(buffer, filename) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "ai-video-gen/outputs",
          public_id: filename,
          resource_type: "video",
          // Generate thumbnail automatically
          eager: [{ width: 640, height: 360, crop: "fill", format: "jpg" }],
          // Add watermark
          transformation: [
            {
              overlay: "text:Arial_20_bold:AI Generated",
              gravity: "south_east",
              x: 10,
              y: 10,
              color: "white",
              opacity: 80,
            },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(buffer);
  });
}

export default cloudinary;
