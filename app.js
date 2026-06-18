const GIST_FILENAME = "quicknote_notes.json";

const LS_CACHE_KEY = "qn_cache";
const LS_GIST_ID_KEY = "qn_gist_id";
const LS_THEME_KEY = "qn_theme";
const LS_ATTACH_REPO_KEY = "qn_attach_repo";
const ATTACH_PREFIX = "quicknote-attachments";

let token = null;
let gistId = localStorage.getItem(LS_GIST_ID_KEY);
let notes = [];
let activeId = null, activeTag = null, searchQuery = "", previewMode = false, autoSaveTimer = null;

async function doLogin(e) {
  e.preventDefault();
  const elErr = document.getElementById("login-error");
  token = document.getElementById("login-token").value.trim();
  if (!token) { elErr.textContent = "请输入令牌"; elErr.style.display = "block"; return; }
  try {
    await ghApi("/user");
    elErr.style.display = "none";
    sessionStorage.setItem("qn_auth", "1");
    sessionStorage.setItem("qn_token", token);
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").classList.remove("app-hidden");
    initNotes();
  } catch(e) { elErr.textContent = "错误: " + e.message; elErr.style.display = "block"; token = null; }
}

function logout() {
  token = null; gistId = null;
  sessionStorage.removeItem("qn_auth"); sessionStorage.removeItem("qn_token");
  localStorage.removeItem(LS_GIST_ID_KEY); localStorage.removeItem(LS_CACHE_KEY);
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("app").classList.add("app-hidden");
  showSidebar();
  notes = [];
}

document.getElementById("login-form").addEventListener("submit", doLogin);
document.getElementById("logout-btn").addEventListener("click", logout);

const savedToken = sessionStorage.getItem("qn_token");
if (savedToken) {
  token = savedToken;
  (async () => { try { document.getElementById("login-screen").style.display = "none"; document.getElementById("app").classList.remove("app-hidden"); initNotes(); } catch(e) { sessionStorage.removeItem("qn_auth"); sessionStorage.removeItem("qn_token"); } })();
}

async function ghApi(path, method, body) {
  const opts = { method: method || "GET", headers: { "Authorization": "Bearer " + token, "Accept": "application/vnd.github.v3+json", "User-Agent": "QuickNote" } };
  if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  const res = await fetch("https://api.github.com" + path, opts);
  if (!res.ok) throw new Error((await res.text()).slice(0, 200));
  return await res.json();
}

async function findOrCreateGist() {
  try {
    const gists = await ghApi("/gists?per_page=100");
    for (const g of gists) { if (g.files && g.files[GIST_FILENAME]) return g.id; }
  } catch(e) {}
  return (await ghApi("/gists", "POST", { description: "快速笔记数据", public: false, files: { [GIST_FILENAME]: { content: "[]" } } })).id;
}

async function loadFromGist() {
  if (!gistId) return false;
  try {
    const gist = await ghApi("/gists/" + gistId);
    const f = gist.files[GIST_FILENAME];
    if (f && f.content) { notes = JSON.parse(f.content); return true; }
  } catch(e) {}
  return false;
}

async function saveToGist() {
  if (!gistId) return;
  try {
    await ghApi("/gists/" + gistId, "PATCH", { files: { [GIST_FILENAME]: { content: JSON.stringify(notes) } } });
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(notes));
  } catch(e) { console.error("Sync fail", e); }
}

async function initNotes() {
  if (!gistId) {
    gistId = localStorage.getItem(LS_GIST_ID_KEY);
    if (!gistId) { try { gistId = await findOrCreateGist(); localStorage.setItem(LS_GIST_ID_KEY, gistId); } catch(e) { return; } }
  }
  const loaded = await loadFromGist();
  if (!loaded || notes.length === 0) {
    try { const r = localStorage.getItem(LS_CACHE_KEY); if (r) notes = JSON.parse(r); } catch(e) {}
  }
  if (notes.length === 0) {
    notes = [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2,8), title: "欢迎", content: "笔记通过 GitHub Gist 实现多设备同步", tags: ["hello"], createdAt: Date.now(), updatedAt: Date.now() }];
    await saveToGist();
  }
  saveCache();
  renderAll();
  initMobileLayout();
  if (notes.length > 0) {
    var newest = notes.reduce(function(a, b) { return (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a; });
    openNote(newest.id);
  }
}

function showStatus(msg, err) {
  const el = document.getElementById("sync-status");
  el.style.display = "block"; el.innerHTML = msg + (err ? "!" : String.fromCharCode(0x2713));
  el.style.borderColor = err ? "var(--danger)" : "var(--accent)";
  clearTimeout(el._hide); el._hide = setTimeout(() => { el.style.display = "none"; }, 2000);
}

