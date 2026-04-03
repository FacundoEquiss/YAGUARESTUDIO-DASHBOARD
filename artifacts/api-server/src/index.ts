process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection during runtime:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception during runtime:", error);
  process.exit(1);
});

async function start() {
  try {
    const { env, logStartupWarnings } = await import("./env");

    logStartupWarnings();

    const [{ default: app }, { seedMasterAccount }, { seedPlans }] = await Promise.all([
      import("./app"),
      import("./routes/auth"),
      import("@workspace/db/seed-plans"),
    ]);

    await seedPlans();
    await seedMasterAccount();
    console.log("Database seeded successfully");

    const server = app.listen(env.port, () => {
      console.log(`Server listening on port ${env.port}`);
    });

    server.on("error", (error) => {
      console.error("HTTP server startup error:", error);
      process.exit(1);
    });
  } catch (err) {
    console.error("Fatal startup error:", err);
    process.exit(1);
  }
}

void start();
