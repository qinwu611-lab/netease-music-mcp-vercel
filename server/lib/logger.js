import { SERVER_NAME } from "./config.js";

export function log(message, extra) {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  process.stderr.write(`[${SERVER_NAME}] ${message}${suffix}\n`);
}