function saveCache() { localStorage.setItem(LS_CACHE_KEY, JSON.stringify(notes)); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

const $ = s => document.querySelector(s);
const noteList = $("#note-list"), searchInput = $("#search-input"), tagFilter = $("#tag-filter");
const noteTitle = $("#note-title"), noteContent = $("#note-content"), tagInput = $("#tag-input");
const tagBar = $("#tag-bar"), emptyState = $("#empty-state"), editorView = $("#editor-view");
const previewBtn = $("#preview-btn"), previewContent = $("#preview-content"), deleteBtn = $("#delete-btn");
const charCount = $("#char-count"), lastSaved = $("#last-saved"), noteCount = $("#note-count");

// ---- Mobile helpers ----
function isMobile() { return window.innerWidth <= 768; }
var sidebar = document.getElementById("sidebar");
var mobileTopbar = document.getElementById("mobile-topbar");
var mobileTopbarTitle = document.getElementById("mobile-topbar-title");
var mobileBackBtn = document.getElementById("mobile-back-btn");
var mobilePreviewBtn = document.getElementById("mobile-preview-btn");
var mobileDeleteBtn = document.getElementById("mobile-delete-btn");

function showSidebar() {
  if (!isMobile()) return;
  sidebar.classList.remove("hidden");
  mobileTopbar.style.display = "none";
}

function hideSidebar() {
  if (!isMobile()) return;
  sidebar.classList.add("hidden");
  mobileTopbar.style.display = "flex";
}

mobileBackBtn.addEventListener("click", function() { showSidebar(); });
mobileDeleteBtn.addEventListener("click", function() { deleteBtn.click(); });
mobilePreviewBtn.addEventListener("click", function() { previewBtn.click(); });

function updateMobileTitle() {
  var n = notes.find(function(x) { return x.id === activeId; });
  mobileTopbarTitle.textContent = n ? (n.title || "无标题") : "";
}

function initMobileLayout() {
  if (isMobile()) {
    sidebar.classList.remove("hidden");
    mobileTopbar.style.display = "none";
  }
}

function escapeHtml(s) {
  const d = document.createElement("div"); d.textContent = s; return d.innerHTML;
}

// ---- Enhanced Markdown Renderer ----
function renderMarkdown(text) {
  // 占位符存储，用于保护已生成的 HTML 不被后续处理破坏
  const ph = {};
  let pid = 0;
  const store = (html) => { const k = `\x00MD${pid++}\x00`; ph[k] = html; return k; };

  let h = text;

  // 1. 思维导图块 (```mindmap) — 必须在代码块之前匹配
  h = h.replace(/```mindmap\n([\s\S]*?)```/g, (_, c) => store(`<div class="mindmap-container"><pre class="markmap">${c.trim()}</pre></div>`));

  // 2. 代码块 (```lang ... ```) — 先提取保护，保留原始字符供 highlight.js 使用
  h = h.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const la = lang ? ` class="language-${lang}"` : '';
    return store(`<pre><code${la}>${code}</code></pre>`);
  });

  // 3. 对剩余文本（非代码块）做 HTML 转义
  const AMP = '&' + 'amp;', LT = '&' + 'lt;', GT = '&' + 'gt;';
  h = h.replace(/[&<>]/g, (c) => ({'&': AMP, '<': LT, '>': GT}[c]));

  // 4. 块级数学公式 ($$...$$)
  if (typeof katex !== 'undefined') {
    h = h.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        return store(`<div class="katex-display">${katex.renderToString(math.trim(), {displayMode: true, throwOnError: false})}</div>`);
      } catch(e) {
        return store(`<div class="katex-display" style="color:var(--danger)">${math.trim()}</div>`);
      }
    });
  } else {
    h = h.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => store(`<pre>$$${math}$$</pre>`));
  }

  // 4. Markdown 表格 (| col1 | col2 | ...)
  h = h.replace(/(?:^\|([^\n]*)\|\s*\n)+/gm, (block) => {
    const rows = block.trim().split('\n');
    const out = ['<table>'];
    let start = 0;
    if (rows.length >= 2 && /^\|[\s:-]+\|/.test(rows[1])) {
      out.push('<thead><tr>');
      rows[0].split('|').slice(1, -1).forEach(c => out.push(`<th>${c.trim()}</th>`));
      out.push('</tr></thead><tbody>');
      start = 2;
    } else {
      out.push('<tbody>');
    }
    for (let i = start; i < rows.length; i++) {
      const cells = rows[i].split('|').slice(1, -1);
      if (cells.length === 0) continue;
      out.push('<tr>');
      cells.forEach(c => out.push(`<td>${c.trim()}</td>`));
      out.push('</tr>');
    }
    out.push('</tbody></table>');
    return store(out.join(''));
  });

  // 5. 多行引用 (以 > 开头)
  let bqOutput = '';
  let bqLines = [];
  const flushBq = () => {
    if (bqLines.length > 0) {
      bqOutput += store('<blockquote>' + bqLines.join('<br>') + '</blockquote>');
      bqLines = [];
    }
  };
  const lines = h.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^>\s?(.*)/);
    if (m) {
      bqLines.push(m[1] || '');
    } else {
      flushBq();
      bqOutput += lines[i] + '\n';
    }
  }
  flushBq();
  h = bqOutput;

  // 6. 标题
  h = h.replace(/^### (.+)$/gm, (_, c) => store(`<h3>${c}</h3>`));
  h = h.replace(/^## (.+)$/gm, (_, c) => store(`<h2>${c}</h2>`));
  h = h.replace(/^# (.+)$/gm, (_, c) => store(`<h1>${c}</h1>`));

  // 7. 水平线
  h = h.replace(/^---$/gm, () => store('<hr />'));

  // 8. 任务列表
  h = h.replace(/^- \[x\] (.+)$/gim, (_, c) => store(`<li class="task-done">&#x2611; ${c}</li>`));
  h = h.replace(/^- \[ \] (.+)$/gim, (_, c) => store(`<li class="task-todo">&#x2610; ${c}</li>`));

  // 9. 无序列表
  h = h.replace(/^[*\-] (.+)$/gm, (_, c) => store(`<li>${c}</li>`));

  // --- 内联元素处理 ---
  // 10. 内联代码
  h = h.replace(/`([^`]+)`/g, (_, c) => store(`<code>${c}</code>`));

  // 11. 内联数学公式 ($...$) — 避免匹配块级公式的 $$
  h = h.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_, math) => store(`<span class="math-inline">${math.trim()}</span>`));

  // 12. 加粗+斜体
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, (_, c) => store(`<strong><em>${c}</em></strong>`));
  h = h.replace(/___(.+?)___/g, (_, c) => store(`<strong><em>${c}</em></strong>`));

  // 13. 加粗
  h = h.replace(/\*\*(.+?)\*\*/g, (_, c) => store(`<strong>${c}</strong>`));
  h = h.replace(/__(.+?)__/g, (_, c) => store(`<strong>${c}</strong>`));

  // 14. 斜体
  h = h.replace(/\*(.+?)\*/g, (_, c) => store(`<em>${c}</em>`));
  h = h.replace(/_(.+?)_/g, (_, c) => store(`<em>${c}</em>`));

  // 15. 删除线
  h = h.replace(/~~(.+?)~~/g, (_, c) => store(`<del>${c}</del>`));

  // 16. 图片
  h = h.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => store(`<img src="${src}" alt="${alt}" />`));

  // 17. 链接
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => store(`<a href="${u}" target="_blank">${t}</a>`));

  // --- 段落与换行 ---
  const paraOut = [];
  const paraLines = h.split('\n');
  let paraBuf = [];
  for (let i = 0; i < paraLines.length; i++) {
    const line = paraLines[i].trim();
    if (line === '') {
      if (paraBuf.length > 0) {
        paraOut.push(paraBuf.join('<br>'));
        paraBuf = [];
      }
    } else {
      paraBuf.push(line);
    }
  }
  if (paraBuf.length > 0) paraOut.push(paraBuf.join('<br>'));

  let result = paraOut.map(p => `<p>${p}</p>`).join('');

  // 恢复所有占位符
  result = result.replace(/\x00MD(\d+)\x00/g, (_, n) => ph[`\x00MD${n}\x00`] || '');

  // 清理空段落和包裹错误
  result = result.replace(/<p><\/p>/g, '');
  result = result.replace(/<p>(<(h[1-3]|pre|blockquote|table|hr|ul|ol|div))>/g, '$1');
  result = result.replace(/(<\/(h[1-3]|pre|blockquote|table|hr|ul|ol|div)>)<\/p>/g, '$1');
  result = result.replace(/<p>(<li)/g, '$1');
  result = result.replace(/(<\/li>)<\/p>/g, '$1');

  // 列表包裹
  result = result.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
  // 连续 <ul> 合并
  result = result.replace(/<\/ul>\s*<ul>/g, '');

  return result;
}

// 预览后处理：代码高亮、内联数学公式渲染
function postProcessPreview() {
  const preview = document.getElementById('preview-content');
  if (!preview) return;

  // 代码语法高亮
  preview.querySelectorAll('pre code').forEach(el => {
    if (typeof hljs !== 'undefined') {
      hljs.highlightElement(el);
    }
  });

  // 内联数学公式渲染
  preview.querySelectorAll('.math-inline').forEach(el => {
    if (typeof katex !== 'undefined') {
      try {
        katex.render(el.textContent, el, {throwOnError: false});
      } catch(e) {
        el.style.color = 'var(--danger)';
      }
    }
  });
}

// ---- Tags ----
function getAllTags() { const t = new Set(); notes.forEach(n => (n.tags||[]).forEach(x => t.add(x))); return [...t].sort(); }

function getFiltered() {
  let f = notes;
  if (activeTag) f = f.filter(n => (n.tags||[]).includes(activeTag));
  if (searchQuery) { const q = searchQuery.toLowerCase(); f = f.filter(n => (n.title||"").toLowerCase().includes(q) || (n.content||"").toLowerCase().includes(q) || (n.tags||[]).some(t => t.toLowerCase().includes(q))); }
  return f;
}

function isPinned(n) { return n.pinned === true; }

function renderNoteList() {
  const f = getFiltered();
  noteCount.textContent = notes.length + " 则笔记";
  if (f.length === 0) { noteList.innerHTML = "<div style=\"padding:24px;text-align:center;color:var(--text-secondary);font-size:13px;\">暂无笔记</div>"; return; }
  var pinned = f.filter(function(n) { return isPinned(n); });
  var unpinned = f.filter(function(n) { return !isPinned(n); });
  function renderItem(n) {
    var pinnedFlag = isPinned(n);
    var p = (n.content||"").replace(/[#*`>\[\]()!~\-]/g, "").slice(0, 80);
    var d = new Date(n.updatedAt||n.createdAt);
    var ds = (d.getMonth()+1) + "/" + d.getDate() + " " + d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
    var th = (n.tags||[]).map(function(t) { return "<span>" + t + "</span>"; }).join("");
    var cls = n.id === activeId ? " active" : "";
    var pinIcon = pinnedFlag ? "&#x1F4CD;" : "&#x1F4CC;";
    var pinTitle = pinnedFlag ? "取消置顶" : "置顶";
    var pinCls = pinnedFlag ? " pin-btn pinned" : " pin-btn";
    return "<div class=\"note-item" + cls + "\" data-id=\"" + n.id + "\" draggable=\"" + (!pinnedFlag) + "\"><button class=\"" + pinCls + "\" data-pin=\"" + n.id + "\" title=\"" + pinTitle + "\">" + pinIcon + "</button><div class=\"note-item-body\"><div class=\"note-item-title\">" + escapeHtml(n.title||"无标题") + "</div><div class=\"note-item-preview\">" + (p||"空白") + "</div><div class=\"note-item-meta\"><span>" + ds + "</span><div class=\"note-item-tags\">" + th + "</div></div></div></div>";
  }
  var html = "";
  if (pinned.length > 0) {
    html += '<div class="pinned-section">' + pinned.map(renderItem).join("") + '</div>';
    if (unpinned.length > 0) html += '<div class="pinned-divider"></div>';
  }
  if (unpinned.length > 0) {
    html += unpinned.map(renderItem).join("");
  }
  noteList.innerHTML = html;
}

