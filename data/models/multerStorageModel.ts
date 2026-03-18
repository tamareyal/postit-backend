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
    destination(_req: Request, _file, cb: (error: Error | null, destination: string) => void) {
      cb(null, destination);
    },
    filename(_req: Request, file, cb: (error: Error | null, filename: string) => void) {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

  const fileFilter = (
    _req: Request,
    file: { mimetype: string },
    cb: multer.FileFilterCallback,
  ) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  };

  return multer({ storage, fileFilter });
}
