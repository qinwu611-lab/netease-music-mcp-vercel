import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { SERVER_NAME, SERVER_VERSION } from "../../../server/lib/config.js";
import { registerNeteaseMusicTools } from "../../../server/tools/registerMcpTools.js";

export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    registerNeteaseMusicTools(server);
  },
  {
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
  },
  {
    basePath: "/api",
    maxDuration,
    disableSse: true,
  },
);

async function verifyToken(_request, bearerToken) {
  const expectedToken = process.env.MCP_AUTH_TOKEN;
  if (!expectedToken) return undefined;
  if (bearerToken !== expectedToken) return undefined;

  return {
    token: bearerToken,
    scopes: ["netease:read"],
    clientId: "netease-music-mcp-client",
  };
}

const authHandler = withMcpAuth(handler, verifyToken, {
  required: Boolean(process.env.MCP_AUTH_TOKEN),
  requiredScopes: ["netease:read"],
});

export { authHandler as DELETE, authHandler as GET, authHandler as POST };