function renderTagFilter() {
  const tags = getAllTags();
  if (tags.length === 0 && !activeTag) { tagFilter.innerHTML = ""; return; }
  var html = "<span class=\"tag" + (!activeTag ? " active" : "") + "\" data-tag=\"\">全部</span>";
  html += tags.map(function(t) { return "<span class=\"tag" + (t === activeTag ? " active" : "") + "\" data-tag=\"" + t + "\">" + t + "</span>"; }).join("");
  tagFilter.innerHTML = html;
}

function renderTagBar() {
  const n = notes.find(function(x) { return x.id === activeId; });
  if (!n) { tagBar.innerHTML = ""; return; }
  tagBar.innerHTML = (n.tags||[]).map(function(t) { return "<span class=\"tag\">" + t + "<button data-tag=\"" + t + "\">&times;</button></span>"; }).join("") + "<span class=\"mobile-tag-add\" title=\"添加标签\">+ 标签</span>";
}

function updateFooter() {
  const n = notes.find(function(x) { return x.id === activeId; });
  if (!n) return;
  const c = n.content || "";
  charCount.textContent = c.length + " 字符，" + (n.content||"").split("\n").length + " 行";
}

function renderAll() { renderTagFilter(); renderNoteList(); updateFooter(); }

// ---- Theme ----
function initTheme() {
  const t = localStorage.getItem(LS_THEME_KEY);
  const isDark = t === "dark" || (!t && matchMedia("(prefers-color-scheme:dark)").matches);
  if (isDark) document.documentElement.setAttribute("data-theme", "dark");
  // Switch highlight.js theme for dark mode
  var hljsLink = document.getElementById("hljs-theme");
  if (hljsLink) hljsLink.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/" + (isDark ? "github-dark" : "github") + ".min.css";
}
initTheme();

