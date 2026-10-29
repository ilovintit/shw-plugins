import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MCP_SERVERS = [
  {
    "id": "worktree",
    "entry": "worktree-mcp/launch.cjs",
    "command": "node"
  }
];

export default function registerShwMcpServers(pi) {
  if (!pi || typeof pi.registerMcpServer !== "function") {
    throw new Error("SHW requires Pi with registerMcpServer support; update Pi before loading this MCP package.");
  }
  for (const server of MCP_SERVERS) {
    pi.registerMcpServer(server.id, {
      command: server.command,
      args: [resolve(PACKAGE_ROOT, server.entry)],
    });
  }
}
