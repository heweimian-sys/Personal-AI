import { readFileSync } from "node:fs";

const config = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");

if (config.includes("REPLACE_WITH_KV_NAMESPACE_ID")) {
  console.error("wrangler.toml still contains REPLACE_WITH_KV_NAMESPACE_ID.");
  console.error("Fill the Cloudflare KV namespace id before deploying.");
  process.exit(1);
}

console.log("Cloudflare Worker config looks ready.");
