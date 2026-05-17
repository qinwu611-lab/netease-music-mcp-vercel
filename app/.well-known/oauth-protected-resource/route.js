import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

import { oauthConfig } from "../../../server/lib/oauth.js";

export const runtime = "nodejs";

const corsHandler = metadataCorsOptionsRequestHandler();

export function GET(request) {
  const config = oauthConfig();
  if (!config.enabled) {
    return new Response("OAuth is not configured for this MCP server.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return protectedResourceHandler({
    authServerUrls: [config.issuer],
    resourceUrl: config.resourceUrl,
  })(request);
}

export { corsHandler as OPTIONS };
