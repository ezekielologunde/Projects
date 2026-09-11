const STATUS_COLORS = {
  staged: "#ff8c42", ready_to_submit: "#f5b64c", applied: "#34d399", interview: "#ffb17a",
  interview_scheduled: "#ffb17a", in_review: "#5eb0ef", action_required: "#f5b64c",
  rejected: "#f0605c", dropped: "#6f7a8c", needs_manual_completion: "#f5b64c", unknown: "#6f7a8c",
};

function esc2(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

let latestData = null;

// ================= Page switching (real navigation, not scroll-to-anchor) =================
function switchPage(name) {
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("on", p.id === `page-${name}`));
  const buttons = [...document.querySelectorAll(".sidebar .nav button")];
  buttons.forEach((b) => b.classList.toggle("on", b.dataset.page === name));
  const activeBtn = buttons.find((b) => b.dataset.page === name);
  if (activeBtn) document.getElementById("navPip").style.top = `${activeBtn.offsetTop}px`;
  document.querySelector(".main").scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  window.scrollTo(0, 0);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".sidebar .nav button").forEach((btn) => {
    btn.addEventListener("click", () => switchPage(btn.dataset.page));
  });
  switchPage("home");
});

// ================= Theme toggle =================
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("howz-theme", theme);
  document.querySelectorAll("#themeToggle button").forEach((b) => b.classList.toggle("on", b.dataset.theme === theme));
}
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(document.documentElement.getAttribute("data-theme") || "dark");
  document.querySelectorAll("#themeToggle button").forEach((b) => {
    b.addEventListener("click", () => applyTheme(b.dataset.theme));
  });
});

// ================= Notifications =================
function toggleNotifPanel() {
  document.getElementById("notifPanel").classList.toggle("open");
}
document.addEventListener("click", (e) => {
  const wrap = document.querySelector(".bell-wrap");
  if (wrap && !wrap.contains(e.target)) document.getElementById("notifPanel").classList.remove("open");
});
function buildNotifications(data) {
  const items = [];
  const staged = data.applications.filter((a) => a.status === "staged").length;
  const interview = data.counts.interview || 0;
  const attention = data.applications.filter((a) => a.status === "needs_manual_completion" || a.status === "action_required" || a.status === "unknown").length;
  if (interview) items.push({ dot: "var(--green)", text: `${interview} application${interview === 1 ? "" : "s"} at interview stage`, sub: "job search", page: "applications" });
  if (staged) items.push({ dot: "var(--blue)", text: `${staged} application${staged === 1 ? "" : "s"} staged, ready for your review`, sub: "job search", page: "applications" });
  if (attention) items.push({ dot: "var(--amber)", text: `${attention} application${attention === 1 ? "" : "s"} need manual completion`, sub: "job search", page: "applications" });
  if (data.inbox && data.inbox.length) items.push({ dot: "var(--muted)", text: `Inbox review on file — check for anything still needing a reply`, sub: `${data.inbox.length} review${data.inbox.length === 1 ? "" : "s"} logged`, page: "inbox" });
  const dueSoon = data.paymentsDueSoon || [];
  if (dueSoon.length) {
    const soonest = dueSoon[0];
    const overdue = soonest.daysLeft < 0;
    items.push({
      dot: overdue ? "var(--red)" : "var(--amber)",
      text: `${dueSoon.length} payment${dueSoon.length === 1 ? "" : "s"} due soon`,
      sub: `${soonest.institution} $${soonest.amount.toFixed(2)} ${overdue ? "was due" : "due"} ${soonest.due}`,
      page: "money",
    });
  }
  const r = data.research;
  if (r && r._meta && r._meta.open_items && r._meta.open_items.length) items.push({ dot: "var(--violet)", text: `${r._meta.open_items.length} open item${r._meta.open_items.length === 1 ? "" : "s"} in doctoral research need your input`, sub: "research", page: "research" });
  document.getElementById("notifList").innerHTML = items.length
    ? items.map((n) => `<div class="notif-item" onclick="switchPage('${n.page}');toggleNotifPanel()"><span class="ni-dot" style="background:${n.dot}"></span><div><div class="ni-text">${esc2(n.text)}</div><div class="ni-sub">${esc2(n.sub)}</div></div></div>`).join("")
    : `<div class="notif-empty">You're all caught up.</div>`;
  document.getElementById("bellDot").style.display = items.length ? "block" : "none";
}

// ================= Module search =================
let moduleSearchTerm = "";
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("moduleSearch").addEventListener("input", (e) => {
    moduleSearchTerm = e.target.value.trim().toLowerCase();
    renderQuickGrid(currentQuickFilter);
  });
});

