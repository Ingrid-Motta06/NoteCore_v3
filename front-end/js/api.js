/* ==========================================================================
   NoteCore — Cliente HTTP (API)
   Funções para comunicar com o back-end REST.
   Injeta automaticamente o token JWT no header Authorization.
   URL base configurável via window.API_BASE_URL ou padrão para localhost:8080.
   ========================================================================== */

const API = (function () {
  "use strict";

  function baseUrl() {
    if (window.API_BASE_URL) return window.API_BASE_URL.replace(/\/$/, "");
    if (typeof window !== "undefined" && window.location && window.location.protocol && window.location.protocol.startsWith("http")) {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isLocal && window.location.port !== "8080") {
        return window.location.protocol + "//" + window.location.hostname + ":8080";
      }
      return window.location.origin;
    }
    return "http://localhost:8080";
  }

  function headers(extra) {
    const h = { "Content-Type": "application/json" };
    const token = Auth.getToken();
    if (token) h["Authorization"] = "Bearer " + token;
    return Object.assign(h, extra || {});
  }

  async function request(method, path, body) {
    const url = baseUrl() + path;
    const opts = { method, headers: headers() };
    if (body !== undefined) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(url, opts);
    } catch (networkErr) {
      console.error("Falha de comunicação com o servidor NoteCore:", url, networkErr);
      throw new Error("Não foi possível conectar ao servidor NoteCore. Verifique se o servidor está ativo.");
    }

    if (res.status === 401 && !path.startsWith("/api/auth/")) {
      Auth.clearToken();
      window.location.reload();
      return null;
    }

    let data = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await res.json();
    }

    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || ("Erro " + res.status);
      throw new Error(msg);
    }

    return data;
  }

  async function get(path) { return request("GET", path); }
  async function post(path, body) { return request("POST", path, body); }
  async function put(path, body) { return request("PUT", path, body); }
  async function del(path) { return request("DELETE", path); }

  /* ---- Auth ---- */
  async function login(email, password) {
    return post("/api/auth/login", { email, password });
  }

  async function register(name, email, password) {
    return post("/api/auth/register", { name, email, password });
  }

  /* ---- Notas ---- */
  async function fetchAllNotes() {
    return get("/api/notes/all");
  }

  async function fetchNote(id) {
    return get("/api/notes/" + id);
  }

  async function createNote(data) {
    return post("/api/notes", data);
  }

  async function updateNote(id, data) {
    return put("/api/notes/" + id, data);
  }

  async function deleteNote(id) {
    return del("/api/notes/" + id);
  }

  async function searchNotes(q) {
    return get("/api/notes/search?q=" + encodeURIComponent(q) + "&size=100");
  }

  async function filterNotes(params) {
    const qs = new URLSearchParams(params).toString();
    return get("/api/notes/filter?" + qs + "&size=100");
  }

  async function fetchTags() {
    return get("/api/notes/tags");
  }

  async function fetchCategories() {
    return get("/api/notes/categories");
  }

  async function addTags(id, tags) {
    return post("/api/notes/" + id + "/tags", { tags: Array.isArray(tags) ? tags : [tags] });
  }

  async function removeTag(id, tag) {
    return del("/api/notes/" + id + "/tags/" + encodeURIComponent(tag));
  }

  /* ---- Tarefas ---- */
  async function fetchTasks() {
    return get("/api/tasks");
  }

  async function fetchTask(id) {
    return get("/api/tasks/" + id);
  }

  async function createTask(data) {
    return post("/api/tasks", data);
  }

  async function updateTask(id, data) {
    return put("/api/tasks/" + id, data);
  }

  async function deleteTask(id) {
    return del("/api/tasks/" + id);
  }

  return {
    login, register,
    fetchAllNotes, fetchNote, createNote, updateNote, deleteNote,
    searchNotes, filterNotes, fetchTags, fetchCategories,
    addTags, removeTag,
    fetchTasks, fetchTask, createTask, updateTask, deleteTask
  };
})();

