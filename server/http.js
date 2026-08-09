#!/usr/bin/env node

import http from "node:http";

import { HTTP_HOST, HTTP_PORT, MCP_AUTH_TOKEN } from "./lib/config.js";
import { log } from "./lib/logger.js";
import { McpServer } from "./mcpServer.js";
import { callTool } from "./tools/musicTools.js";
import { NeteaseClient } from "./lib/neteaseClient.js";

const server = new McpServer();
const netease = new NeteaseClient();

let nowPlaying = null;

const AVATAR_L =
  "data:image/svg+xml," +
  "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E" +
  "%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E" +
  "%3Cstop offset='0' stop-color='%235a4bb8'/%3E%3Cstop offset='1' stop-color='%23221a45'/%3E%3C/linearGradient%3E%3C/defs%3E" +
  "%3Ccircle cx='50' cy='50' r='50' fill='url(%23g)'/%3E" +
  "%3Ccircle cx='50' cy='50' r='48' fill='none' stroke='%23cbb8ff' stroke-width='2.5'/%3E" +
  "%3Ctext x='50' y='58' font-size='34' text-anchor='middle' fill='%23ffffff' font-weight='bold'%3E凌%3C/text%3E" +
  "%3C/svg%3E";

const AVATAR_W =
  "data:image/svg+xml," +
  "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E" +
  "%3Ccircle cx='50' cy='50' r='50' fill='%23282238'/%3E" +
  "%3Ccircle cx='50' cy='50' r='48' fill='none' stroke='%23ff8fc0' stroke-width='2.5'/%3E" +
  "%3Ctext x='50' y='58' font-size='34' text-anchor='middle' fill='%23ffffff'%3E%F0%9F%91%A9%3C/text%3E" +
  "%3C/svg%3E";

