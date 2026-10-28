import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const keyPath = path.resolve(dirname, "certs/key.pem");
const certPath = path.resolve(dirname, "certs/cert.pem");
// Self-signed dev certs are generated at image build time (see Dockerfile);
// fall back to plain HTTP if they're missing, eg. when running outside Docker.
const https =
  fs.existsSync(keyPath) && fs.existsSync(certPath)
    ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    https,
    proxy: {
      "/api": process.env.API_PROXY_TARGET ?? "http://localhost:8000",
    },
  },
});
