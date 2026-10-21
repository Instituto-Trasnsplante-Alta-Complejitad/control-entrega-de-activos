import { runOcsSync } from "../server/ocs-sync.js";
import { prisma } from "../server/prisma.js";

try {
  const result = await runOcsSync(prisma, "scheduled");
  console.log(JSON.stringify({
    status: result.status,
    total: result.total_ids,
    processed: result.processed,
    updated: result.updated,
    created: result.created,
    warnings: result.errors,
  }, null, 2));
  if (result.status === "failed") process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

