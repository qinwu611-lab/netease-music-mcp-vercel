# NetEase Music MCP

Local stdio or remote HTTP MCP server for quickly searching NetEase Cloud Music and fetching timestamped lyrics.

## What It Wraps

The implementation is based on the NetEase Music developer docs you linked, especially the pages for keyword search and lyric retrieval:

- `803202bd65bc469587d05b507dcd31e7`: lyric retrieval
- `ffd83c003331452d9d0bdb45e8ab1261`: comprehensive keyword search
- `b175e0d52550427cbb7cd4735a9de765`: keyword song search
- `ca7eda92ab634c0fbc1436c99fdaad5d`: keyword album search
- `a1c2bcb0e9b44c09a45b614c3d4f1784`: keyword artist search
- `a6d0565f06c54439b7c75c145b216995`: album song list
- `ba84444321a94ffea19f592e2f92b70a`: artist album list

For this assignment, the MCP focuses on the operations you said you wanted to make fast: searching songs, searching albums, searching artists, listing album songs, listing artist albums, and fetching lyrics. The NetEase web API adapter is isolated in `server/lib/neteaseClient.js` and `server/lib/neteaseCrypto.js`, so you can later replace it with official app-key signing if your developer account requires it.

## Design Choice: No NetEase Login

This server intentionally avoids logging in to NetEase Music. It only calls public web endpoints so setup stays lightweight: no NetEase cookies, no personal account session, and no credential storage. That makes lyric/search fetching easier to run locally, deploy remotely, and share with MCP clients.

The tradeoff is that account-only behavior is out of scope. Region-restricted, VIP-only, or personalized data may be incomplete or unavailable.

## Prerequisites

- Node.js 20 or newer
- Network access to `https://music.163.com`

Install dependencies before running tests or the Vercel route:

```bash
npm install
```

The stdio server itself still uses only Node built-ins. The extra dependencies are for the Vercel/Next.js Streamable HTTP route.

## Project Structure

```text
app/api/[transport]/route.js   # Vercel MCP route at /api/mcp
app/page.js                    # small landing page for deployed app
server/index.js              # stdio entrypoint
server/http.js               # HTTP entrypoint for remote deployment
server/mcpServer.js          # MCP JSON-RPC routing
server/tools/musicTools.js   # tool schemas and handlers
server/tools/registerMcpTools.js # adapter for mcp-handler on Vercel
server/lib/neteaseClient.js  # NetEase HTTP client, timeouts, throttling
server/lib/neteaseCrypto.js  # NetEase weapi payload encryption
server/lib/normalizers.js    # response shaping
server/lib/validation.js     # tool input validation
server/lib/errors.js         # typed tool/upstream errors
server/lib/config.js         # server constants and env-backed settings
server/lib/logger.js         # stderr logging
```

## Run Locally With Stdio

```bash
npm start
```

That starts a stdio MCP server. It is meant to be launched by an MCP client, so it will wait for JSON-RPC messages on stdin.

To inspect it interactively:

```bash
npm run inspect
```

The inspector command uses `npx`, so it may download `@modelcontextprotocol/inspector` the first time.

## Run Tests

```bash
npm test
```

The test suite uses Node's built-in `node:test` runner and mocked NetEase clients, so it does not need network access.

## Run Vercel Route Locally

Start the Next.js app:

```bash
npm run dev
```

The Streamable HTTP MCP endpoint is:

```text
http://localhost:3000/api/mcp
```

To check that the Vercel build succeeds:

```bash
npm run build
```

## Environment Variables

| Name | Default | Purpose |
| --- | --- | --- |
| `NETEASE_TIMEOUT_MS` | `10000` | Maximum time to wait for a NetEase request. |
| `NETEASE_MIN_INTERVAL_MS` | `350` | Minimum delay between NetEase requests. |
| `USER_AGENT` | Browser-like default | User agent sent to NetEase. |
| `HOST` | `127.0.0.1` | HTTP host for `npm run start:http`. |
| `PORT` | `8787` | HTTP port for `npm run start:http`. |
| `OAUTH_ISSUER` | unset | OAuth issuer URL. Setting this enables OAuth protection on the Vercel MCP route. |
| `OAUTH_JWKS_URL` | derived from issuer | JWKS endpoint used to verify OAuth access tokens. |
| `DESCOPE_JWKS_URL` | derived from Descope issuer/project ID | Optional Descope JWKS override. Descope's JWKS path differs from the generic issuer default. |
| `OAUTH_AUDIENCE` | unset | Optional expected JWT audience. Leave unset for Descope MCP Auth unless you explicitly configured an audience. |
| `OAUTH_RESOURCE_URL` | deployed `/api/mcp` URL | Protected resource identifier advertised to MCP clients. |
| `OAUTH_REQUIRED_SCOPES` | unset | Optional space-separated scopes required for MCP access. |
| `DESCOPE_PROJECT_ID` | unset | Convenience setting for Descope. Used to derive issuer/audience when `OAUTH_ISSUER` is not set. |
| `DESCOPE_ISSUER_URL` | unset | Optional Descope issuer override. |

