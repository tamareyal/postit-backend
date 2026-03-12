import { Router } from "express";
import { imageUploader, deleteImage } from "../controllers/storageController";

const router = Router();

router.delete("/upload/:filename", (req, res) => {
  try {
    deleteImage(req.params.filename);
    res.status(200).json({ message: "Image deleted successfully" });
  } catch (err: any) {
    const status = err.message === "File not found" ? 404 : 400;
    res.status(status).json({ message: err.message });
  }
});

router.post("/upload", imageUploader.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No image file provided" });
    return;
  }
  res.json({ path: req.file.path });
});

export default router;