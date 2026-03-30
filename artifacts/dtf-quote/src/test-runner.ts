import runRoutingTests from "./lib/routing.test";

async function main() {
  let failed = false;

  console.log("Suite: routing");

  try {
    await runRoutingTests();
  } catch (error) {
    failed = true;
    console.error("  [fail] routing");
    console.error(error);
  }

  if (failed) {
    process.exit(1);
  }
}

void main();
