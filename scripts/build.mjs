import { mkdir, rm, cp } from "node:fs/promises";

const STATIC_SRC = "src/static";
const JS_SRC = "src/js";
const OUT = "docs";

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // HTML + statische Assets
  await cp(STATIC_SRC, OUT, { recursive: true });

  // JS
  await mkdir(`${OUT}/assets/js`, { recursive: true });
  await cp(JS_SRC, `${OUT}/assets/js`, { recursive: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
