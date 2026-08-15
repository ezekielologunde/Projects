// Local personal-assistant dashboard server.
// Password-gated (see profile/dashboard-auth.json) since it now binds to the LAN interface,
// not just 127.0.0.1 — reachable by any device on the home network, so it needs a real gate.
// Reads live from the project's data folders on every request (no build/regenerate step).
//
// Usage: node server.js
// If the port is already in use, assumes another instance is already serving and exits quietly.

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const crypto = require("crypto");
const { answerQuestion } = require("./lib/chatbot.js");
const { findRelated } = require("./lib/cross-links.js");

const PORT = 47832;
const HOST = "0.0.0.0"; // LAN-reachable. Home routers don't forward this to the internet by default.
const ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(__dirname, "web", "dist");
const SESSION_COOKIE = "pa_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const DIRS = {
  applications: path.join(ROOT, "applications"),
  digests: path.join(ROOT, "digests"),
  news: path.join(ROOT, "news"),
  inbox: path.join(ROOT, "inbox"),
  profile: path.join(ROOT, "profile"),
  logs: path.join(ROOT, "logs"),
};
const SNAPSHOT_PATH = path.join(DIRS.logs, "dashboard-snapshot.json");

// Honest day-over-day deltas: compares against a baseline saved at the first
// dashboard load of each calendar day, not a fabricated trend number.
function getCountTrends(counts) {
  const today = new Date().toISOString().slice(0, 10);
  const snapshot = readJsonSafe(SNAPSHOT_PATH, null);
  let trends = {};
  if (snapshot && snapshot.date === today) {
    trends = Object.fromEntries(Object.keys(counts).map((k) => [k, counts[k] - (snapshot.counts[k] || 0)]));
  } else {
    fs.mkdirSync(DIRS.logs, { recursive: true });
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify({ date: today, counts }, null, 2));
  }
  return trends;
}

function readJsonSafe(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return fallback; }
}

function fileUrl(p) {
  return "file:///" + p.replace(/\\/g, "/").replace(/ /g, "%20");
}

// ---- Auth: simple in-memory session tokens behind a shared password ----
const sessions = new Map(); // token -> expiresAt

function getPassword() {
  const auth = readJsonSafe(path.join(DIRS.profile, "dashboard-auth.json"), null);
  return auth ? auth.password : null;
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").map((c) => c.trim().split("=")).filter((p) => p[0]));
}

function isAuthed(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token || !sessions.has(token)) return false;
  if (sessions.get(token) < Date.now()) { sessions.delete(token); return false; }
  return true;
}

function createSession() {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

// ---- Data aggregation ----
function getApplications() {
  if (!fs.existsSync(DIRS.applications)) return [];
  const folders = fs.readdirSync(DIRS.applications, { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name);
  return folders.map((folder) => {
    const dir = path.join(DIRS.applications, folder);
    const status = readJsonSafe(path.join(dir, "status.json"), {
      status: "unknown", company: folder, role: "", url: "", found_at: "", applied_at: null, notes: "",
    });
    const files = fs.readdirSync(dir);
    const has = (name) => files.includes(name);
    return {
      folder,
      status: status.status || "unknown",
      company: status.company || "",
      role: status.role || "",
      url: status.url || "",
      found_at: status.found_at || "",
      applied_at: status.applied_at || null,
      discovered_via: status.discovered_via || "",
      notes: status.notes || "",
      docs: {
        jobPosting: has("job-posting.md"),
        tailoringNotes: has("tailoring-notes.md"),
        applyLog: has("apply-log.md"),
        resume: has("resume_tailored.docx") ? fileUrl(path.join(dir, "resume_tailored.docx")) : null,
        coverLetter: has("cover_letter_tailored.docx") ? fileUrl(path.join(dir, "cover_letter_tailored.docx")) : null,
      },
    };
  }).sort((a, b) => (b.found_at || "").localeCompare(a.found_at || ""));
}

function listMd(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().reverse()
    .map((f) => ({ date: f.replace(/\.md$/, "") }));
}

// Parses "- **Headline** — blurb [Source](url)" bullets out of a news digest .md file.
// Real extraction from what was actually written, not a summary/rewrite.
function parseNewsHeadlines(content, limit) {
  const items = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^- \*\*(.+?)\*\*\s*—\s*(.*)$/);
    if (!m) continue;
    let [, headline, rest] = m;
    let source = null, url = null;
    const linkMatch = rest.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*$/);
    if (linkMatch) {
      source = linkMatch[1];
      url = linkMatch[2];
      rest = rest.slice(0, linkMatch.index).trim();
    }
    items.push({ headline: headline.trim(), blurb: rest.trim(), source, url });
    if (items.length >= limit) break;
  }
  return items;
}

