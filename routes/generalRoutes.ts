import { Router, type Request } from "express";
import { imageUploader, deleteImage } from "../controllers/storageController";

const router = Router();

/**
 * @swagger
 * /api/general/upload/{filename}:
 *   delete:
 *     tags:
 *       - Storage
 *     summary: Delete an uploaded image
 *     description: Deletes an image file from the uploads directory by filename.
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the uploaded file to delete.
 *     responses:
 *       200:
 *         description: Image deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteImageResponse'
 *       400:
 *         description: Invalid filename or bad request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: File not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/upload/:filename", (req, res) => {
  try {
    deleteImage(req.params.filename);
    res.status(200).json({ message: "Image deleted successfully" });
  } catch (err: any) {
    const status = err.message === "File not found" ? 404 : 400;
    res.status(status).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/general/upload:
 *   post:
 *     tags:
 *       - Storage
 *     summary: Upload an image
 *     description: Uploads a single image file to the uploads directory.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageUploadResponse'
 *       400:
 *         description: No file provided or invalid file.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/upload", imageUploader.single("image"), (req: Request & { file?: Express.Multer.File }, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No image file provided" });
    return;
  }
  res.json({ path: req.file.path });
});

export default router;