import { createRemoteJWKSet, jwtVerify } from "jose";

let cachedJwks;
let cachedJwksUrl;

function trimTrailingSlash(value) {
  return value?.replace(/\/+$/, "");
}

function splitScopes(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return String(value).split(/\s+/).filter(Boolean);
}

function descopeJwksUrl(issuer, projectId) {
  const issuerMatch = issuer?.match(/^https:\/\/api\.descope\.com\/v1\/apps\/([^/]+)$/);
  const resolvedProjectId = projectId ?? issuerMatch?.[1];
  if (!resolvedProjectId) return undefined;
  return `https://api.descope.com/${resolvedProjectId}/.well-known/jwks.json`;
}

export function oauthConfig() {
  const descopeProjectId = process.env.DESCOPE_PROJECT_ID;
  const issuer = trimTrailingSlash(
    process.env.OAUTH_ISSUER
      ?? process.env.DESCOPE_ISSUER
      ?? process.env.DESCOPE_ISSUER_URL
      ?? (descopeProjectId ? `https://api.descope.com/${descopeProjectId}` : undefined),
  );

  if (!issuer) {
    return { enabled: false };
  }

  const jwksUrl = process.env.OAUTH_JWKS_URL
    ?? process.env.DESCOPE_JWKS_URL
    ?? descopeJwksUrl(issuer, descopeProjectId)
    ?? `${issuer}/.well-known/jwks.json`;
  const audience = process.env.OAUTH_AUDIENCE;
  const requiredScopes = splitScopes(process.env.OAUTH_REQUIRED_SCOPES ?? process.env.OAUTH_REQUIRED_SCOPE);
  const resourceUrl = trimTrailingSlash(process.env.OAUTH_RESOURCE_URL) ?? "https://netease-music-mcp-vercel.vercel.app/api/mcp";

  return {
    enabled: true,
    issuer,
    jwksUrl,
    audience,
    requiredScopes,
    resourceUrl,
  };
}

function jwksForUrl(jwksUrl) {
  if (!cachedJwks || cachedJwksUrl !== jwksUrl) {
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
    cachedJwksUrl = jwksUrl;
  }
  return cachedJwks;
}

export async function verifyOauthBearerToken(_request, bearerToken) {
  const config = oauthConfig();
  if (!config.enabled || !bearerToken) return undefined;

  try {
    const verifyOptions = {
      issuer: config.issuer,
    };

    if (config.audience) {
      verifyOptions.audience = config.audience;
    }

    const { payload } = await jwtVerify(bearerToken, jwksForUrl(config.jwksUrl), verifyOptions);
    const scopes = [
      ...splitScopes(payload.scope),
      ...splitScopes(payload.scp),
    ];

    return {
      token: bearerToken,
      scopes,
      clientId: String(payload.client_id ?? payload.azp ?? payload.sub ?? "oauth-client"),
      extra: {
        subject: payload.sub,
        issuer: payload.iss,
        audience: payload.aud,
      },
    };
  } catch {
    return undefined;
  }
}
