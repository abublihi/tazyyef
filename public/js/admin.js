const API = "/api/admin";

// ─── State ────────────────────────────────────────────────────────────────────
let integrations = [];
let scenarios = [];
let trafficEntries = [];
let currentTrafficDetailId = null;
let currentDetailIntegrationId = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function toast(msg, type = "success") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function methodBadge(method) {
  return `<span class="badge badge-${method.toLowerCase()}">${method}</span>`;
}

function statusBadge(code) {
  const cls = code < 300 ? "2xx" : code < 500 ? "4xx" : "5xx";
  return `<span class="badge badge-${cls}">${code}</span>`;
}

function esc(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ─── Key-Value Editor ─────────────────────────────────────────────────────────
function addKvRow(containerId, key = "", value = "") {
  const container = document.getElementById(containerId);
  const row = document.createElement("div");
  row.className = "kv-row";
  row.innerHTML = `
    <input type="text" placeholder="Key" value="${key}" class="kv-key">
    <input type="text" placeholder="Value" value="${value}" class="kv-value">
    <button type="button" class="btn-danger btn-sm" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(row);
}

function getKvPairs(containerId) {
  const rows = document.querySelectorAll(`#${containerId} .kv-row`);
  const result = {};
  rows.forEach((row) => {
    const k = row.querySelector(".kv-key").value.trim();
    const v = row.querySelector(".kv-value").value.trim();
    if (k) result[k] = v;
  });
  return result;
}

function setKvPairs(containerId, obj) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  if (obj) {
    Object.entries(obj).forEach(([k, v]) => addKvRow(containerId, k, v));
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────
async function checkAuth() {
  try {
    const data = await api("/auth/me");
    if (data.authenticated) showApp(data.username);
    else showLogin();
  } catch {
    showLogin();
  }
}

function showLogin() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("app").classList.remove("active");
}

function showApp(username) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").classList.add("active");
  document.getElementById("userGreeting").textContent = username;
  loadIntegrations();
  loadTraffic();
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUser").value;
  const password = document.getElementById("loginPass").value;
  try {
    await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    document.getElementById("loginError").textContent = "";
    showApp(username);
  } catch (err) {
    document.getElementById("loginError").textContent = err.message;
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await api("/auth/logout", { method: "POST" });
  showLogin();
});

// ─── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll("[id^='tab-']").forEach((p) => p.classList.add("hidden"));
    document.getElementById(`tab-${tab.dataset.tab}`).classList.remove("hidden");
  });
});

// ─── Modal Handling ───────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add("active");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

document.querySelectorAll(".close-modal").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.closest(".modal-overlay").classList.remove("active");
  });
});

// Close modal on overlay click
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("active");
    }
  });
});

// ─── Integrations ─────────────────────────────────────────────────────────────
let searchTimeout = null;

async function loadIntegrations(searchTerm = "") {
  const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
  integrations = await api(`/integrations${query}`);
  renderIntegrations();
  populateIntegrationDropdowns();
}

document.getElementById("integrationSearch").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadIntegrations(e.target.value.trim());
  }, 300);
});

document.getElementById("integrationSearch").addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.target.value = "";
    loadIntegrations();
  }
});

