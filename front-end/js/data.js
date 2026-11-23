/* ==========================================================================
   NoteCore — Dados e persistência (somente front-end)
   Nenhuma chamada de rede é feita. Contas e notas ficam no localStorage do
   navegador; as notas e tarefas são gravadas SEPARADAMENTE para cada conta.
   ========================================================================== */

const MOCK_USER = {
  name: "Ana Moura",
  email: "ana.moura@notecore.com",
  initials: "AM"
};

// "Banco de usuários" mockado — em memória + espelhado no localStorage,
// para que o cadastro/login persista entre recarregamentos de página.
// Isso simula uma tabela de usuários sem precisar de backend real.
const MOCK_USERS_SEED = [
  { name: MOCK_USER.name, email: MOCK_USER.email, password: "notecore123" }
];

function loadRegisteredUsers() {
  try {
    const raw = localStorage.getItem("notecore_users");
    if (raw) return JSON.parse(raw);
  } catch (e) { /* localStorage indisponível — segue com os dados padrão */ }
  return MOCK_USERS_SEED.slice();
}

function saveRegisteredUsers(users) {
  try { localStorage.setItem("notecore_users", JSON.stringify(users)); }
  catch (e) { /* ambiente sem localStorage — cadastro fica só na sessão atual */ }
}

function initialsFromName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ? parts[0][0] : "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "US";
}

// ID único e estável entre recarregamentos (o contador antigo reiniciava em 1000
// a cada carregamento e geraria IDs repetidos para notas já salvas).
function nextId() {
  return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Data local (AAAA-MM-DD). toISOString() usa UTC e, no fuso do Brasil, "virava"
// o dia seguinte a partir das 21h.
function toLocalISO(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalISO(d);
}

/* --------------------------------------------------------------------------
   Notas e tarefas por conta
   Cada usuário tem a sua própria chave no localStorage, derivada do e-mail.
   Nenhuma nota de exemplo é criada: uma conta nova começa com a lista vazia.
   -------------------------------------------------------------------------- */
const USER_DATA_PREFIX = "notecore_data_v1:";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function userDataKey(email) {
  return USER_DATA_PREFIX + String(email || "").trim().toLowerCase();
}

function sanitizeNote(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.title !== "string") return null;
  const today = daysAgoISO(0);
  const date = (v) => (typeof v === "string" && ISO_DATE_RE.test(v) ? v : today);
  const type = ["TEXT", "CHECKLIST", "MARKDOWN", "CODE"].includes(raw.type) ? raw.type : "TEXT";
  const items = Array.isArray(raw.items)
    ? raw.items.map(it => ({ text: String(it.text || it.itemText || ""), done: Boolean(it.done || it.itemDone) }))
    : null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : (raw.id ? String(raw.id) : nextId()),
    type: type,
    title: raw.title,
    content: typeof raw.content === "string" ? raw.content : "",
    category: typeof raw.category === "string" ? raw.category : "",
    urgency: ["baixa", "media", "alta"].includes(raw.urgency) ? raw.urgency : "media",
    tags: Array.isArray(raw.tags) ? raw.tags.filter(tg => typeof tg === "string") : [],
    items: items,
    date: date(raw.date),
    createdAt: date(raw.createdAt),
    updatedAt: date(raw.updatedAt),
    favorite: raw.favorite === true,
    deleted: raw.deleted === true
  };
}

function sanitizeTask(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.title !== "string") return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : (raw.id ? String(raw.id) : nextId()),
    title: raw.title,
    relatedNoteId: raw.relatedNoteId !== undefined && raw.relatedNoteId !== null ? String(raw.relatedNoteId) : "",
    date: typeof raw.date === "string" && ISO_DATE_RE.test(raw.date) ? raw.date : daysAgoISO(0),
    status: ["pendente", "andamento", "concluida"].includes(raw.status) ? raw.status : "pendente"
  };
}

/** Lê as notas/tarefas da conta. Sem dados salvos (ou storage indisponível) devolve listas vazias. */
function loadUserData(email) {
  const empty = { notes: [], tasks: [] };
  if (!email) return empty;
  try {
    const raw = localStorage.getItem(userDataKey(email));
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      notes: (Array.isArray(parsed.notes) ? parsed.notes : []).map(sanitizeNote).filter(Boolean),
      tasks: (Array.isArray(parsed.tasks) ? parsed.tasks : []).map(sanitizeTask).filter(Boolean)
    };
  } catch (e) { return empty; }
}

/** Grava as notas/tarefas somente na chave da conta informada. */
function saveUserData(email, data) {
  if (!email) return false;
  try {
    localStorage.setItem(userDataKey(email), JSON.stringify({ notes: data.notes, tasks: data.tasks }));
    return true;
  } catch (e) { return false; /* sem storage — dados valem só para a sessão atual */ }
}