// ---- Editor ----
function openNote(id) {
  activeId = id;
  const n = notes.find(function(x) { return x.id === id; });
  if (!n) return;
  emptyState.style.display = "none"; editorView.style.display = "flex";
  noteTitle.value = n.title || ""; noteContent.value = n.content || "";
  previewMode = false; noteContent.style.display = "block"; previewContent.style.display = "none";
  renderTagBar(); renderAttachments(); renderNoteList(); updateFooter(); updateMobileTitle(); if (isMobile()) hideSidebar();
}

async function createNote() {
  const n = { id: genId(), title: "", content: "", tags: [], attachments: [], createdAt: Date.now(), updatedAt: Date.now(), pinned: false };
  notes.unshift(n); saveCache();
  if (isMobile()) hideSidebar();
  openNote(n.id); renderAll(); noteTitle.focus();
  await saveToGist(); showStatus("已创建");
}

async function deleteNote() {
  if (!activeId) return;
  const n = notes.find(function(x) { return x.id === activeId; });
  if (!confirm("确认删除「" + (n ? n.title || "无标题" : "") + "」？")) return;
  notes = notes.filter(function(x) { return x.id !== activeId; }); saveCache();
  activeId = null; emptyState.style.display = "flex"; editorView.style.display = "none";
  renderAll();
  await saveToGist(); showStatus("已删除");
}