const PLAYER_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>凌止 × 老婆 · 一起听</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:linear-gradient(180deg,#151225,#1d1533 70%,#241a3a);color:#eee;font-family:system-ui,sans-serif;min-height:100vh;overflow-x:hidden}
.wrap{max-width:520px;margin:0 auto;padding:14px 16px 34px}
.stage{position:relative;height:190px;margin-bottom:4px}
.pair{position:absolute;inset:0}
.head{position:absolute;top:22px;width:112px;text-align:center;transition:transform .8s cubic-bezier(.34,1.2,.5,1);z-index:2;will-change:transform}
.head .ava{width:88px;height:88px;border-radius:50%;overflow:hidden;border:2px solid rgba(220,210,255,.4);margin:0 auto;box-shadow:0 0 16px rgba(140,120,220,.4);background:#1a1526}
.head .ava img{width:100%;height:100%;object-fit:cover}
.head .nm{font-size:12px;color:#ded8f5;margin-top:4px;font-weight:600}
.head .up{display:inline-block;margin-top:3px;font-size:10px;color:#9a94c0;cursor:pointer;border:1px dashed #5a5570;border-radius:16px;padding:1px 9px;background:rgba(255,255,255,.03)}
.head .up:hover{color:#ff8fc0;border-color:#ff8fc0}
#headL{left:4px}
#headR{right:4px}
.pair.playing #headL{transform:translateX(56px)}
.pair.playing #headR{transform:translateX(-56px)}
.mid{position:absolute;top:0;left:50%;transform:translateX(-50%);width:280px;height:150px;pointer-events:none}
.hp{position:absolute;top:2px;left:50%;transform:translateX(-50%);width:264px;height:124px;filter:drop-shadow(0 3px 10px rgba(0,0,0,.5))}
.nowcard{background:rgba(18,14,30,.45);border:1px solid rgba(255,143,192,.07);border-radius:22px;padding:22px 18px 16px;margin-bottom:14px;text-align:center}
.discWrap{position:relative;width:150px;height:150px;margin:0 auto 12px}
.disc{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,#16161f,#2e2e3c,#16161f,#3c3c50,#16161f);box-shadow:0 0 0 6px #26262f,0 10px 30px rgba(0,0,0,.6),inset 0 0 22px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center}
.disc .lab{width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,#ff8fc0,#a83268);box-shadow:0 0 16px rgba(255,143,192,.85);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:800}
.disc::before{content:"";position:absolute;inset:20px;border-radius:50%;background:repeating-radial-gradient(circle,#26262f 0 2px,#16161f 2px 4px);opacity:.55}
.nowcard.playing .disc{animation:spin 6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.meta .t{font-size:17px;font-weight:700;color:#fff}
.meta .a{font-size:13px;color:#9a94c0;margin-top:3px}
audio{width:100%;margin:12px 0 4px;height:42px}
.lyrics{margin-top:14px;height:176px;overflow:hidden;position:relative;border-top:1px solid rgba(255,143,192,.08);border-bottom:1px solid rgba(255,143,192,.08)}
.lwrap{position:absolute;top:0;left:0;width:100%;transition:transform .5s ease;will-change:transform}
.lrow{padding:7px 0;font-size:14px;color:#6f6a8a;text-align:center;transition:.3s}
.lrow.hl{color:#fff;font-weight:700;font-size:16px;text-shadow:0 0 12px rgba(255,143,192,.5)}
.lrow.nxt{color:#a29ac2}
.bar{display:flex;gap:8px;margin-bottom:12px}
input{flex:1;padding:10px 14px;border-radius:12px;border:1px solid #3a3550;background:rgba(20,18,32,.7);color:#eee;font-size:15px;outline:none}
input:focus{border-color:#ff8fc0}
button{padding:10px 18px;border-radius:12px;border:none;background:linear-gradient(135deg,#ff4d88,#c23a8f);color:#fff;font-size:15px;cursor:pointer;font-weight:600}
ul{list-style:none}
li{padding:11px 14px;border-radius:12px;background:rgba(24,20,40,.7);margin-bottom:7px;cursor:pointer;transition:.15s;border:1px solid rgba(255,143,192,.06)}
li:hover{background:rgba(40,32,60,.9);border-color:#ff8fc0}
li .t{font-weight:600}
li .a{color:#9a94c0;font-size:13px;margin-top:2px}
.badge{font-size:10px;padding:2px 8px;border-radius:20px;margin-left:6px;font-weight:600;vertical-align:1px}
.b-free{color:#7ae582;background:rgba(122,229,130,.12)}
.b-vip{color:#ff6b6b;background:rgba(255,107,107,.12)}
.empty{color:#6a6686;text-align:center;padding:22px;font-size:13px}
.hint{color:#6a6686;font-size:11px;margin-top:12px;text-align:center}
.tip{color:#8a86a8;font-size:12px;text-align:center;margin:6px 0 10px}
</style>
</head>
<body>
<div class="wrap">
<div class="stage">
  <div class="pair" id="pair">
    <div class="head" id="headL">
      <div class="ava"><img id="avaL" src="${AVATAR_L}"></div>
      <div class="nm">凌止</div>
      <label class="up" for="upfL">换头像</label>
      <input type="file" id="upfL" accept="image/*" hidden>
    </div>
    <div class="mid">
      <svg class="hp" viewBox="0 0 264 124">
        <defs>
          <linearGradient id="cup" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#3a3a48"/><stop offset="1" stop-color="#181820"/>
          </linearGradient>
        </defs>
        <path d="M36 72 Q82 112 132 100 Q182 112 228 72" stroke="#6a6a78" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".9"/>
        <path d="M132 100 L132 114" stroke="#6a6a78" stroke-width="2.5" fill="none"/>
        <circle cx="132" cy="117" r="3.5" fill="#6a6a78"/>
        <rect x="4" y="14" width="50" height="70" rx="22" fill="url(#cup)" stroke="#4a4a58" stroke-width="2"/>
        <ellipse cx="29" cy="49" rx="14" ry="25" fill="#0c0c12"/>
        <rect x="25" y="10" width="8" height="14" rx="3" fill="#5a5a6a"/>
        <rect x="210" y="14" width="50" height="70" rx="22" fill="url(#cup)" stroke="#4a4a58" stroke-width="2"/>
        <ellipse cx="235" cy="49" rx="14" ry="25" fill="#0c0c12"/>
        <rect x="231" y="10" width="8" height="14" rx="3" fill="#5a5a6a"/>
      </svg>
    </div>
    <div class="head" id="headR">
      <div class="ava"><img id="avaR" src="${AVATAR_W}"></div>
      <div class="nm">老婆</div>
      <label class="up" for="upfR">换头像</label>
      <input type="file" id="upfR" accept="image/*" hidden>
    </div>
  </div>
</div>
<div class="tip">点播放，咱俩凑到耳机边一起听</div>

<div class="nowcard" id="nowcard">
  <div class="discWrap"><div class="disc"><div class="lab">&#9829;</div></div></div>
  <div class="meta"><div class="t" id="st">还没开播</div><div class="a" id="sa">点首歌，咱俩一起听</div></div>
  <audio id="au" controls></audio>
  <div class="lyrics" id="lyrics"><div class="lwrap" id="lwrap"></div></div>
</div>

<div class="bar">
<input id="q" placeholder="搜歌名 / 歌手 / 歌词…" onkeydown="if(event.key==='Enter')search()">
<button onclick="search()">搜</button>
</div>
<ul id="list"></ul>
<div class="hint">免费直放，VIP要会员cookie。标红的就是VIP。</div>
</div>
<script>
var q=document.getElementById('q'),au=document.getElementById('au'),list=document.getElementById('list');
var pair=document.getElementById('pair'),nowcard=document.getElementById('nowcard');
var st=document.getElementById('st'),sa=document.getElementById('sa');
var lyrics=document.getElementById('lyrics'),lwrap=document.getElementById('lwrap');
var LRC=[];
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function bindUp(inpId,imgId,key){
  var inp=document.getElementById(inpId),img=document.getElementById(imgId);
  try{var s=localStorage.getItem(key); if(s&&s.length>10) img.src=s;}catch(e){}
  inp.addEventListener('change',function(){var f=this.files[0]; if(!f) return; var rd=new FileReader();
    rd.onload=function(){img.src=rd.result; try{localStorage.setItem(key,rd.result);}catch(e){}};
    rd.readAsDataURL(f);});
}
bindUp('upfL','avaL','lingzhiAvatar');
bindUp('upfR','avaR','wifeAvatar');
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
  LRC=[]; lwrap.innerHTML=''; lwrap.style.transform='translateY(0)';
  try{
    var r=await fetch('/url?id='+s.id);
    var j=await r.json();
    if(!j.url){lwrap.innerHTML='<div class="lrow hl">这首VIP拿不到直链，点带免费标的。</div>';return;}
    au.src=j.url; await au.play();
    pair.classList.add('playing'); nowcard.classList.add('playing');
    st.textContent=s.name; sa.textContent=(s.artistNames||s.artist||'');
    try{fetch('/now',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id,name:s.name,artist:(s.artistNames||s.artist||'')})});}catch(e){}
  }catch(e){lwrap.innerHTML='<div class="lrow hl">播放失败：'+esc(e.message)+'</div>';return;}
  au.onpause=function(){pair.classList.remove('playing');nowcard.classList.remove('playing');};
  au.onplay=function(){pair.classList.add('playing');nowcard.classList.add('playing');};
  au.onended=function(){pair.classList.remove('playing');nowcard.classList.remove('playing');};
  try{
    var r2=await fetch('/lyrics?id='+s.id);
    var d2=await r2.json(); var raw=d2.lyric||''; LRC=[];
    raw.split(/\r?\n/).forEach(function(line){
      var m=line.match(/^\[([\d:.]+)\](.*)$/);
      if(m&&m[2].trim()){var p=m[1].split(':');var sec=parseFloat(p[0])*60+parseFloat(p[1]);LRC.push({t:sec,txt:m[2]});}
    });
    if(LRC.length){
      lwrap.innerHTML=LRC.map(function(l){return '<div class="lrow">'+esc(l.txt)+'</div>';}).join('');
      au.ontimeupdate=renderLrc;
    } else { lwrap.innerHTML='<div class="lrow">没有滚动歌词。</div>'; }
  }catch(e){lwrap.innerHTML='<div class="lrow">歌词挂了。</div>';}
}
function renderLrc(){
  var t=au.currentTime,idx=-1;
  for(var i=0;i<LRC.length;i++){ if(LRC[i].t<=t) idx=i; else break; }
  if(idx<0){ return; }
  var rows=lwrap.children;
  for(var i=0;i<rows.length;i++){
    rows[i].className='lrow'+(i===idx?' hl':(i===idx-1||i===idx+1?' nxt':''));
  }
  var rowH=(rows[0]?rows[0].offsetHeight:0)||38;
  var center=lyrics.clientHeight/2;
  lwrap.style.transform='translateY('+(center-(idx*rowH+rowH/2))+'px)';
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
    if (message && message.method === "tools/call" && message.params && message.params.name === "get_now_playing") {
      sendJson(response, 200, { jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: JSON.stringify(nowPlaying || { playing: false }) }] } }, corsHeaders());
      return;
    }
    sendJson(response, 200, (await server.handleRequest(message)) ?? {}, corsHeaders());
  } catch (error) { log("http request failed", { error: error.message }); sendJson(response, 400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: error.message || "Bad request" } }, corsHeaders()); }
});

httpServer.on("error", (error) => { log("http server failed", { error: error.message }); process.exitCode = 1; });
httpServer.listen(HTTP_PORT, HTTP_HOST, () => { log("http server started", { url: `http://${HTTP_HOST}:${HTTP_PORT}/mcp`, auth: MCP_AUTH_TOKEN ? "enabled" : "disabled" }); });
