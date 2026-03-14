import request from "supertest";
import path from "path";
import fs from "fs";
import { serverURL } from "./mockdata";

const TEST_IMAGE_PATH = path.resolve(__dirname, "../uploads/forTests.jpg");
const UPLOAD_ENDPOINT = "/api/general/upload";

describe("Image Upload Tests", () => {
  let uploadedFilePath: string | undefined;

  test("uploads a valid image and returns its path", async () => {
    const res = await request(serverURL)
      .post(UPLOAD_ENDPOINT)
      .attach("image", TEST_IMAGE_PATH);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("path");
    expect(typeof res.body.path).toBe("string");

    uploadedFilePath = res.body.path;
  });

  test("uploaded file is accessible via the static /uploads route", async () => {
    if (!uploadedFilePath) {
      return;
    }

    const filename = path.basename(uploadedFilePath);
    const res = await request(serverURL).get(`/uploads/${filename}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image/);
  });

  test("rejects a non-image file", async () => {
    const tmpFile = path.resolve(__dirname, "../uploads/_test.txt");
    fs.writeFileSync(tmpFile, "not an image");

    try {
      const res = await request(serverURL)
        .post(UPLOAD_ENDPOINT)
        .attach("image", tmpFile);

      expect(res.status).not.toBe(200);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  test("returns 400 when no file is attached", async () => {
    const res = await request(serverURL).post(UPLOAD_ENDPOINT);

    expect(res.status).toBe(400);
  });

  test("deletes the uploaded image", async () => {
    expect(uploadedFilePath).toBeDefined();

    const filename = path.basename(uploadedFilePath!);
    const res = await request(serverURL).delete(`${UPLOAD_ENDPOINT}/${filename}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Image deleted successfully");
  });

  test("deleted file is no longer accessible via the static /uploads route", async () => {
    expect(uploadedFilePath).toBeDefined();

    const filename = path.basename(uploadedFilePath!);
    const res = await request(serverURL).get(`/uploads/${filename}`);

    expect(res.status).toBe(404);
  });

  test("deleting a non-existent image returns 404", async () => {
    const res = await request(serverURL).delete(`${UPLOAD_ENDPOINT}/nonexistent.jpg`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message", "File not found");
  });

  test("deleting with a path traversal filename returns 400", async () => {
    const res = await request(serverURL).delete(`${UPLOAD_ENDPOINT}/..%2F..%2Fetc%2Fpasswd`);

    expect(res.status).toBe(400);
  });
});
