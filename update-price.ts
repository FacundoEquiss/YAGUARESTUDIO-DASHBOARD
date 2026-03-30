import { config } from 'dotenv';
config();
import { db, subscriptionPlans } from './lib/db/src/index';
import { eq } from 'drizzle-orm';
async function main() {
  try {
    const res = await db.update(subscriptionPlans).set({ price: 14990 }).where(eq(subscriptionPlans.slug, 'premium')).returning();
    console.log('Updated:', res);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
main();
