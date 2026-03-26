import app from "./app";
import { seedMasterAccount } from "./routes/auth";
import { seedPlans } from "@workspace/db/seed-plans";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  try {
    await seedPlans();
    await seedMasterAccount();
    console.log("Database seeded successfully");
  } catch (err) {
    console.error("Seed error:", err);
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start();
