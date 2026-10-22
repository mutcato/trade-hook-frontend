const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("access");
}

export function setTokens(access, refresh) {
  localStorage.setItem("access", access);
  localStorage.setItem("refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

export function isLoggedIn() {
  return !!getToken();
}

function handleAuthFailure() {
  clearTokens();
  window.location.href = "/login?expired=1";
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) return null;

  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  localStorage.setItem("access", data.access);
  if (data.refresh) localStorage.setItem("refresh", data.refresh);
  return data.access;
}

const AUTH_PATHS = ["/auth/login/", "/auth/register/", "/auth/token/refresh/"];

async function request(path, options = {}, retried = false) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (
    response.status === 401 &&
    token &&
    !retried &&
    !AUTH_PATHS.some((p) => path.includes(p))
  ) {
    const newAccess = await refreshAccessToken();
    if (newAccess) return request(path, options, true);
    handleAuthFailure();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message =
      typeof error.detail === "string"
        ? error.detail
        : Object.keys(error).length
          ? JSON.stringify(error)
          : response.statusText;

    if (
      response.status === 401 &&
      typeof message === "string" &&
      message.toLowerCase().includes("token")
    ) {
      handleAuthFailure();
    }

    // Carry the status through: callers need to tell "payment required" (402)
    // apart from a generic failure, not just read a message.
    const failure = new Error(message);
    failure.status = response.status;
    if (error.code) failure.code = error.code;
    throw failure;
  }

  if (response.status === 204) return null;
  return response.json();
}

export const authApi = {
  register: (data) =>
    request("/auth/register/", { method: "POST", body: JSON.stringify(data) }),
  login: (data) =>
    request("/auth/login/", { method: "POST", body: JSON.stringify(data) }),
  logout: (refresh) =>
    request("/auth/logout/", { method: "POST", body: JSON.stringify({ refresh }) }),
  profile: () => request("/auth/profile/"),
  updateProfile: (data) =>
    request("/auth/profile/", { method: "PATCH", body: JSON.stringify(data) }),
  changePassword: (data) =>
    request("/auth/change-password/", { method: "POST", body: JSON.stringify(data) }),
};

export const traderApi = {
  listHooksets: () => request("/trader/hooksets/"),
  getHookset: (id) => request(`/trader/hooksets/${id}/`),
  createHookset: (data) =>
    request("/trader/hooksets/", { method: "POST", body: JSON.stringify(data) }),
  updateHookset: (id, data) =>
    request(`/trader/hooksets/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteHookset: (id) => request(`/trader/hooksets/${id}/`, { method: "DELETE" }),

  listHooks: () => request("/trader/hooks/"),
  createHook: (data) =>
    request("/trader/hooks/", { method: "POST", body: JSON.stringify(data) }),
  updateHook: (uuid, data) =>
    request(`/trader/hooks/${uuid}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteHook: (uuid) => request(`/trader/hooks/${uuid}/`, { method: "DELETE" }),
  triggerHook: (uuid) =>
    request(`/trader/hooks/${uuid}/trigger/`, { method: "POST", body: "{}" }),

  listTrades: () => request("/trader/trades/"),
  createTrade: (data) =>
    request("/trader/trades/", { method: "POST", body: JSON.stringify(data) }),
  updateTrade: (id, data) =>
    request(`/trader/trades/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTrade: (id) => request(`/trader/trades/${id}/`, { method: "DELETE" }),

  listTelegrams: () => request("/trader/telegrams/"),
  createTelegram: (data) =>
    request("/trader/telegrams/", { method: "POST", body: JSON.stringify(data) }),
  getTelegramBotInfo: () => request("/trader/telegrams/bot_info/"),
};

export const billingApi = {
  getWallet: () => request("/billing/wallet/"),
  listPacks: () => request("/billing/packs/"),
  listOrders: () => request("/billing/orders/"),
  getOrder: (uuid) => request(`/billing/orders/${uuid}/`),
  /** Opens a crypto invoice for a pack; the response carries `invoice_url`. */
  createOrder: (packId) =>
    request("/billing/orders/", {
      method: "POST",
      body: JSON.stringify({ pack: packId }),
    }),
  listLedger: () => request("/billing/ledger/"),
};

export function hookTriggerUrl(hookId) {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://127.0.0.1:5173";
  return `${origin}/api/trader/hooks/${hookId}/trigger/`;
}

export function minutesToTimewindow(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

export function timewindowToMinutes(timewindow) {
  if (!timewindow) return 60;
  const [h, m] = String(timewindow).split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

export function formatTime(isoDate) {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

export function formatUsd(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatDate(isoDate) {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function timeAgo(isoDate) {
  if (!isoDate) return "—";
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Derive dashboard status for a strategy from its hooks + trades. */
export function deriveStrategyStatus(hookset, hooks, trades) {
  const hsHooks = hooks.filter((h) => h.hookset === hookset.id);
  const hsTrades = trades.filter((t) => {
    const id = typeof t.hookset === "object" ? t.hookset?.id : t.hookset;
    return id === hookset.id;
  });

  const pairs = [...new Set(hsTrades.map((t) => t.pair).filter(Boolean))];
  const allHooksTriggered =
    hsHooks.length > 0 && hsHooks.every((h) => h.is_triggered);
  const anyHookTriggered = hsHooks.some((h) => h.is_triggered);
  const allTradesTriggered =
    hsTrades.length > 0 && hsTrades.every((t) => t.is_triggered);
  const anyTradeTriggered = hsTrades.some((t) => t.is_triggered);

  let status = "idle";
  if (allTradesTriggered) status = "completed";
  else if (allHooksTriggered && !allTradesTriggered) status = "processing";
  else if (anyHookTriggered) status = "processing";
  else if (hsHooks.length === 0) status = "inactive";

  return {
    ...hookset,
    hooks: hsHooks,
    trades: hsTrades,
    pairs,
    status,
    anyTradeTriggered,
  };
}
