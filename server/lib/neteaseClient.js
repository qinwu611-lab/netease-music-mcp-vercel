import { MIN_REQUEST_INTERVAL_MS, MUSIC_ORIGIN, REQUEST_TIMEOUT_MS, USER_AGENT } from "./config.js";
import { TimeoutError, UpstreamError } from "./errors.js";
import { createWeapiPayload } from "./neteaseCrypto.js";

// All NetEase HTTP traffic goes through this file: headers, throttling,
// timeouts, and upstream error conversion live here instead of in tool code.
let lastRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle() {
  // A tiny client-side delay is enough for this personal MCP and avoids
  // accidentally hammering NetEase while an agent chains tool calls.
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
  lastRequestAt = Date.now();
}

function assertSuccess(parsed) {
  if (parsed.code && parsed.code !== 200) {
    throw new UpstreamError(`NetEase returned code ${parsed.code}`, {
      upstreamCode: parsed.code,
    });
  }
}

async function parseJsonResponse(response) {
  const body = await response.text();
  if (!response.ok) {
    throw new UpstreamError(`NetEase returned HTTP ${response.status}: ${body.slice(0, 200)}`, {
      status: response.status,
    });
  }

  try {
    const parsed = JSON.parse(body);
    assertSuccess(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError("NetEase returned invalid JSON", { cause: error });
  }
}

async function requestWithTimeout(url, init = {}) {
  await throttle();

  // AbortController gives us a real timeout for fetch, which otherwise may
  // hang long enough to make the MCP client feel broken.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return await parseJsonResponse(response);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new TimeoutError(REQUEST_TIMEOUT_MS, { cause: error });
    }
    if (error instanceof UpstreamError || error instanceof TimeoutError) throw error;
    throw new UpstreamError(error.message || "NetEase request failed", { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

export class NeteaseClient {
  async postWeapi(path, data = {}) {
    // Web-client endpoints expect encrypted form fields named params/encSecKey.
    return requestWithTimeout(`${MUSIC_ORIGIN}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        Referer: `${MUSIC_ORIGIN}/`,
        Origin: MUSIC_ORIGIN,
      },
      body: createWeapiPayload(data),
    });
  }

  async getJson(path, params = {}) {
    // Some older NetEase endpoints still return plain JSON with query params.
    const url = new URL(`${MUSIC_ORIGIN}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    return requestWithTimeout(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: `${MUSIC_ORIGIN}/`,
      },
    });
  }
}
