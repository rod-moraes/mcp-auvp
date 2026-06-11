#!/usr/bin/env node
import { runStdioServer } from "./server.js";

runStdioServer().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`mcp-auvp-financas failed to start: ${message}`);
  process.exit(1);
});