## Run Remotely With HTTP

Start an HTTP MCP endpoint:

```bash
MCP_AUTH_TOKEN="change-me-to-a-long-random-secret" npm run start:http
```

By default it listens at:

```text
http://127.0.0.1:8787/mcp
```

Remote deployment hosts usually set `PORT` for you. You can also set:

```bash
HOST=0.0.0.0
PORT=8787
MCP_AUTH_TOKEN="change-me"
NETEASE_TIMEOUT_MS=10000
NETEASE_MIN_INTERVAL_MS=350
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

Example HTTP MCP request:

```bash
curl -X POST http://127.0.0.1:8787/mcp \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer change-me-to-a-long-random-secret' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

For a public deployment, always set `MCP_AUTH_TOKEN`. Without it, anyone who can reach the URL can call your MCP tools.

## Claude Desktop Config

Add this to your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "netease-music": {
      "command": "node",
      "args": [
        "/absolute/path/to/week3/server/index.js"
      ],
      "env": {
        "NETEASE_TIMEOUT_MS": "10000",
        "NETEASE_MIN_INTERVAL_MS": "350"
      }
    }
  }
}
```

Restart Claude Desktop after saving the config.

## Remote Client Config

For a remote MCP-aware client, configure:

```text
URL: https://your-domain.example/api/mcp
Authorization: Bearer your-long-random-secret
```

Exact config syntax depends on the client.

For Vercel, use the Next.js route at `/api/mcp`. For long-running Node hosts such as a VPS, Railway, Render, or Fly.io, you can use `server/http.js`, which expects a JSON-RPC body at `POST /mcp`.

## Deploy To Vercel

The Vercel-compatible entrypoint is `app/api/[transport]/route.js`, built with `mcp-handler`.

Recommended separate-repo flow:

1. Create a new GitHub repository for this MCP.
2. Copy this folder's contents into the new repository root.
3. Run `npm install` and `npm run build`.
4. Push the new repository to GitHub.
5. Import the repository in Vercel.
6. For no-auth testing, leave OAuth env vars unset. For shared/private use, install Descope MCP Auth or another OAuth provider and set the OAuth env vars below.
7. Deploy and connect MCP clients to `https://your-vercel-app.vercel.app/api/mcp`.

Cursor-style remote config:

```json
{
  "mcpServers": {
    "netease-music": {
      "url": "https://your-vercel-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer your-long-random-secret"
      }
    }
  }
}
```

## OAuth For Claude And ChatGPT

Claude and ChatGPT custom connectors work best with real OAuth, not a pasted static bearer token. This server supports OAuth as a resource server:

- The MCP endpoint is `/api/mcp`.
- Protected resource metadata is served at `/.well-known/oauth-protected-resource`.
- JWT access tokens are verified against the configured issuer's JWKS.

Recommended provider path on Vercel:

1. Install the Descope MCP Auth integration from the Vercel Marketplace.
2. Connect it to this Vercel project.
3. In Descope, enable MCP client onboarding through DCR and/or CIMD.
4. Pull or inspect the environment variables Descope adds.
5. Make sure production has either:
   - `DESCOPE_PROJECT_ID`, or
   - `OAUTH_ISSUER` plus optional `OAUTH_JWKS_URL` and `OAUTH_AUDIENCE`.
6. Redeploy production.
7. In Claude or ChatGPT, add the MCP URL and choose OAuth authentication.

For Descope, the issuer usually looks like:

```text
https://api.descope.com/v1/apps/<DESCOPE_PROJECT_ID>
```

Descope's JWKS URL is derived as:

```text
https://api.descope.com/<DESCOPE_PROJECT_ID>/.well-known/jwks.json
```

If your provider issues scoped tokens, set:

```text
OAUTH_REQUIRED_SCOPES=netease:read
```

Leave `OAUTH_REQUIRED_SCOPES` unset while first testing the OAuth handshake, then tighten scopes once sign-in works.

## Tools

### `search_songs`

Search by song, artist, or mixed keyword.

Example input:

```json
{
  "keyword": "Stefanie Sun 遇见",
  "limit": 5
}
```

Returns song IDs, song names, artists, album names, duration, and NetEase song links.

### `search_albums`

Search by album, artist, or mixed keyword.

Example input:

```json
{
  "keyword": "Stefanie Sun Stefanie",
  "limit": 5
}
```

Returns album IDs, album names, artists, publish dates, song counts, and NetEase album links.

### `search_playlists`

