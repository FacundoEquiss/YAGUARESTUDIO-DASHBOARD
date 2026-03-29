import app from "./app";
import { seedMasterAccount } from "./routes/auth";
import { seedPlans } from "@workspace/db/seed-plans";

const rawPort = process.env.PORT || "8080";
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
    console.error("Database initialization error:", err);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start();
