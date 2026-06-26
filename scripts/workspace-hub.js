#!/usr/bin/env node

const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const home = process.env.HOME || "";
const registryPath = path.join(home, ".codex", "workspace-browser-registry.json");
const port = Number(process.env.PORT || process.argv[2] || 4316);

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "cache-control": "no-store", ...headers });
  res.end(body);
}

function json(res, status, body) {
  send(res, status, JSON.stringify(body), {
    "content-type": "application/json; charset=utf-8",
  });
}

async function readRegistry() {
  try {
    const raw = await fs.readFile(registryPath, "utf8");
    const data = JSON.parse(raw);
    return {
      activeRoot: data.activeRoot || null,
      activeUpdatedAt: data.activeUpdatedAt || null,
      projects: Array.isArray(data.projects) ? data.projects : [],
    };
  } catch {
    return { activeRoot: null, activeUpdatedAt: null, projects: [] };
  }
}

function nameFromRoot(root) {
  return path.basename(root) || root;
}

const html = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Codex Workspace Hub</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f7f4;
      --panel: #fff;
      --line: #deded8;
      --text: #1d1d1f;
      --muted: #6b6b72;
      --accent: #2f6fed;
      --soft: #eef3ff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.45 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
    }
    .shell { max-width: 980px; margin: 0 auto; padding: 22px 16px 40px; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
    h1 { margin: 0; font-size: 22px; letter-spacing: 0; }
    .sub { color: var(--muted); margin-top: 4px; }
    .hint { color: var(--muted); font-size: 12px; margin-top: 8px; }
    button {
      height: 34px;
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--text);
      cursor: pointer;
      padding: 0 12px;
    }
    button:hover { border-color: var(--accent); box-shadow: 0 0 0 3px var(--soft); }
    .list { display: grid; gap: 8px; }
    .current {
      border: 2px solid var(--accent);
      background: var(--panel);
      padding: 14px;
      margin-bottom: 12px;
    }
    .current-label { color: var(--accent); font-weight: 800; font-size: 12px; margin-bottom: 5px; }
    .item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 14px;
      align-items: center;
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 12px;
    }
    .name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .path { color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; margin-top: 3px; }
    .meta { color: var(--muted); font-size: 12px; margin-top: 5px; }
    a {
      display: inline-grid;
      place-items: center;
      height: 34px;
      min-width: 76px;
      padding: 0 12px;
      border: 1px solid var(--accent);
      color: #fff;
      background: var(--accent);
      text-decoration: none;
      font-weight: 650;
    }
    .empty {
      border: 1px dashed var(--line);
      padding: 28px;
      color: var(--muted);
      background: rgba(255,255,255,.55);
    }
  </style>
</head>
<body>
  <main class="shell">
    <header>
      <div>
        <h1>Codex 项目文件入口</h1>
        <div class="sub" id="subtitle">固定入口页。项目端口会自动登记在这里。</div>
      </div>
      <button id="refresh">刷新</button>
    </header>
    <section id="list" class="list"></section>
  </main>
  <script>
    const list = document.getElementById("list");
    const params = new URLSearchParams(location.search);
    const pinnedRoot = params.get("root") || "";
    let lastPayload = "";
    function fmtTime(value) {
      if (!value) return "";
      return new Date(value).toLocaleString("zh-CN", { hour12: false });
    }
    async function load() {
      const api = pinnedRoot ? "/api/projects?root=" + encodeURIComponent(pinnedRoot) : "/api/projects";
      const data = await fetch(api).then(r => r.json());
      const payload = JSON.stringify(data);
      if (payload === lastPayload) return;
      lastPayload = payload;
      document.getElementById("subtitle").textContent = data.pinned
        ? "本窗口已锁定到指定项目，不会被其他对话覆盖。"
        : "总入口页。多个对话共用时，顶部只代表最近激活项目。";
      const current = data.current ? '<article class="current">' +
        '<div class="current-label">' + (data.pinned ? "本窗口锁定项目" : "最近激活项目") + '</div>' +
        '<div class="name">' + data.current.name + '</div>' +
        '<div class="path">' + data.current.root + '</div>' +
        '<div class="meta">端口 ' + data.current.port + ' · ' + fmtTime(data.current.updatedAt) + '</div>' +
        '<div style="margin-top:10px"><a href="' + data.current.url + '">直接打开</a></div>' +
      '</article>' : "";
      list.innerHTML = data.projects.length ? current + data.projects.map(project => {
        return '<article class="item">' +
          '<div><div class="name">' + project.name + '</div>' +
          '<div class="path">' + project.root + '</div>' +
          '<div class="meta">端口 ' + project.port + ' · ' + fmtTime(project.updatedAt) + '</div></div>' +
          '<a href="' + project.url + '">打开</a>' +
        '</article>';
      }).join("") : '<div class="empty">还没有登记项目。让 Codex 启动一次 workspace-browser 后会自动出现在这里。</div>';
    }
    document.getElementById("refresh").addEventListener("click", load);
    setInterval(load, 2000);
    load().catch(error => { list.innerHTML = '<div class="empty">' + error.message + '</div>'; });
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/") {
      send(res, 200, html, { "content-type": "text/html; charset=utf-8" });
      return;
    }
    if (url.pathname === "/api/projects") {
      const registry = await readRegistry();
      const pinnedRoot = url.searchParams.get("root");
      const projects = registry.projects
        .map((project) => ({
          ...project,
          name: project.name || nameFromRoot(project.root),
          url: `http://127.0.0.1:${project.port}/`,
        }))
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      const current = pinnedRoot
        ? projects.find((project) => project.root === pinnedRoot) || null
        : projects.find((project) => project.root === registry.activeRoot) || null;
      json(res, 200, {
        pinned: Boolean(pinnedRoot),
        current,
        projects,
      });
      return;
    }
    send(res, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Workspace hub`);
  console.log(`URL: http://127.0.0.1:${port}`);
});
