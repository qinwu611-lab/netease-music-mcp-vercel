import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { SERVER_NAME, SERVER_VERSION } from "../../../server/lib/config.js";
import { oauthConfig, verifyOauthBearerToken } from "../../../server/lib/oauth.js";
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

const authConfig = oauthConfig();

const authHandler = authConfig.enabled
  ? withMcpAuth(handler, verifyOauthBearerToken, {
      required: true,
      requiredScopes: authConfig.requiredScopes,
      resourceMetadataPath: "/.well-known/oauth-protected-resource",
      resourceUrl: authConfig.resourceUrl,
    })
  : handler;

export { authHandler as DELETE, authHandler as GET, authHandler as POST };
