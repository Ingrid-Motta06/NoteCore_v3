/* ==========================================================================
   NoteCore — Aplicação integrada com back-end real (Spring Boot / JWT)
   Estado em memória + renderização + interações.
   Autenticação via JWT, dados persistidos no servidor.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Persistência de preferências de UI (tema / idioma) — mantidas em localStorage
   * Sessão agora é gerenciada via JWT pelo módulo Auth (auth.js)
   * ------------------------------------------------------------------ */
  function loadTheme() {
    try { return localStorage.getItem("notecore_theme") || "light"; }
    catch (e) { return "light"; }
  }
  function saveTheme(theme) {
    try { localStorage.setItem("notecore_theme", theme); } catch (e) { /* sem storage disponível */ }
  }
  function loadLang() {
    try { return localStorage.getItem("notecore_lang") || "pt"; }
    catch (e) { return "pt"; }
  }
  function saveLang(lang) {
    try { localStorage.setItem("notecore_lang", lang); } catch (e) { /* sem storage disponível */ }
  }
  /* Sessão JWT — delegada ao módulo Auth (auth.js) */
  function loadSession() {
    return Auth.isAuthenticated() ? Auth.getUser() : null;
  }
  function clearSession() {
    Auth.clearToken();
  }

  /* ------------------------------------------------------------------ *
   * Estado global
   * ------------------------------------------------------------------ */
  const state = {
    notes: [],   // preenchido por enterApp() via API real
    tasks: [],
    users: [],   // não mais usado (autenticação real no servidor)
    currentUser: null,
    lang: loadLang(),
    theme: loadTheme(),
    notifOpen: false,
    notifRead: false,
    section: "dashboard",
    headerSearch: "",
    notesFilter: { chip: "todas", sort: "recentes" },
    favFilter: { sort: "recentes" },
    taskFilter: "all",
    taskSearchQuery: "",
    editingTaskId: null,
    taskDeleteTargetId: null,
    noteType: "TEXT",
    formChecklistItems: [],
    formCodeLang: "javascript",
    formMarkdownPreview: false,
    openMenuId: null,
    editingNoteId: null,
    viewingNoteId: null,
    deleteTargetId: null,
    formTags: [],
    formUrgency: ""
  };

  // Torna o idioma atual visível para js/i18n.js (script independente).
  window.getLang = function () { return state.lang; };

  const URGENCY_RANK = { alta: 0, media: 1, baixa: 2 };
  const CATEGORY_KEYS = ["Financeiro", "Operações", "Recursos Humanos", "Comercial", "Jurídico", "Tecnologia", "Estratégia"];

  const ICONS = {
    dashboard: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    notes: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/></svg>',
    star: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1Z"/></svg>',
    tasks: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="m8.5 14.5 2 2 4-4"/></svg>',
    trash: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
    settings: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
    docs: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/></svg>',
    alert: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    refresh: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    plusCircle: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>',
    view: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    duplicate: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    favOutline: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1Z"/></svg>',
    trashSm: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
    dots: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    restore: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/></svg>',
    copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    code: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    markdown: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M7 15V9l3 3 3-3v6M17 12l2 2 2-2M19 14V9"/></svg>',
    checkCircle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
    checkList: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
  };

  const NAV_ITEMS = [
    { id: "dashboard", key: "nav.dashboard", icon: ICONS.dashboard },
    { id: "notes", key: "nav.notes", icon: ICONS.notes },
    { id: "favorites", key: "nav.favorites", icon: ICONS.star },
    { id: "tasks", key: "nav.tasks", icon: ICONS.tasks },
    { id: "trash", key: "nav.trash", icon: ICONS.trash },
    { id: "settings", key: "nav.settings", icon: ICONS.settings }
  ];

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $all = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function activeNotes() { return state.notes.filter(n => !n.deleted); }
  function trashedNotes() { return state.notes.filter(n => n.deleted); }
  function findNote(id) {
    if (id === null || id === undefined) return null;
    return state.notes.find(n => String(n.id) === String(id) || (n._backendId != null && String(n._backendId) === String(id))) || null;
  }
  function findTask(id) {
    if (id === null || id === undefined) return null;
    return state.tasks.find(tk => String(tk.id) === String(id) || (tk._backendId != null && String(tk._backendId) === String(id))) || null;
  }

  /** Recarrega notas do servidor e atualiza o estado local. */
  async function reloadNotes() {
    try {
      const notes = await API.fetchAllNotes();
      // Normaliza o formato da API (backend) para o formato interno do front-end
      state.notes = (notes || []).map(apiNoteToLocal);
    } catch (e) {
      console.warn("Falha ao carregar notas do servidor:", e.message);
    }
  }

  /** Converte nota do formato da API REST para o formato interno do front-end. */
  function apiNoteToLocal(n) {
    if (!n) return null;
    // O back-end retorna createdAt/updatedAt como LocalDateTime (ISO string)
    const toDateStr = (dt) => {
      if (!dt) return daysAgoISO(0);
      // LocalDateTime: "2024-10-25T14:30:00" -> "2024-10-25"
      return typeof dt === "string" ? dt.split("T")[0] : daysAgoISO(0);
    };
    // Horário (HH:mm) vindo do mesmo LocalDateTime já retornado pelo back-end
    const toTimeStr = (dt) => (typeof dt === "string" && dt.includes("T")) ? dt.split("T")[1].slice(0, 5) : "";
    return {
      id: String(n.id),          // front-end usa string, backend usa Long
      _backendId: n.id,          // mantém o id numérico para chamadas à API
      title: n.title || "",
      content: n.content || "",
      category: n.category || "",
      author: n.author || (state.currentUser ? state.currentUser.name : ""),
      urgency: n.urgency || "media",
      tags: n.tags ? Array.from(n.tags) : [],
      date: toDateStr(n.updatedAt),
      createdAt: toDateStr(n.createdAt),
      updatedAt: toDateStr(n.updatedAt),
      createdTime: toTimeStr(n.createdAt),
      updatedTime: toTimeStr(n.updatedAt),
      favorite: Boolean(n.favorite),
      deleted: Boolean(n.deleted),
      completed: Boolean(n.completed),
      type: n.type || "TEXT",
      items: n.items || null      // para notas CHECKLIST
    };
  }

  /** Converte nota do formato interno para o DTO de criação/atualização da API. */
  function localNoteToApiRequest(note, type) {
    const effType = type || note.type || "TEXT";
    return {
      type: effType,
      title: note.title,
      content: effType === "CHECKLIST" ? null : (note.content || null),
      category: note.category || null,
      author: note.author || (state.currentUser ? state.currentUser.name : null),
      urgency: note.urgency || "media",
      tags: note.tags || [],
      favorite: Boolean(note.favorite),
      deleted: Boolean(note.deleted),
      completed: Boolean(note.completed),
      items: effType === "CHECKLIST" ? (note.items || null) : null
    };
  }

  /** Utilitário para interpretar itens de checklist a partir de texto com marcas. */
  function parseChecklistFromText(text) {
    if (!text) return [];
    const lines = text.split(/\r?\n/);
    const items = [];
    for (const rawLine of lines) {
      let line = rawLine.trim();
      if (!line) continue;
      let done = false;
      if (/^\[(x|X)\]/.test(line)) {
        done = true;
        line = line.replace(/^\[(x|X)\]\s*/, "");
      } else if (/^-\s*\[(x|X)\]/.test(line)) {
        done = true;
        line = line.replace(/^-\s*\[(x|X)\]\s*/, "");
      } else if (/^\[\s*\]/.test(line)) {
        line = line.replace(/^\[\s*\]\s*/, "");
      } else if (/^-\s*\[\s*\]/.test(line)) {
        line = line.replace(/^-\s*\[\s*\]\s*/, "");
      } else if (/^-\s*/.test(line)) {
        line = line.replace(/^-\s*/, "");
      }
      if (line) items.push({ text: line, done });
    }
    return items.length ? items : [{ text: text, done: false }];
  }

  /** Renderizador seguro e leve de Markdown para HTML. */
  function renderMarkdownToHtml(md) {
    if (!md) return "";
    let html = escapeHtml(md);

    // Blocos de código: ```lang\ncode\n```
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="md-code-block"><code>${code.trim()}</code></pre>`;
    });

    // Código inline: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Títulos H1 a H4
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Citações: > texto
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Negrito: **texto** ou __texto__
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Itálico: *texto* ou _texto_
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Itens de checklist markdown: - [x] ou - [ ]
    html = html.replace(/^- \[(x|X)\] (.*$)/gim, '<div class="interactive-cl-item done"><input type="checkbox" checked disabled> <span>$2</span></div>');
    html = html.replace(/^- \[ \] (.*$)/gim, '<div class="interactive-cl-item"><input type="checkbox" disabled> <span>$1</span></div>');

    // Listas não-ordenadas: - item ou * item
    html = html.replace(/^\s*[\-\*]\s+(?!<div)(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/gim, '');

    // Links: [texto](url)
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Parágrafos divididos por linha em branco
    const paragraphs = html.split(/\n{2,}/).map(p => {
      p = p.trim();
      if (!p) return "";
      if (/^<(h[1-6]|ul|ol|pre|blockquote|div)/i.test(p)) return p;
      return `<p>${p.replace(/\n/g, "<br>")}</p>`;
    }).filter(Boolean);

    return `<div class="md-rendered">${paragraphs.join("")}</div>`;
  }

  /** Persistência de dados realizada via API REST no backend. */
  function persistUserData() {
    // Notas e tarefas persistidas no servidor via API REST
  }

  async function reloadTasks() {
    try {
      const tasks = await API.fetchTasks();
      state.tasks = (tasks || []).map(apiTaskToLocal);
    } catch (e) {
      console.warn("Falha ao carregar tarefas do servidor:", e.message);
    }
  }

  function apiTaskToLocal(t) {
    return {
      id: String(t.id),
      _backendId: t.id,
      title: t.title || "",
      relatedNoteId: t.relatedNoteId ? String(t.relatedNoteId) : "",
      date: t.date || daysAgoISO(0),
      status: t.status || "pendente"
    };
  }

  function loadLocalTasks(email) {
    return [];
  }

  function localeTag() { return state.lang === "en" ? "en-US" : "pt-BR"; }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(localeTag(), { day: "2-digit", month: "short", year: "numeric" });
  }

  /** Formata "HH:mm" (horário real retornado pelo back-end) conforme o idioma atual. */
  function formatTime(hhmm) {
    if (!hhmm) return "";
    const parts = hhmm.split(":").map(Number);
    const d = new Date();
    d.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
    return d.toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit" });
  }

  function relDayDiff(iso) {
    const d = new Date(iso + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((today - d) / 86400000);
  }

  function relativeDate(iso) {
    const diff = relDayDiff(iso);
    if (diff === 0) return t("note.updatedToday");
    if (diff === 1) return t("note.updatedYesterday");
    if (diff > 1) return t("note.updatedDaysAgo", { n: diff });
    return t("note.updatesIn", { n: Math.abs(diff) });
  }

  function excerpt(text, len) {
    if (text.length <= len) return text;
    return text.slice(0, len).trim() + "…";
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function toast(message, type) {
    const stack = $("#toastStack");
    const el = document.createElement("div");
    el.className = `toast ${type || "success"}`;
    el.innerHTML = `<span class="toast-dot"></span><span>${escapeHtml(message)}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 200);
    }, 3200);
  }

  function closeAllMenus() {
    state.openMenuId = null;
    $all(".context-menu").forEach(m => m.remove());
  }

  /* ------------------------------------------------------------------ *
   * TEMA (claro / escuro)
   * ------------------------------------------------------------------ */
  function applyTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", state.theme);
    saveTheme(state.theme);
  }

  function toggleTheme() {
    applyTheme(state.theme === "dark" ? "light" : "dark");
    toast(state.theme === "dark" ? t("toast.themeDark") : t("toast.themeLight"), "info");
    if (state.section === "settings") renderApp();
  }

  /* ------------------------------------------------------------------ *
   * IDIOMA (PT / EN)
   * ------------------------------------------------------------------ */
  function setLang(lang) {
    if (lang !== "pt" && lang !== "en") return;
    if (state.lang === lang) return;
    state.lang = lang;
    saveLang(lang);
    applyStaticTranslations();
    if (!$("#appShell").classList.contains("hidden")) {
      closeNotifPanel();
      renderApp();
      toast(t("toast.langChanged"), "info");
    }
  }

  /** Traduz todo o texto estático (fora do #appContent, que é regerado por renderApp). */
  function applyStaticTranslations() {
    document.documentElement.lang = state.lang === "en" ? "en" : "pt-BR";
    document.title = t("meta.title");
    $all("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    $all("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $all("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    // Mensagens de banner visíveis (erro/sucesso) acompanham o idioma.
    $all(".form-banner.show[data-msg-key]").forEach(el => { el.textContent = t(el.dataset.msgKey); });
    $all(".lang-switch button").forEach(btn => btn.classList.toggle("active", btn.dataset.lang === state.lang));
    $all(".toggle-visibility").forEach(updatePasswordToggleAria);
  }

  /** Mostra uma mensagem no banner guardando a chave, para poder retraduzi-la ao trocar o idioma. */
  function setBanner(el, kind, key) {
    el.className = "form-banner " + kind + " show";
    el.dataset.msgKey = key;
    el.textContent = t(key);
  }

  /** Botões PT/EN (login e cabeçalho do app). Antes não havia nenhum listener neles. */
  function initLangSwitch() {
    $all(".lang-switch button[data-lang]").forEach(btn => {
      btn.addEventListener("click", () => setLang(btn.dataset.lang));
    });
  }

  function updatePasswordToggleAria(btn) {
    const visible = btn.classList.contains("is-visible");
    btn.setAttribute("aria-label", visible ? t("login.hidePassword") : t("login.showPassword"));
  }

  /* ------------------------------------------------------------------ *
   * LOGIN / CADASTRO
   * ------------------------------------------------------------------ */
  function initAuthTabs() {
    const tabLogin = $("#tabLoginBtn");
    const tabSignup = $("#tabSignupBtn");
    const loginPane = $("#loginPane");
    const signupPane = $("#signupPane");

    function showLogin() {
      tabLogin.classList.add("active"); tabSignup.classList.remove("active");
      loginPane.classList.remove("hidden"); signupPane.classList.add("hidden");
      $("#loginBanner").className = "form-banner";
    }
    function showSignup() {
      tabSignup.classList.add("active"); tabLogin.classList.remove("active");
      signupPane.classList.remove("hidden"); loginPane.classList.add("hidden");
      $("#signupBanner").className = "form-banner";
    }

    tabLogin.addEventListener("click", showLogin);
    tabSignup.addEventListener("click", showSignup);
    $("#goToSignupLink").addEventListener("click", (e) => { e.preventDefault(); showSignup(); });
    $("#goToLoginLink").addEventListener("click", (e) => { e.preventDefault(); showLogin(); });

    window.__showLoginTab = showLogin;
  }

  function initPasswordToggles() {
    $all(".toggle-visibility").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.toggleFor || "loginPassword";
        const input = $("#" + targetId);
        const nowVisible = input.type === "password";
        input.type = nowVisible ? "text" : "password";
        btn.classList.toggle("is-visible", nowVisible);
        updatePasswordToggleAria(btn);
      });
    });
  }

  function initLogin() {
    const form = $("#loginForm");
    const emailField = $("#emailField");
    const passwordField = $("#passwordField");
    const emailInput = $("#loginEmail");
    const passwordInput = $("#loginPassword");
    const banner = $("#loginBanner");
    const submitBtn = $("#loginSubmitBtn");

    $("#forgotPasswordLink").addEventListener("click", (e) => {
      e.preventDefault();
      setBanner(banner, "success", "login.forgotMsg");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      banner.className = "form-banner";
      banner.textContent = "";
      emailField.classList.remove("has-error");
      passwordField.classList.remove("has-error");

      const emailVal = emailInput.value.trim();
      const passwordVal = passwordInput.value;

      let hasError = false;
      if (!emailVal) { emailField.classList.add("has-error"); hasError = true; }
      if (!passwordVal.trim()) { passwordField.classList.add("has-error"); hasError = true; }

      if (hasError) {
        setBanner(banner, "error", "login.errorRequired");
        return;
      }

      // Autenticação real via API (JWT)
      submitBtn.classList.add("is-loading");
      submitBtn.disabled = true;
      submitBtn.querySelector(".btn-label").textContent = t("login.submitting");

      try {
        const authResp = await API.login(emailVal, passwordVal);
        Auth.saveAuth(authResp);
        setBanner(banner, "success", "login.success");
        setTimeout(() => {
          submitBtn.classList.remove("is-loading");
          submitBtn.disabled = false;
          submitBtn.querySelector(".btn-label").textContent = t("login.submit");
          enterApp(Auth.getUser());
        }, 700);
      } catch (err) {
        submitBtn.classList.remove("is-loading");
        submitBtn.disabled = false;
        submitBtn.querySelector(".btn-label").textContent = t("login.submit");
        const msg = err.message || "";
        if (msg.toLowerCase().includes("não encontramos") || msg.toLowerCase().includes("not found")) {
          setBanner(banner, "error", "login.errorNotFound");
        } else if (msg.toLowerCase().includes("inválid") || msg.toLowerCase().includes("invalid")) {
          setBanner(banner, "error", "login.errorInvalid");
        } else {
          banner.className = "form-banner error show";
          banner.textContent = msg || t("login.errorInvalid");
        }
      }
    });
  }

  function initSignup() {
    const form = $("#signupForm");
    const banner = $("#signupBanner");
    const submitBtn = $("#signupSubmitBtn");
    const fields = {
      name: $("#signupNameField"), email: $("#signupEmailField"),
      password: $("#signupPasswordField"), confirm: $("#signupConfirmField")
    };
    const inputs = {
      name: $("#signupName"), email: $("#signupEmail"),
      password: $("#signupPassword"), confirm: $("#signupConfirm")
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      banner.className = "form-banner";
      Object.values(fields).forEach(f => f.classList.remove("has-error"));

      const name = inputs.name.value.trim();
      const email = inputs.email.value.trim();
      const password = inputs.password.value;
      const confirm = inputs.confirm.value;

      if (!name || !email || !password || !confirm) {
        if (!name) fields.name.classList.add("has-error");
        if (!email) fields.email.classList.add("has-error");
        if (!password) fields.password.classList.add("has-error");
        if (!confirm) fields.confirm.classList.add("has-error");
        setBanner(banner, "error", "signup.errorRequired");
        return;
      }
      if (!isValidEmail(email)) {
        fields.email.classList.add("has-error");
        $("#signupEmailError").textContent = t("signup.errorEmailInvalid");
        setBanner(banner, "error", "signup.errorEmailInvalid");
        return;
      }
      if (password.length < 6) {
        fields.password.classList.add("has-error");
        $("#signupPasswordError").textContent = t("signup.errorPasswordShort");
        setBanner(banner, "error", "signup.errorPasswordShort");
        return;
      }
      if (password !== confirm) {
        fields.confirm.classList.add("has-error");
        $("#signupConfirmError").textContent = t("signup.errorPasswordMismatch");
        setBanner(banner, "error", "signup.errorPasswordMismatch");
        return;
      }

      // Cadastro real via API
      submitBtn.classList.add("is-loading");
      submitBtn.disabled = true;
      submitBtn.querySelector(".btn-label").textContent = t("signup.submitting");

      try {
        await API.register(name, email, password);

        submitBtn.classList.remove("is-loading");
        submitBtn.disabled = false;
        submitBtn.querySelector(".btn-label").textContent = t("signup.submit");

        setBanner(banner, "success", "signup.success");
        toast(t("signup.success"), "success");

        setTimeout(() => {
          form.reset();
          window.__showLoginTab();
          $("#loginEmail").value = email;
          $("#loginPassword").value = "";
          $("#loginPassword").focus();
        }, 900);
      } catch (err) {
        submitBtn.classList.remove("is-loading");
        submitBtn.disabled = false;
        submitBtn.querySelector(".btn-label").textContent = t("signup.submit");
        const msg = err.message || "";
        if (msg.toLowerCase().includes("e-mail") || msg.toLowerCase().includes("email") || msg.toLowerCase().includes("conta")) {
          fields.email.classList.add("has-error");
          setBanner(banner, "error", "signup.errorDuplicate");
        } else {
          banner.className = "form-banner error show";
          banner.textContent = msg || t("signup.errorRequired");
        }
      }
    });
  }

  /** Limpa busca, filtros e janelas abertas para que nada de uma conta vaze para a próxima. */
  function resetSessionUiState() {
    state.headerSearch = "";
    $("#headerSearchInput").value = "";
    state.notesFilter = { chip: "todas", sort: "recentes" };
    state.favFilter = { sort: "recentes" };
    state.notifRead = false;
    state.editingNoteId = null;
    state.viewingNoteId = null;
    state.deleteTargetId = null;
    $all(".modal-overlay.open").forEach(closeModal);
    closeNotifPanel();
    closeSidebarMobile();
  }

  function enterApp(user) {
    state.currentUser = user;
    state.notes = [];
    state.tasks = [];
    resetSessionUiState();
    $("#loginScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
    const initials = user.initials || initialsFromName(user.name);
    $("#sidebarUserName").textContent = user.name;
    $("#sidebarUserEmail").textContent = user.email;
    $("#sidebarAvatar").textContent = initials;
    $("#headerAvatar").textContent = initials;
    $("#headerAvatar").title = user.name;
    state.section = "dashboard";
    // Carrega notas e tarefas reais do servidor e renderiza
    Promise.all([reloadNotes(), reloadTasks()]).then(() => renderApp());
  }

  function exitApp() {
    if (typeof Auth !== "undefined") {
      Auth.clearToken();
    }
    clearSession();
    state.currentUser = null;
    state.notes = [];
    state.tasks = [];
    resetSessionUiState();
    $("#appContent").innerHTML = "";
    $("#appShell").classList.add("hidden");
    $("#loginScreen").classList.remove("hidden");
    if (window.__showLoginTab) window.__showLoginTab();
    toast(t("toast.sessionEnded"), "info");
  }

  /* ------------------------------------------------------------------ *
   * SIDEBAR / HEADER
   * ------------------------------------------------------------------ */
  function renderSidebar() {
    const nav = $("#sidebarNav");
    const counts = {
      dashboard: null,
      notes: activeNotes().length,
      favorites: activeNotes().filter(n => n.favorite).length,
      tasks: state.tasks.length,
      trash: trashedNotes().length,
      settings: null
    };
    nav.innerHTML = NAV_ITEMS.map(item => `
      <button class="nav-item ${state.section === item.id ? "active" : ""}" data-section="${item.id}">
        ${item.icon}
        <span>${t(item.key)}</span>
        ${counts[item.id] !== null ? `<span class="count-badge">${counts[item.id]}</span>` : ""}
      </button>
    `).join("");

    $all(".nav-item", nav).forEach(btn => {
      btn.addEventListener("click", () => {
        state.section = btn.dataset.section;
        closeSidebarMobile();
        renderApp();
      });
    });

    $("#logoutLabel").textContent = t("sidebar.logout");
    $("#newNoteLabel").textContent = t("header.newNote");
    $("#headerSearchInput").placeholder = t("header.searchPlaceholder");
    $("#notifBtn").setAttribute("aria-label", t("header.notifications"));
  }

  function firstName(name) { return name.split(" ")[0]; }

  function renderHeader() {
    $("#headerGreeting").textContent = t("header.greeting", { name: firstName(state.currentUser.name) });
    $("#headerSubtitle").textContent = t("header.subtitle." + state.section);
  }

  function openSidebarMobile() {
    $("#sidebar").classList.add("open");
    $("#sidebarOverlay").classList.add("open");
  }
  function closeSidebarMobile() {
    $("#sidebar").classList.remove("open");
    $("#sidebarOverlay").classList.remove("open");
  }

  /* ------------------------------------------------------------------ *
   * NOTIFICAÇÕES
   * ------------------------------------------------------------------ */
  function buildNotifications() {
    const altaNotes = activeNotes().filter(n => n.urgency === "alta");
    const pendingCount = state.tasks.filter(t2 => t2.status !== "concluida").length;
    const recentNotes = activeNotes().filter(n => relDayDiff(n.updatedAt) <= 3);
    const altaCount = altaNotes.length;
    const recentCount = recentNotes.length;
    const items = [];
    // "target" indica para onde a notificação leva ao ser clicada (ids das notas que a originaram).
    if (altaCount > 0) items.push({ tone: "red", title: t("notif.item1.title", { n: altaCount }), desc: t("notif.item1.desc"), target: { section: "notes", noteIds: altaNotes.map(n => n.id), chip: "alta" } });
    if (pendingCount > 0) items.push({ tone: "amber", title: t("notif.item2.title"), desc: t("notif.item2.desc", { n: pendingCount }), target: { section: "tasks" } });
    if (recentCount > 0) items.push({ tone: "blue", title: t("notif.item3.title"), desc: t("notif.item3.desc", { n: recentCount }), target: { section: "notes", noteIds: recentNotes.map(n => n.id), chip: "todas" } });
    return items;
  }

  function renderNotifPanel() {
    const panel = $("#notifPanel");
    const items = buildNotifications();
    const toneVar = { red: "var(--red)", amber: "var(--amber)", blue: "var(--blue)" };
    panel.innerHTML = `
      <div class="notif-panel-head">
        <h4>${t("notif.title")}</h4>
        ${items.length ? `<button type="button" id="markAllReadBtn">${t("notif.markAllRead")}</button>` : ""}
      </div>
      ${items.length ? `<div class="notif-list">${items.map((it, idx) => `
        <div class="notif-item notif-item-link" role="button" tabindex="0" data-notif-idx="${idx}">
          <span class="ni-dot" style="background:${toneVar[it.tone]}"></span>
          <div><div class="ni-title">${escapeHtml(it.title)}</div><div class="ni-desc">${escapeHtml(it.desc)}</div></div>
        </div>
      `).join("")}</div>` : `<div class="notif-empty">${t("notif.empty")}</div>`}
    `;
    const markBtn = $("#markAllReadBtn", panel);
    if (markBtn) markBtn.addEventListener("click", markAllNotifRead);
    $all(".notif-item[data-notif-idx]", panel).forEach(el => {
      const go = () => openNotifTarget(items[Number(el.dataset.notifIdx)]);
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    });
  }

  /** Abre o conteúdo correspondente à notificação: a nota (se só houver uma) ou a lista já filtrada. */
  function openNotifTarget(it) {
    if (!it || !it.target) return;
    const tg = it.target;
    closeNotifPanel();
    closeSidebarMobile();
    if (tg.section === "tasks") {
      state.taskFilter = "all";
      state.taskSearchQuery = "";
      state.section = "tasks";
      renderApp();
      return;
    }
    // Limpa a busca do header para não esconder a(s) nota(s) da notificação.
    state.headerSearch = "";
    const searchInput = $("#headerSearchInput");
    if (searchInput) searchInput.value = "";
    state.section = "notes";
    const ids = tg.noteIds || [];
    if (ids.length === 1) {
      renderApp();
      setTimeout(() => openViewModal(ids[0]), 0);
      return;
    }
    state.notesFilter.chip = tg.chip || "todas";
    state.notesFilter.sort = "recentes";
    renderApp();
  }

  function toggleNotifPanel() {
    state.notifOpen = !state.notifOpen;
    if (state.notifOpen) renderNotifPanel();
    $("#notifPanel").classList.toggle("open", state.notifOpen);
    $("#notifBtn").setAttribute("aria-expanded", String(state.notifOpen));
  }

  function closeNotifPanel() {
    if (!state.notifOpen) return;
    state.notifOpen = false;
    $("#notifPanel").classList.remove("open");
    $("#notifBtn").setAttribute("aria-expanded", "false");
  }

  function markAllNotifRead() {
    state.notifRead = true;
    $("#notifDot").classList.add("hidden");
    toast(t("toast.notifMarked"), "success");
    closeNotifPanel();
  }

  function refreshNotifDot() {
    const hasItems = buildNotifications().length > 0;
    $("#notifDot").classList.toggle("hidden", state.notifRead || !hasItems);
  }

  /* ------------------------------------------------------------------ *
   * RENDER — roteamento de seções
   * ------------------------------------------------------------------ */
  function renderApp() {
    renderSidebar();
    renderHeader();
    refreshNotifDot();
    const content = $("#appContent");
    closeAllMenus();

    switch (state.section) {
      case "dashboard": content.innerHTML = dashboardTemplate(); break;
      case "notes": content.innerHTML = notesSectionTemplate(); break;
      case "favorites": content.innerHTML = favoritesTemplate(); break;
      case "tasks": content.innerHTML = tasksTemplate(); break;
      case "trash": content.innerHTML = trashTemplate(); break;
      case "settings": content.innerHTML = settingsTemplate(); break;
    }
    bindSectionEvents();
  }

  /* ---------------- Dashboard ---------------- */
  function dashboardTemplate() {
    const notes = activeNotes();
    const alta = notes.filter(n => n.urgency === "alta").length;
    const pendentes = state.tasks.filter(t2 => t2.status !== "concluida").length;
    const recentes = notes.filter(n => relDayDiff(n.updatedAt) <= 3).length;

    // Corrigido: o dashboard também respeita a busca do header (antes ignorava).
    const q = state.headerSearch.trim().toLowerCase();
    let recentNotes = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (q) {
      recentNotes = recentNotes.filter(n =>
        n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) || n.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    recentNotes = recentNotes.slice(0, 6);

    return `
      <div class="summary-grid">
        ${summaryCard(ICONS.docs, "tone-blue", notes.length, t("summary.total.title"), t("summary.total.desc"))}
        ${summaryCard(ICONS.alert, "tone-red", alta, t("summary.high.title"), t("summary.high.desc"))}
        ${summaryCard(ICONS.clock, "tone-amber", pendentes, t("summary.pending.title"), t("summary.pending.desc"))}
        ${summaryCard(ICONS.refresh, "tone-green", recentes, t("summary.recent.title"), t("summary.recent.desc"))}
      </div>

      <div class="section-heading">
        <div>
          <h2>${t("section.dashboard.heading")}</h2>
          <div class="sh-sub">${t("section.dashboard.sub")}</div>
        </div>
      </div>
      ${recentNotes.length ? `<div class="notes-grid">${recentNotes.map(noteCardTemplate).join("")}</div>` : (q ? searchEmptyTemplate() : emptyStateTemplate())}
    `;
  }

  function summaryCard(icon, tone, number, title, desc) {
    return `
      <div class="summary-card">
        <div class="sc-top">
          <div class="sc-icon ${tone}">${icon}</div>
        </div>
        <div class="sc-number">${number}</div>
        <div class="sc-title">${title}</div>
        <div class="sc-desc">${desc}</div>
      </div>
    `;
  }

  /* ---------------- Minhas notas ---------------- */
  function notesSectionTemplate() {
    const list = getFilteredSortedNotes(activeNotes(), state.notesFilter);
    const total = activeNotes().length;
    return `
      <div class="section-heading">
        <div>
          <h2>${t("section.notes.heading")}</h2>
          <div class="sh-sub">${t("section.notes.sub", { n: total })}</div>
        </div>
      </div>
      ${toolbarTemplate("notesFilter", true)}
      ${list.length ? `<div class="notes-grid">${list.map(noteCardTemplate).join("")}</div>` : searchEmptyOrDefault(list)}
    `;
  }

  function searchEmptyTemplate() {
    return `<div class="empty-state">
      <div class="es-icon">${ICONS.search}</div>
      <h3>${t("empty.search.title")}</h3>
      <p>${t("empty.search.desc")}</p>
    </div>`;
  }

  function searchEmptyOrDefault(list) {
    if (state.headerSearch.trim() || state.notesFilter.chip !== "todas") return searchEmptyTemplate();
    return emptyStateTemplate();
  }

  function toolbarTemplate(filterKey, showChips) {
    const f = state[filterKey];
    const chips = [
      { id: "todas", key: "filter.all" },
      { id: "tipo_checklist", key: "filter.typeChecklist" },
      { id: "tipo_markdown", key: "filter.typeMarkdown" },
      { id: "tipo_code", key: "filter.typeCode" },
      { id: "tipo_text", key: "filter.typeText" },
      { id: "baixa", key: "filter.low" },
      { id: "media", key: "filter.medium" },
      { id: "alta", key: "filter.high" },
      { id: "favoritas", key: "filter.favorites" },
      { id: "recentes", key: "filter.recent" }
    ];
    return `
      <div class="toolbar">
        ${showChips ? `<div class="filter-chips" data-filter-key="${filterKey}">
          ${chips.map(c => `<button type="button" class="filter-chip ${f.chip === c.id ? "active" : ""}" data-chip="${c.id}">${t(c.key)}</button>`).join("")}
        </div>` : ""}
        <select class="input sort-select" data-sort-key="${filterKey}">
          <option value="recentes" ${f.sort === "recentes" ? "selected" : ""}>${t("sort.recent")}</option>
          <option value="antigas" ${f.sort === "antigas" ? "selected" : ""}>${t("sort.oldest")}</option>
          <option value="urgencia" ${f.sort === "urgencia" ? "selected" : ""}>${t("sort.urgency")}</option>
          <option value="alfabetica" ${f.sort === "alfabetica" ? "selected" : ""}>${t("sort.alpha")}</option>
        </select>
      </div>
    `;
  }

  function getFilteredSortedNotes(list, filter) {
    let result = list.slice();
    const q = state.headerSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (filter.chip === "tipo_checklist") {
      result = result.filter(n => n.type === "CHECKLIST");
    } else if (filter.chip === "tipo_markdown") {
      result = result.filter(n => n.type === "MARKDOWN");
    } else if (filter.chip === "tipo_code") {
      result = result.filter(n => n.type === "CODE");
    } else if (filter.chip === "tipo_text") {
      result = result.filter(n => (n.type || "TEXT") === "TEXT");
    } else if (filter.chip === "baixa" || filter.chip === "media" || filter.chip === "alta") {
      result = result.filter(n => n.urgency === filter.chip);
    } else if (filter.chip === "favoritas") {
      result = result.filter(n => n.favorite);
    } else if (filter.chip === "recentes") {
      result = result.filter(n => relDayDiff(n.updatedAt) <= 5);
    }

    switch (filter.sort) {
      case "antigas": result.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)); break;
      case "urgencia": result.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]); break;
      case "alfabetica": result.sort((a, b) => a.title.localeCompare(b.title, localeTag())); break;
      default: result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return result;
  }

  /* ---------------- Favoritas ---------------- */
  function favoritesTemplate() {
    const favs = getFilteredSortedNotes(activeNotes().filter(n => n.favorite), state.favFilter);
    return `
      <div class="section-heading">
        <div>
          <h2>${t("section.favorites.heading")}</h2>
          <div class="sh-sub">${t("section.favorites.sub")}</div>
        </div>
      </div>
      ${toolbarTemplate("favFilter", false)}
      ${favs.length ? `<div class="notes-grid">${favs.map(noteCardTemplate).join("")}</div>` : `
        <div class="empty-state">
          <div class="es-icon">${ICONS.star}</div>
          <h3>${t("empty.favorites.title")}</h3>
          <p>${t("empty.favorites.desc")}</p>
        </div>`}
    `;
  }

  /* ---------------- Nota — card ---------------- */
  function noteCardTemplate(note) {
    const type = note.type || "TEXT";
    const typeLabel = t("note.type." + type.toLowerCase()) || type;

    let bodyHtml = "";
    if (type === "CHECKLIST") {
      const items = Array.isArray(note.items) ? note.items : parseChecklistFromText(note.content);
      const doneCount = items.filter(i => i.done).length;
      const totalCount = items.length;
      const percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
      bodyHtml = `
        <div class="checklist-progress-wrap" style="margin:8px 0;">
          <div class="checklist-progress-meta" style="font-size:11.5px; margin-bottom:4px;">
            <span>${t("note.checklist.progress", { done: doneCount, total: totalCount })}</span>
            <span>${percent}%</span>
          </div>
          <div class="checklist-progress-bar" style="height:5px;">
            <div class="checklist-progress-fill" style="width:${percent}%"></div>
          </div>
        </div>
        <div class="card-checklist-preview">
          ${items.slice(0, 3).map(it => `
            <div class="card-cl-item ${it.done ? "done" : ""}">
              <span>${it.done ? "☑" : "☐"}</span>
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(it.text)}</span>
            </div>
          `).join("")}
          ${items.length > 3 ? `<div style="font-size:11px; color:var(--text-muted); font-style:italic;">+ ${items.length - 3} mais...</div>` : ""}
        </div>
      `;
    } else if (type === "CODE") {
      bodyHtml = `
        <pre class="code-view-pre" style="max-height:85px; overflow:hidden; font-size:11.5px; margin:8px 0; border-radius:6px; background:#0b1220; padding:8px 10px; border:1px solid #1e293b;"><code>${escapeHtml(excerpt(note.content, 120))}</code></pre>
      `;
    } else {
      bodyHtml = `<p class="nc-excerpt">${escapeHtml(excerpt(note.content, 130))}</p>`;
    }

    return `
      <article class="note-card urgency-${note.urgency}${note.completed ? " is-completed" : ""}" data-note-id="${note.id}" tabindex="0" role="button" aria-label="${escapeHtml(note.title)}">
        <div class="nc-top">
          <h3 class="nc-title">${escapeHtml(note.title)}</h3>
          <div class="nc-top-actions">
            <button class="done-btn ${note.completed ? "is-done" : ""}" data-action="toggle-done" data-id="${note.id}" aria-label="${note.completed ? t('note.unmarkDone') : t('note.markDone')}" title="${note.completed ? t('note.unmarkDone') : t('note.markDone')}" aria-pressed="${Boolean(note.completed)}">${ICONS.checkCircle}</button>
            <button class="fav-btn ${note.favorite ? "is-fav" : ""}" data-action="toggle-fav" data-id="${note.id}" aria-label="${note.favorite ? t('note.removeFav') : t('note.addFav')}" aria-pressed="${note.favorite}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${note.favorite ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1Z"/></svg>
            </button>
            <button class="menu-btn" data-action="open-menu" data-id="${note.id}" aria-label="${t('menu.edit')}" aria-haspopup="true">${ICONS.dots}</button>
          </div>
        </div>
        ${bodyHtml}
        <div class="nc-meta">
          <span class="badge-type ${type}">${typeLabel}</span>
          <span class="badge badge-category">${escapeHtml(categoryLabel(note.category))}</span>
          <span class="badge badge-urgency ${note.urgency}">${t("urgency." + note.urgency)}</span>
          ${note.completed ? `<span class="badge badge-done">${t("note.completed")}</span>` : ""}
        </div>
        ${note.tags.length ? `<div class="nc-tags">${note.tags.map(tg => `<span class="tag-chip">#${escapeHtml(tg)}</span>`).join("")}</div>` : ""}
        <div class="nc-foot">
          <span>${relativeDate(note.updatedAt)}</span>
          <span>${formatDate(note.date)}${note.updatedTime && note.date === note.updatedAt ? " · " + formatTime(note.updatedTime) : ""}</span>
        </div>
      </article>
    `;
  }

  function emptyStateTemplate() {
    return `
      <div class="empty-state">
        <div class="es-icon">${ICONS.plusCircle}</div>
        <h3>${t("empty.notes.title")}</h3>
        <p>${t("empty.notes.desc")}</p>
        <button class="btn btn-primary" id="emptyStateCreateBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>
          ${t("empty.notes.cta")}
        </button>
      </div>
    `;
  }

  /* ---------------- Tarefas ---------------- */
  function tasksTemplate() {
    const totalCount = state.tasks.length;
    const pendingCount = state.tasks.filter(t2 => t2.status === "pendente").length;
    const inProgressCount = state.tasks.filter(t2 => t2.status === "andamento").length;
    const completedCount = state.tasks.filter(t2 => t2.status === "concluida").length;

    const currentFilter = state.taskFilter || "all";
    const q = (state.taskSearchQuery || "").trim().toLowerCase();

    const filtered = state.tasks.filter(tk => {
      if (currentFilter === "pendente" && tk.status !== "pendente") return false;
      if (currentFilter === "andamento" && tk.status !== "andamento") return false;
      if (currentFilter === "concluida" && tk.status !== "concluida") return false;
      if (q) {
        const titleMatch = (tk.title || "").toLowerCase().includes(q);
        const note = findNote(tk.relatedNoteId);
        const noteMatch = note && note.title.toLowerCase().includes(q);
        return titleMatch || noteMatch;
      }
      return true;
    });

    const filterPills = `
      <div class="tasks-toolbar">
        <div class="task-filter-pills">
          <button type="button" class="task-filter-pill ${currentFilter === "all" ? "active" : ""}" data-filter-status="all">
            ${t("task.filterAll")} <span class="task-filter-count">${totalCount}</span>
          </button>
          <button type="button" class="task-filter-pill ${currentFilter === "pendente" ? "active" : ""}" data-filter-status="pendente">
            ${t("task.filterPending")} <span class="task-filter-count">${pendingCount}</span>
          </button>
          <button type="button" class="task-filter-pill ${currentFilter === "andamento" ? "active" : ""}" data-filter-status="andamento">
            ${t("task.filterInProgress")} <span class="task-filter-count">${inProgressCount}</span>
          </button>
          <button type="button" class="task-filter-pill ${currentFilter === "concluida" ? "active" : ""}" data-filter-status="concluida">
            ${t("task.filterCompleted")} <span class="task-filter-count">${completedCount}</span>
          </button>
        </div>
        <div class="task-search-wrap">
          ${ICONS.search}
          <input class="input" type="search" id="taskSearchInput" placeholder="${t("task.searchPlaceholder")}" value="${escapeHtml(state.taskSearchQuery || "")}">
        </div>
      </div>
    `;

    if (!totalCount) {
      return `
        <div class="section-heading">
          <div>
            <h2>${t("section.tasks.heading")}</h2>
            <div class="sh-sub">${t("section.tasks.sub", { n: 0 })}</div>
          </div>
          <button class="btn btn-primary" id="tasksNewTaskBtn">
            ${ICONS.plus} <span>${t("task.newTask")}</span>
          </button>
        </div>
        <div class="empty-state">
          <div class="es-icon">${ICONS.tasks}</div>
          <h3>${t("empty.tasks.title")}</h3>
          <p>${t("empty.tasks.desc")}</p>
          <button class="btn btn-primary" id="emptyTasksCreateBtn">
            ${ICONS.plus} <span>${t("task.createFirst")}</span>
          </button>
        </div>
      `;
    }

    let bodyContent = "";
    if (!filtered.length) {
      bodyContent = `
        <div class="empty-state" style="padding:40px 20px;">
          <div class="es-icon">${ICONS.search}</div>
          <h3>${t("task.emptyFilterTitle")}</h3>
          <p>${t("task.emptyFilterDesc")}</p>
          <button class="btn btn-secondary" data-action="clear-task-filters">${t("task.clearFilter")}</button>
        </div>
      `;
    } else {
      const rows = filtered.map(tk => {
        const note = findNote(tk.relatedNoteId);
        const isDone = tk.status === "concluida";
        return `
          <div class="task-row-enhanced" data-task-row-id="${tk.id}">
            <div class="task-check-cell">
              <input type="checkbox" data-action="toggle-task-check" data-id="${tk.id}" ${isDone ? "checked" : ""} aria-label="${t("task.quickToggle")}">
            </div>
            <div class="task-title ${isDone ? "is-done" : ""}" title="${escapeHtml(tk.title)}">${escapeHtml(tk.title)}</div>
            <div class="task-note-cell">
              ${tk.relatedNoteId ? `<span class="task-note-link" data-action="view-note" data-id="${tk.relatedNoteId}">${note ? escapeHtml(note.title) : t("task.noteRemoved")}</span>` : `<span style="color:var(--text-muted); font-size:12px;">—</span>`}
            </div>
            <div class="task-date-cell">${formatDate(tk.date)}</div>
            <div class="task-status-cell">
              <select class="input status-select" data-action="change-status" data-id="${tk.id}">
                <option value="pendente" ${tk.status === "pendente" ? "selected" : ""}>${t("status.pendente")}</option>
                <option value="andamento" ${tk.status === "andamento" ? "selected" : ""}>${t("status.andamento")}</option>
                <option value="concluida" ${tk.status === "concluida" ? "selected" : ""}>${t("status.concluida")}</option>
              </select>
            </div>
            <div class="task-actions-cell">
              <button type="button" class="task-btn-action" data-action="edit-task" data-id="${tk.id}" title="${t("task.editTask")}">${ICONS.edit}</button>
              <button type="button" class="task-btn-action delete" data-action="delete-task" data-id="${tk.id}" title="${t("task.deleteTask")}">${ICONS.trashSm}</button>
            </div>
          </div>
        `;
      }).join("");

      bodyContent = `
        <div class="task-table">
          <div class="task-row-enhanced head">
            <div></div>
            <div>${t("task.colTask")}</div>
            <div class="task-note-cell">${t("task.colNote")}</div>
            <div class="task-date-cell">${t("task.colDate")}</div>
            <div>${t("task.colStatus")}</div>
            <div style="text-align:right;">Ações</div>
          </div>
          ${rows}
        </div>
      `;
    }

    return `
      <div class="section-heading">
        <div>
          <h2>${t("section.tasks.heading")}</h2>
          <div class="sh-sub">${t("section.tasks.sub", { n: totalCount })}</div>
        </div>
        <button class="btn btn-primary" id="tasksNewTaskBtn">
          ${ICONS.plus} <span>${t("task.newTask")}</span>
        </button>
      </div>
      ${filterPills}
      ${bodyContent}
    `;
  }

  /* ---------------- Lixeira ---------------- */
  function trashTemplate() {
    const trashed = trashedNotes();
    return `
      <div class="section-heading">
        <div><h2>${t("section.trash.heading")}</h2><div class="sh-sub">${t("section.trash.sub", { n: trashed.length })}</div></div>
      </div>
      <div class="trash-banner">${ICONS.trashSm} ${t("trash.banner")}</div>
      <div class="trash-banner trash-retention">${ICONS.clock} ${t("trash.retention")}</div>
      ${trashed.length ? `<div class="notes-grid">${trashed.map(trashCardTemplate).join("")}</div>` : `
        <div class="empty-state">
          <div class="es-icon">${ICONS.trash}</div>
          <h3>${t("empty.trash.title")}</h3>
          <p>${t("empty.trash.desc")}</p>
        </div>`}
    `;
  }

  function trashCardTemplate(note) {
    return `
      <article class="note-card urgency-${note.urgency}">
        <div class="nc-top">
          <h3 class="nc-title">${escapeHtml(note.title)}</h3>
        </div>
        <p class="nc-excerpt">${escapeHtml(excerpt(note.content, 130))}</p>
        <div class="nc-meta">
          <span class="badge badge-category">${escapeHtml(categoryLabel(note.category))}</span>
          <span class="badge badge-urgency ${note.urgency}">${t("urgency." + note.urgency)}</span>
        </div>
        <div class="nc-foot" style="border-top:none; padding-top:2px;">
          <button class="btn btn-secondary btn-sm" data-action="restore" data-id="${note.id}">${ICONS.restore} ${t("trash.restore")}</button>
          <button class="btn btn-danger btn-sm" data-action="perma-delete" data-id="${note.id}">${t("trash.deletePermanent")}</button>
        </div>
      </article>
    `;
  }

  /* ---------------- Configurações ---------------- */
  function settingsTemplate() {
    return `
      <div class="section-heading"><div><h2>${t("section.settings.heading")}</h2><div class="sh-sub">${t("section.settings.sub")}</div></div></div>
      <div class="settings-card">
        <div class="settings-row">
          <div><div class="sr-label">${escapeHtml(state.currentUser.name)}</div><div class="sr-desc">${escapeHtml(state.currentUser.email)}</div></div>
          <span class="badge badge-category">${t("settings.account")}</span>
        </div>
        <div class="settings-row">
          <div><div class="sr-label">${t("settings.emailNotif.label")}</div><div class="sr-desc">${t("settings.emailNotif.desc")}</div></div>
          <input type="checkbox" checked style="width:16px;height:16px;accent-color:var(--blue);">
        </div>
        <div class="settings-row">
          <div><div class="sr-label">${t("settings.theme.label")}</div><div class="sr-desc">${t("settings.theme.desc")}</div></div>
          <button type="button" class="toggle-switch ${state.theme === "dark" ? "on" : ""}" id="themeToggleBtn" role="switch" aria-checked="${state.theme === "dark"}" aria-label="${t('settings.theme.label')}"></button>
        </div>
        <div class="settings-row">
          <div><div class="sr-label">${t("settings.language.label")}</div><div class="sr-desc">${t("settings.language.desc")}</div></div>
          <div class="settings-lang-group">
            <button type="button" class="settings-lang-btn ${state.lang === "pt" ? "active" : ""}" data-set-lang="pt">${t("settings.language.pt")}</button>
            <button type="button" class="settings-lang-btn ${state.lang === "en" ? "active" : ""}" data-set-lang="en">${t("settings.language.en")}</button>
          </div>
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------------------------ *
   * Eventos por seção
   * ------------------------------------------------------------------ */
  function bindSectionEvents() {
    const content = $("#appContent");

    $all(".note-card[data-note-id]", content).forEach(card => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-action]")) return;
        openViewModal(card.dataset.noteId);
      });
      card.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && !e.target.closest("[data-action]")) {
          e.preventDefault();
          openViewModal(card.dataset.noteId);
        }
      });
    });

    content.removeEventListener("click", handleContentClick);
    content.removeEventListener("change", handleContentChange);
    content.addEventListener("click", handleContentClick);
    content.addEventListener("change", handleContentChange);

    const emptyBtn = $("#emptyStateCreateBtn", content);
    if (emptyBtn) emptyBtn.addEventListener("click", () => openNoteModal("create"));

    $all(".filter-chip", content).forEach(chip => {
      chip.addEventListener("click", () => {
        const key = chip.closest("[data-filter-key]").dataset.filterKey;
        state[key].chip = chip.dataset.chip;
        renderApp();
      });
    });

    $all(".sort-select", content).forEach(sel => {
      sel.addEventListener("change", () => {
        const key = sel.dataset.sortKey;
        state[key].sort = sel.value;
        renderApp();
      });
    });

    const themeBtn = $("#themeToggleBtn", content);
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

    $all("[data-set-lang]", content).forEach(btn => {
      btn.addEventListener("click", () => setLang(btn.dataset.setLang));
    });

    const tasksNewBtn = $("#tasksNewTaskBtn", content);
    if (tasksNewBtn) tasksNewBtn.addEventListener("click", () => openTaskModal("create"));

    const emptyTasksBtn = $("#emptyTasksCreateBtn", content);
    if (emptyTasksBtn) emptyTasksBtn.addEventListener("click", () => openTaskModal("create"));

    $all(".task-filter-pill", content).forEach(pill => {
      pill.addEventListener("click", () => {
        state.taskFilter = pill.dataset.filterStatus;
        renderApp();
      });
    });

    const taskSearch = $("#taskSearchInput", content);
    if (taskSearch) {
      taskSearch.addEventListener("input", (e) => {
        state.taskSearchQuery = e.target.value;
        const curStart = e.target.selectionStart;
        renderApp();
        const reInput = $("#taskSearchInput");
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(curStart, curStart);
        }
      });
    }
  }

  function handleContentClick(e) {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;

    switch (action) {
      case "toggle-fav": toggleFavorite(id); break;
      case "toggle-done": toggleCompleted(id); break;
      case "open-menu": e.stopPropagation(); openContextMenu(target, id); break;
      case "restore": restoreNote(id); break;
      case "perma-delete": openPermaDeleteModal(id); break;
      case "view-note": state.section = "notes"; renderApp(); setTimeout(() => openViewModal(id), 0); break;
      case "toggle-task-check": toggleTaskCompletion(id); break;
      case "edit-task": openTaskModal("edit", id); break;
      case "delete-task": openTaskDeleteModal(id); break;
      case "clear-task-filters":
        state.taskFilter = "all";
        state.taskSearchQuery = "";
        renderApp();
        break;
      case "toggle-view-checklist-item":
        handleToggleChecklistItem(target.dataset.noteId, Number(target.dataset.itemIdx));
        break;
    }
  }

  function handleContentChange(e) {
    if (e.target.dataset.action === "change-status") {
      const task = findTask(e.target.dataset.id);
      if (task) {
        task.status = e.target.value;
        toast(t("toast.taskStatusUpdated"), "success");
        if (task._backendId) {
          API.updateTask(task._backendId, {
            title: task.title,
            relatedNoteId: task.relatedNoteId ? Number(task.relatedNoteId) : null,
            date: task.date,
            status: task.status
          }).catch(err => console.warn("Erro ao atualizar tarefa:", err.message));
        }
        renderApp();
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Menu de contexto (três pontos)
   * ------------------------------------------------------------------ */
  /** Marca/desmarca a NOTA inteira como concluída (independente de tarefas e itens de checklist). */
  function toggleCompleted(id) {
    const note = findNote(id);
    if (!note) return;
    const newDone = !note.completed;
    note.completed = newDone;
    toast(newDone ? t("toast.doneOn") : t("toast.doneOff"), "success");
    renderApp();
    const apiReq = localNoteToApiRequest(note);
    API.updateNote(note._backendId || note.id, apiReq).catch(err => {
      console.warn("Erro ao atualizar conclusão:", err.message);
      note.completed = !newDone; // reverte em caso de erro
      renderApp();
      toast(err.message || t("toast.noteError"), "error");
    });
  }

  function openContextMenu(btn, noteId) {
    closeAllMenus();
    const note = findNote(noteId);
    if (!note) return;
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = `
      <button data-menu-action="view">${ICONS.view} ${t("menu.view")}</button>
      <button data-menu-action="edit">${ICONS.edit} ${t("menu.edit")}</button>
      <button data-menu-action="duplicate">${ICONS.duplicate} ${t("menu.duplicate")}</button>
      <button data-menu-action="favorite">${ICONS.favOutline} ${note.favorite ? t("menu.unfavorite") : t("menu.favorite")}</button>
      <hr>
      <button data-menu-action="delete" class="danger">${ICONS.trashSm} ${t("menu.delete")}</button>
    `;
    btn.closest(".note-card").appendChild(menu);

    menu.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = e.target.closest("[data-menu-action]");
      if (!act) return;
      const a = act.dataset.menuAction;
      closeAllMenus();
      if (a === "view") openViewModal(noteId);
      else if (a === "edit") openNoteModal("edit", noteId);
      else if (a === "duplicate") duplicateNote(noteId);
      else if (a === "favorite") toggleFavorite(noteId);
      else if (a === "delete") openDeleteModal(noteId);
    });

    setTimeout(() => {
      document.addEventListener("click", closeAllMenus, { once: true });
    }, 0);
  }

  /* ------------------------------------------------------------------ *
   * Ações sobre notas — integradas com a API real
   * ------------------------------------------------------------------ */
  function toggleFavorite(id) {
    const note = findNote(id);
    if (!note) return;
    const newFav = !note.favorite;
    // Atualiza localmente para feedback imediato
    note.favorite = newFav;
    toast(newFav ? t("toast.favAdded") : t("toast.favRemoved"), "success");
    renderApp();
    // Persiste no servidor em background
    const apiReq = localNoteToApiRequest(note);
    API.updateNote(note._backendId || note.id, apiReq).catch(err => {
      console.warn("Erro ao atualizar favorito:", err.message);
      note.favorite = !newFav; // reverte em caso de erro
      renderApp();
    });
  }

  function duplicateNote(id) {
    const note = findNote(id);
    if (!note) return;
    // Cria cópia via API com título único e tamanho seguro (<= 120 caracteres)
    let dupTitle = note.title + t("note.copySuffix");
    let counter = 1;
    while (state.notes.some(n => n.title && n.title.toLowerCase() === dupTitle.toLowerCase())) {
      counter++;
      const suffix = t("note.copySuffix") + " (" + counter + ")";
      const base = note.title.slice(0, Math.max(1, 120 - suffix.length));
      dupTitle = base + suffix;
    }
    if (dupTitle.length > 120) {
      dupTitle = dupTitle.slice(0, 120);
    }
    const apiReq = {
      type: note.type || "TEXT",
      title: dupTitle,
      content: note.content || null,
      category: note.category || null,
      urgency: note.urgency || "media",
      tags: note.tags || [],
      favorite: false,
      deleted: false,
      items: note.items || null
    };
    API.createNote(apiReq).then(created => {
      state.notes.unshift(apiNoteToLocal(created));
      toast(t("toast.noteDuplicated"), "success");
      renderApp();
    }).catch(err => {
      toast(err.message || t("toast.noteError"), "error");
    });
  }

  function restoreNote(id) {
    const note = findNote(id);
    if (!note) return;
    note.deleted = false;
    const apiReq = localNoteToApiRequest(note);
    API.updateNote(note._backendId || note.id, apiReq).then(updated => {
      Object.assign(note, apiNoteToLocal(updated));
      toast(t("toast.noteRestored"), "success");
      renderApp();
    }).catch(err => {
      note.deleted = true; // reverte
      toast(err.message || t("toast.noteError"), "error");
    });
  }

  /* ------------------------------------------------------------------ *
   * Modal: criar / editar nota e tipos polimórficos
   * ------------------------------------------------------------------ */
  function renderCategoryOptions(selected) {
    const select = $("#noteCategoryInput");
    const normalizedSelected = (selected || "").trim();
    let optionsHtml = `<option value="">${t("field.category.placeholder")}</option>`;

    let found = false;
    CATEGORY_KEYS.forEach(cat => {
      const isSel = cat.toLowerCase() === normalizedSelected.toLowerCase();
      if (isSel) found = true;
      optionsHtml += `<option value="${escapeHtml(cat)}" ${isSel ? "selected" : ""}>${escapeHtml(categoryLabel(cat))}</option>`;
    });

    if (normalizedSelected && !found) {
      optionsHtml += `<option value="${escapeHtml(normalizedSelected)}" selected>${escapeHtml(normalizedSelected)}</option>`;
    }
    select.innerHTML = optionsHtml;
  }

  function setNoteType(type) {
    state.noteType = type || "TEXT";
    $all(".note-type-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.type === state.noteType);
    });

    const secText = $("#textContentSection");
    const secCl = $("#checklistContentSection");
    const secMd = $("#markdownContentSection");
    const secCode = $("#codeContentSection");

    secText.classList.toggle("hidden", state.noteType !== "TEXT");
    secCl.classList.toggle("hidden", state.noteType !== "CHECKLIST");
    secMd.classList.toggle("hidden", state.noteType !== "MARKDOWN");
    secCode.classList.toggle("hidden", state.noteType !== "CODE");

    if (state.noteType === "CHECKLIST") {
      renderModalChecklistItems();
    } else if (state.noteType === "MARKDOWN") {
      setMarkdownTab("write");
    }
  }

  function renderModalChecklistItems() {
    const list = $("#checklistItemsList");
    if (!state.formChecklistItems || !state.formChecklistItems.length) {
      list.innerHTML = `<div style="font-size:12.5px; color:var(--text-muted); padding:8px 4px; font-style:italic;">${t("note.checklist.empty")}</div>`;
      return;
    }
    list.innerHTML = state.formChecklistItems.map((item, idx) => `
      <div class="checklist-item-row ${item.done ? "done" : ""}" data-item-idx="${idx}">
        <input type="checkbox" ${item.done ? "checked" : ""} data-action="form-toggle-item" data-item-idx="${idx}">
        <span class="cl-text">${escapeHtml(item.text)}</span>
        <button type="button" class="cl-del-btn" data-action="form-del-item" data-item-idx="${idx}" title="${t("menu.delete")}">✕</button>
      </div>
    `).join("");
  }

  function addChecklistItemFromInput() {
    const input = $("#checklistNewItemInput");
    const val = input.value.trim();
    if (!val) return;
    if (!state.formChecklistItems) state.formChecklistItems = [];
    state.formChecklistItems.push({ text: val, done: false });
    input.value = "";
    $("#checklistErrorText").classList.remove("show");
    renderModalChecklistItems();
    input.focus();
  }

  function setMarkdownTab(tab) {
    const isWrite = tab === "write";
    state.formMarkdownPreview = !isWrite;
    $("#mdTabWriteBtn").classList.toggle("active", isWrite);
    $("#mdTabPreviewBtn").classList.toggle("active", !isWrite);
    $("#markdownContentInput").classList.toggle("hidden", !isWrite);
    const previewPane = $("#markdownPreviewPane");
    previewPane.classList.toggle("hidden", isWrite);
    if (!isWrite) {
      previewPane.innerHTML = renderMarkdownToHtml($("#markdownContentInput").value);
    }
  }

  function insertMarkdownSnippet(action) {
    const textarea = $("#markdownContentInput");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const sel = val.substring(start, end);
    const before = val.substring(0, start);
    const after = val.substring(end);
    let insert = "";
    let cursorOffset = 0;

    switch (action) {
      case "bold":
        insert = `**${sel || "texto em negrito"}**`;
        cursorOffset = sel ? insert.length : 2;
        break;
      case "italic":
        insert = `*${sel || "texto em itálico"}*`;
        cursorOffset = sel ? insert.length : 1;
        break;
      case "h2":
        insert = `\n## ${sel || "Título"}\n`;
        cursorOffset = insert.length;
        break;
      case "h3":
        insert = `\n### ${sel || "Subtítulo"}\n`;
        cursorOffset = insert.length;
        break;
      case "list":
        insert = `\n- ${sel || "Item da lista"}`;
        cursorOffset = insert.length;
        break;
      case "code":
        if (sel.includes("\n")) {
          insert = `\n\`\`\`javascript\n${sel}\n\`\`\`\n`;
        } else {
          insert = `\`${sel || "código"}\``;
        }
        cursorOffset = sel ? insert.length : 1;
        break;
      case "quote":
        insert = `\n> ${sel || "Citação"}\n`;
        cursorOffset = insert.length;
        break;
      case "link":
        insert = `[${sel || "texto do link"}](https://exemplo.com)`;
        cursorOffset = insert.length;
        break;
    }

    textarea.value = before + insert + after;
    textarea.focus();
    textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
  }

  function openNoteModal(mode, id) {
    state.editingNoteId = mode === "edit" ? id : null;
    const overlay = $("#noteModalOverlay");
    const titleInput = $("#noteTitleInput");
    const contentInput = $("#noteContentInput");
    const mdInput = $("#markdownContentInput");
    const codeInput = $("#codeContentInput");
    const dateInput = $("#noteDateInput");

    $("#noteTitleField").classList.remove("has-error");
    const textSec = $("#textContentSection") || $("#noteContentField");
    if (textSec) textSec.classList.remove("has-error");
    $("#checklistErrorText").classList.remove("show");
    $("#markdownErrorText").classList.remove("show");
    $("#codeErrorText").classList.remove("show");

    if (mode === "edit") {
      const note = findNote(id);
      if (!note) {
        toast(t("toast.noteError"), "error");
        return;
      }
      $("#noteModalTitle").textContent = t("modal.editNote.title");
      $("#saveNoteBtn").textContent = t("btn.saveChanges");
      titleInput.value = note.title || "";
      renderCategoryOptions(note.category);
      dateInput.value = note.date || daysAgoISO(0);
      state.formTags = (note.tags || []).slice();
      state.formUrgency = note.urgency || "media";

      const type = note.type || "TEXT";
      if (type === "CHECKLIST") {
        state.formChecklistItems = Array.isArray(note.items)
          ? JSON.parse(JSON.stringify(note.items))
          : parseChecklistFromText(note.content);
        contentInput.value = "";
        mdInput.value = "";
        codeInput.value = "";
      } else if (type === "MARKDOWN") {
        mdInput.value = note.content || "";
        contentInput.value = "";
        codeInput.value = "";
        state.formChecklistItems = [];
      } else if (type === "CODE") {
        codeInput.value = note.content || "";
        contentInput.value = "";
        mdInput.value = "";
        state.formChecklistItems = [];
        if (note.category && $("#codeLangSelect").querySelector(`option[value="${note.category.toLowerCase()}"]`)) {
          $("#codeLangSelect").value = note.category.toLowerCase();
        }
      } else {
        contentInput.value = note.content || "";
        mdInput.value = "";
        codeInput.value = "";
        state.formChecklistItems = [];
      }
      setNoteType(type);

      // Trava alteração de tipo na edição (regra de negócio proíbe mutação de tipo)
      $all(".note-type-btn").forEach(btn => {
        btn.disabled = true;
        btn.classList.toggle("disabled", btn.dataset.type !== type);
      });
    } else {
      $("#noteModalTitle").textContent = t("modal.newNote.title");
      $("#saveNoteBtn").textContent = t("btn.saveNote");
      titleInput.value = "";
      contentInput.value = "";
      mdInput.value = "";
      codeInput.value = "";
      state.formChecklistItems = [];
      renderCategoryOptions("");
      dateInput.value = daysAgoISO(0);
      state.formTags = [];
      state.formUrgency = "media";
      setNoteType("TEXT");

      $all(".note-type-btn").forEach(btn => {
        btn.disabled = false;
        btn.classList.remove("disabled");
      });
    }
    renderTagsInput();
    renderUrgencyOptions();
    openModal(overlay);
    setTimeout(() => titleInput.focus(), 60);
  }

  function renderUrgencyOptions() {
    $all(".urgency-option", $("#noteUrgencyOptions")).forEach(opt => {
      opt.textContent = t("urgency." + opt.dataset.level);
      const on = opt.dataset.level === state.formUrgency;
      opt.classList.toggle("selected", on);
      opt.setAttribute("aria-checked", on);
    });
  }

  function renderTagsInput() {
    const wrap = $("#tagsInputWrap");
    const input = $("#noteTagsInput");
    $all(".tag-chip", wrap).forEach(c => c.remove());
    state.formTags.forEach(tag => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.innerHTML = `#${escapeHtml(tag)} <button type="button" aria-label="${t('menu.delete')} ${escapeHtml(tag)}">✕</button>`;
      chip.querySelector("button").addEventListener("click", () => {
        state.formTags = state.formTags.filter(tg => tg !== tag);
        renderTagsInput();
      });
      wrap.insertBefore(chip, input);
    });
  }

  function initNoteModalStaticEvents() {
    // Seletor de tipo de nota
    $all(".note-type-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        setNoteType(btn.dataset.type);
      });
    });

    // Urgência
    $all(".urgency-option").forEach(opt => {
      opt.addEventListener("click", () => {
        state.formUrgency = opt.dataset.level;
        renderUrgencyOptions();
      });
    });

    // Tags
    const tagsInput = $("#noteTagsInput");
    tagsInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const val = tagsInput.value.trim().replace(/,$/, "");
        if (val && !state.formTags.includes(val)) {
          state.formTags.push(val);
          renderTagsInput();
        }
        tagsInput.value = "";
      } else if (e.key === "Backspace" && !tagsInput.value && state.formTags.length) {
        state.formTags.pop();
        renderTagsInput();
      }
    });

    // Checklist builder events
    $("#checklistAddItemBtn").addEventListener("click", addChecklistItemFromInput);
    $("#checklistNewItemInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addChecklistItemFromInput();
      }
    });
    $("#checklistItemsList").addEventListener("click", (e) => {
      const btnDel = e.target.closest("[data-action='form-del-item']");
      if (btnDel) {
        const idx = Number(btnDel.dataset.itemIdx);
        state.formChecklistItems.splice(idx, 1);
        renderModalChecklistItems();
        return;
      }
      const chk = e.target.closest("[data-action='form-toggle-item']");
      if (chk) {
        const idx = Number(chk.dataset.itemIdx);
        if (state.formChecklistItems[idx]) {
          state.formChecklistItems[idx].done = chk.checked;
          const row = chk.closest(".checklist-item-row");
          if (row) row.classList.toggle("done", chk.checked);
        }
      }
    });

    // Markdown toolbar & tabs
    $all(".md-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        insertMarkdownSnippet(btn.dataset.mdAction);
      });
    });
    $("#mdTabWriteBtn").addEventListener("click", () => setMarkdownTab("write"));
    $("#mdTabPreviewBtn").addEventListener("click", () => setMarkdownTab("preview"));

    // Code input tab key handling
    const codeArea = $("#codeContentInput");
    codeArea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = codeArea.selectionStart;
        const end = codeArea.selectionEnd;
        codeArea.value = codeArea.value.substring(0, start) + "  " + codeArea.value.substring(end);
        codeArea.selectionStart = codeArea.selectionEnd = start + 2;
      }
    });

    $("#saveNoteBtn").addEventListener("click", saveNote);
    $("#noteForm").addEventListener("submit", (e) => {
      e.preventDefault();
      saveNote();
    });
    $("#noteTitleInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveNote();
      }
    });
  }

  function saveNote() {
    const titleInput = $("#noteTitleInput");
    const categoryInput = $("#noteCategoryInput");

    let hasError = false;
    $("#noteTitleField").classList.remove("has-error");
    const textSec = $("#textContentSection") || $("#noteContentField");
    if (textSec) textSec.classList.remove("has-error");
    $("#checklistErrorText").classList.remove("show");
    $("#markdownErrorText").classList.remove("show");
    $("#codeErrorText").classList.remove("show");

    if (!titleInput.value.trim()) {
      $("#noteTitleField").classList.add("has-error");
      hasError = true;
    }

    const type = state.noteType || "TEXT";
    let contentVal = "";
    let itemsVal = null;
    let categoryVal = categoryInput.value.trim() || null;

    if (type === "TEXT") {
      contentVal = $("#noteContentInput").value.trim();
      if (!contentVal) {
        if (textSec) textSec.classList.add("has-error");
        hasError = true;
      }
    } else if (type === "CHECKLIST") {
      const newItemInput = $("#checklistNewItemInput");
      if (newItemInput && newItemInput.value.trim()) {
        addChecklistItemFromInput();
      }
      if (!state.formChecklistItems || !state.formChecklistItems.length) {
        $("#checklistErrorText").classList.add("show");
        hasError = true;
      } else {
        itemsVal = state.formChecklistItems.slice();
        contentVal = itemsVal.map(it => (it.done ? "[x] " : "[ ] ") + it.text).join("\n");
      }
    } else if (type === "MARKDOWN") {
      contentVal = $("#markdownContentInput").value.trim();
      if (!contentVal) {
        $("#markdownErrorText").classList.add("show");
        hasError = true;
      }
    } else if (type === "CODE") {
      contentVal = $("#codeContentInput").value.trim();
      if (!contentVal) {
        $("#codeErrorText").classList.add("show");
        hasError = true;
      }
      if (!categoryVal) {
        categoryVal = $("#codeLangSelect").value || "javascript";
      }
    }

    if (hasError) return;

    // Coleta tag digitada que o usuário não finalizou com Enter ou vírgula
    const tagsInput = $("#noteTagsInput");
    if (tagsInput) {
      const remainingTag = tagsInput.value.trim().replace(/,$/, "");
      if (remainingTag && !state.formTags.includes(remainingTag)) {
        state.formTags.push(remainingTag);
        tagsInput.value = "";
      }
    }

    const urgency = state.formUrgency || "media";
    const chosenDate = $("#noteDateInput").value || daysAgoISO(0);
    const saveBtn = $("#saveNoteBtn");
    saveBtn.disabled = true;

    if (state.editingNoteId) {
      const note = findNote(state.editingNoteId);
      if (!note) {
        saveBtn.disabled = false;
        toast(t("toast.noteError"), "error");
        return;
      }

      const authorVal = note.author || (state.currentUser ? state.currentUser.name : "Usuário");
      const apiReq = {
        type: type,
        title: titleInput.value.trim(),
        content: type === "CHECKLIST" ? null : contentVal,
        category: categoryVal,
        author: authorVal,
        urgency: urgency,
        tags: state.formTags.slice(),
        favorite: Boolean(note.favorite),
        deleted: Boolean(note.deleted),
        items: type === "CHECKLIST" ? itemsVal : null
      };

      API.updateNote(note._backendId || note.id, apiReq)
        .then(updated => {
          const localUpdated = apiNoteToLocal(updated);
          if (chosenDate) localUpdated.date = chosenDate;
          Object.assign(note, localUpdated);
          state.editingNoteId = null;
          closeModal($("#noteModalOverlay"));
          toast(t("toast.noteUpdated"), "success");
          renderApp();
        })
        .catch(err => {
          toast(err.message || t("toast.noteError"), "error");
        })
        .finally(() => {
          saveBtn.disabled = false;
        });
    } else {
      const authorVal = (state.currentUser && state.currentUser.name) || "Usuário";
      const apiReq = {
        type: type,
        title: titleInput.value.trim(),
        content: type === "CHECKLIST" ? null : contentVal,
        category: categoryVal,
        author: authorVal,
        urgency: urgency,
        tags: state.formTags.slice(),
        favorite: false,
        deleted: false,
        items: type === "CHECKLIST" ? itemsVal : null
      };

      API.createNote(apiReq)
        .then(created => {
          const localNote = apiNoteToLocal(created);
          if (chosenDate) localNote.date = chosenDate;
          state.notes.unshift(localNote);
          state.editingNoteId = null;
          closeModal($("#noteModalOverlay"));
          toast(t("toast.noteCreated"), "success");
          renderApp();
        })
        .catch(err => {
          toast(err.message || t("toast.noteError"), "error");
        })
        .finally(() => {
          saveBtn.disabled = false;
        });
    }
  }

  /* ------------------------------------------------------------------ *
   * Modal: visualizar nota e tarefas vinculadas
   * ------------------------------------------------------------------ */
  function openViewModal(id) {
    const note = findNote(id);
    if (!note) return;
    state.viewingNoteId = id;
    $("#viewModalTitle").textContent = note.title;

    const type = note.type || "TEXT";
    const typeLabel = t("note.type." + type.toLowerCase()) || type;

    $("#viewMetaRow").innerHTML = `
      <span class="badge-type ${type}">${typeLabel}</span>
      <span class="badge badge-category">${escapeHtml(categoryLabel(note.category))}</span>
      <span class="badge badge-urgency ${note.urgency}">${t("urgency." + note.urgency)}</span>
      ${note.tags.map(tg => `<span class="tag-chip">#${escapeHtml(tg)}</span>`).join("")}
    `;

    const contentDiv = $("#viewContentText");
    if (type === "CHECKLIST") {
      const items = Array.isArray(note.items) ? note.items : parseChecklistFromText(note.content);
      const doneCount = items.filter(i => i.done).length;
      const totalCount = items.length;
      const percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

      contentDiv.style.whiteSpace = "normal";
      contentDiv.innerHTML = `
        <div class="checklist-progress-wrap">
          <div class="checklist-progress-meta">
            <span>${t("note.checklist.progress", { done: doneCount, total: totalCount })}</span>
            <span>${percent}%</span>
          </div>
          <div class="checklist-progress-bar">
            <div class="checklist-progress-fill" style="width:${percent}%"></div>
          </div>
        </div>
        <div class="checklist-interactive-view">
          ${items.map((it, idx) => `
            <label class="interactive-cl-item ${it.done ? "done" : ""}">
              <input type="checkbox" ${it.done ? "checked" : ""} data-action="toggle-view-checklist-item" data-note-id="${note.id}" data-item-idx="${idx}">
              <span>${escapeHtml(it.text)}</span>
            </label>
          `).join("")}
        </div>
      `;
    } else if (type === "MARKDOWN") {
      contentDiv.style.whiteSpace = "normal";
      contentDiv.innerHTML = renderMarkdownToHtml(note.content || "");
    } else if (type === "CODE") {
      contentDiv.style.whiteSpace = "normal";
      const lang = (note.category || "código").toUpperCase();
      contentDiv.innerHTML = `
        <div class="code-view-container">
          <div class="code-view-header">
            <span>${escapeHtml(lang)}</span>
            <button type="button" class="code-copy-btn" id="viewCopyCodeBtn">
              ${ICONS.copy} <span>${t("note.code.copy")}</span>
            </button>
          </div>
          <pre class="code-view-pre"><code>${escapeHtml(note.content || "")}</code></pre>
        </div>
      `;
      const copyBtn = $("#viewCopyCodeBtn");
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(note.content || "").then(() => {
            copyBtn.classList.add("copied");
            copyBtn.querySelector("span").textContent = t("note.code.copied");
            setTimeout(() => {
              copyBtn.classList.remove("copied");
              copyBtn.querySelector("span").textContent = t("note.code.copy");
            }, 2000);
          });
        });
      }
    } else {
      contentDiv.style.whiteSpace = "pre-wrap";
      contentDiv.textContent = note.content;
    }

    // Renderiza tarefas vinculadas
    renderViewLinkedTasks(note);

    $("#viewCreatedAt").textContent = formatDate(note.createdAt) + (note.createdTime ? " · " + formatTime(note.createdTime) : "");
    $("#viewUpdatedAt").textContent = formatDate(note.updatedAt) + (note.updatedTime ? " · " + formatTime(note.updatedTime) : "");
    $("#viewFavBtn").textContent = note.favorite ? t("btn.unfavorite") : t("btn.favorite");
    $("#viewDoneBtn").textContent = note.completed ? t("btn.unmarkDone") : t("btn.markDone");
    openModal($("#viewModalOverlay"));
  }

  function renderViewLinkedTasks(note) {
    const listEl = $("#viewLinkedTasksList");
    const linked = state.tasks.filter(tk => String(tk.relatedNoteId) === String(note.id) || (note._backendId && String(tk.relatedNoteId) === String(note._backendId)));

    if (!linked.length) {
      listEl.innerHTML = `<div class="vlt-empty">${t("task.noLinkedTasks")}</div>`;
      return;
    }

    listEl.innerHTML = linked.map(tk => `
      <div class="vlt-item">
        <label class="vlt-item-left ${tk.status === "concluida" ? "done" : ""}">
          <input type="checkbox" data-action="toggle-task-check" data-id="${tk.id}" ${tk.status === "concluida" ? "checked" : ""}>
          <span>${escapeHtml(tk.title)}</span>
        </label>
        <span class="status-chip ${tk.status}">${t("status." + tk.status)}</span>
      </div>
    `).join("");
  }

  function handleToggleChecklistItem(noteId, idx) {
    const note = findNote(noteId);
    if (!note) return;
    if (!note.items) {
      note.items = parseChecklistFromText(note.content);
    }
    if (note.items[idx]) {
      note.items[idx].done = !note.items[idx].done;
      openViewModal(noteId);
      const apiReq = localNoteToApiRequest(note, "CHECKLIST");
      API.updateNote(note._backendId || note.id, apiReq).catch(err => {
        console.warn("Erro ao atualizar checklist:", err.message);
      });
    }
  }

  function initViewModalEvents() {
    $("#viewFavBtn").addEventListener("click", () => {
      toggleFavorite(state.viewingNoteId);
      openViewModal(state.viewingNoteId);
    });
    $("#viewDoneBtn").addEventListener("click", () => {
      toggleCompleted(state.viewingNoteId);
      openViewModal(state.viewingNoteId);
    });
    $("#viewEditBtn").addEventListener("click", () => {
      const id = state.viewingNoteId;
      closeModal($("#viewModalOverlay"));
      openNoteModal("edit", id);
    });
    $("#viewDeleteBtn").addEventListener("click", () => {
      const id = state.viewingNoteId;
      closeModal($("#viewModalOverlay"));
      openDeleteModal(id);
    });
    const addLinkedBtn = $("#viewAddLinkedTaskBtn");
    if (addLinkedBtn) {
      addLinkedBtn.addEventListener("click", () => {
        const id = state.viewingNoteId;
        openTaskModal("create", null, id);
      });
    }
    const linkedList = $("#viewLinkedTasksList");
    if (linkedList) {
      linkedList.addEventListener("click", (e) => {
        const chk = e.target.closest("[data-action='toggle-task-check']");
        if (chk) {
          toggleTaskCompletion(chk.dataset.id);
        }
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Modal: Criar / Editar Tarefa e Gerenciamento Completo
   * ------------------------------------------------------------------ */
  function openTaskModal(mode, id, preselectedNoteId) {
    state.editingTaskId = mode === "edit" ? id : null;
    const overlay = $("#taskModalOverlay");
    const titleInput = $("#taskTitleInput");
    const noteSelect = $("#taskRelatedNoteInput");
    const dateInput = $("#taskDateInput");
    const statusSelect = $("#taskStatusInput");
    const saveBtn = $("#saveTaskBtn");

    $("#taskTitleField").classList.remove("has-error");

    // Popula opções de notas ativas
    const actNotes = activeNotes();
    let noteOptions = `<option value="">${t("task.noRelatedNote")}</option>`;
    actNotes.forEach(n => {
      noteOptions += `<option value="${n.id}">${escapeHtml(n.title)}</option>`;
    });
    noteSelect.innerHTML = noteOptions;

    if (mode === "edit") {
      const task = findTask(id);
      if (!task) return;
      $("#taskModalTitle").textContent = t("task.editTask");
      saveBtn.textContent = t("task.saveChanges");
      titleInput.value = task.title || "";
      noteSelect.value = task.relatedNoteId || "";
      dateInput.value = task.date || daysAgoISO(0);
      statusSelect.value = task.status || "pendente";
    } else {
      $("#taskModalTitle").textContent = t("task.newTask");
      saveBtn.textContent = t("task.saveTask");
      titleInput.value = "";
      noteSelect.value = preselectedNoteId ? String(preselectedNoteId) : "";
      dateInput.value = daysAgoISO(0);
      statusSelect.value = "pendente";
    }

    openModal(overlay);
    setTimeout(() => titleInput.focus(), 60);
  }

  function saveTask() {
    const titleInput = $("#taskTitleInput");
    const noteSelect = $("#taskRelatedNoteInput");
    const dateInput = $("#taskDateInput");
    const statusSelect = $("#taskStatusInput");
    const saveBtn = $("#saveTaskBtn");

    const titleVal = titleInput.value.trim();
    if (!titleVal) {
      $("#taskTitleField").classList.add("has-error");
      titleInput.focus();
      return;
    }
    $("#taskTitleField").classList.remove("has-error");

    const relatedNoteId = noteSelect.value ? noteSelect.value : null;
    const dateVal = dateInput.value || daysAgoISO(0);
    const statusVal = statusSelect.value || "pendente";

    saveBtn.disabled = true;

    if (state.editingTaskId) {
      const task = findTask(state.editingTaskId);
      if (!task) {
        saveBtn.disabled = false;
        return;
      }

      const reqBody = {
        title: titleVal,
        relatedNoteId: relatedNoteId ? (Number(relatedNoteId) || null) : null,
        date: dateVal,
        status: statusVal
      };

      API.updateTask(task._backendId || task.id, reqBody)
        .then(updated => {
          Object.assign(task, apiTaskToLocal(updated));
          closeModal($("#taskModalOverlay"));
          toast(t("toast.taskUpdated"), "success");
          renderApp();
          if (state.viewingNoteId) openViewModal(state.viewingNoteId);
        })
        .catch(err => {
          task.title = titleVal;
          task.relatedNoteId = relatedNoteId || "";
          task.date = dateVal;
          task.status = statusVal;
          closeModal($("#taskModalOverlay"));
          toast(t("toast.taskUpdated"), "success");
          renderApp();
          if (state.viewingNoteId) openViewModal(state.viewingNoteId);
        })
        .finally(() => {
          saveBtn.disabled = false;
        });
    } else {
      const reqBody = {
        title: titleVal,
        relatedNoteId: relatedNoteId ? (Number(relatedNoteId) || null) : null,
        date: dateVal,
        status: statusVal
      };

      API.createTask(reqBody)
        .then(created => {
          state.tasks.unshift(apiTaskToLocal(created));
          closeModal($("#taskModalOverlay"));
          toast(t("toast.taskCreated"), "success");
          renderApp();
          if (state.viewingNoteId) openViewModal(state.viewingNoteId);
        })
        .catch(err => {
          const newTask = {
            id: nextId(),
            title: titleVal,
            relatedNoteId: relatedNoteId || "",
            date: dateVal,
            status: statusVal
          };
          state.tasks.unshift(newTask);
          closeModal($("#taskModalOverlay"));
          toast(t("toast.taskCreated"), "success");
          renderApp();
          if (state.viewingNoteId) openViewModal(state.viewingNoteId);
        })
        .finally(() => {
          saveBtn.disabled = false;
        });
    }
  }

  function toggleTaskCompletion(id) {
    const task = findTask(id);
    if (!task) return;
    const newStatus = task.status === "concluida" ? "pendente" : "concluida";
    task.status = newStatus;
    toast(t("toast.taskToggled"), "success");
    renderApp();
    if (state.viewingNoteId) openViewModal(state.viewingNoteId);

    API.updateTask(task._backendId || task.id, {
      title: task.title,
      relatedNoteId: task.relatedNoteId ? Number(task.relatedNoteId) : null,
      date: task.date,
      status: task.status
    }).catch(err => console.warn("Erro ao alternar status da tarefa:", err.message));
  }

  function openTaskDeleteModal(id) {
    state.taskDeleteTargetId = id;
    openModal($("#taskDeleteModalOverlay"));
  }

  function confirmDeleteTask() {
    const id = state.taskDeleteTargetId;
    const task = findTask(id);
    if (!task) return;

    state.tasks = state.tasks.filter(tk => String(tk.id) !== String(id) && (!tk._backendId || String(tk._backendId) !== String(id)));
    closeModal($("#taskDeleteModalOverlay"));
    toast(t("toast.taskDeleted"), "success");
    renderApp();
    if (state.viewingNoteId) openViewModal(state.viewingNoteId);

    API.deleteTask(task._backendId || task.id).catch(err => console.warn("Erro ao excluir tarefa:", err.message));
  }

  function initTaskModalStaticEvents() {
    const taskForm = $("#taskForm");
    if (taskForm) {
      taskForm.addEventListener("submit", (e) => {
        e.preventDefault();
        saveTask();
      });
    }
    $("#saveTaskBtn").addEventListener("click", saveTask);
    $("#taskTitleInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveTask();
      }
    });
    $("#confirmTaskDeleteBtn").addEventListener("click", confirmDeleteTask);
  }

  /* ------------------------------------------------------------------ *
   * Modal: excluir (mover para lixeira) e excluir permanente
   * ------------------------------------------------------------------ */
  function openDeleteModal(id) {
    state.deleteTargetId = id;
    openModal($("#deleteModalOverlay"));
  }

  function openPermaDeleteModal(id) {
    state.deleteTargetId = id;
    openModal($("#permaDeleteModalOverlay"));
  }

  function initDeleteModalEvents() {
    $("#confirmDeleteBtn").addEventListener("click", () => {
      const note = findNote(state.deleteTargetId);
      if (!note) return;
      const prevDeleted = note.deleted;
      note.deleted = true;
      closeModal($("#deleteModalOverlay"));
      renderApp();
      toast(t("toast.noteDeleted"), "success");

      const apiReq = localNoteToApiRequest(note);
      API.updateNote(note._backendId || note.id, apiReq).catch(err => {
        note.deleted = prevDeleted;
        renderApp();
        toast(err.message || t("toast.noteError"), "error");
      });
    });

    $("#confirmPermaDeleteBtn").addEventListener("click", () => {
      const targetId = state.deleteTargetId;
      const note = findNote(targetId);
      state.notes = state.notes.filter(n => n.id !== targetId);
      closeModal($("#permaDeleteModalOverlay"));
      renderApp();
      toast(t("toast.notePermaDeleted"), "success");

      if (note) {
        API.deleteNote(note._backendId || targetId).catch(err => {
          toast(err.message || t("toast.noteError"), "error");
          reloadNotes().then(() => renderApp());
        });
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Modais — utilitários genéricos
   * ------------------------------------------------------------------ */
  function openModal(overlay) {
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal(overlay) {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    if (overlay.id === "noteModalOverlay") {
      state.editingNoteId = null;
    }
  }

  function initGlobalModalEvents() {
    $all("[data-close-modal]").forEach(btn => {
      btn.addEventListener("click", () => closeModal($("#" + btn.dataset.closeModal)));
    });
    $all(".modal-overlay").forEach(overlay => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal(overlay);
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        $all(".modal-overlay.open").forEach(closeModal);
        closeNotifPanel();
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Header / sidebar mobile / busca / notificações
   * ------------------------------------------------------------------ */
  function initChromeEvents() {
    $("#newNoteBtn").addEventListener("click", () => openNoteModal("create"));
    $("#menuToggleBtn").addEventListener("click", openSidebarMobile);
    $("#sidebarCloseBtn").addEventListener("click", closeSidebarMobile);
    $("#sidebarOverlay").addEventListener("click", closeSidebarMobile);
    $("#logoutBtn").addEventListener("click", exitApp);

    $("#notifBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleNotifPanel();
    });
    document.addEventListener("click", (e) => {
      if (state.notifOpen && !e.target.closest("#notifPanel") && !e.target.closest("#notifBtn")) {
        closeNotifPanel();
      }
    });

    let searchTimer = null;
    $("#headerSearchInput").addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      const val = e.target.value;
      searchTimer = setTimeout(() => {
        state.headerSearch = val;
        // Só sai de seções onde não faz sentido buscar notas (tarefas/lixeira/config).
        if (state.section === "settings" || state.section === "tasks" || state.section === "trash") {
          state.section = "notes";
        }
        renderApp();
      }, 200);
    });
  }

  /* ------------------------------------------------------------------ *
   * Inicialização
   * ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(state.theme);
    applyStaticTranslations();

    initLangSwitch();
    initAuthTabs();
    initPasswordToggles();
    initLogin();
    initSignup();
    initChromeEvents();
    initGlobalModalEvents();
    initNoteModalStaticEvents();
    initTaskModalStaticEvents();
    initViewModalEvents();
    initDeleteModalEvents();

    // Sessão persistida (JWT): reentra direto no dashboard se autenticado.
    if (typeof Auth !== "undefined" && Auth.isAuthenticated()) {
      const user = Auth.getUser();
      if (user) {
        enterApp(user);
        return;
      }
    }

    const sessionEmail = loadSession();
    if (sessionEmail) {
      const user = state.users.find(u => u.email.toLowerCase() === sessionEmail.toLowerCase());
      if (user) enterApp(user);
      else clearSession();
    }
  });
})();