async function autoSave() {
  if (!activeId) return;
  const n = notes.find(function(x) { return x.id === activeId; });
  if (!n) return;
  n.title = noteTitle.value; n.content = noteContent.value; n.updatedAt = Date.now();
  saveCache();
  const now = new Date();
  lastSaved.textContent = "已保存 " + now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
  renderNoteList(); updateFooter(); updateMobileTitle();
  await saveToGist(); showStatus("已保存");
}

function scheduleAutoSave() { clearTimeout(autoSaveTimer); autoSaveTimer = setTimeout(autoSave, 800); }

document.getElementById("new-note-btn").addEventListener("click", createNote);
deleteBtn.addEventListener("click", deleteNote);

noteList.addEventListener("click", function(e) {
  var pin = e.target.closest(".pin-btn");
  if (pin) {
    e.stopPropagation();
    var id = pin.dataset.pin;
    var note = notes.find(function(x) { return x.id === id; });
    if (note) {
      note.pinned = !note.pinned;
      note.updatedAt = Date.now();
      saveCache();
      renderAll();
      saveToGist();
    }
    return;
  }
  var item = e.target.closest(".note-item");
  if (item) openNote(item.dataset.id);
});

// Drag-and-drop note reordering
(function() {
  var dragId = null;
  window._noteDragActive = false;

  noteList.addEventListener("dragstart", function(e) {
    var item = e.target.closest(".note-item");
    if (!item) return;
    dragId = item.dataset.id;
    window._noteDragActive = true;
    item.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragId);
  });

  noteList.addEventListener("dragover", function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    var items = noteList.querySelectorAll(".note-item:not(.dragging)");
    var indicator = noteList.querySelector(".drop-indicator");
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = "drop-indicator";
      noteList.appendChild(indicator);
    }
    var target = null;
    var pos = "after";
    for (var i = 0; i < items.length; i++) {
      var rect = items[i].getBoundingClientRect();
      var midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        target = items[i];
        pos = "before";
        break;
      }
    }
    if (!target && items.length > 0) {
      target = items[items.length - 1];
      pos = "after";
    }
    if (target) {
      if (pos === "before") {
        target.parentNode.insertBefore(indicator, target);
      } else {
        target.parentNode.insertBefore(indicator, target.nextSibling);
      }
      indicator.style.display = "block";
    }
  });

  noteList.addEventListener("dragleave", function(e) {
    if (!noteList.contains(e.relatedTarget)) {
      var indicator = noteList.querySelector(".drop-indicator");
      if (indicator) indicator.style.display = "none";
    }
  });

  noteList.addEventListener("drop", function(e) {
    e.preventDefault();
    var indicator = noteList.querySelector(".drop-indicator");
    if (indicator) { indicator.style.display = "none"; }
    if (!dragId) return;

    var items = noteList.querySelectorAll(".note-item:not(.dragging)");
    var targetId = null;
    var insertBefore = true;
    for (var i = 0; i < items.length; i++) {
      var rect = items[i].getBoundingClientRect();
      var midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        targetId = items[i].dataset.id;
        insertBefore = true;
        break;
      }
    }
    if (!targetId && items.length > 0) {
      targetId = items[items.length - 1].dataset.id;
      insertBefore = false;
    }

    if (targetId && targetId !== dragId) {
      var srcIdx = notes.findIndex(function(x) { return x.id === dragId; });
      var note = notes.splice(srcIdx, 1)[0];
      var tgtIdx = notes.findIndex(function(x) { return x.id === targetId; });
      if (!insertBefore) tgtIdx++;
      notes.splice(tgtIdx, 0, note);
      saveCache();
      renderAll();
      saveToGist();
    }
    dragId = null;
  });

  noteList.addEventListener("dragend", function() {
    dragId = null;
    window._noteDragActive = false;
    var dragging = noteList.querySelector(".dragging");
    if (dragging) dragging.classList.remove("dragging");
    var indicator = noteList.querySelector(".drop-indicator");
    if (indicator) indicator.style.display = "none";
  });
})();

