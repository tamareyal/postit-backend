import multer, { StorageEngine } from "multer";
import path from "path";
import { Request } from "express";

export interface ImageUploadConfig {
  destination?: string;
  allowedMimeTypes?: string[];
}

export function createImageUpload(config: ImageUploadConfig = {}) {
  const { destination = "uploads", allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] } = config;

  const storage: StorageEngine = multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, destination);
    },
    filename(_req, file, cb) {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

  const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  };

  return multer({ storage, fileFilter });
}
