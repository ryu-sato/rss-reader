const { execFileSync } = require("child_process");
const path = require("path");

const prismaCliDir = path.join(__dirname, "prisma-cli");
const prismaCli = path.join(prismaCliDir, "node_modules", "prisma", "build", "index.js");
const prismaConfig = path.join(prismaCliDir, "prisma.config.mjs");

execFileSync(
  process.execPath,
  [prismaCli, "migrate", "deploy", "--config", prismaConfig],
  { stdio: "inherit" }
);

require("./server.js");