searchInput.addEventListener("input", function(e) { searchQuery = e.target.value; renderNoteList(); });

tagFilter.addEventListener("click", function(e) {
  var t = e.target.closest(".tag");
  if (t) { activeTag = t.dataset.tag || null; renderAll(); }
});

tagInput.addEventListener("keydown", async function(e) {
  if (e.key === "Enter" && tagInput.value.trim()) {
    e.preventDefault();
    var n = notes.find(function(x) { return x.id === activeId; });
    if (!n) return;
    var tag = tagInput.value.trim();
    if (!n.tags) n.tags = [];
    if (n.tags.includes(tag)) { tagInput.value = ""; return; }
    n.tags.push(tag);
    n.updatedAt = Date.now();
    saveCache();
    renderTagBar();
    renderAll();
    tagInput.value = "";
    await saveToGist(); showStatus("已保存");
  }
});

tagBar.addEventListener("click", async function(e) {
  if (e.target.closest(".mobile-tag-add")) { var tag = prompt("输入标签"); if (tag && tag.trim()) { var n2 = notes.find(function(x) { return x.id === activeId; }); if (n2) { if (!n2.tags) n2.tags = []; if (!n2.tags.includes(tag.trim())) { n2.tags.push(tag.trim()); n2.updatedAt = Date.now(); saveCache(); renderTagBar(); renderAll(); saveToGist(); } } } return; }
  var b = e.target.closest("button"); if (!b) return;
  var n = notes.find(function(x) { return x.id === activeId; }); if (!n) return;
  n.tags = (n.tags||[]).filter(function(t) { return t !== b.dataset.tag; });
  n.updatedAt = Date.now(); saveCache(); renderTagBar(); renderAll();
  await saveToGist(); showStatus("已保存");
});

noteTitle.addEventListener("input", function() { scheduleAutoSave(); updateMobileTitle(); });
noteContent.addEventListener("input", scheduleAutoSave);

previewBtn.addEventListener("click", function() {
  previewMode = !previewMode;
  if (previewMode) {
    noteContent.style.display = "none"; previewContent.style.display = "block";
    previewContent.innerHTML = renderMarkdown(noteContent.value);
    // 后处理：代码高亮 + 数学公式渲染
    postProcessPreview();
    previewBtn.title = "编辑"; mobilePreviewBtn.innerHTML = previewBtn.innerHTML;
    previewBtn.innerHTML = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg>";
  } else {
    noteContent.style.display = "block"; previewContent.style.display = "none";
    previewBtn.title = "预览"; mobilePreviewBtn.innerHTML = previewBtn.innerHTML;
    previewBtn.innerHTML = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>";
  }
});

document.addEventListener("keydown", function(e) {
  if (e.ctrlKey && e.shiftKey && e.key === "N") { e.preventDefault(); createNote(); }
  if (e.ctrlKey && e.shiftKey && e.key === "S") { e.preventDefault(); autoSave(); }
  if (e.ctrlKey && e.shiftKey && e.key === "P") { e.preventDefault(); previewBtn.click(); }
});

// ---- Attachments ----
function getAttachRepo() { return localStorage.getItem(LS_ATTACH_REPO_KEY) || ""; }
function setAttachRepo(v) { localStorage.setItem(LS_ATTACH_REPO_KEY, v); }

function getAttachFileIcon(type) {
  if (!type) return "&#x1F4CE;";
  if (type.startsWith("image/")) return "&#x1F5BC;";
  if (type.includes("pdf")) return "&#x1F4D5;";
  if (type.includes("word") || type.includes("docx")) return "&#x1F4D6;";
  if (type.includes("sheet") || type.includes("excel") || type.includes("xlsx")) return "&#x1F4CA;";
  if (type.includes("presentation") || type.includes("ppt")) return "&#x1F4CA;";
  if (type.startsWith("text/")) return "&#x1F4DD;";
  return "&#x1F4CE;";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

async function uploadToRepo(file, noteId) {
  const repo = getAttachRepo();
  if (!repo) throw new Error("未配置附件存储 Repo");
  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._\-一-龥]/g, "_");
  const path = ATTACH_PREFIX + "/" + noteId + "/" + ts + "_" + safeName;
  const encodedContentPath = path.split("/").map(encodeURIComponent).join("/");
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const parts = repo.split("/");
  await ghApi("/repos/" + parts[0] + "/" + parts[1] + "/contents/" + encodedContentPath, "PUT", {
    message: "QuickNote attach: " + file.name,
    content: base64
  });
  const url = "https://raw.githubusercontent.com/" + parts[0] + "/" + parts[1] + "/master/" + encodedContentPath;
  return { id: genId(), name: file.name, path: path, size: file.size, type: file.type, url: url };
}

