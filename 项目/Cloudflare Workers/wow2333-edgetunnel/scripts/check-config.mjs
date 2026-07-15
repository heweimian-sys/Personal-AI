import { readFileSync } from "node:fs";

const config = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");

if (!config.includes('name = "bold-poetry-bb94"')) {
  console.error('wrangler.toml must target the "bold-poetry-bb94" Worker.');
  process.exit(1);
}

if (!config.includes('keep_vars = true')) {
  console.error("wrangler.toml must keep Dashboard variables and secrets.");
  process.exit(1);
}

console.log("Cloudflare Worker config looks ready.");
