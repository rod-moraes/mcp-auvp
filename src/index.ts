#!/usr/bin/env node
import { runStdioServer } from "./server.js";
import { resolveEnabledModules } from "./mcp/modules.js";

async function main(): Promise<void> {
  const enabledModules = resolveEnabledModules();
  await runStdioServer({ enabledModules });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`mcp-auvp failed to start: ${message}`);
  process.exit(1);
});
