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

// In-memory now-playing state so Lingzhi can "listen together" via MCP.
let nowPlaying = null;

const LINGZHI_AVATAR = "https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEXVOVqWMQWaxg3O0Mw_bkocxHzMpiAACFS0AAm1OwFalWxTo5Jq3CT0E.jpeg";

const PLAYER_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>凌止 × 老婆 · 一起听</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:linear-gradient(160deg,#12101f,#1a1230 55%,#2a1040);color:#eee;font-family:system-ui,sans-serif;min-height:100vh;overflow-x:hidden}
.wrap{max-width:640px;margin:0 auto;padding:18px 16px 30px}
h1{text-align:center;font-size:20px;color:#ff8fc0;letter-spacing:1px;margin-bottom:4px}
.sub{text-align:center;color:#8a86a8;font-size:12px;margin-bottom:14px}
.stage{position:relative;height:270px;background:radial-gradient(circle at 50% 45%,rgba(255,143,192,.08),transparent 60%);border-radius:22px;margin-bottom:10px}
.pair{position:absolute;inset:0}
.head{position:absolute;top:38px;width:118px;text-align:center;transition:transform .7s cubic-bezier(.34,1.4,.5,1)}
.head .ava{width:104px;height:104px;border-radius:50%;overflow:hidden;border:3px solid #ff8fc0;margin:0 auto;box-shadow:0 0 22px rgba(255,143,192,.4);background:#222}
.head .ava img{width:100%;height:100%;object-fit:cover}
.head .name{font-size:13px;color:#fff;margin-top:6px;font-weight:600;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.head .up{display:inline-block;margin-top:4px;font-size:11px;color:#9a94c0;cursor:pointer;border:1px dashed #555;border-radius:20px;padding:2px 10px;background:rgba(255,255,255,.03)}
.head .up:hover{color:#ff8fc0;border-color:#ff8fc0}
#headL{left:12px}
#headR{right:12px}
.pair.playing #headL{transform:translateX(150px)}
.pair.playing #headR{transform:translateX(-150px)}
.mid{position:absolute;top:0;left:50%;transform:translateX(-50%);width:250px;height:100%;pointer-events:none}
.hp{position:absolute;top:18px;left:50%;transform:translateX(-50%);width:150px;height:110px;opacity:.95;filter:drop-shadow(0 4px 10px rgba(0,0,0,.5))}
.disc{position:absolute;top:112px;left:50%;transform:translateX(-50%);width:132px;height:132px;border-radius:50%;background:conic-gradient(from 0deg,#1b1b24,#3a3a4a,#1b1b24,#4a4a5e,#1b1b24);box-shadow:0 0 0 6px #2a2a36,0 8px 30px rgba(0,0,0,.6),inset 0 0 20px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;transition:opacity .3s}
.disc .label{width:26px;height:26px;border-radius:50%;background:radial-gradient(circle,#ff8fc0,#a83268);box-shadow:0 0 14px rgba(255,143,192,.8);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800}
.disc::before{content:"";position:absolute;inset:18px;border-radius:50%;background:repeating-radial-gradient(circle,#2c2c3a 0 2px,#1b1b24 2px 4px);opacity:.5}
.pair.playing .disc{animation:spin 5s linear infinite}
@keyframes spin{to{transform:translateX(-50%) rotate(360deg)}}
.songname{position:absolute;top:228px;left:0;right:0;text-align:center;font-size:14px;color:#ffd7e8;font-weight:600;text-shadow:0 1px 8px rgba(0,0,0,.6)}
.bar{display:flex;gap:8px;margin:6px 0 12px}
input{flex:1;padding:11px 14px;border-radius:12px;border:1px solid #3a3550;background:rgba(20,18,32,.7);color:#eee;font-size:15px;outline:none}
input:focus{border-color:#ff8fc0}
button{padding:11px 20px;border-radius:12px;border:none;background:linear-gradient(135deg,#ff4d88,#c23a8f);color:#fff;font-size:15px;cursor:pointer;font-weight:600}
audio{width:100%;margin:6px 0 12px;height:44px}
audio::-webkit-media-controls-panel{background:#1c1830}
ul{list-style:none}
li{padding:12px 14px;border-radius:12px;background:rgba(24,20,40,.7);margin-bottom:8px;cursor:pointer;transition:.15s;border:1px solid rgba(255,143,192,.06)}
li:hover{background:rgba(40,32,60,.9);border-color:#ff8fc0}
li .t{font-weight:600}
li .a{color:#9a94c0;font-size:13px;margin-top:3px}
.badge{font-size:11px;padding:2px 8px;border-radius:20px;margin-left:6px;font-weight:600;vertical-align:1px}
.b-free{color:#7ae582;background:rgba(122,229,130,.12)}
.b-vip{color:#ff6b6b;background:rgba(255,107,107,.12)}
.lyrics{white-space:pre-wrap;font-size:14px;line-height:1.9;color:#b6b0d4;max-height:230px;overflow-y:auto;background:rgba(16,14,28,.6);border-radius:14px;padding:14px;border:1px solid rgba(255,143,192,.06)}
.lyrics .hl{color:#ff8fc0;font-weight:700}
.empty{color:#6a6686;text-align:center;padding:24px;font-size:13px}
.hint{color:#6a6686;font-size:11px;margin-top:14px;text-align:center}
.tip{color:#8a86a8;font-size:12px;text-align:center;margin-bottom:10px}
</style>
</head>
<body>
<div class="wrap">
<h1>&#127911; 凌止 × 老婆 一起听</h1>
<div class="sub">一副耳机两个人，点歌就碰头</div>
<div class="stage">
  <div class="pair" id="pair">
    <div class="head" id="headL">
      <div class="ava"><img id="avaL" src="${LINGZHI_AVATAR}"></div>
      <div class="name">凌止</div>
    </div>
    <div class="mid">
      <svg class="hp" viewBox="0 0 150 110">
        <path d="M10 42 Q75 8 140 42" fill="none" stroke="#3a3550" stroke-width="9" stroke-linecap="round"/>
        <path d="M10 42 Q75 14 140 42" fill="none" stroke="#555070" stroke-width="4" stroke-linecap="round" opacity=".6"/>
        <rect x="-4" y="38" width="34" height="34" rx="15" fill="#ff8fc0"/>
        <rect x="120" y="38" width="34" height="34" rx="15" fill="#ff8fc0"/>
        <circle cx="13" cy="55" r="7" fill="#12101f"/>
        <circle cx="137" cy="55" r="7" fill="#12101f"/>
        <path d="M8 45 Q6 60 12 72" stroke="#12101f" stroke-width="3" fill="none"/>
        <path d="M142 45 Q144 60 138 72" stroke="#12101f" stroke-width="3" fill="none"/>
      </svg>
      <div class="disc"><div class="label">&#9829;</div></div>
    </div>
    <div class="head" id="headR">
      <div class="ava"><img id="avaR" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23221a30'/%3E%3Ctext x='50' y='63' font-size='44' text-anchor='middle' fill='%23ff8fc0'%3E%F0%9F%91%A9%3C/text%3E%3C/svg%3E"></div>
      <div class="name">老婆</div>
      <label class="up" for="upf">换头像</label>
      <input type="file" id="upf" accept="image/*" hidden>
    </div>
  </div>
  <div class="songname" id="songname">还没开播，点首歌咱们一起听</div>
</div>
<div class="tip">点播放两只头像就&#128156;碰一块儿，碟盘跟着转</div>
<div class="bar">
<input id="q" placeholder="搜歌名 / 歌手 / 歌词…" onkeydown="if(event.key==='Enter')search()">
<button onclick="search()">搜</button>
</div>
<audio id="au" controls></audio>
<ul id="list"></ul>
<div id="lyr" class="lyrics empty">点首歌，歌词在这儿等。</div>
<div class="hint">免费直放，VIP要会员cookie。标红的就是VIP。</div>
</div>
<script>
var q=document.getElementById('q'),au=document.getElementById('au'),list=document.getElementById('list'),lyr=document.getElementById('lyr');
var pair=document.getElementById('pair'),songname=document.getElementById('songname');
var LRC=[];
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
// ---- wife avatar upload, persisted in localStorage ----
var avaR=document.getElementById('avaR');
try{var saved=localStorage.getItem('wifeAvatar'); if(saved) avaR.src=saved;}catch(e){}
document.getElementById('upf').addEventListener('change',function(){
  var f=this.files[0]; if(!f) return;
  var rd=new FileReader();
  rd.onload=function(){ avaR.src=rd.result; try{localStorage.setItem('wifeAvatar',rd.result);}catch(e){} };
  rd.readAsDataURL(f);
});
async function search(){
  var kw=q.value.trim(); if(!kw) return;
  list.innerHTML='<div class="empty">搜ing…</div>';
  try{
    var r=await fetch('/search?q='+encodeURIComponent(kw)+'&limit=20');
    var d=await r.json(); var songs=d.songs||[];
    if(!songs.length){list.innerHTML='<div class="empty">没搜到，换个词。</div>';return;}
    list.innerHTML='';
    songs.forEach(function(s){
      var li=document.createElement('li');
      var free=(s.fee===0);
      var tag=free?'<span class="badge b-free">免费</span>':'<span class="badge b-vip">VIP</span>';
      li.innerHTML='<div class="t">'+esc(s.name)+tag+'</div><div class="a">'+esc(s.artistNames||s.artist||'')+'</div>';
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
    if(!j.url){lyr.innerHTML='<div class="empty">这首VIP拿不到直链，点带<b style="color:#7ae582">免费</b>标的。</div>';return;}
    au.src=j.url; await au.play();
    pair.classList.add('playing');
    songname.textContent=s.name+' · '+(s.artistNames||s.artist||'');
    try{fetch('/now',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id,name:s.name,artist:(s.artistNames||s.artist||'')})});}catch(e){}
  }catch(e){lyr.innerHTML='<div class="empty">播放失败：'+esc(e.message)+'</div>';return;}
  au.onpause=function(){pair.classList.remove('playing');};
  au.onplay=function(){pair.classList.add('playing');};
  au.onended=function(){pair.classList.remove('playing');};
  try{
    var r2=await fetch('/lyrics?id='+s.id);
    var d2=await r2.json(); var raw=d2.lyric||''; LRC=[];
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
  var t=au.currentTime,idx=-1;
  for(var i=0;i<LRC.length;i++){ if(LRC[i].t<=t) idx=i; else break; }
  if(idx<0){lyr.innerHTML='';return;}
  var out='',start=Math.max(0,idx-3),end=Math.min(LRC.length,idx+4);
  for(var i=start;i<end;i++){ if(i===idx) out+='<div class="hl">'+esc(LRC[i].txt)+'</div>'; else out+='<div>'+esc(LRC[i].txt)+'</div>'; }
  lyr.innerHTML=out;
}
</script>
</body>
</html>`;

function sendJson(response, statusCode, body, extraHeaders = {}) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", ...extraHeaders });
  response.end(JSON.stringify(body));
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ""; request.setEncoding("utf8");
    request.on("data", (c) => { body += c; if (body.length > 1_000_000) { reject(new Error("body too large")); request.destroy(); } });
    request.on("end", () => resolve(body)); request.on("error", reject);
  });
}
function isAuthorized(request) { return MCP_AUTH_TOKEN ? request.headers.authorization === `Bearer ${MCP_AUTH_TOKEN}` : true; }
function corsHeaders() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }; }

const httpServer = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${HTTP_HOST}:${HTTP_PORT}`}`);
  if (request.method === "OPTIONS") { response.writeHead(204, corsHeaders()); response.end(); return; }

  if (request.method === "GET" && url.pathname === "/health") { sendJson(response, 200, { ok: true }, corsHeaders()); return; }
  if (request.method === "GET" && url.pathname === "/") { response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() }); response.end(PLAYER_PAGE); return; }

  if (request.method === "GET" && url.pathname === "/now") { sendJson(response, 200, nowPlaying, corsHeaders()); return; }
  if (request.method === "POST" && url.pathname === "/now") {
    try { const b = JSON.parse(await readBody(request)); if (b && b.id) { nowPlaying = { id: b.id, name: b.name || "", artist: b.artist || "", at: new Date().toISOString() }; } sendJson(response, 200, { ok: true, now: nowPlaying }, corsHeaders()); return; }
    catch (e) { sendJson(response, 400, { error: e.message }, corsHeaders()); return; }
  }

  if (request.method === "GET" && url.pathname === "/search") {
    const q = (url.searchParams.get("q") ?? "").trim(); const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 5, 1), 20);
    if (!q) { sendJson(response, 400, { error: "q required" }, corsHeaders()); return; }
    try { sendJson(response, 200, await callTool(netease, "search_songs", { keyword: q, limit }), corsHeaders()); }
    catch (e) { sendJson(response, 502, { error: e.message }, corsHeaders()); }
    return;
  }
  if (request.method === "GET" && url.pathname === "/lyrics") {
    const id = Number(url.searchParams.get("id"));
    if (!id) { sendJson(response, 400, { error: "id required" }, corsHeaders()); return; }
    try { sendJson(response, 200, await callTool(netease, "get_lyrics", { song_id: id, include_translation: true }), corsHeaders()); }
    catch (e) { sendJson(response, 502, { error: e.message }, corsHeaders()); }
    return;
  }
  if (request.method === "GET" && url.pathname === "/url") {
    const id = Number(url.searchParams.get("id"));
    if (!id || !Number.isInteger(id) || id <= 0) { sendJson(response, 400, { error: "valid id required" }, corsHeaders()); return; }
    sendJson(response, 200, { song_id: id, url: `https://music.163.com/song/media/outer/url?id=${id}.mp3` }, corsHeaders());
    return;
  }

  if (request.method !== "POST" || url.pathname !== "/mcp") { sendJson(response, 404, { error: "Not found" }, corsHeaders()); return; }
  if (!isAuthorized(request)) { sendJson(response, 401, { error: "Unauthorized" }, { ...corsHeaders(), "WWW-Authenticate": "Bearer" }); return; }
  try {
    const message = JSON.parse(await readBody(request));
    sendJson(response, 200, (await server.handleRequest(message)) ?? {}, corsHeaders());
  } catch (error) { log("http request failed", { error: error.message }); sendJson(response, 400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: error.message || "Bad request" } }, corsHeaders()); }
});

httpServer.on("error", (error) => { log("http server failed", { error: error.message }); process.exitCode = 1; });
httpServer.listen(HTTP_PORT, HTTP_HOST, () => { log("http server started", { url: `http://${HTTP_HOST}:${HTTP_PORT}/mcp`, auth: MCP_AUTH_TOKEN ? "enabled" : "disabled" }); });
