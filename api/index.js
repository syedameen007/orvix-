import { createApp } from "../services/api/dist/app.js";

const app = createApp();

export default function handler(req, res) {
  if (req.url === "/api") {
    req.url = "/";
  } else if (req.url?.startsWith("/api/")) {
    req.url = req.url.slice(4);
  }
  return app(req, res);
}
