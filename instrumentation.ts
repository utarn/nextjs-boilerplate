export async function register() {
  // Only run on the Node.js server (not Edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { execSync } = await import("child_process");

    console.log("[instrumentation] Applying pending Prisma migrations...");

    try {
      execSync("npx prisma migrate deploy", {
        stdio: "inherit",
        env: { ...process.env },
      });
      console.log("[instrumentation] Migrations applied successfully.");
    } catch (error) {
      console.error("[instrumentation] Migration failed:", error);
      // In development, log but don't crash — the dev server can retry on HMR reload.
      // In production, you may want to process.exit(1) here.
      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      }
    }
  }
}
