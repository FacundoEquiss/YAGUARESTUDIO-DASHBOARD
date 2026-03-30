import { env, logStartupWarnings } from "./env";

async function start() {
  logStartupWarnings();

  const [{ default: app }, { seedMasterAccount }, { seedPlans }] = await Promise.all([
    import("./app"),
    import("./routes/auth"),
    import("@workspace/db/seed-plans"),
  ]);

  try {
    await seedPlans();
    await seedMasterAccount();
    console.log("Database seeded successfully");
  } catch (err) {
    console.error("Database initialization error:", err);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

start();
