#!/usr/bin/env node

const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { createReadStream } = require("fs");

const root = path.resolve(process.argv[2] || process.cwd());
const port = Number(process.env.PORT || process.argv[3] || 4317);

const mime = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "cache-control": "no-store", ...headers });
  res.end(body);
}

function json(res, status, body) {
  send(res, status, JSON.stringify(body), {
    "content-type": "application/json; charset=utf-8",
  });
}

function safePath(raw = "") {
  const decoded = decodeURIComponent(raw || "");
  const clean = decoded.replace(/^\/+/, "");
  const target = path.resolve(root, clean);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error("Path is outside the workspace");
  }
  return target;
}

function relPath(abs) {
  return path.relative(root, abs).split(path.sep).join("/");
}

function typeFor(name, isDirectory) {
  if (isDirectory) return "folder";
  const ext = path.extname(name).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext)) return "image";
  if ([".mp4", ".mov", ".webm", ".m4v"].includes(ext)) return "video";
  if ([".md", ".txt", ".json", ".js", ".ts", ".tsx", ".jsx", ".css", ".html", ".toml", ".yml", ".yaml"].includes(ext)) return "text";
  if (ext === ".pdf") return "pdf";
  return "file";
}

async function listDir(url, res) {
  const target = safePath(url.searchParams.get("path") || "");
  const stat = await fs.stat(target);
  if (!stat.isDirectory()) {
    json(res, 400, { error: "Not a directory" });
    return;
  }

  const entries = await fs.readdir(target, { withFileTypes: true });
  const items = await Promise.all(
    entries
      .filter((entry) => entry.name !== "node_modules" && entry.name !== ".git")
      .map(async (entry) => {
        const abs = path.join(target, entry.name);
        const st = await fs.stat(abs);
        return {
          name: entry.name,
          path: relPath(abs),
          type: typeFor(entry.name, entry.isDirectory()),
          size: entry.isDirectory() ? null : st.size,
          mtime: st.mtimeMs,
        };
      }),
  );

  items.sort((a, b) => {
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;
    return a.name.localeCompare(b.name, "zh-CN", { numeric: true });
  });

  json(res, 200, {
    root,
    path: relPath(target),
    parent: target === root ? null : relPath(path.dirname(target)),
    items,
  });
}

async function serveFile(url, res) {
  const target = safePath(url.searchParams.get("path") || "");
  const stat = await fs.stat(target);
  if (stat.isDirectory()) {
    json(res, 400, { error: "Cannot stream a directory" });
    return;
  }

  const contentType = mime[path.extname(target).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "content-type": contentType,
    "content-length": stat.size,
    "cache-control": "private, max-age=60",
  });
  createReadStream(target).pipe(res);
}