Search playlists by keyword.

Example input:

```json
{
  "keyword": "Stefanie Sun covers",
  "limit": 5
}
```

Returns playlist IDs, names, creators, track counts, play counts, descriptions, cover images, and playlist links.

### `search_artists`

Search by artist name or alias.

Example input:

```json
{
  "keyword": "Stefanie Sun",
  "limit": 5
}
```

Returns artist IDs, names, aliases, music counts, album counts, images, and NetEase artist links.

### `get_song_detail`

Fetch richer metadata for one or more song IDs.

Example input:

```json
{
  "song_ids": [287035]
}
```

Returns normalized song metadata, aliases, album IDs, MV IDs, popularity, and privilege data.

### `get_album_songs`

Get songs from a known album ID.

Example input:

```json
{
  "album_id": 32772,
  "limit": 20
}
```

Returns album metadata plus song IDs, titles, artists, duration, fee status, and song links.

### `get_artist_albums`

Get albums from a known artist ID.

Example input:

```json
{
  "artist_id": 9272,
  "limit": 10
}
```

Returns artist metadata plus album IDs, names, artists, publish dates, song counts, and album links.

### `get_artist_top_songs`

Get popular songs from a known artist ID.

Example input:

```json
{
  "artist_id": 9272,
  "limit": 20
}
```

Returns artist metadata plus popular songs.

### `get_playlist_songs`

Get tracks from a known playlist ID.

Example input:

```json
{
  "playlist_id": 6792103822,
  "limit": 20,
  "offset": 0
}
```

Returns playlist metadata plus paged song details.

### `get_lyrics`

Fetch lyrics for a known song ID.

Example input:

```json
{
  "song_id": 287035,
  "include_translation": true
}
```

Returns timestamped lyric text and translated lyrics when available.

### `search_and_get_lyrics`

Search and fetch lyrics in one step.

Example input:

```json
{
  "keyword": "Stefanie Sun 遇见",
  "limit": 5,
  "pick": 0,
  "include_translation": false
}
```

Returns the selected song, alternative matches, and lyrics.

### `find_song_by_lyric_phrase`

Search candidate songs, fetch lyrics, and return matches containing a phrase.

Example input:

```json
{
  "keyword": "Stefanie Sun 遇见",
  "phrase": "我遇见谁",
  "limit": 5
}
```

Returns matching songs and the lyric lines where the phrase appears.

### `get_song_comments_summary`

Fetch hot and recent comments for a song.

Example input:

```json
{
  "song_id": 287035,
  "limit": 10
}
```

Returns total comment count, hot comments, and recent comments.

### `get_similar_songs`

Fetch NetEase similar-song recommendations for a song.

Example input:

```json
{
  "song_id": 287035,
  "limit": 10
}
```

Returns similar songs when NetEase has recommendations.

### `resolve_netease_url`

Parse a NetEase URL into a resource type and ID.

Example input:

```json
{
  "url": "https://music.163.com/#/artist?id=9272"
}
```

Returns the resource type, ID, original URL, and a suggested follow-up tool.

## Example Invocation Flow

In an MCP-aware client, ask:

```text
Use the NetEase Music MCP to search for "Stefanie Sun 遇见" and fetch the lyrics for the best match.
```

The client should call `search_and_get_lyrics`. If the first result is not the song you wanted, call it again with `pick: 1`, `pick: 2`, and so on.

## Reliability Notes

- The server validates required inputs and numeric bounds.
- Requests time out using `NETEASE_TIMEOUT_MS`.
- Calls are throttled with `NETEASE_MIN_INTERVAL_MS` to reduce rate-limit risk.
- Upstream HTTP failures, empty results, and NetEase error codes are returned as graceful tool errors.
- Logs go to stderr only, which keeps stdio MCP traffic clean.
- Remote HTTP mode supports bearer-token auth with `MCP_AUTH_TOKEN`.

## Limitations

- Some NetEase content can be region restricted, unavailable, or missing lyrics.
- This uses NetEase's public web API behavior for a local personal tool and deliberately avoids NetEase login. If your developer account provides official credentials or a different signing scheme, replace `postWeapi` in `server/lib/neteaseClient.js`.

## 简体中文说明

这是一个 NetEase Music MCP 服务器，用来快速搜索网易云音乐并获取带时间戳的歌词。它支持本地 stdio、普通 HTTP，以及适合 Vercel 部署的 Streamable HTTP 路由。

### 它做什么

主要工具包括：

- 搜索歌曲、专辑、歌单、艺人
- 获取歌曲详情
- 获取专辑歌曲列表
- 获取艺人专辑和热门歌曲
- 获取歌单歌曲
- 获取歌词
- 搜索歌曲并直接获取歌词
- 按歌词片段查找歌曲
- 解析网易云音乐 URL
- 获取歌曲评论摘要和相似歌曲