function getTopNews(limit) {
  const files = fs.existsSync(DIRS.news) ? fs.readdirSync(DIRS.news).filter((f) => f.endsWith(".md")).sort().reverse() : [];
  if (!files.length) return null;
  const date = files[0].replace(/\.md$/, "");
  const content = fs.readFileSync(path.join(DIRS.news, files[0]), "utf-8");
  return { date, items: parseNewsHeadlines(content, limit) };
}

// Flags a payment as "due soon" (within this many days) for the money-page notification.
const PAYMENT_DUE_SOON_DAYS = 14;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target - new Date(new Date().toISOString().slice(0, 10) + "T00:00:00")) / 86400000);
}

function getFinances() {
  const finances = readJsonSafe(path.join(DIRS.profile, "finances.json"), null);
  const connectedAccounts = readJsonSafe(path.join(DIRS.profile, "connected-accounts.json"), null);
  if (!finances) return { finances: null, connectedAccounts, paymentsDueSoon: [] };
  const paymentsDueSoon = (finances.accounts || [])
    .filter((a) => a.latest_statement && a.latest_statement.minimum_payment_due)
    .map((a) => ({
      institution: a.institution, last4: a.last4, amount: a.latest_statement.minimum_payment,
      due: a.latest_statement.minimum_payment_due, daysLeft: daysUntil(a.latest_statement.minimum_payment_due),
    }))
    .filter((p) => p.daysLeft !== null && p.daysLeft <= PAYMENT_DUE_SOON_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  return { finances, connectedAccounts, paymentsDueSoon };
}

function buildDashboardData() {
  const goalsData = readJsonSafe(path.join(DIRS.profile, "goals.json"), { goals: [] });
  const preferences = readJsonSafe(path.join(DIRS.profile, "preferences.json"), null);
  const profile = readJsonSafe(path.join(DIRS.profile, "master-profile.json"), null);
  const cyntraix = readJsonSafe(path.join(DIRS.profile, "cyntraix-business.json"), null);
  const research = readJsonSafe(path.join(DIRS.profile, "doctoral-research.json"), null);
  const projectsRegistry = readJsonSafe(path.join(DIRS.profile, "projects-registry.json"), null);
  const applications = getApplications();
  const counts = applications.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
  const trends = getCountTrends(counts);
  const { finances, connectedAccounts, paymentsDueSoon } = getFinances();

  return {
    generatedAt: new Date().toISOString(),
    goals: goalsData.goals || [],
    applications,
    counts,
    trends,
    digests: listMd(DIRS.digests),
    news: listMd(DIRS.news),
    topNews: getTopNews(4),
    inbox: listMd(DIRS.inbox),
    cyntraix,
    research,
    projectsRegistry,
    preferences,
    finances,
    connectedAccounts,
    paymentsDueSoon,
    workAuth: profile && profile.contact ? profile.contact.work_authorization : null,
  };
}

// getDashboardData() re-walks every JSON file and every applications/ subfolder on disk.
// That's fine for one request, but this dashboard is reachable from any device on the LAN
// (see the module comment up top), so a burst of near-simultaneous loads (phone + laptop,
// or a page load re-fetching right after a manual refresh) would otherwise re-do that full
// synchronous disk walk once per request, blocking the single-threaded event loop each time.
// A few seconds of staleness is invisible to a human refreshing a personal dashboard, so a
// short cache trades that for keeping the "reads live from disk" guarantee intact in practice.
const DASHBOARD_CACHE_TTL_MS = 4000;
let dashboardCache = null; // { data, expiresAt }
function getDashboardData() {
  const now = Date.now();
  if (dashboardCache && dashboardCache.expiresAt > now) return dashboardCache.data;
  const data = buildDashboardData();
  dashboardCache = { data, expiresAt: now + DASHBOARD_CACHE_TTL_MS };
  return data;
}

// ---- Safe file-content reads for drill-down (whitelisted dirs/files only) ----
const ALLOWED_APPLICATION_FILES = new Set(["job-posting.md", "tailoring-notes.md", "apply-log.md"]);

function safeReadApplicationFile(folder, file) {
  if (folder.includes("..") || folder.includes("/") || folder.includes("\\")) return null;
  if (!ALLOWED_APPLICATION_FILES.has(file)) return null;
  const p = path.join(DIRS.applications, folder, file);
  if (!p.startsWith(DIRS.applications)) return null;
  try { return fs.readFileSync(p, "utf-8"); } catch { return null; }
}

function safeReadDatedFile(dir, date) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) return null;
  const p = path.join(dir, `${date}.md`);
  if (!p.startsWith(dir)) return null;
  try { return fs.readFileSync(p, "utf-8"); } catch { return null; }
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const PUBLIC_PATHS = new Set(["/login.html", "/login.js", "/styles.css"]);

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ---- Login ----
  if (pathname === "/api/login" && req.method === "POST") {
    const body = await readBody(req);
    let submitted = "";
    try { submitted = JSON.parse(body).password; } catch { /* ignore */ }
    const real = getPassword();
    if (real && submitted === real) {
      const token = createSession();
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}; Path=/`,
      });
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false }));
    }
    return;
  }
  if (pathname === "/api/logout") {
    const cookies = parseCookies(req);
    sessions.delete(cookies[SESSION_COOKIE]);
    res.writeHead(302, { Location: "/login.html", "Set-Cookie": `${SESSION_COOKIE}=; Max-Age=0; Path=/` });
    res.end();
    return;
  }

  // ---- Auth gate (everything below requires a valid session) ----
  if (!PUBLIC_PATHS.has(pathname) && !isAuthed(req)) {
    if (pathname.startsWith("/api/")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
    } else {
      res.writeHead(302, { Location: "/login.html" });
      res.end();
    }
    return;
  }

  // ---- API ----
  if (pathname === "/api/dashboard") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getDashboardData()));
    return;
  }
  if (pathname === "/api/application-file") {
    const { folder, file } = parsed.query;
    const content = folder && file ? safeReadApplicationFile(String(folder), String(file)) : null;
    res.writeHead(content === null ? 404 : 200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(content === null ? "Not found" : content);
    return;
  }
  if (pathname === "/api/digest") {
    const content = parsed.query.date ? safeReadDatedFile(DIRS.digests, String(parsed.query.date)) : null;
    res.writeHead(content === null ? 404 : 200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(content === null ? "Not found" : content);
    return;
  }
  if (pathname === "/api/news") {
    const content = parsed.query.date ? safeReadDatedFile(DIRS.news, String(parsed.query.date)) : null;
    res.writeHead(content === null ? 404 : 200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(content === null ? "Not found" : content);
    return;
  }
  if (pathname === "/api/inbox") {
    const content = parsed.query.date ? safeReadDatedFile(DIRS.inbox, String(parsed.query.date)) : null;
    res.writeHead(content === null ? 404 : 200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(content === null ? "Not found" : content);
    return;
  }
  if (pathname === "/api/chat" && req.method === "POST") {
    const body = await readBody(req);
    let question = "";
    try { question = JSON.parse(body).question; } catch { /* ignore */ }
    const result = answerQuestion(question, getDashboardData());
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }
  if (pathname === "/api/related") {
    const { kind, id } = parsed.query;
    const related = kind && id ? findRelated(String(kind), String(id), getDashboardData()) : [];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ related }));
    return;
  }

  // ---- Static frontend ----
  let filePath = pathname === "/" ? "/index.html" : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end("Forbidden"); return; }
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`Dashboard server already running on port ${PORT} — nothing to do.`);
    process.exit(0);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  const nets = require("os").networkInterfaces();
  const lanIps = Object.values(nets).flat().filter((n) => n.family === "IPv4" && !n.internal).map((n) => n.address);
  console.log(`Personal assistant dashboard running on port ${PORT}.`);
  console.log(`  Locally:  http://127.0.0.1:${PORT}`);
  lanIps.forEach((ip) => console.log(`  On LAN:   http://${ip}:${PORT}`));
});
