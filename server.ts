require('dotenv').config({ path: '.env' });

import startServer from "./index";
import http from "http";
import https from "https";
import fs from "fs";

const PORT = Number(process.env.PORT) || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mydatabase";

async function main() {
  const [conn, app] = await startServer(PORT, MONGO_URI);

  if (process.env.NODE_ENV === "production") {
    const sslOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH || "path/to/ssl/key.pem"),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH || "path/to/ssl/cert.pem"),
    };

    https.createServer(sslOptions, app).listen(PORT, () => {
      console.log(`HTTPS Server is running on port ${PORT}`);
    });
  } else {
    http.createServer(app).listen(PORT, () => {
      console.log(`HTTP Server is running on port ${PORT}`);
    });
  }
}

main().catch(() => {
  process.exit(1);
});
