/* ==========================================================================
   NoteCore — Gerenciamento de Autenticação (JWT)
   Gerencia o token JWT no localStorage e informações do usuário atual.
   ========================================================================== */

const Auth = (function () {
  "use strict";

  const TOKEN_KEY = "notecore_jwt";
  const USER_KEY = "notecore_user";

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function setToken(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch (e) { /* sem storage */ }
  }

  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) { /* sem storage */ }
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setUser(user) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) { /* sem storage */ }
  }

  function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    try {
      // Decodifica o payload do JWT (sem validar assinatura — só para checar expiração)
      const parts = token.split(".");
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (!payload.exp) return false;
      return Date.now() / 1000 < payload.exp;
    } catch (e) { return false; }
  }

  function saveAuth(authResponse) {
    setToken(authResponse.token);
    setUser({
      id: authResponse.userId,
      name: authResponse.name,
      email: authResponse.email,
      initials: initialsFromName(authResponse.name)
    });
  }

  function initialsFromName(name) {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0] ? parts[0][0] : "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || "US";
  }

  return { getToken, setToken, clearToken, getUser, setUser, isAuthenticated, saveAuth };
})();

