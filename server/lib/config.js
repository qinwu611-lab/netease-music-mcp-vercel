export const SERVER_NAME = "netease-music-mcp";
export const SERVER_VERSION = "0.1.0";
export const MUSIC_ORIGIN = "https://music.163.com";
export const REQUEST_TIMEOUT_MS = Number(process.env.NETEASE_TIMEOUT_MS ?? 10000);
export const MIN_REQUEST_INTERVAL_MS = Number(process.env.NETEASE_MIN_INTERVAL_MS ?? 350);
export const HTTP_HOST = process.env.HOST ?? "127.0.0.1";
export const HTTP_PORT = Number(process.env.PORT ?? 8787);
export const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN ?? "";
export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 NetEaseMusicMCP/0.1";
