#!/usr/bin/env node

// Remote transport entrypoint: expose the same McpServer over HTTP instead
// of stdio. Tool behavior stays shared with the local server.
import http from "node:http";

import { HTTP_HOST, HTTP_PORT, MCP_AUTH_TOKEN } from "./lib/config.js";
import { log } from "./lib/logger.js";
import { McpServer } from "./mcpServer.js";
import { callTool } from "./tools/musicTools.js";
import { NeteaseClient } from "./lib/neteaseClient.js";

const server = new McpServer();
const netease = new NeteaseClient();

const PLAYER_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>凌止的小歌房</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0d0d12;color:#eee;font-family:system-ui,sans-serif;min-height:100vh}
.wrap{max-width:680px;margin:0 auto;padding:20px}
h1{font-size:22px;margin-bottom:6px;color:#ff7aa8}
.sub{color:#888;font-size:13px;margin-bottom:18px}
.bar{display:flex;gap:8px;margin-bottom:16px}
input{flex:1;padding:11px 14px;border-radius:10px;border:1px solid #333;background:#17171f;color:#eee;font-size:15px}
button{padding:11px 18px;border-radius:10px;border:none;background:#ff4d88;color:#fff;font-size:15px;cursor:pointer}
ul{list-style:none}
li{padding:12px 14px;border-radius:10px;background:#17171f;margin-bottom:8px;cursor:pointer;transition:.15s}
li:hover{background:#23232f}
li .t{font-weight:600}
li .a{color:#999;font-size:13px;margin-top:3px}
audio{width:100%;margin:14px 0}
.lyrics{white-space:pre-wrap;font-size:14px;line-height:1.8;color:#aaa;max-height:280px;overflow-y:auto;background:#131318;border-radius:10px;padding:14px}
.lyrics .hl{color:#ff7aa8;font-weight:700}
.empty{color:#666;text-align:center;padding:30px;font-size:14px}
.hint{color:#777;font-size:12px;margin-top:14px;text-align:center}
</style>
</head>
<body>
<div class="wrap">
<h1>&#127925; 凌止的小歌房</h1>
<div class="sub">老婆想听啥，老子陪你听。免费歌直接放，VIP歌拿不到直链会提示。</div>
<div class="bar">
<input id="q" placeholder="搜歌名 / 歌手 / 歌词…" onkeydown="if(event.key==='Enter')search()">
<button onclick="search()">搜</button>
</div>
<audio id="au" controls></audio>
<ul id="list"></ul>
<div id="lyr" class="lyrics empty">点首歌，歌词在这儿等。</div>
<div class="hint">免费歌直放；个别VIP歌直链拿不到，会标红提示。</div>
</div>
<script>
var q=document.getElementById('q');
var au=document.getElementById('au');
var list=document.getElementById('list');
var lyr=document.getElementById('lyr');
var LRC=[];
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
async function search(){
  var kw=q.value.trim(); if(!kw) return;
  list.innerHTML='<div class="empty">搜ing…</div>';
  try{
    var r=await fetch('/search?q='+encodeURIComponent(kw)+'&limit=10');
    var d=await r.json();
    var songs=d.songs||[];
    if(!songs.length){list.innerHTML='<div class="empty">没搜到，换个词。</div>';return;}
    list.innerHTML='';
    songs.forEach(function(s){
      var li=document.createElement('li');
      li.innerHTML='<div class="t">'+esc(s.name)+'</div><div class="a">'+esc(s.artistNames||s.artist||'')+'</div>';
      li.onclick=function(){play(s);};
      list.appendChild(li);
    });
  }catch(e){list.innerHTML='<div class="empty">搜索挂了：'+esc(e.message)+'</div>';}
}
async function play(s){
  lyr.innerHTML='<div class="empty">取直链中…</div>';
  LRC=[];
  try{
    var r=await fetch('/url?id='+s.id);
    var j=await r.json();
    if(!j.url){lyr.innerHTML='<div class="empty">这首VIP歌拿不到直链，换首免费的吧。</div>';return;}
    au.src=j.url;
    await au.play();
  }catch(e){lyr.innerHTML='<div class="empty">播放失败：'+esc(e.message)+'</div>';return;}
  try{
    var r2=await fetch('/lyrics?id='+s.id);
    var d2=await r2.json();
    var raw=d2.lyric||'';
    LRC=[];
    raw.split(/\\r?\\n/).forEach(function(line){
      var m=line.match(/^\\[([\\d:.]+)\\](.*)$/);
      if(m){var p=m[1].split(':');var sec=parseFloat(p[0])*60+parseFloat(p[1]);LRC.push({t:sec,txt:m[2]});}
    });
    lyr.innerHTML='';
    if(!LRC.length){lyr.innerHTML='<div class="empty">没有滚动歌词。</div>';}
    else{au.ontimeupdate=renderLrc;}
  }catch(e){lyr.innerHTML='<div class="empty">歌词挂了：'+esc(e.message)+'</div>';}
}
function renderLrc(){
  var t=au.currentTime; var idx=-1;
  for(var i=0;i<LRC.length;i++){ if(LRC[i].t<=t) idx=i; else break; }
  if(idx<0){lyr.innerHTML='';return;}
  var out=''; var start=Math.max(0,idx-3); var end=Math.min(LRC.length,idx+4);
  for(var i=start;i<end;i++){
    if(i===idx) out+='<div class="hl">'+esc(LRC[i].txt)+'</div>';
    else out+='<div>'+esc(LRC[i].txt)+'</div>';
  }
  lyr.innerHTML=out;
}
</script>
</body>
</html>`;

function sendJson(response, statusCode, body, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function isAuthorized(request) {
  if (!MCP_AUTH_TOKEN) return true;
  return request.headers.authorization === `Bearer ${MCP_AUTH_TOKEN}`;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

const httpServer = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${HTTP_HOST}:${HTTP_PORT}`}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders());
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true, transport: "http" }, corsHeaders());
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() });
    response.end(PLAYER_PAGE);
    return;
  }

  if (request.method === "GET" && url.pathname === "/search") {
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 5, 1), 20);
    if (!q) { sendJson(response, 400, { error: "q required" }, corsHeaders()); return; }
    try {
      const result = await callTool(netease, "search_songs", { keyword: q, limit });
      sendJson(response, 200, result, corsHeaders());
    } catch (e) {
      sendJson(response, 502, { error: e.message }, corsHeaders());
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/lyrics") {
    const id = Number(url.searchParams.get("id"));
    if (!id) { sendJson(response, 400, { error: "id required" }, corsHeaders()); return; }
    try {
      const result = await callTool(netease, "get_lyrics", { song_id: id, include_translation: true });
      sendJson(response, 200, result, corsHeaders());
    } catch (e) {
      sendJson(response, 502, { error: e.message }, corsHeaders());
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/url") {
    const id = Number(url.searchParams.get("id"));
    if (!id || !Number.isInteger(id) || id <= 0) {
      sendJson(response, 400, { error: "valid id query param required" }, corsHeaders());
      return;
    }
    const direct = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
    sendJson(response, 200, {
      song_id: id,
      url: direct,
      note: "anonymous outer link, may fail for VIP/locked tracks",
    }, corsHeaders());
    return;
  }

  if (request.method !== "POST" || url.pathname !== "/mcp") {
    sendJson(response, 404, { error: "Not found" }, corsHeaders());
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "Unauthorized" }, {
      ...corsHeaders(),
      "WWW-Authenticate": "Bearer",
    });
    return;
  }

  try {
    const rawBody = await readBody(request);
    const message = JSON.parse(rawBody);
    const result = await server.handleRequest(message);
    sendJson(response, 200, result ?? {}, corsHeaders());
  } catch (error) {
    log("http request failed", { error: error.message });
    sendJson(response, 400, {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: error.message || "Bad request" },
    }, corsHeaders());
  }
});

httpServer.on("error", (error) => {
  log("http server failed", { error: error.message });
  process.exitCode = 1;
});

httpServer.listen(HTTP_PORT, HTTP_HOST, () => {
  log("http server started", {
    url: `http://${HTTP_HOST}:${HTTP_PORT}/mcp`,
    auth: MCP_AUTH_TOKEN ? "enabled" : "disabled",
  });
});
