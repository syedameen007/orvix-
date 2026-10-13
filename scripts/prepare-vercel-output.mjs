import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mobileDist = path.join(root, "apps", "mobile", "dist");
const adminDist = path.join(root, "apps", "admin", "dist");
const adminTarget = path.join(mobileDist, "admin");

fs.rmSync(adminTarget, { recursive: true, force: true });
fs.mkdirSync(adminTarget, { recursive: true });
fs.cpSync(adminDist, adminTarget, { recursive: true });
