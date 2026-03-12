import fs from "fs";
import path from "path";
import { createImageUpload, ImageUploadConfig } from "../data/models/multerStorageModel";

export function getImageUploader(config?: ImageUploadConfig) {
  return createImageUpload(config);
}

// Default uploader — saves to the `uploads` directory
export const imageUploader = createImageUpload();

export function deleteImage(filename: string, directory = "uploads"): void {
  // Reject before path.basename() can silently strip traversal sequences
  if (/[/\\]|\.\./.test(filename)) {
    throw new Error("Invalid filename");
  }

  const resolved = path.resolve(directory, path.basename(filename));
  const allowedDir = path.resolve(directory);
  if (!resolved.startsWith(allowedDir + path.sep)) {
    throw new Error("Invalid filename");
  }

  if (!fs.existsSync(resolved)) {
    throw new Error("File not found");
  }

  fs.unlinkSync(resolved);
}