async function deleteFromRepo(path) {
  const repo = getAttachRepo();
  if (!repo || !path) return;
  const parts = repo.split("/");
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  try {
    const fileData = await ghApi("/repos/" + parts[0] + "/" + parts[1] + "/contents/" + encodedPath);
    if (fileData && fileData.sha) {
      await ghApi("/repos/" + parts[0] + "/" + parts[1] + "/contents/" + encodedPath, "DELETE", {
        message: "QuickNote delete attach: " + path.split("/").pop(),
        sha: fileData.sha
      });
    }
  } catch(e) { console.error("Delete attach fail", e); }
}

function renderAttachments() {
  const bar = document.getElementById("attachment-bar");
  if (!bar) return;
  const n = notes.find(function(x) { return x.id === activeId; });
  if (!n) { bar.innerHTML = ""; return; }
  const atts = n.attachments || [];
  var html = "";
  for (var i = 0; i < atts.length; i++) {
    var a = atts[i];
    var isImage = a.type && a.type.startsWith("image/");
    var thumb = isImage ? '<img class="attachment-thumb" src="' + a.url + '" alt="' + escapeHtml(a.name) + '" data-img="' + a.url + '">' : '<span class="attachment-icon">' + getAttachFileIcon(a.type) + '</span>';
    html += '<div class="attachment-item" data-aid="' + a.id + '">' + thumb + '<div class="attachment-info"><div class="attachment-name" title="' + escapeHtml(a.name) + '">' + escapeHtml(a.name) + '</div><div class="attachment-size">' + formatFileSize(a.size) + '</div></div><a href="' + a.url + '" download="' + escapeHtml(a.name) + '" title="下载" style="color:inherit;text-decoration:none">&#x2B07;</a><button class="attachment-del" data-del="' + a.id + '" title="删除">&times;</button></div>';
  }
  html += '<div class="attachment-upload-hint" id="attach-upload-hint"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 添加附件</div>';
  bar.innerHTML = html;
}

async function handleAttachmentUpload(files) {
  var repo = getAttachRepo();
  if (!repo) {
    document.getElementById("settings-modal").style.display = "flex";
    document.getElementById("attach-repo-input").focus();
    return;
  }
  var n = notes.find(function(x) { return x.id === activeId; });
  if (!n) return;
  if (!n.attachments) n.attachments = [];
  var bar = document.getElementById("attachment-bar");
  var progressEl = document.createElement("div");
  progressEl.className = "attachment-progress";
  bar.appendChild(progressEl);
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (file.size > 10 * 1024 * 1024) {
      showStatus(file.name + " 超过 10MB 限制", true);
      continue;
    }
    progressEl.textContent = "上传中 (" + (i + 1) + "/" + files.length + "): " + file.name;
    try {
      var att = await uploadToRepo(file, n.id);
      n.attachments.push(att);
      if (att.type && att.type.startsWith("image/")) {
        var imgMd = "\n![" + att.name + "](" + att.url + ")";
        n.content = (n.content || "") + imgMd;
        noteContent.value = n.content;
      }
    } catch(e) {
      showStatus("上传失败: " + e.message, true);
    }
  }
  progressEl.remove();
  n.updatedAt = Date.now();
  saveCache();
  renderAttachments();
  await saveToGist();
  showStatus("附件已上传");
}

async function deleteAttachment(aid) {
  var n = notes.find(function(x) { return x.id === activeId; });
  if (!n || !n.attachments) return;
  var att = n.attachments.find(function(a) { return a.id === aid; });
  if (!att) return;
  if (!confirm("确认删除附件「" + att.name + "」？")) return;
  n.attachments = n.attachments.filter(function(a) { return a.id !== aid; });
  n.updatedAt = Date.now();
  saveCache();
  renderAttachments();
  await deleteFromRepo(att.path);
  await saveToGist();
  showStatus("附件已删除");
}

