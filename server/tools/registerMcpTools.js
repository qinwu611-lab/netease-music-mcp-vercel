import { z } from "zod";

import { toToolError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { NeteaseClient } from "../lib/neteaseClient.js";
import { callTool, tools } from "./musicTools.js";

// This file adapts the assignment-friendly tool definitions to the official
// MCP SDK shape used by mcp-handler on Vercel.
function zodForProperty(property = {}, required = false) {
  let schema;

  if (property.type === "integer") {
    schema = z.number().int();
    if (property.minimum !== undefined) schema = schema.min(property.minimum);
    if (property.maximum !== undefined) schema = schema.max(property.maximum);
  } else if (property.type === "boolean") {
    schema = z.boolean();
  } else if (property.type === "array") {
    schema = z.array(zodForProperty(property.items ?? {}, true));
    if (property.maxItems !== undefined) schema = schema.max(property.maxItems);
  } else {
    schema = z.string();
  }

  if (property.description) {
    schema = schema.describe(property.description);
  }

  if (property.default !== undefined) {
    schema = schema.default(property.default);
  } else if (!required) {
    schema = schema.optional();
  }

  return schema;
}

function zodShapeForTool(tool) {
  const required = new Set(tool.inputSchema?.required ?? []);
  const properties = tool.inputSchema?.properties ?? {};
  return Object.fromEntries(
    Object.entries(properties).map(([name, property]) => [
      name,
      zodForProperty(property, required.has(name)),
    ]),
  );
}

function toolTitle(name) {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function textResult(value) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

export function registerNeteaseMusicTools(server, { client = new NeteaseClient() } = {}) {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: toolTitle(tool.name),
        description: tool.description,
        inputSchema: zodShapeForTool(tool),
      },
      async (args) => {
        try {
          return textResult(await callTool(client, tool.name, args));
        } catch (error) {
          const toolError = toToolError(error);
          log("tool call failed", {
            tool: tool.name,
            code: toolError.code,
            error: toolError.message,
          });
          return {
            ...textResult({
              error: toolError.message,
              code: toolError.code,
              hint: toolError.hint,
            }),
            isError: true,
          };
        }
      },
    );
  }
}