function renderIntegrations() {
  const container = document.getElementById("integrationsList");
  if (!integrations.length) {
    container.innerHTML = `
      <div class="glass-card">
        <div class="empty-state">
          <p>No integrations yet. Create one to get started.</p>
        </div>
      </div>`;
    return;
  }
  container.innerHTML = integrations
    .map(
      (i) => `
    <div class="card">
      <div class="list-item" onclick="openIntegrationDetail('${i.id}')">
        <div class="info">
          <h4>${esc(i.name)}</h4>
          <span>key: ${esc(i.key)}</span>
        </div>
        <div class="actions">
          <button class="btn-ghost btn-sm" onclick="event.stopPropagation(); openEditIntegration('${i.id}')">Edit</button>
          <button class="btn-danger btn-sm" onclick="event.stopPropagation(); deleteIntegration('${i.id}')">Delete</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

// Integration form
document.getElementById("addIntegrationBtn").addEventListener("click", () => {
  document.getElementById("integrationModalTitle").textContent = "New Integration";
  document.getElementById("integrationForm").reset();
  document.getElementById("integrationId").value = "";
  document.getElementById("integrationKey").value = "(auto-generated)";
  openModal("integrationModal");
});

async function openEditIntegration(id) {
  const integration = integrations.find((i) => i.id === id);
  if (!integration) return;
  document.getElementById("integrationModalTitle").textContent = "Edit Integration";
  document.getElementById("integrationId").value = integration.id;
  document.getElementById("integrationName").value = integration.name;
  document.getElementById("integrationDesc").value = integration.description || "";
  document.getElementById("integrationKey").value = integration.key;
  openModal("integrationModal");
}

document.getElementById("integrationForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("integrationId").value;
  const body = {
    name: document.getElementById("integrationName").value,
    description: document.getElementById("integrationDesc").value,
  };
  const customKey = document.getElementById("integrationKey").value.trim();
  if (customKey && customKey !== "(auto-generated)") {
    body.key = customKey;
  }
  try {
    if (id) {
      await api(`/integrations/${id}`, { method: "PUT", body: JSON.stringify(body) });
      toast("Integration updated");
    } else {
      await api("/integrations", { method: "POST", body: JSON.stringify(body) });
      toast("Integration created");
    }
    closeModal("integrationModal");
    await loadIntegrations();
    if (currentDetailIntegrationId) {
      const updated = integrations.find((i) => i.id === currentDetailIntegrationId);
      if (updated) {
        document.getElementById("detailIntegrationName").textContent = updated.name;
        document.getElementById("detailIntegrationKey").textContent = updated.key;
        document.getElementById("detailIntegrationDesc").textContent = updated.description || "No description";
      }
    }
  } catch (err) {
    toast(err.message, "error");
  }
});

async function deleteIntegration(id) {
  if (!confirm("Delete this integration and all its scenarios?")) return;
  try {
    await api(`/integrations/${id}`, { method: "DELETE" });
    toast("Integration deleted");
    loadIntegrations();
    loadScenarios();
    closeIntegrationDetail();
  } catch (err) {
    toast(err.message, "error");
  }
}

// ─── Integration Detail View ──────────────────────────────────────────────────
let detailScenarios = [];
let detailSearchTimeout = null;

async function openIntegrationDetail(id) {
  currentDetailIntegrationId = id;
  const integration = integrations.find((i) => i.id === id);
  if (!integration) return;

  document.getElementById("integrationsListView").classList.add("hidden");
  document.getElementById("integrationDetailView").classList.remove("hidden");

  document.getElementById("detailIntegrationName").textContent = integration.name;
  document.getElementById("detailIntegrationKey").textContent = integration.key;
  document.getElementById("detailIntegrationDesc").textContent = integration.description || "No description";

  await loadIntegrationScenarios(id);
}

function closeIntegrationDetail() {
  currentDetailIntegrationId = null;
  detailScenarios = [];
  document.getElementById("detailScenarioSearch").value = "";
  document.getElementById("integrationsListView").classList.remove("hidden");
  document.getElementById("integrationDetailView").classList.add("hidden");
}

document.getElementById("detailScenarioSearch").addEventListener("input", (e) => {
  clearTimeout(detailSearchTimeout);
  detailSearchTimeout = setTimeout(() => {
    renderIntegrationScenarios(detailScenarios);
  }, 300);
});

document.getElementById("detailScenarioSearch").addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.target.value = "";
    renderIntegrationScenarios(detailScenarios);
  }
});

async function loadIntegrationScenarios(id) {
  try {
    const integrationScenarios = await api(`/integrations/${id}/scenarios`);
    const integration = integrations.find((i) => i.id === id);
    detailScenarios = integrationScenarios.map((s) => ({
      ...s,
      integrationName: integration.name,
      integrationKey: integration.key,
    }));
    renderIntegrationScenarios(detailScenarios);
  } catch (err) {
    toast(err.message, "error");
  }
}

function getDetailSearchTerm() {
  return document.getElementById("detailScenarioSearch")?.value?.trim().toLowerCase() || "";
}

function filterDetailScenarios() {
  const term = getDetailSearchTerm();
  if (!term) return detailScenarios;
  return detailScenarios.filter((s) =>
    s.endpoint.toLowerCase().includes(term) ||
    s.method.toLowerCase().includes(term) ||
    s.responseCode.toString().includes(term)
  );
}

function renderIntegrationScenarios(scenarioList) {
  const filtered = filterDetailScenarios();
  const container = document.getElementById("integrationScenariosList");
  if (!filtered.length) {
    const message = getDetailSearchTerm()
      ? "No scenarios match your search."
      : "No scenarios for this integration. Create one to get started.";
    container.innerHTML = `
      <div class="glass-card">
        <div class="empty-state">
          <p>${message}</p>
        </div>
      </div>`;
    return;
  }
  container.innerHTML = filtered
    .map(
      (s) => {
        const rateInfo = s.rateLimit
          ? `<span class="text-sm text-muted" title="Rate limit">${s.rateLimit} req / ${s.rateWindow || 60000}ms</span>`
          : "";
        return `
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-1">
          ${methodBadge(s.method)}
          <span class="mono text-sm">${esc(s.endpoint)}</span>
        </div>
        ${statusBadge(s.responseCode)}
      </div>
      <div class="list-item">
        <div class="info">
          <span class="text-sm text-muted">
            ${Object.keys(JSON.parse(s.headers || "{}")).length} headers &middot;
            ${Object.keys(JSON.parse(s.queryParams || "{}")).length} query &middot;
            ${Object.keys(JSON.parse(s.bodyParams || "{}")).length} body
            ${rateInfo ? " &middot; " + rateInfo : ""}
          </span>
        </div>
        <div class="actions">
          <button class="btn-ghost btn-sm" onclick="testScenario('${s.integrationKey}', '${esc(s.endpoint)}', '${s.method}')">Test</button>
          <button class="btn-ghost btn-sm" onclick="openEditScenario('${s.id}')">Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteScenarioFromDetail('${s.id}')">Delete</button>
        </div>
      </div>
    </div>
  `;
      }
    )
    .join("");
}

async function deleteScenarioFromDetail(id) {
  if (!confirm("Delete this scenario?")) return;
  try {
    await api(`/scenarios/${id}`, { method: "DELETE" });
    toast("Scenario deleted");
    if (currentDetailIntegrationId) {
      await loadIntegrationScenarios(currentDetailIntegrationId);
    }
    loadScenarios();
  } catch (err) {
    toast(err.message, "error");
  }
}

document.getElementById("backToIntegrationsBtn").addEventListener("click", closeIntegrationDetail);
document.getElementById("addScenarioFromDetailBtn").addEventListener("click", () => {
  document.getElementById("scenarioIntegration").value = currentDetailIntegrationId;
  document.getElementById("addScenarioBtn").click();
});
document.getElementById("editIntegrationFromDetailBtn").addEventListener("click", () => {
  if (currentDetailIntegrationId) {
    openEditIntegration(currentDetailIntegrationId);
  }
});
document.getElementById("deleteIntegrationFromDetailBtn").addEventListener("click", () => {
  if (currentDetailIntegrationId) {
    deleteIntegration(currentDetailIntegrationId);
  }
});

// ─── Scenarios ────────────────────────────────────────────────────────────────
let scenarioSearchTimeout = null;

function populateIntegrationDropdowns() {
  const options = integrations.map((i) => `<option value="${i.id}">${esc(i.name)}</option>`).join("");
  document.getElementById("scenarioIntegration").innerHTML = options;
  document.getElementById("scenarioIntegrationFilter").innerHTML =
    `<option value="">Select Integration...</option>` + options;
  document.getElementById("trafficIntegrationFilter").innerHTML =
    `<option value="">All Integrations</option>` + options;
}

async function loadScenarios() {
  const filterId = document.getElementById("scenarioIntegrationFilter").value;
  const searchTerm = document.getElementById("scenarioSearch")?.value?.trim() || "";
  const query = new URLSearchParams();
  if (searchTerm) query.set("search", searchTerm);

  scenarios = await api(`/scenarios?${query.toString()}`);

  if (filterId) {
    scenarios = scenarios.filter((s) => s.integrationId === filterId);
  }

  renderScenarios();
}

document.getElementById("scenarioIntegrationFilter").addEventListener("change", loadScenarios);

document.getElementById("scenarioSearch").addEventListener("input", (e) => {
  clearTimeout(scenarioSearchTimeout);
  scenarioSearchTimeout = setTimeout(() => {
    loadScenarios();
  }, 300);
});

document.getElementById("scenarioSearch").addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.target.value = "";
    loadScenarios();
  }
});

function renderScenarios() {
  const container = document.getElementById("scenariosList");
  const filterId = document.getElementById("scenarioIntegrationFilter").value;

  if (!scenarios.length) {
    const message = filterId
      ? "No scenarios for this integration. Create one to get started."
      : "No scenarios found.";
    container.innerHTML = `
      <div class="glass-card">
        <div class="empty-state">
          <p>${message}</p>
        </div>
      </div>`;
    return;
  }
  container.innerHTML = scenarios
    .map(
      (s) => {
        const rateInfo = s.rateLimit
          ? `<span class="text-sm text-muted" title="Rate limit">${s.rateLimit} req / ${s.rateWindow || 60000}ms</span>`
          : "";
        return `
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-1">
          ${methodBadge(s.method)}
          <span class="mono text-sm">${esc(s.endpoint)}</span>
        </div>
        ${statusBadge(s.responseCode)}
      </div>
      <div class="list-item">
        <div class="info">
          <h4>${esc(s.integrationName)}</h4>
          <span class="text-sm text-muted">
            ${Object.keys(JSON.parse(s.headers || "{}")).length} headers &middot;
            ${Object.keys(JSON.parse(s.queryParams || "{}")).length} query &middot;
            ${Object.keys(JSON.parse(s.bodyParams || "{}")).length} body
            ${rateInfo ? " &middot; " + rateInfo : ""}
          </span>
        </div>
        <div class="actions">
          <button class="btn-ghost btn-sm" onclick="testScenario('${s.integrationKey}', '${esc(s.endpoint)}', '${s.method}')">Test</button>
          <button class="btn-ghost btn-sm" onclick="openEditScenario('${s.id}')">Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteScenario('${s.id}')">Delete</button>
        </div>
      </div>
    </div>
  `;
      }
    )
    .join("");
}

// Scenario form
document.getElementById("addScenarioBtn").addEventListener("click", () => {
  document.getElementById("scenarioModalTitle").textContent = "New Scenario";
  document.getElementById("scenarioForm").reset();
  document.getElementById("scenarioId").value = "";
  setKvPairs("headersEditor", {});
  setKvPairs("queryParamsEditor", {});
  setKvPairs("bodyParamsEditor", {});
  document.getElementById("scenarioResponseBody").value = "{}";
  document.getElementById("scenarioRateLimit").value = "";
  document.getElementById("scenarioRateWindow").value = "";
  openModal("scenarioModal");
});

async function openEditScenario(id) {
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) return;
  document.getElementById("scenarioModalTitle").textContent = "Edit Scenario";
  document.getElementById("scenarioId").value = scenario.id;
  document.getElementById("scenarioIntegration").value = scenario.integrationId;
  document.getElementById("scenarioMethod").value = scenario.method;
  document.getElementById("scenarioEndpoint").value = scenario.endpoint;
  setKvPairs("headersEditor", JSON.parse(scenario.headers || "{}"));
  setKvPairs("queryParamsEditor", JSON.parse(scenario.queryParams || "{}"));
  setKvPairs("bodyParamsEditor", JSON.parse(scenario.bodyParams || "{}"));
  document.getElementById("scenarioResponseCode").value = scenario.responseCode;
  document.getElementById("scenarioResponseBody").value = scenario.responseBody;
  document.getElementById("scenarioRateLimit").value = scenario.rateLimit || "";
  document.getElementById("scenarioRateWindow").value = scenario.rateWindow || "";
  openModal("scenarioModal");
}

document.getElementById("scenarioForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const endpoint = document.getElementById("scenarioEndpoint").value;
  if (/^https?:\/\//i.test(endpoint)) {
    toast("Endpoint must be a path starting with /. Full URLs are not allowed.", "error");
    return;
  }
  if (!endpoint.startsWith("/")) {
    toast("Endpoint must start with /", "error");
    return;
  }
  const id = document.getElementById("scenarioId").value;
  const body = {
    integrationId: document.getElementById("scenarioIntegration").value,
    method: document.getElementById("scenarioMethod").value,
    endpoint: document.getElementById("scenarioEndpoint").value,
    headers: getKvPairs("headersEditor"),
    queryParams: getKvPairs("queryParamsEditor"),
    bodyParams: getKvPairs("bodyParamsEditor"),
    responseCode: parseInt(document.getElementById("scenarioResponseCode").value, 10),
    responseBody: document.getElementById("scenarioResponseBody").value,
    rateLimit: document.getElementById("scenarioRateLimit").value ? parseInt(document.getElementById("scenarioRateLimit").value, 10) : undefined,
    rateWindow: document.getElementById("scenarioRateWindow").value ? parseInt(document.getElementById("scenarioRateWindow").value, 10) : undefined,
  };
  try {
    if (id) {
      await api(`/scenarios/${id}`, { method: "PUT", body: JSON.stringify(body) });
      toast("Scenario updated");
    } else {
      await api(`/integrations/${body.integrationId}/scenarios`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast("Scenario created");
    }
    closeModal("scenarioModal");
    loadScenarios();
    if (currentDetailIntegrationId) {
      await loadIntegrationScenarios(currentDetailIntegrationId);
    }
  } catch (err) {
    toast(err.message, "error");
  }
});

async function deleteScenario(id) {
  if (!confirm("Delete this scenario?")) return;
  try {
    await api(`/scenarios/${id}`, { method: "DELETE" });
    toast("Scenario deleted");
    loadScenarios();
  } catch (err) {
    toast(err.message, "error");
  }
}

// ─── Test Scenario ────────────────────────────────────────────────────────────
function testScenario(integrationKey, endpoint, method) {
  document.getElementById("testMethod").value = method;
  document.getElementById("testUrl").value = `/mock/${integrationKey}${endpoint}`;
  document.getElementById("testBody").value = "{}";
  document.getElementById("testResult").classList.add("hidden");
  openModal("testModal");
}

document.getElementById("testSendBtn").addEventListener("click", async () => {
  const method = document.getElementById("testMethod").value;
  const url = document.getElementById("testUrl").value;
  const bodyStr = document.getElementById("testBody").value;

  try {
    const options = { method, credentials: "include" };
    if (["POST", "PUT", "PATCH"].includes(method)) {
      options.headers = { "Content-Type": "application/json" };
      options.body = bodyStr;
    }

    const res = await fetch(url, options);
    const data = await res.json();

    document.getElementById("testStatus").textContent = `${res.status} ${res.statusText}`;
    document.getElementById("testStatus").className = `badge badge-${res.status < 300 ? "2xx" : res.status < 500 ? "4xx" : "5xx"}`;
    document.getElementById("testResponseBody").textContent = JSON.stringify(data, null, 2);
    document.getElementById("testResult").classList.remove("hidden");
  } catch (err) {
    document.getElementById("testStatus").textContent = "Error";
    document.getElementById("testStatus").className = "badge badge-5xx";
    document.getElementById("testResponseBody").textContent = err.message;
    document.getElementById("testResult").classList.remove("hidden");
  }
});

// ─── Traffic ──────────────────────────────────────────────────────────────────
async function loadTraffic() {
  const filterId = document.getElementById("trafficIntegrationFilter").value;
  try {
    const data = await api(`/traffic?limit=100&integrationId=${filterId}`);
    trafficEntries = data.entries || [];
    renderTraffic();
  } catch (err) {
    toast(err.message, "error");
  }
}

function renderTraffic() {
  const container = document.getElementById("trafficList");
  if (!trafficEntries.length) {
    container.innerHTML = `
      <div class="glass-card">
        <div class="empty-state">
          <p>No traffic logged yet.</p>
        </div>
      </div>`;
    return;
  }
  container.innerHTML = trafficEntries
    .map(
      (t) => `
    <div class="card">
      <div class="traffic-item" onclick="openTrafficDetail('${t.id}')">
        <div class="traffic-meta">
          ${methodBadge(t.method)}
          <span class="traffic-path">${esc(t.path)}</span>
          ${statusBadge(t.statusCode)}
        </div>
        <div class="traffic-response">
          <span class="text-sm text-muted">${t.responseTime}ms</span>
          <span class="traffic-time">${formatTime(t.timestamp)}</span>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString();
}

document.getElementById("trafficIntegrationFilter").addEventListener("change", loadTraffic);
document.getElementById("refreshTrafficBtn").addEventListener("click", loadTraffic);

async function openTrafficDetail(id) {
  currentTrafficDetailId = id;
  try {
    const entry = await api(`/traffic/${id}`);
    document.getElementById("trafficDetailMethod").innerHTML = methodBadge(entry.method);
    document.getElementById("trafficDetailPath").textContent = entry.path;
    document.getElementById("trafficDetailStatus").innerHTML = statusBadge(entry.statusCode);
    document.getElementById("trafficDetailTime").textContent = `${entry.responseTime}ms — ${formatTime(entry.timestamp)}`;
    document.getElementById("trafficDetailHeaders").textContent = JSON.stringify(entry.headers, null, 2);
    document.getElementById("trafficDetailQuery").textContent = JSON.stringify(entry.query, null, 2);
    document.getElementById("trafficDetailBody").textContent = JSON.stringify(entry.body, null, 2);
    openModal("trafficDetailModal");
  } catch (err) {
    toast(err.message, "error");
  }
}

document.getElementById("deleteTrafficEntryBtn").addEventListener("click", async () => {
  if (!currentTrafficDetailId) return;
  try {
    await api(`/traffic/${currentTrafficDetailId}`, { method: "DELETE" });
    toast("Traffic entry deleted");
    closeModal("trafficDetailModal");
    loadTraffic();
  } catch (err) {
    toast(err.message, "error");
  }
});

document.getElementById("clearTrafficBtn").addEventListener("click", async () => {
  const filterId = document.getElementById("trafficIntegrationFilter").value;
  const msg = filterId ? "Clear traffic for this integration?" : "Clear ALL traffic?";
  if (!confirm(msg)) return;
  try {
    const data = await api(`/traffic${filterId ? `?integrationId=${filterId}` : ""}`, { method: "DELETE" });
    toast(data.message);
    loadTraffic();
  } catch (err) {
    toast(err.message, "error");
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
checkAuth();

// ─── Postman Import ───────────────────────────────────────────────────────────
let importIntegrationId = null;
let importPreviewData = null;
let importSelectedEndpoints = new Set();

function openImportModal(integrationId) {
  importIntegrationId = integrationId;
  importPreviewData = null;
  importSelectedEndpoints = new Set();

  document.getElementById("importStepUpload").classList.remove("hidden");
  document.getElementById("importStepLoading").classList.add("hidden");
  document.getElementById("importStepPreview").classList.add("hidden");
  document.getElementById("importStepSummary").classList.add("hidden");
  document.getElementById("importConfirmBtn").classList.add("hidden");
  document.getElementById("importBackBtn").classList.add("hidden");
  document.getElementById("importFileError").classList.add("hidden");
  document.getElementById("importFileInput").value = "";

  openModal("importModal");
}

document.getElementById("importPostmanFromDetailBtn").addEventListener("click", () => {
  if (currentDetailIntegrationId) {
    openImportModal(currentDetailIntegrationId);
  }
});

const dropZone = document.getElementById("importDropZone");
const fileInput = document.getElementById("importFileInput");

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleImportFile(file);
});

dropZone.addEventListener("click", (e) => {
  if (e.target.tagName !== "INPUT" && e.target.tagName !== "LABEL") {
    fileInput.click();
  }
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) handleImportFile(file);
});

async function handleImportFile(file) {
  if (!file.name.endsWith(".json")) {
    showImportError("Please upload a JSON file");
    return;
  }

  try {
    const text = await file.text();
    const collection = JSON.parse(text);

    document.getElementById("importStepUpload").classList.add("hidden");
    document.getElementById("importStepLoading").classList.remove("hidden");

    const response = await api(`/integrations/${importIntegrationId}/import/preview`, {
      method: "POST",
      body: JSON.stringify({ collection }),
    });

    importPreviewData = response;
    renderImportPreview(response);

    document.getElementById("importStepLoading").classList.add("hidden");
    document.getElementById("importStepPreview").classList.remove("hidden");
    document.getElementById("importConfirmBtn").classList.remove("hidden");
  } catch (err) {
    document.getElementById("importStepLoading").classList.add("hidden");
    document.getElementById("importStepUpload").classList.remove("hidden");
    showImportError(err.message);
  }
}

function showImportError(message) {
  const errorEl = document.getElementById("importFileError");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function renderImportPreview(data) {
  document.getElementById("importCollectionName").textContent = data.collection.name;
  document.getElementById("importCollectionDesc").textContent = data.collection.description || "";
  document.getElementById("importTotalCount").textContent = `${data.totalEndpoints} endpoints`;

  const conflictEl = document.getElementById("importConflictCount");
  if (data.conflictCount > 0) {
    conflictEl.textContent = `${data.conflictCount} conflicts`;
    conflictEl.classList.remove("hidden");
  } else {
    conflictEl.classList.add("hidden");
  }

  const envVarEl = document.getElementById("importEnvVarWarning");
  if (data.hasEnvVariables) {
    envVarEl.classList.remove("hidden");
  } else {
    envVarEl.classList.add("hidden");
  }

  importSelectedEndpoints = new Set(data.endpoints.map((_, i) => i));
  renderImportEndpoints(data.endpoints);
}

function renderImportEndpoints(endpoints) {
  const container = document.getElementById("importEndpointsList");
  container.innerHTML = endpoints.map((ep, index) => {
    const isSelected = importSelectedEndpoints.has(index);
    const conflictClass = ep.hasConflict ? "has-conflict" : "";
    const selectedClass = isSelected ? "selected" : "";

    let statusBadge = "";
    if (ep.hasConflict) {
      statusBadge = `<span class="badge badge-4xx">Conflict</span>`;
    } else {
      statusBadge = `<span class="badge badge-2xx">New</span>`;
    }

    let actionSelect = "";
    if (ep.hasConflict) {
      actionSelect = `
        <select onchange="updateConflictAction(${index}, this.value)">
          <option value="skip" ${ep.conflictAction === "skip" ? "selected" : ""}>Skip</option>
          <option value="overwrite" ${ep.conflictAction === "overwrite" ? "selected" : ""}>Overwrite</option>
          <option value="create" ${ep.conflictAction === "create" ? "selected" : ""}>Create New</option>
        </select>
      `;
    } else {
      actionSelect = `<span class="text-sm text-muted">Create</span>`;
    }

    return `
      <div class="import-endpoint-row ${conflictClass} ${selectedClass}" data-index="${index}">
        <span class="import-col-select">
          <input type="checkbox" ${isSelected ? "checked" : ""} onchange="toggleEndpointSelection(${index}, this.checked)">
        </span>
        <span class="import-col-method">${methodBadge(ep.method)}</span>
        <span class="import-col-path" title="${esc(ep.endpoint)}">${esc(ep.endpoint)}</span>
        <span class="import-col-desc" title="${esc(ep.description || "")}">${esc(ep.description || "—")}</span>
        <span class="import-col-status">${statusBadge}</span>
        <span class="import-col-action">${actionSelect}</span>
      </div>
    `;
  }).join("");
}

function toggleEndpointSelection(index, selected) {
  if (selected) {
    importSelectedEndpoints.add(index);
  } else {
    importSelectedEndpoints.delete(index);
  }
  const row = document.querySelector(`.import-endpoint-row[data-index="${index}"]`);
  if (row) {
    row.classList.toggle("selected", selected);
  }
}

function updateConflictAction(index, action) {
  if (importPreviewData) {
    importPreviewData.endpoints[index].conflictAction = action;
  }
}

document.getElementById("importSelectAllBtn").addEventListener("click", () => {
  importSelectedEndpoints = new Set(importPreviewData.endpoints.map((_, i) => i));
  renderImportEndpoints(importPreviewData.endpoints);
});

document.getElementById("importDeselectAllBtn").addEventListener("click", () => {
  importSelectedEndpoints = new Set();
  renderImportEndpoints(importPreviewData.endpoints);
});

document.getElementById("importSelectConflictsBtn").addEventListener("click", () => {
  importSelectedEndpoints = new Set();
  importPreviewData.endpoints.forEach((ep, i) => {
    if (ep.hasConflict) importSelectedEndpoints.add(i);
  });
  renderImportEndpoints(importPreviewData.endpoints);
});

document.getElementById("importBackBtn").addEventListener("click", () => {
  document.getElementById("importStepSummary").classList.add("hidden");
  document.getElementById("importStepPreview").classList.remove("hidden");
  document.getElementById("importConfirmBtn").classList.remove("hidden");
  document.getElementById("importBackBtn").classList.add("hidden");
});

document.getElementById("importConfirmBtn").addEventListener("click", async () => {
  if (importSelectedEndpoints.size === 0) {
    toast("Select at least one endpoint to import", "error");
    return;
  }

  const selectedEndpoints = importPreviewData.endpoints
    .map((ep, index) => ({
      ...ep,
      action: importSelectedEndpoints.has(index) ? (ep.conflictAction || "create") : "skip",
    }));

  const integration = integrations.find(i => i.id === importIntegrationId);

  try {
    document.getElementById("importStepPreview").classList.add("hidden");
    document.getElementById("importStepLoading").classList.remove("hidden");
    document.getElementById("importConfirmBtn").classList.add("hidden");

    const response = await api(`/integrations/${importIntegrationId}/import/confirm`, {
      method: "POST",
      body: JSON.stringify({
        endpoints: selectedEndpoints,
        collectionName: importPreviewData.collection.name,
      }),
    });

    document.getElementById("importStepLoading").classList.add("hidden");
    document.getElementById("importStepSummary").classList.remove("hidden");

    document.getElementById("summaryImported").textContent = response.summary.imported;
    document.getElementById("summaryUpdated").textContent = response.summary.updated;
    document.getElementById("summarySkipped").textContent = response.summary.skipped;
    document.getElementById("summaryFailed").textContent = response.summary.failed;

    if (response.details.failed.length > 0) {
      document.getElementById("importFailedDetails").classList.remove("hidden");
      document.getElementById("importFailedList").innerHTML = response.details.failed
        .map(f => `<li><strong>${esc(f.name)}</strong>: ${esc(f.reason)}</li>`)
        .join("");
    } else {
      document.getElementById("importFailedDetails").classList.add("hidden");
    }

    loadIntegrations();
    loadScenarios();
    if (currentDetailIntegrationId) {
      await loadIntegrationScenarios(currentDetailIntegrationId);
    }
  } catch (err) {
    document.getElementById("importStepLoading").classList.add("hidden");
    document.getElementById("importStepPreview").classList.remove("hidden");
    document.getElementById("importConfirmBtn").classList.remove("hidden");
    toast(err.message, "error");
  }
});