### 为什么不登录网易云音乐

这个项目是有意避开网易云音乐登录的。它只调用公开 Web 接口，不保存网易云账号、Cookie 或个人会话。这样做的好处是：

- 本地运行更简单
- 部署到 Vercel 更轻量
- 给 Claude、ChatGPT 等 MCP 客户端调用时更稳定
- 不需要处理个人账号凭据

代价是：会员、地区限制、个性化或账号相关内容可能拿不到，歌词也可能缺失。

### 本地运行

安装依赖：

```bash
npm install
```

启动 stdio MCP：

```bash
npm start
```

用 MCP Inspector 调试：

```bash
npm run inspect
```

运行测试：

```bash
npm test
```

启动 Vercel/Next.js 本地路由：

```bash
npm run dev
```

本地 MCP 地址：

```text
http://localhost:3000/api/mcp
```

检查 Vercel 构建：

```bash
npm run build
```

### 部署到 Vercel

Vercel 入口是：

```text
app/api/[transport]/route.js
```

部署后 MCP 地址通常是：

```text
https://your-vercel-app.vercel.app/api/mcp
```

如果只是个人测试，可以不设置 OAuth 环境变量。这样 Claude/ChatGPT 会以无认证方式连接。

如果想分享给朋友并保留权限控制，推荐使用 OAuth。这个项目已经支持 OAuth resource server：

- MCP endpoint: `/api/mcp`
- OAuth protected resource metadata: `/.well-known/oauth-protected-resource`
- 使用 JWKS 验证访问令牌

推荐做法是在 Vercel Marketplace 安装 Descope MCP Auth，并连接到这个 Vercel 项目。Descope 会添加类似下面的环境变量：

```text
DESCOPE_PROJECT_ID
DESCOPE_ISSUER
DESCOPE_DISCOVERY_URL
NEXT_PUBLIC_DESCOPE_PROJECT_ID
NEXT_PUBLIC_DESCOPE_BASE_URL
```

然后重新部署：

```bash
npx vercel --prod --yes
```

Claude 或 ChatGPT 中添加 MCP 地址：

```text
https://your-vercel-app.vercel.app/api/mcp
```

认证方式选择 OAuth。

### 常用环境变量

| 名称 | 作用 |
| --- | --- |
| `NETEASE_TIMEOUT_MS` | 网易云请求超时时间，默认 `10000` 毫秒。 |
| `NETEASE_MIN_INTERVAL_MS` | 请求间隔节流，默认 `350` 毫秒。 |
| `USER_AGENT` | 请求网易云时使用的 User-Agent。 |
| `OAUTH_ISSUER` | OAuth issuer。设置后 Vercel MCP 路由会启用 OAuth。 |
| `OAUTH_JWKS_URL` | 用来验证 OAuth token 的 JWKS 地址。 |
| `DESCOPE_PROJECT_ID` | Descope 项目 ID。 |
| `DESCOPE_ISSUER` | Descope issuer。 |
| `DESCOPE_JWKS_URL` | 可选的 Descope JWKS 覆盖地址。 |
| `OAUTH_AUDIENCE` | 可选 JWT audience；Descope MCP Auth 初始测试时通常不用设置。 |
| `OAUTH_REQUIRED_SCOPES` | 可选 scope 要求，例如 `netease:read`。 |

### Claude Desktop 本地配置示例

如果使用本地 stdio，而不是远程 Vercel，可以在 Claude Desktop 配置中加入：

```json
{
  "mcpServers": {
    "netease-music": {
      "command": "node",
      "args": [
        "/absolute/path/to/server/index.js"
      ],
      "env": {
        "NETEASE_TIMEOUT_MS": "10000",
        "NETEASE_MIN_INTERVAL_MS": "350"
      }
    }
  }
}
```

### 使用示例

在 Claude 或 ChatGPT 中可以问：

```text
Use the NetEase Music MCP to search for "Stefanie Sun 遇见" and return the top song ID, title, artist, and album.
```

或者：

```text
Use the NetEase Music MCP to search for "Stefanie Sun 遇见" and fetch the lyrics for the best match.
```

### 可靠性说明

- 输入参数会被校验。
- 网易云请求有超时控制。
- 请求之间有简单节流，避免代理连续调用时太激进。
- 上游错误会转成 MCP tool error，不会直接让服务器崩掉。
- stdio 模式下日志只写 stderr，避免污染 MCP JSON-RPC stdout。

### 限制

- 部分歌曲、歌词、评论可能因为地区、版权或会员限制无法获取。
- 项目使用的是公开 Web 行为，不是网易云官方 OpenAPI 登录态。
- 如果以后想改成官方 OpenAPI，可以替换 `server/lib/neteaseClient.js` 中的请求逻辑。