// ================= Modal dialog =================
function openModal(html) {
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modalOverlay").classList.add("open");
}
function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// Minimal, safe markdown → HTML: escapes first, then converts headers/bold/bullets/links/rules.
function mdToHtml(raw) {
  const lines = esc2(raw).split("\n");
  let html = "", inList = false;
  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
  for (let line of lines) {
    line = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--blue)">$1</a>');
    if (/^### (.*)$/.test(line)) { closeList(); html += `<h5>${line.replace(/^### /, "")}</h5>`; continue; }
    if (/^## (.*)$/.test(line)) { closeList(); html += `<h4>${line.replace(/^## /, "")}</h4>`; continue; }
    if (/^# (.*)$/.test(line)) { closeList(); html += `<h3>${line.replace(/^# /, "")}</h3>`; continue; }
    if (/^---\s*$/.test(line)) { closeList(); html += `<hr/>`; continue; }
    if (/^- (.*)$/.test(line)) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${line.replace(/^- /, "")}</li>`; continue; }
    closeList();
    if (line.trim() === "") { html += "<br/>"; continue; }
    html += `<p>${line}</p>`;
  }
  closeList();
  return html;
}

async function openFileModal(title, sub, endpoint) {
  openModal(`<h3>${esc2(title)}</h3><div class="modal-sub">${esc2(sub)}</div><div class="loading">loading</div>`);
  const res = await fetch(endpoint);
  const body = res.ok ? `<div class="md-body">${mdToHtml(await res.text())}</div>` : `<div class="loading">could not load</div>`;
  openModal(`<h3>${esc2(title)}</h3><div class="modal-sub">${esc2(sub)}</div>${body}`);
}

function openNoteModal(title, sub, note) {
  openModal(`<h3>${esc2(title)}</h3><div class="modal-sub">${esc2(sub)}</div><pre>${esc2(note)}</pre>`);
}

// ================= Clock + greeting =================
function tickClock() {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
setInterval(tickClock, 1000);
tickClock();

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Winding down";
}
document.querySelector(".who .hello").textContent = greeting() + ",";

// ================= Data load =================
let splashDismissed = false;
async function load(isRefresh) {
  const btn = document.getElementById("refresh-btn");
  if (isRefresh && btn) btn.classList.add("spinning");
  const res = await fetch("/api/dashboard");
  const data = await res.json();
  latestData = data;
  render(data);
  if (isRefresh && btn) setTimeout(() => btn.classList.remove("spinning"), 500);
  if (!splashDismissed) {
    splashDismissed = true;
    const splash = document.getElementById("splash");
    splash.classList.add("hide");
    setTimeout(() => { splash.style.display = "none"; maybeShowOnboarding(); }, 420);
  }
}

// ================= First-visit onboarding tour =================
const TOUR_STEPS = [
  { icon: "i-home", title: "Welcome to HoWz", body: "This is your Chief of Staff AI assistant — one place tracking job search, goals, Cyntraix, doctoral research, projects, and news, all pulled live from what's actually on file." },
  { icon: "i-folder", title: "Modules, filtered", body: "The cards below the news strip are your modules. Use the category pills — Career, Business, Academic, Ops — or the search box to jump straight to one." },
  { icon: "i-mail", title: "Alerts are real", body: "The bell in the top right only shows things that actually need you — staged applications, items needing manual completion, open research questions. Empty means genuinely caught up." },
  { icon: "i-brief", title: "Nothing happens without you", body: "Résumés get tailored, applications get staged, leads get found — but nothing is ever submitted, sent, or applied for without your explicit go-ahead first." },
];
let tourIndex = 0;
function renderTourStep() {
  const s = TOUR_STEPS[tourIndex];
  const dots = TOUR_STEPS.map((_, i) => `<span class="${i === tourIndex ? "on" : ""}"></span>`).join("");
  openModal(`
    <div class="tour-steps">${dots}</div>
    <div class="tour-icon"><svg width="20" height="20"><use href="#${s.icon}"/></svg></div>
    <h3>${esc2(s.title)}</h3>
    <div class="notes" style="margin-top:8px;font-size:14px;line-height:1.6">${esc2(s.body)}</div>
    <div class="tour-actions">
      <button class="tour-skip" onclick="endTour()">skip</button>
      <button class="tour-next" onclick="advanceTour()">${tourIndex === TOUR_STEPS.length - 1 ? "let's go" : "next"}</button>
    </div>`);
}
function advanceTour() {
  tourIndex++;
  if (tourIndex >= TOUR_STEPS.length) { endTour(); return; }
  renderTourStep();
}
function endTour() {
  localStorage.setItem("howz-onboarded", "1");
  closeModal();
}
function maybeShowOnboarding() {
  if (localStorage.getItem("howz-onboarded")) return;
  tourIndex = 0;
  renderTourStep();
}

function countUp(el, target) {
  const start = Number(el.dataset.val || 0);
  if (start === target) return;
  el.dataset.val = target;
  const duration = 500;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Daily briefing spans every module, not just job search — ranks real candidates and
// picks the single most relevant one, with an honest cross-module fallback.
function heroCopy(data) {
  const staged = data.applications.filter((a) => a.status === "staged").length;
  const interview = data.counts.interview || 0;
  const attention = data.applications.filter((a) => a.status === "needs_manual_completion" || a.status === "action_required" || a.status === "unknown").length;
  const activeGoals = data.goals.filter((g) => g.status === "active").length;
  const cyOpen = data.cyntraix && data.cyntraix._meta && data.cyntraix._meta.open_items ? data.cyntraix._meta.open_items.length : 0;
  const rsOpen = data.research && data.research._meta && data.research._meta.open_items ? data.research._meta.open_items.length : 0;
  const cyClients = data.cyntraix ? data.cyntraix.clients.filter((c) => c.status === "active").length : 0;

  const candidates = [];
  if (interview) candidates.push({ priority: 100, line1: "Interview", line2: "on the board.", blurb: `${interview} application${interview === 1 ? " has" : "s have"} moved to interview stage. Check job search for details.` });
  if (attention) candidates.push({ priority: 90, line1: `${attention} application${attention === 1 ? "" : "s"}`, line2: "need manual completion.", blurb: `Something in the apply flow couldn't be finished automatically — worth a look in job search.` });
  if (cyOpen) candidates.push({ priority: 80, line1: "Cyntraix needs", line2: "your input.", blurb: `${cyOpen} open item${cyOpen === 1 ? "" : "s"} on the business side — check the Cyntraix page for what's blocking.` });
  if (rsOpen) candidates.push({ priority: 70, line1: "Research has", line2: "open questions.", blurb: `${rsOpen} open item${rsOpen === 1 ? "" : "s"} in the doctoral research tracker waiting on a decision from you.` });
  if (staged) candidates.push({ priority: 50, line1: `${staged} application${staged === 1 ? "" : "s"}`, line2: "ready to review.", blurb: `Tailored résumé${staged === 1 ? "" : "s"} and cover letter${staged === 1 ? "" : "s"} staged and waiting on your go-ahead before anything gets submitted.` });

  if (candidates.length) {
    candidates.sort((a, b) => b.priority - a.priority);
    const { line1, line2, blurb } = candidates[0];
    return { line1, line2, blurb };
  }
  return {
    line1: "You're", line2: "all caught up.",
    blurb: `${activeGoals} active goal${activeGoals === 1 ? "" : "s"}, ${cyClients} active Cyntraix client${cyClients === 1 ? "" : "s"}, and nothing urgent across job search, research, or the inbox right now.`,
  };
}

// ================= Bar chart =================
let currentChartDays = 7;
function dateRange(n) {
  const days = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(d.toISOString().slice(0, 10)); }
  return days;
}
function buildChart(applications, dayCount) {
  currentChartDays = dayCount || currentChartDays;
  const days = dateRange(currentChartDays);
  const counts = days.map((d) => applications.filter((a) => a.found_at === d).length);
  const max = Math.max(1, ...counts);
  const w = 560, h = 128, pad = 6, gap = 6;
  const barW = (w / counts.length) - gap;
  const bars = counts.map((c, i) => {
    const barH = Math.max(c > 0 ? 6 : 3, (c / max) * (h - pad * 2));
    const x = i * (barW + gap) + gap / 2;
    const y = h - barH;
    const fill = c > 0 ? "url(#barGrad)" : "rgba(255,255,255,.08)";
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="4" fill="${fill}" style="animation-delay:${i * 45}ms"/>`;
  }).join("");
  document.getElementById("chart").innerHTML = `
    <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--violet)"/><stop offset="100%" stop-color="var(--blue)"/>
    </linearGradient></defs>${bars}`;
  const dayLabels = days.map((d) => new Date(d + "T00:00:00").toLocaleDateString([], currentChartDays > 14 ? { day: "numeric" } : { weekday: "short" }));
  document.getElementById("chartDays").innerHTML = dayLabels.map((l, i) => `<span class="${i === dayLabels.length - 1 ? "on" : ""}">${l}</span>`).join("");
}

// ================= Total Activity: horizontal segmented bar =================
const ACTIVITY_BUCKETS = [
  { key: "progress", label: "In Progress", hex: "#9b8cff", match: (s) => s === "staged" || s === "ready_to_submit" },
  { key: "completed", label: "Completed", hex: "#5b8cff", match: (s) => s === "applied" || s === "interview" || s === "rejected" },
  { key: "followup", label: "Needs Follow-up", hex: "#ffab5c", match: (s) => s === "needs_manual_completion" || s === "unknown" },
];
function buildActivityBar(data) {
  const apps = data.applications.filter((a) => a.status !== "dropped");
  const total = apps.length;
  const counts = ACTIVITY_BUCKETS.map((b) => apps.filter((a) => b.match(a.status)).length);
  const segbar = document.getElementById("segbar");
  const chips = document.getElementById("segbarChips");
  if (!total) {
    segbar.innerHTML = "";
    document.getElementById("activityPct").textContent = "—";
    chips.innerHTML = `<div class="empty" style="flex:1;padding:14px">no applications yet</div>`;
    return;
  }
  segbar.innerHTML = ACTIVITY_BUCKETS.map((b, i) => {
    const pct = (counts[i] / total) * 100;
    return pct > 0 ? `<div class="seg" style="width:${pct}%;background:${b.hex}" title="${b.label}: ${Math.round(pct)}%"></div>` : "";
  }).join("");
  const movedOn = counts[1]; // completed = resolved one way or another
  document.getElementById("activityPct").textContent = `${Math.round((movedOn / total) * 100)}%`;
  chips.innerHTML = ACTIVITY_BUCKETS.map((b, i) => `
    <div class="segbar-chip"><div class="sc-dot" style="background:${b.hex}"></div><div class="sc-num">${counts[i]}</div><div class="sc-label">${b.label}</div></div>`).join("");
}

// ================= Top News Today =================
function buildNewsStrip(data) {
  const tn = data.topNews;
  const dateEl = document.getElementById("newsStripDate");
  const cardsEl = document.getElementById("newsCards");
  if (!tn || !tn.items || !tn.items.length) {
    dateEl.textContent = "no digest yet";
    cardsEl.innerHTML = `<div class="empty">no news digest on file yet.</div>`;
    return;
  }
  dateEl.textContent = tn.date;
  cardsEl.innerHTML = tn.items.map((n) => `
    <div class="news-card" onclick="openFileModal('${escAttr(tn.date)}','news digest','/api/news?date=${encodeURIComponent(tn.date)}')">
      <div class="nc-headline">${esc2(n.headline)}</div>
      <div class="nc-blurb">${esc2(n.blurb)}</div>
      ${n.source ? `<div class="nc-source">${esc2(n.source)}</div>` : ""}
    </div>`).join("");
}

function buildPerfStatChips(data) {
  const staged = data.applications.filter((a) => a.status === "staged").length;
  const attention = data.applications.filter((a) => a.status === "needs_manual_completion" || a.status === "action_required" || a.status === "unknown").length;
  document.getElementById("perfStatChips").innerHTML = `
    <div class="perf-stat-chip b"><div class="psc-icon"><svg width="14" height="14"><use href="#i-brief"/></svg></div><div class="psc-num">${staged}</div><div class="psc-label">Staged</div></div>
    <div class="perf-stat-chip a"><div class="psc-icon"><svg width="14" height="14"><use href="#i-mail"/></svg></div><div class="psc-num">${attention}</div><div class="psc-label">Needs attention</div></div>`;
}

const PERIOD_LABELS = { 7: "this week", 14: "last 2 weeks", 30: "this month" };
function togglePeriodMenu() { document.getElementById("periodSelect").classList.toggle("open"); }
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("periodMenu").querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const days = Number(btn.dataset.days);
      document.getElementById("periodBtn").firstChild.textContent = PERIOD_LABELS[days] + " ";
      document.getElementById("periodSelect").classList.remove("open");
      buildChart(latestData.applications, days);
    });
  });
  document.addEventListener("click", (e) => {
    const sel = document.getElementById("periodSelect");
    if (sel && !sel.contains(e.target)) sel.classList.remove("open");
  });
});

function buildHeatmap(data) {
  const days = dateRange(28);
  const byDate = {}; days.forEach((d) => { byDate[d] = 0; });
  data.applications.forEach((a) => { if (byDate[a.found_at] !== undefined) byDate[a.found_at]++; });
  data.digests.forEach((d) => { if (byDate[d.date] !== undefined) byDate[d.date]++; });
  data.news.forEach((n) => { if (byDate[n.date] !== undefined) byDate[n.date]++; });
  data.inbox.forEach((i) => { if (byDate[i.date] !== undefined) byDate[i.date]++; });
  const max = Math.max(1, ...Object.values(byDate));
  document.getElementById("heatmap").innerHTML = days.map((d) => {
    const count = byDate[d]; const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
    const label = new Date(d + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" });
    return `<div class="cell" data-level="${level}" data-tip="${label}: ${count} item${count === 1 ? "" : "s"}"></div>`;
  }).join("");
}

// ================= Render =================
function render(data) {
  const hero = heroCopy(data);
  document.getElementById("heroHeadline").innerHTML = `<span class="ln"><span>${esc2(hero.line1)}</span></span><span class="ln"><span>${esc2(hero.line2)}</span></span>`;
  document.getElementById("heroBlurb").textContent = hero.blurb;

  const statsEl = document.getElementById("stats");
  if (!statsEl.dataset.built) {
    statsEl.innerHTML = Object.keys(STATUS_COLORS).map((k, i) => {
      const t = (data.trends || {})[k] || 0;
      const trendHtml = t !== 0 ? `<span class="trend ${t > 0 ? "up" : "down"}">${t > 0 ? "+" : ""}${t} today</span>` : "";
      return `<div class="stat glass" style="animation-delay:${i * 40 + 900}ms"><div class="num-row"><div class="num" id="stat-${k}" data-val="0" style="color:${STATUS_COLORS[k]}">0</div>${trendHtml}</div><div class="label">${k.replace(/_/g, " ")}</div></div>`;
    }).join("");
    statsEl.dataset.built = "1";
  }
  Object.keys(STATUS_COLORS).forEach((k) => countUp(document.getElementById(`stat-${k}`), data.counts[k] || 0));

  buildNewsStrip(data);
  buildChart(data.applications, currentChartDays);
  buildPerfStatChips(data);
  buildActivityBar(data);
  buildHeatmap(data);
  buildQuickGrid(data);
  buildNotifications(data);

  renderGoalsPage(data.goals);
  renderApplicationsPage(data.applications, data.trends);
  renderMoneyPage(data);

  const c = data.cyntraix;
  document.getElementById("cyntraixList").innerHTML = !c ? '<div class="empty">not set up yet.</div>' : `
    <div class="card glass static"><div class="app-title">${esc2(c.business.name)} — ${esc2(c.business.role)}</div>
      <div class="notes">founded ${esc2(c.business.founded)} · ${esc2(c.business.structure)}</div></div>
    ${c.clients.map((cl) => `
    <div class="card glass" onclick="openNoteModal('${escAttr(cl.name)}', '${escAttr(cl.status)}', '${escAttr(cl.cadence_note || "")}${cl.scope ? " — Scope: " + escAttr(cl.scope) : ""}')">
      <div class="app-head"><div class="app-title">${esc2(cl.name)}</div><span class="badge" style="color:${cl.status === "active" ? "#34d399" : "#6f7a8c"}"><span class="dot ${cl.status === "active" ? "live" : ""}"></span>${esc2(cl.status)}</span></div>
      <div class="notes">${esc2(cl.cadence_note || "")}${cl.scope ? ` — scope: ${esc2(cl.scope)}` : ""}</div>
    </div>`).join("")}
    ${c._meta && c._meta.open_items && c._meta.open_items.length ? `
    <div class="card glass static"><div class="app-title">still needs your input</div><div class="notes">${c._meta.open_items.map(esc2).join("<br/>")}</div></div>` : ""}`;

  const r = data.research;
  document.getElementById("researchList").innerHTML = !r ? '<div class="empty">not set up yet.</div>' : `
    <div class="card glass static"><div class="app-title">${esc2(r.program.degree)}</div>
      <div class="notes">${esc2(r.program.institution)} · ${esc2(r.program.location)} · expected ${esc2(r.program.expected)} · ${esc2(r.program.status)}</div>
      ${r._meta && r._meta.orcid_url ? `<div class="notes" style="margin-top:6px"><a href="${esc2(r._meta.orcid_url)}" target="_blank" rel="noopener" style="color:var(--blue)">${esc2(r._meta.orcid_url)}</a></div>` : ""}
      ${r._meta && r._meta.scholar_url ? `<div class="notes" style="margin-top:4px"><a href="${esc2(r._meta.scholar_url)}" target="_blank" rel="noopener" style="color:var(--blue)">${esc2(r._meta.scholar_url)}</a>${r._meta.scholar_metrics ? ` — ${esc2(r._meta.scholar_metrics.citations)} citations · h-index ${esc2(r._meta.scholar_metrics.h_index)}` : ""}</div>` : ""}</div>
    <div class="card glass static"><div class="app-title">research areas</div><div class="notes">${r.research_areas.map(esc2).join("<br/>")}</div></div>
    ${r.potential_publication_leads && r.potential_publication_leads.length ? `
    <div class="card glass static"><div class="app-title">publication leads</div>
      <div class="notes">${r.potential_publication_leads.map((p) => `<strong style="color:#fff">${esc2(p.venue)}</strong> — ${esc2(p.status)}`).join("<br/><br/>")}</div></div>` : ""}
    ${r.publications && r.publications.source ? `
    <div class="card glass static"><div class="app-title">publications <span style="font-weight:400;color:var(--muted)">— ${esc2(r.publications.source)}</span></div>
      <div class="notes" style="margin-bottom:8px">${esc2(r.publications.note || "")}</div>
      ${["2026", "2025", "2024"].filter((y) => r.publications[y] && r.publications[y].length).map((y) => `
      <div style="margin-top:10px"><strong style="color:#fff">${y}</strong> <span style="color:var(--muted)">(${r.publications[y].length})</span>
        <div class="notes" style="margin-top:4px">${r.publications[y].map(esc2).join("<br/>")}</div></div>`).join("")}
    </div>` : ""}
    ${r._meta && r._meta.open_items && r._meta.open_items.length ? `
    <div class="card glass static"><div class="app-title">still needs your input</div><div class="notes">${r._meta.open_items.map(esc2).join("<br/>")}</div></div>` : ""}`;

  const OWNERSHIP_COLORS = { own_venture: "#34d399", client_work: "#ff8c42", likely_client_or_ministry: "#f5b64c", unconfirmed: "#6f7a8c" };
  const OWNERSHIP_LABELS = { own_venture: "own venture", client_work: "client work", likely_client_or_ministry: "likely client/ministry", unconfirmed: "ownership unconfirmed" };
  const pr = data.projectsRegistry;
  document.getElementById("projectsList").innerHTML = !pr ? '<div class="empty">not set up yet.</div>' : `
    ${pr.projects.map((p, i) => `
    <div class="card glass" style="animation-delay:${i * 25}ms" onclick="openNoteModal('${escAttr(p.name)}', '${escAttr(p.type)} · ${escAttr(OWNERSHIP_LABELS[p.ownership] || p.ownership)}', '${escAttr(p.status)} — ${escAttr(p.note)}')">
      <div class="app-head">
        <div><div class="app-title">${esc2(p.name)}</div><div class="app-role">${esc2(p.type)}</div></div>
        <span class="badge" style="color:${OWNERSHIP_COLORS[p.ownership] || OWNERSHIP_COLORS.unconfirmed}"><span class="dot ${p.status && p.status.includes("active") ? "live" : ""}"></span>${esc2(OWNERSHIP_LABELS[p.ownership] || p.ownership)}</span>
      </div>
      <div class="notes">${esc2(p.status)} — ${esc2(p.note)}</div>
    </div>`).join("")}
    ${pr._meta && pr._meta.open_items && pr._meta.open_items.length ? `
    <div class="card glass static"><div class="app-title">still needs your input</div><div class="notes">${pr._meta.open_items.map(esc2).join("<br/>")}</div></div>` : ""}`;

  renderList("inboxList", data.inbox, (n, i) => `
    <div class="card glass" style="animation-delay:${i * 35}ms" onclick="openFileModal('${escAttr(n.date)}','inbox review','/api/inbox?date=${encodeURIComponent(n.date)}')">
      <div class="app-title">${esc2(n.date)}</div></div>`, "No inbox reviews yet.");

  renderList("newsList", data.news, (n, i) => `
    <div class="card glass" style="animation-delay:${i * 35}ms" onclick="openFileModal('${escAttr(n.date)}','news digest','/api/news?date=${encodeURIComponent(n.date)}')">
      <div class="app-title">${esc2(n.date)}</div></div>`, "No news digests yet.");

  renderList("digestsList", data.digests, (d, i) => `
    <div class="card glass" style="animation-delay:${i * 35}ms" onclick="openFileModal('${escAttr(d.date)}','daily digest','/api/digest?date=${encodeURIComponent(d.date)}')">
      <div class="app-title">${esc2(d.date)}</div></div>`, "No digests yet.");

  const p = data.preferences;
  document.getElementById("preferencesList").innerHTML = !p ? '<div class="card glass static prefs">profile/preferences.json not found.</div>' : `
    <div class="card glass static prefs">
      <strong>max leads/day</strong> ${p.max_new_applications_per_day ?? "—"}<br/>
      <strong>academic</strong> ${p.target_roles?.academic?.pursue ? "pursuing — " + esc2(p.target_roles.academic.criteria || "") : "not pursuing"}<br/>
      <strong>industry</strong> ${p.target_roles?.cybersecurity_industry?.pursue ? "pursuing — " + esc2(p.target_roles.cybersecurity_industry.criteria || "") : "not pursuing"}<br/>
      <strong>work auth</strong> ${esc2(data.workAuth || "not set")}
    </div>`;
}

function escAttr(s) { return esc2(s).replace(/'/g, "&#39;"); }

function renderList(id, items, tpl, emptyMsg) {
  const el = document.getElementById(id);
  el.innerHTML = !items.length ? `<div class="empty">${emptyMsg}</div>` : items.map(tpl).join("");
}

// ================= Goals page: filterable by status =================
let latestGoals = [], goalsFilter = "all";
function renderGoalsPage(goals) {
  latestGoals = goals;
  const statuses = [...new Set(goals.map((g) => g.status))];
  document.getElementById("goalsFilterPills").innerHTML = ["all", ...statuses].map((s) => `
    <button class="filter-pill ${s === goalsFilter ? "on" : ""}" onclick="setGoalsFilter('${s}')">${s === "all" ? "All" : esc2(s)}</button>`).join("");
  const activeCount = goals.filter((g) => g.status === "active").length;
  document.getElementById("goalsTrend").innerHTML = goals.length ? `<strong>${activeCount}</strong> active of <strong>${goals.length}</strong> total` : "";
  const filtered = goalsFilter === "all" ? goals : goals.filter((g) => g.status === goalsFilter);
  renderList("goalsList", filtered, (g, i) => `
    <div class="card glass" style="animation-delay:${i * 35}ms" onclick="openNoteModal('${escAttr(g.title)}', '${escAttr(g.category)} · ${escAttr(g.status)}${g.target_date ? " · target " + escAttr(g.target_date) : ""}', '${escAttr(g.notes || "")}')">
      <div class="app-head">
        <div><span class="goal-cat">${esc2(g.category)}</span><span class="app-title">${esc2(g.title)}</span></div>
        <span class="goal-status ${esc2(g.status)}"><span class="dot ${g.status === "active" ? "live" : ""}"></span>${esc2(g.status)}</span>
      </div>
      <div class="notes">${g.target_date ? `Target: ${esc2(g.target_date)} · ` : ""}${esc2(g.notes || "")}</div>
    </div>`, `No goals with status "${goalsFilter}".`);
}
function setGoalsFilter(s) { goalsFilter = s; renderGoalsPage(latestGoals); }

// ================= Applications page: filterable by status, with trend line =================
let latestApplications = [], applicationsFilter = "all";
function renderApplicationsPage(applications, trends) {
  latestApplications = applications;
  const statuses = [...new Set(applications.map((a) => a.status))];
  document.getElementById("applicationsFilterPills").innerHTML = ["all", ...statuses].map((s) => `
    <button class="filter-pill ${s === applicationsFilter ? "on" : ""}" onclick="setApplicationsFilter('${s}')">${s === "all" ? "All" : esc2(s.replace(/_/g, " "))}</button>`).join("");
  const staged = applications.filter((a) => a.status === "staged").length;
  const stagedTrend = (trends || {}).staged || 0;
  const trendHtml = stagedTrend ? ` (<strong style="color:${stagedTrend > 0 ? "var(--green)" : "var(--muted)"}">${stagedTrend > 0 ? "+" : ""}${stagedTrend} today</strong>)` : "";
  document.getElementById("applicationsTrend").innerHTML = applications.length ? `<strong>${staged}</strong> staged${trendHtml} of <strong>${applications.length}</strong> total` : "";
  const filtered = applicationsFilter === "all" ? applications : applications.filter((a) => a.status === applicationsFilter);
  renderList("applicationsList", filtered, (a, i) => `
    <div class="card glass" style="animation-delay:${i * 35}ms">
      <div class="app-head">
        <div><div class="app-title">${esc2(a.company)}</div><div class="app-role">${esc2(a.role)}</div></div>
        <span class="badge" style="color:${STATUS_COLORS[a.status] || STATUS_COLORS.unknown}"><span class="dot ${a.status === "staged" || a.status === "interview" ? "live" : ""}"></span>${esc2(a.status.replace(/_/g, " "))}</span>
      </div>
      <div class="links">
        ${a.url ? `<a href="${esc2(a.url)}" target="_blank" onclick="event.stopPropagation()">posting ↗</a>` : ""}
        ${a.docs.jobPosting ? `<button onclick="event.stopPropagation();openFileModal('${escAttr(a.company)}','job posting','/api/application-file?folder=${encodeURIComponent(a.folder)}&file=job-posting.md')">job notes</button>` : ""}
        ${a.docs.tailoringNotes ? `<button onclick="event.stopPropagation();openFileModal('${escAttr(a.company)}','tailoring notes','/api/application-file?folder=${encodeURIComponent(a.folder)}&file=tailoring-notes.md')">tailoring notes</button>` : ""}
        ${a.docs.applyLog ? `<button onclick="event.stopPropagation();openFileModal('${escAttr(a.company)}','apply log','/api/application-file?folder=${encodeURIComponent(a.folder)}&file=apply-log.md')">apply log</button>` : ""}
        ${a.docs.resume ? `<a href="${a.docs.resume}" onclick="event.stopPropagation()">résumé ↗</a>` : ""}
        ${a.docs.coverLetter ? `<a href="${a.docs.coverLetter}" onclick="event.stopPropagation()">cover letter ↗</a>` : ""}
      </div>
      <div class="notes">found ${esc2(a.found_at)} via ${esc2(a.discovered_via)}${a.applied_at ? ` · applied ${esc2(a.applied_at)}` : ""}${a.notes ? ` — ${esc2(a.notes)}` : ""}</div>
    </div>`, `No applications with status "${applicationsFilter}".`);
}
function setApplicationsFilter(s) { applicationsFilter = s; renderApplicationsPage(latestApplications, latestData ? latestData.trends : {}); }

// ================= Money page: accounts, recurring payments, one-off transactions =================
function money(n) { return `$${Number(n).toFixed(2)}`; }
function renderMoneyPage(data) {
  const f = data.finances;
  const dueSoon = data.paymentsDueSoon || [];
  document.getElementById("moneyTrend").innerHTML = !f ? "" :
    `<strong>${f.accounts.length}</strong> account${f.accounts.length === 1 ? "" : "s"} tracked · <strong>${(f.recurring_payments || []).length}</strong> recurring payment${(f.recurring_payments || []).length === 1 ? "" : "s"} on file`;

  renderList("moneyDueList", dueSoon, (p, i) => {
    const overdue = p.daysLeft < 0;
    const dayLabel = overdue ? `${Math.abs(p.daysLeft)} day${Math.abs(p.daysLeft) === 1 ? "" : "s"} overdue` : p.daysLeft === 0 ? "due today" : `due in ${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"}`;
    return `
    <div class="card glass" style="animation-delay:${i * 35}ms">
      <div class="app-head">
        <div><div class="app-title">${esc2(p.institution)}${p.last4 ? ` <span style="color:var(--muted);font-weight:400">···${esc2(p.last4)}</span>` : ""}</div></div>
        <span class="money-figure ${overdue ? "money-due-soon" : ""}">${money(p.amount)}</span>
      </div>
      <div class="notes">${esc2(dayLabel)} — ${esc2(p.due)}</div>
    </div>`;
  }, "Nothing due in the next two weeks.");

  if (!f) {
    ["moneyAccountsList", "moneyRecurringList", "moneyOneOffList"].forEach((id) => {
      document.getElementById(id).innerHTML = '<div class="empty">profile/finances.json not found.</div>';
    });
    return;
  }

  renderList("moneyAccountsList", f.accounts, (a, i) => {
    const stmt = a.latest_statement;
    return `
    <div class="card glass" style="animation-delay:${i * 35}ms">
      <div class="app-head">
        <div><div class="app-title">${esc2(a.institution)}${a.last4 ? ` <span style="color:var(--muted);font-weight:400">···${esc2(a.last4)}</span>` : ""}</div><div class="app-role">${esc2((a.type || "").replace(/_/g, " "))} · ${esc2(a.owner_account || "")}</div></div>
        ${stmt ? `<span class="money-figure">${money(stmt.balance)}</span>` : ""}
      </div>
      <div class="notes">${stmt ? `min payment ${money(stmt.minimum_payment)}${stmt.minimum_payment_due ? ` due ${esc2(stmt.minimum_payment_due)}` : ""} — ` : ""}${esc2(a.note || "")}</div>
    </div>`;
  }, "No accounts on file yet.");

  renderList("moneyRecurringList", f.recurring_payments || [], (r, i) => `
    <div class="card glass" style="animation-delay:${i * 35}ms">
      <div class="app-head">
        <div><div class="app-title">${esc2(r.payee)}</div><div class="app-role">${esc2(r.category || "")} · ${esc2(r.method || "")}</div></div>
        ${r.amount ? `<span class="money-figure">${money(r.amount)}</span>` : ""}
      </div>
      <div class="notes">${esc2(r.cadence || "")}${r.note ? ` — ${esc2(r.note)}` : ""}</div>
    </div>`, "No recurring payments on file yet.");

  renderList("moneyOneOffList", f.one_off_transactions_seen || [], (t, i) => `
    <div class="card glass" style="animation-delay:${i * 35}ms">
      <div class="app-head">
        <div><div class="app-title">${esc2(t.payee)}</div><div class="app-role">${esc2(t.category || "")} · ${esc2(t.method || "")}</div></div>
        <span class="money-figure">${money(t.amount)}</span>
      </div>
      <div class="notes">${esc2(t.date || "")}${t.account ? ` · ${esc2(t.account)}` : ""}</div>
    </div>`, "No one-off transactions on file yet.");
}

// ================= Home quick-grid: entry points, not the full dump =================
let latestQuickCards = [];
function buildQuickGrid(data) {
  const staged = data.applications.filter((a) => a.status === "staged").length;
  const activeGoals = data.goals.filter((g) => g.status === "active").length;
  latestQuickCards = [
    { page: "goals", icon: "i-goal", count: data.goals.length, title: "goals", note: `${activeGoals} active`, cat: "career" },
    { page: "applications", icon: "i-brief", count: data.applications.length, title: "job search", note: `${staged} staged for review`, cat: "career" },
    { page: "money", icon: "i-money", count: data.finances ? data.finances.accounts.length : 0, title: "money", note: data.paymentsDueSoon && data.paymentsDueSoon.length ? `${data.paymentsDueSoon.length} payment${data.paymentsDueSoon.length === 1 ? "" : "s"} due soon` : "accounts tracked", cat: "money" },
    { page: "cyntraix", icon: "i-biz", count: data.cyntraix ? data.cyntraix.clients.length : 0, title: "cyntraix", note: "active clients", cat: "business" },
    { page: "projects", icon: "i-folder", count: data.projectsRegistry ? data.projectsRegistry.projects.length : 0, title: "projects", note: "tracked ventures", cat: "business" },
    { page: "research", icon: "i-grad", count: data.research ? data.research.research_areas.length : 0, title: "research", note: "areas tracked", cat: "academic" },
    { page: "news", icon: "i-news", count: data.news.length, title: "news", note: "digests on file", cat: "academic" },
    { page: "inbox", icon: "i-mail", count: data.inbox.length, title: "inbox", note: "reviews on file", cat: "ops" },
  ];
  renderQuickGrid(currentQuickFilter);
}
const CAT_COLORS = { career: "#5b8cff", business: "#9b8cff", academic: "#ffab5c", ops: "#34d399", money: "#5ce1e6" };
function renderQuickGrid(cat) {
  let cards = cat === "all" ? latestQuickCards : latestQuickCards.filter((c) => c.cat === cat);
  if (moduleSearchTerm) cards = cards.filter((c) => c.title.toLowerCase().includes(moduleSearchTerm) || c.note.toLowerCase().includes(moduleSearchTerm));
  if (!cards.length) { document.getElementById("quickGrid").innerHTML = `<div class="empty">no modules match "${esc2(moduleSearchTerm)}"</div>`; return; }
  document.getElementById("quickGrid").innerHTML = cards.map((c, i) => {
    const hex = CAT_COLORS[c.cat] || CAT_COLORS.career;
    return `
    <div class="quick-card glass" style="animation-delay:${i * 40}ms" onclick="switchPage('${c.page}')">
      <div class="qc-top"><div class="qc-icon" style="background:${hex}22;color:${hex}"><svg width="18" height="18"><use href="#${c.icon}"/></svg></div><div class="qc-count">${c.count}</div></div>
      <div class="qc-title">${c.title}</div>
      <div class="qc-note">${esc2(c.note)}</div>
      <div class="qc-go">view all <svg width="12" height="12" viewBox="0 0 24 24"><use href="#i-arrow"/></svg></div>
    </div>`;
  }).join("");
}
let currentQuickFilter = "all";
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("filterPills").querySelectorAll(".filter-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentQuickFilter = btn.dataset.cat;
      document.querySelectorAll(".filter-pill").forEach((b) => b.classList.toggle("on", b === btn));
      renderQuickGrid(currentQuickFilter);
    });
  });
});

load(false);