// Settings modal
document.getElementById("settings-btn").addEventListener("click", function() {
  document.getElementById("attach-repo-input").value = getAttachRepo();
  document.getElementById("settings-modal").style.display = "flex";
});
document.getElementById("settings-cancel").addEventListener("click", function() {
  document.getElementById("settings-modal").style.display = "none";
});
document.getElementById("settings-save").addEventListener("click", function() {
  var val = document.getElementById("attach-repo-input").value.trim();
  if (val && !/^[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+$/.test(val)) {
    showStatus("格式错误，请输入 owner/repo", true);
    return;
  }
  setAttachRepo(val);
  document.getElementById("settings-modal").style.display = "none";
  showStatus("附件 Repo 已保存");
});
document.getElementById("settings-modal").addEventListener("click", function(e) {
  if (e.target === this) this.style.display = "none";
});

// Attach button & file input
document.getElementById("attach-btn").addEventListener("click", function() {
  document.getElementById("file-input").click();
});
document.getElementById("file-input").addEventListener("change", function(e) {
  if (e.target.files && e.target.files.length > 0) {
    handleAttachmentUpload(Array.from(e.target.files));
    e.target.value = "";
  }
});

// Attachment bar events (delete & image preview)
document.getElementById("attachment-bar").addEventListener("click", function(e) {
  var del = e.target.closest(".attachment-del");
  if (del) { deleteAttachment(del.dataset.del); return; }
  var img = e.target.closest(".attachment-thumb");
  if (img) {
    document.getElementById("image-preview-img").src = img.dataset.img;
    document.getElementById("image-preview-modal").style.display = "flex";
    return;
  }
  var hint = e.target.closest("#attach-upload-hint");
  if (hint) document.getElementById("file-input").click();
});

// Image preview close
document.getElementById("image-preview-close").addEventListener("click", function() {
  document.getElementById("image-preview-modal").style.display = "none";
});
document.getElementById("image-preview-modal").addEventListener("click", function(e) {
  if (e.target === this) this.style.display = "none";
});

// --- Drag-and-drop file import ---
(function() {
  var overlay = null;
  var dragCounter = 0;

  function showOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "drop-overlay";
    overlay.innerHTML = '<div class="drop-overlay-inner"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><div>\u62d6\u62fd\u6587\u4ef6\u5230\u6b64\u5904\u5bfc\u5165\u7b14\u8bb0</div><div style="font-size:12px;color:var(--text-secondary);margin-top:8px">\u652f\u6301 TXT / DOCX / XLSX / CSV</div></div>';
    document.body.appendChild(overlay);
  }

  function hideOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
    dragCounter = 0;
  }

  document.addEventListener("dragenter", function(e) {
    if (window._noteDragActive) return;
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) showOverlay();
  });

  document.addEventListener("dragleave", function(e) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) hideOverlay();
  });

  document.addEventListener("dragover", function(e) { e.preventDefault(); });

  document.addEventListener("drop", function(e) {
    e.preventDefault();
    hideOverlay();
    var files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;
    for (var i = 0; i < files.length; i++) {
      importFile(files[i]);
    }
  });

  function stripExt(name) {
    var dot = name.lastIndexOf(".");
    return dot > 0 ? name.substring(0, dot) : name;
  }

  function importFile(file) {
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    var title = stripExt(file.name);

    if (ext === "txt" || ext === "csv" || ext === "md" || ext === "json") {
      var reader = new FileReader();
      reader.onload = function(ev) {
        createNoteFromFile(title, ev.target.result, ext);
      };
      reader.readAsText(file, "utf-8");

    } else if (ext === "docx") {
      if (typeof mammoth === "undefined") {
        showStatus("\u52a0\u8f7d DOCX \u5e93\u5931\u8d25", true);
        return;
      }
      var reader = new FileReader();
      reader.onload = function(ev) {
        mammoth.extractRawText({ arrayBuffer: ev.target.result })
          .then(function(result) { createNoteFromFile(title, result.value, ext); })
          .catch(function() { showStatus("DOCX \u89e3\u6790\u5931\u8d25", true); });
      };
      reader.readAsArrayBuffer(file);

    } else if (ext === "xlsx" || ext === "xls") {
      if (typeof XLSX === "undefined") {
        showStatus("\u52a0\u8f7d Excel \u5e93\u5931\u8d25", true);
        return;
      }
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var wb = XLSX.read(ev.target.result, { type: "array" });
          var texts = [];
          wb.SheetNames.forEach(function(name) {
            var data = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
            if (data.length === 0) return;
            var cols = data[0].length;
            if (cols === 0) return;
            var rows = data.map(function(row) {
              var cells = [];
              for (var c = 0; c < cols; c++) cells.push(row[c] != null ? String(row[c]) : "");
              return "| " + cells.join(" | ") + " |";
            });
            var sep = "| " + Array(cols).fill("---").join(" | ") + " |";
            rows.splice(1, 0, sep);
            texts.push("[" + name + "]\n" + rows.join("\n"));
          });
          createNoteFromFile(title, texts.join("\n\n"));
        } catch(err) {
          showStatus("Excel \u89e3\u6790\u5931\u8d25", true);
        }
      };
      reader.readAsArrayBuffer(file);

    } else {
      showStatus("\u4e0d\u652f\u6301 " + ext + " \u683c\u5f0f", true);
    }
  }

  async function createNoteFromFile(title, content, ext) {
    var n = { id: genId(), title: title, content: content, tags: [], attachments: [], createdAt: Date.now(), updatedAt: Date.now(), pinned: false };
    notes.unshift(n);
    saveCache();
    openNote(n.id);
    renderAll();
    if (ext === "md") {
      previewMode = true;
      noteContent.style.display = "none";
      previewContent.style.display = "block";
      previewContent.innerHTML = renderMarkdown(content);
      postProcessPreview();
    }
    await saveToGist();
    showStatus("已导入");
  }
})();