// Errors carry a machine-friendly code and a user-facing hint. The MCP layer
// can expose these without leaking stack traces or low-level fetch details.
export class McpToolError extends Error {
  constructor(message, { code = "TOOL_ERROR", hint, cause } = {}) {
    super(message, { cause });
    this.name = "McpToolError";
    this.code = code;
    this.hint = hint;
  }
}

export class InputError extends McpToolError {
  constructor(message) {
    super(message, {
      code: "INVALID_INPUT",
      hint: "Check the tool input schema and try again.",
    });
    this.name = "InputError";
  }
}

export class UpstreamError extends McpToolError {
  constructor(message, { status, upstreamCode, cause } = {}) {
    super(message, {
      code: "UPSTREAM_ERROR",
      hint: "NetEase rejected or failed the request. Try again later, use a smaller limit, or check whether the content is available.",
      cause,
    });
    this.name = "UpstreamError";
    this.status = status;
    this.upstreamCode = upstreamCode;
  }
}

export class TimeoutError extends McpToolError {
  constructor(timeoutMs, { cause } = {}) {
    super(`NetEase request timed out after ${timeoutMs}ms`, {
      code: "UPSTREAM_TIMEOUT",
      hint: "Try again, or increase NETEASE_TIMEOUT_MS if your connection is slow.",
      cause,
    });
    this.name = "TimeoutError";
  }
}

export function toToolError(error) {
  // Anything unexpected gets normalized before it reaches the MCP client.
  if (error instanceof McpToolError) return error;
  return new McpToolError(error.message || "Unexpected tool error", {
    code: "UNEXPECTED_ERROR",
    hint: "Try again. If this persists, inspect stderr logs for details.",
    cause: error,
  });
}