const html = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Workspace Browser</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f7f4;
      --panel: #ffffff;
      --line: #deded8;
      --text: #1d1d1f;
      --muted: #6b6b72;
      --accent: #2f6fed;
      --soft: #eef3ff;
      --danger: #b42318;
      --shadow: 0 18px 50px rgba(24, 28, 38, .08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.45 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
    }
    button, input { font: inherit; }
    .shell { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
    .topbar {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      align-items: center;
      padding: 10px 12px;
      background: rgba(255,255,255,.88);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(14px);
      position: sticky;
      top: 0;
      z-index: 5;
    }
    .nav { display: flex; gap: 6px; align-items: center; }
    .iconbtn {
      width: 32px;
      height: 32px;
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--text);
      display: grid;
      place-items: center;
      cursor: pointer;
    }
    .iconbtn:disabled { opacity: .35; cursor: default; }
    .pathbox {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px;
      height: 32px;
      border: 1px solid var(--line);
      background: #fbfbf9;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .pathbox strong { font-weight: 650; overflow: hidden; text-overflow: ellipsis; }
    .tools { display: flex; gap: 8px; align-items: center; }
    .search {
      width: min(32vw, 260px);
      height: 32px;
      border: 1px solid var(--line);
      padding: 0 10px;
      background: #fff;
      outline: none;
    }
    .search:focus, .iconbtn:focus-visible { border-color: var(--accent); box-shadow: 0 0 0 3px var(--soft); }
    .content {
      min-height: 0;
      display: grid;
      grid-template-columns: 1fr minmax(260px, 34%);
    }
    .main {
      min-width: 0;
      padding: 14px;
      overflow: auto;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
      gap: 10px;
    }
    .list { display: grid; gap: 6px; }
    .item {
      border: 1px solid var(--line);
      background: var(--panel);
      cursor: pointer;
      min-width: 0;
    }
    .item:hover, .item.selected { border-color: var(--accent); box-shadow: 0 0 0 3px var(--soft); }
    .grid .item { padding: 10px; min-height: 126px; display: grid; grid-template-rows: 72px auto auto; gap: 6px; }
    .list .item { display: grid; grid-template-columns: 34px 1fr auto auto; gap: 10px; align-items: center; padding: 8px 10px; }
    .thumb {
      min-width: 0;
      display: grid;
      place-items: center;
      background: #f0f0ec;
      overflow: hidden;
      color: var(--muted);
      font-size: 27px;
    }
    .grid .thumb { height: 72px; }
    .list .thumb { width: 28px; height: 28px; font-size: 17px; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    .meta { color: var(--muted); font-size: 12px; white-space: nowrap; }
    .preview {
      min-width: 0;
      border-left: 1px solid var(--line);
      background: #fbfbf8;
      padding: 14px;
      overflow: auto;
    }
    .preview h2 { margin: 0 0 4px; font-size: 15px; }
    .preview .sub { color: var(--muted); font-size: 12px; margin-bottom: 14px; word-break: break-all; }
    .preview img, .preview video, .preview iframe {
      width: 100%;
      max-height: 58vh;
      border: 1px solid var(--line);
      background: #fff;
      object-fit: contain;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid var(--line);
      background: #fff;
      padding: 12px;
      max-height: 58vh;
      overflow: auto;
      font-family: "SF Mono", ui-monospace, Menlo, monospace;
      font-size: 12px;
    }
    .empty {
      border: 1px dashed var(--line);
      padding: 42px 16px;
      text-align: center;
      color: var(--muted);
      background: rgba(255,255,255,.55);
    }
    @media (max-width: 880px) {
      .content { grid-template-columns: 1fr; }
      .preview { border-left: 0; border-top: 1px solid var(--line); min-height: 260px; }
      .search { width: 160px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div class="nav">
        <button id="back" class="iconbtn" title="返回上一级" aria-label="返回上一级">‹</button>
        <button id="refresh" class="iconbtn" title="刷新" aria-label="刷新">↻</button>
      </div>
      <div class="pathbox" title=""><span>工作区</span><strong id="path">/</strong></div>
      <div class="tools">
        <input id="search" class="search" placeholder="筛选文件..." aria-label="筛选文件" />
        <button id="mode" class="iconbtn" title="切换列表/网格" aria-label="切换列表/网格">▦</button>
      </div>
    </header>
    <main class="content">
      <section class="main">
        <div id="items" class="grid"></div>
      </section>
      <aside id="preview" class="preview">
        <div class="empty">选择文件预览</div>
      </aside>
    </main>
  </div>
  <script>
    let state = { path: "", parent: null, items: [], selected: null, mode: localStorage.getItem("mode") || "grid" };
    const $ = (id) => document.getElementById(id);
    const icon = (type) => ({ folder: "📁", image: "▧", video: "▶", pdf: "PDF", text: "TXT", file: "◇" }[type] || "◇");
    const fmtSize = (n) => n == null ? "" : n < 1024 ? n + " B" : n < 1048576 ? (n/1024).toFixed(1) + " KB" : n < 1073741824 ? (n/1048576).toFixed(1) + " MB" : (n/1073741824).toFixed(2) + " GB";
    const fmtDate = (n) => new Date(n).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    const fileUrl = (p) => "/file?path=" + encodeURIComponent(p);
    async function load(path = state.path) {
      const res = await fetch("/api/list?path=" + encodeURIComponent(path));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "load failed");
      state = { ...state, path: data.path, parent: data.parent, items: data.items, selected: null };
      render();
    }
    function filtered() {
      const q = $("search").value.trim().toLowerCase();
      return q ? state.items.filter((item) => item.name.toLowerCase().includes(q)) : state.items;
    }
    function render() {
      $("path").textContent = state.path || "/";
      document.querySelector(".pathbox").title = state.path || "/";
      $("back").disabled = state.parent == null;
      $("items").className = state.mode;
      $("mode").textContent = state.mode === "grid" ? "☷" : "▦";
      const items = filtered();
      $("items").innerHTML = items.length ? items.map(item => {
        const thumb = item.type === "image"
          ? '<img loading="lazy" src="' + fileUrl(item.path) + '" alt="">'
          : icon(item.type);
        return '<article class="item' + (state.selected?.path === item.path ? " selected" : "") + '" data-path="' + item.path + '">' +
          '<div class="thumb">' + thumb + '</div>' +
          '<div class="name" title="' + item.name + '">' + item.name + '</div>' +
          '<div class="meta">' + (item.type === "folder" ? "文件夹" : fmtSize(item.size)) + '</div>' +
          '<div class="meta">' + fmtDate(item.mtime) + '</div>' +
          '</article>';
      }).join("") : '<div class="empty">没有匹配的文件</div>';
    }
    async function preview(item) {
      state.selected = item;
      render();
      const el = $("preview");
      const title = '<h2>' + item.name + '</h2><div class="sub">' + item.path + '</div>';
      if (item.type === "folder") {
        await load(item.path);
        return;
      }
      if (item.type === "image") {
        el.innerHTML = title + '<img src="' + fileUrl(item.path) + '" alt="">';
      } else if (item.type === "video") {
        el.innerHTML = title + '<video src="' + fileUrl(item.path) + '" controls preload="metadata"></video>';
      } else if (item.type === "pdf") {
        el.innerHTML = title + '<iframe src="' + fileUrl(item.path) + '"></iframe>';
      } else if (item.type === "text" && item.size < 1024 * 1024) {
        const text = await fetch(fileUrl(item.path)).then(r => r.text());
        el.innerHTML = title + '<pre></pre>';
        el.querySelector("pre").textContent = text;
      } else {
        el.innerHTML = title + '<div class="empty">此文件可在系统中打开<br>' + fmtSize(item.size) + '</div>';
      }
    }
    $("items").addEventListener("click", (event) => {
      const card = event.target.closest(".item");
      if (!card) return;
      const item = state.items.find(x => x.path === card.dataset.path);
      if (item) preview(item);
    });
    $("back").addEventListener("click", () => state.parent != null && load(state.parent));
    $("refresh").addEventListener("click", () => load());
    $("search").addEventListener("input", render);
    $("mode").addEventListener("click", () => {
      state.mode = state.mode === "grid" ? "list" : "grid";
      localStorage.setItem("mode", state.mode);
      render();
    });
    load().catch((error) => {
      $("items").innerHTML = '<div class="empty">' + error.message + '</div>';
    });
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/") {
      send(res, 200, html, { "content-type": "text/html; charset=utf-8" });
    } else if (url.pathname === "/api/list") {
      await listDir(url, res);
    } else if (url.pathname === "/file") {
      await serveFile(url, res);
    } else {
      send(res, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
    }
  } catch (error) {
    json(res, 500, { error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Workspace browser`);
  console.log(`Root: ${root}`);
  console.log(`URL:  http://127.0.0.1:${port}`);
});
