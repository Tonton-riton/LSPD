// Client API REST pour communiquer avec le serveur LSPD // DOJ MDT (server.js + PostgreSQL/JSON BDA)

const TOKEN_KEY = "sa_lspd_auth_token_v1";

export function isHttpServerMode() {
  return typeof window !== "undefined" && window.location.protocol.startsWith("http");
}

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function apiRequest(path, { method = "GET", body, requireAuth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new Error("Non authentifié");
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    // ignore non-json
  }

  if (!res.ok) {
    const err = new Error(data.error || `Erreur serveur (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// --- Health & Auth ---
export const apiHealth = () => apiRequest("/api/health", { requireAuth: false });

export const apiLogin = async (username, password) => {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { username, password },
    requireAuth: false
  });
  if (data.token) setAuthToken(data.token);
  return data;
};

export const apiRegister = async ({ username, password, fullName, matricule, rank }) => {
  const data = await apiRequest("/api/auth/register", {
    method: "POST",
    body: { username, password, fullName, matricule, rank },
    requireAuth: false
  });
  if (data.token) setAuthToken(data.token);
  return data;
};

export const apiMe = () => apiRequest("/api/auth/me");

export const apiUpdateMyProfile = (patch) =>
  apiRequest("/api/auth/me", { method: "PATCH", body: patch });

export const apiLogout = async () => {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }
  setAuthToken("");
};

// --- Users & Roles (Hauts Gradés LSPD uniquement) ---
export const apiListUsers = () => apiRequest("/api/users");
export const apiCreateUser = (payload) => apiRequest("/api/users", { method: "POST", body: payload });
export const apiUpdateUser = (id, patch) => apiRequest(`/api/users/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
export const apiDeleteUser = (id) => apiRequest(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });

// --- Settings / Discord Webhooks (Hauts Gradés) ---
export const apiGetSettings = () => apiRequest("/api/settings");
export const apiSaveSettings = (patch) => apiRequest("/api/settings", { method: "PATCH", body: patch });

// --- Rapports d'Arrestation + Transfert & Validation DOJ ---
export const apiListReports = () => apiRequest("/api/reports");
export const apiSaveReport = (report) => apiRequest("/api/reports", { method: "POST", body: report });
export const apiReviewReport = (id, { dojStatus, dojComment }) =>
  apiRequest(`/api/reports/${encodeURIComponent(id)}/review`, {
    method: "POST",
    body: { dojStatus, dojComment }
  });
export const apiDeleteReport = (id) => apiRequest(`/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });

// --- Demandes DOJ (Descentes, Perquisitions, Mandats + Preuves) ---
export const apiListDojRequests = () => apiRequest("/api/doj-requests");
export const apiSaveDojRequest = (reqObj) => apiRequest("/api/doj-requests", { method: "POST", body: reqObj });
export const apiReviewDojRequest = (id, { status, dojComment }) =>
  apiRequest(`/api/doj-requests/${encodeURIComponent(id)}/review`, {
    method: "POST",
    body: { status, dojComment }
  });
export const apiDeleteDojRequest = (id) => apiRequest(`/api/doj-requests/${encodeURIComponent(id)}`, { method: "DELETE" });

// --- Dossiers d'Enquête partagés ---
export const apiListInvestigations = () => apiRequest("/api/investigations");
export const apiSaveInvestigation = (caseObj) => apiRequest("/api/investigations", { method: "POST", body: caseObj });
export const apiDeleteInvestigation = (id) => apiRequest(`/api/investigations/${encodeURIComponent(id)}`, { method: "DELETE" });
