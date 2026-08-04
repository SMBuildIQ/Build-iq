export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootSecurityChecks } = await import("./lib/boot");
    bootSecurityChecks();
  }
}
