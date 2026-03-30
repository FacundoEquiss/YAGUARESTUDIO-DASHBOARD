process.env.DATABASE_URL ??= "postgres://test";
process.env.JWT_SECRET ??= "test-secret";

async function main() {
  const { default: runEnvTests } = await import("./env.test");
  const { default: runMercadoPagoWebhookTests } = await import("./lib/mercadopago-webhook.test");

  const suites = [
    ["env", runEnvTests],
    ["mercadopago-webhook", runMercadoPagoWebhookTests],
  ] as const;

  let failed = false;

  for (const [name, run] of suites) {
    console.log(`Suite: ${name}`);

    try {
      await run();
    } catch (error) {
      failed = true;
      console.error(`  [fail] ${name}`);
      console.error(error);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

void main();
