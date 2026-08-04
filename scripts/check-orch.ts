import { listOrchestrationRuns } from "../src/lib/ai/orchestration/orchestrator";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log(
    "agent keys",
    Object.keys(prisma).filter((k) => /agent|project/i.test(k))
  );
  const company = await prisma.company.findFirst();
  console.log("company", company?.id);
  if (!company) return;
  const runs = await listOrchestrationRuns(company.id);
  console.log("runs", runs.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
