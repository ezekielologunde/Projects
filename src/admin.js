const STORAGE_KEY = "prepdash-admin-state-v1";

const seedState = {
  settings: {
    platformFee: 8,
    deliveryRadius: 12,
    autoPayouts: true,
    orderPause: false,
  },
  preppers: [
    {
      id: "prep-001",
      name: "Chef Dre",
      area: "Oak Cliff",
      rank: "Elite Chef",
      status: "pending",
      score: 94,
      docs: ["Food Handler", "Kitchen Photos", "Bank Connected"],
      revenue: 6240,
      rating: 4.9,
      flags: 0,
    },
    {
      id: "prep-002",
      name: "Auntie Mo's Bowls",
      area: "Plano",
      rank: "Local Favorite",
      status: "verified",
      score: 88,
      docs: ["Food Handler", "Insurance", "Bank Connected"],
      revenue: 3810,
      rating: 4.8,
      flags: 1,
    },
    {
      id: "prep-003",
      name: "Macro Mike",
      area: "Arlington",
      rank: "Trusted Prepper",
      status: "needs-review",
      score: 73,
      docs: ["Food Handler"],
      revenue: 1980,
      rating: 4.5,
      flags: 3,
    },
  ],
  orders: [
    {
      id: "ORD-1042",
      meal: "Cajun Alfredo Bowls",
      customer: "Nia Carter",
      prepper: "Chef Dre",
      status: "preparing",
      type: "delivery",
      total: 48.75,
      eta: "6:25 PM",
      risk: "low",
    },
    {
      id: "ORD-1041",
      meal: "High Protein Breakfast Stack",
      customer: "Luis Green",
      prepper: "Macro Mike",
      status: "pending",
      type: "pickup",
      total: 31.5,
      eta: "5:40 PM",
      risk: "medium",
    },
    {
      id: "ORD-1040",
      meal: "Caribbean Sunday Plates",
      customer: "Amara Wilson",
      prepper: "Auntie Mo's Bowls",
      status: "ready",
      type: "delivery",
      total: 62,
      eta: "Now",
      risk: "low",
    },
  ],
  moderation: [
    {
      id: "MOD-221",
      type: "Meal photo",
      subject: "Late Night Sushi Drop",
      owner: "Chef Dre",
      reason: "Needs freshness/date label",
      severity: "medium",
      status: "open",
    },
    {
      id: "MOD-222",
      type: "Review",
      subject: "1-star review",
      owner: "Macro Mike",
      reason: "Prepper reports abusive language",
      severity: "high",
      status: "open",
    },
    {
      id: "MOD-223",
      type: "Live clip",
      subject: "Kitchen tour",
      owner: "Auntie Mo's Bowls",
      reason: "Verify visible prep area",
      severity: "low",
      status: "open",
    },
  ],
  payouts: [
    { id: "PAY-780", prepper: "Chef Dre", amount: 1184.42, status: "ready", method: "Stripe Express" },
    { id: "PAY-781", prepper: "Auntie Mo's Bowls", amount: 642.1, status: "scheduled", method: "Bank ACH" },
    { id: "PAY-782", prepper: "Macro Mike", amount: 219.7, status: "held", method: "Stripe Express" },
  ],
  auditLog: [
    "System booted Admin Console",
    "Payment review queue synced",
    "Delivery SLA monitor started",
  ],
};

const navItems = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "preppers", label: "Preppers", icon: "shield" },
  { id: "orders", label: "Orders", icon: "receipt" },
  { id: "moderation", label: "Moderation", icon: "eye" },
  { id: "payments", label: "Payments", icon: "wallet" },
  { id: "settings", label: "Settings", icon: "sliders" },
];

const statusFlow = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "completed"];
let activeView = "overview";
let state = loadState();
let searchTerm = "";

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(seedState);
  } catch {
    return structuredClone(seedState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function icon(name) {
  const paths = {
    grid: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 4-2V2z"/><path d="M8 7h8M8 12h8M8 17h5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    wallet: '<path d="M3 7h18v13H3z"/><path d="M16 12h5v4h-5z"/><path d="M3 7V5a2 2 0 0 1 2-2h13v4"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M2 14h4M10 8h4M18 16h4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    truck: '<path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
}

function addAudit(message) {
  const stamp = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  state.auditLog.unshift(`${stamp} - ${message}`);
  state.auditLog = state.auditLog.slice(0, 8);
  saveState();
}

function setPrepperStatus(id, status) {
  const prepper = state.preppers.find((item) => item.id === id);
  if (!prepper) return;
  prepper.status = status;
  addAudit(`${prepper.name} marked ${status.replace("-", " ")}`);
  render();
}

function advanceOrder(id) {
  const order = state.orders.find((item) => item.id === id);
  if (!order) return;
  const next = statusFlow[Math.min(statusFlow.indexOf(order.status) + 1, statusFlow.length - 1)];
  order.status = next;
  addAudit(`${order.id} advanced to ${next.replaceAll("_", " ")}`);
  render();
}

function resolveCase(id, verdict) {
  const item = state.moderation.find((caseItem) => caseItem.id === id);
  if (!item) return;
  item.status = verdict;
  addAudit(`${item.id} ${verdict}: ${item.subject}`);
  render();
}

function updateSetting(key, value) {
  state.settings[key] = value;
  addAudit(`Setting updated: ${key}`);
  render();
}

function resetDemo() {
  state = structuredClone(seedState);
  saveState();
  render();
}

function applySearch() {
  const term = searchTerm.trim().toLowerCase();
  document.querySelectorAll(".admin-record").forEach((record) => {
    record.hidden = term.length > 0 && !record.textContent.toLowerCase().includes(term);
  });
}

function statCards() {
  const activeOrders = state.orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length;
  const pendingPreppers = state.preppers.filter((prepper) => prepper.status !== "verified").length;
  const heldPayouts = state.payouts.filter((payout) => payout.status === "held").length;
  const grossRevenue = state.orders.reduce((sum, order) => sum + order.total, 0) + state.preppers.reduce((sum, prepper) => sum + prepper.revenue, 0);
  const cards = [
    { label: "Gross volume", value: money(grossRevenue), hint: "+18% this month", tone: "success" },
    { label: "Active orders", value: activeOrders, hint: "2 delivery checks", tone: "primary" },
    { label: "Prepper reviews", value: pendingPreppers, hint: "verification queue", tone: "warning" },
    { label: "Payout holds", value: heldPayouts, hint: "risk review needed", tone: "danger" },
  ];
  return cards
    .map(
      (card) => `
        <article class="stat-card ${card.tone}">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
          <small>${card.hint}</small>
        </article>
      `,
    )
    .join("");
}

function overviewView() {
  const topPrepper = [...state.preppers].sort((a, b) => b.revenue - a.revenue)[0];
  const riskOrders = state.orders.filter((order) => order.risk !== "low").length;
  return `
    <section class="page-grid overview-grid">
      <div class="stat-grid">${statCards()}</div>
      <article class="panel spotlight">
        <div>
          <p class="eyebrow">Control room</p>
          <h2>Live food-commerce operations</h2>
          <p>Monitor trust, payments, delivery flow, and creator performance from one admin surface.</p>
        </div>
        <div class="spotlight-stack">
          <span>${icon("bell")} ${riskOrders} risk signals</span>
          <span>${icon("truck")} ${state.settings.deliveryRadius} mile delivery radius</span>
          <span>${icon("check")} ${topPrepper.name} leads revenue</span>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Verification</p>
            <h3>Prepper queue</h3>
          </div>
          <button class="ghost" data-view="preppers">Review all</button>
        </div>
        ${state.preppers
          .filter((prepper) => prepper.status !== "verified")
          .map(prepperRow)
          .join("")}
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Ops timeline</p>
            <h3>Audit log</h3>
          </div>
        </div>
        <ol class="audit-list">${state.auditLog.map((item) => `<li>${item}</li>`).join("")}</ol>
      </article>
    </section>
  `;
}

function prepperRow(prepper) {
  return `
    <div class="row-card">
      <div class="avatar">${prepper.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
      <div class="row-main">
        <strong>${prepper.name}</strong>
        <span>${prepper.area} - ${prepper.rank} - ${prepper.rating.toFixed(1)} rating</span>
        <div class="chip-wrap">${prepper.docs.map((doc) => `<span class="chip">${doc}</span>`).join("")}</div>
      </div>
      <div class="row-meta">
        <span class="status ${prepper.status}">${prepper.status.replace("-", " ")}</span>
        <small>Trust ${prepper.score}</small>
      </div>
    </div>
  `;
}

function preppersView() {
  return `
    <section class="page-grid">
      <article class="panel wide">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Trust and safety</p>
            <h3>Prepper verification</h3>
          </div>
          <button class="primary" data-action="reset-demo">Reset demo data</button>
        </div>
        <div class="table-list">
          ${state.preppers
            .map(
              (prepper) => `
                <div class="admin-record">
                  ${prepperRow(prepper)}
                  <div class="action-bar">
                    <button data-prepper="${prepper.id}" data-status="verified">${icon("check")} Verify</button>
                    <button data-prepper="${prepper.id}" data-status="needs-review">${icon("alert")} Needs review</button>
                    <button data-prepper="${prepper.id}" data-status="suspended">Suspend</button>
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function orderRow(order) {
  return `
    <div class="admin-record">
      <div class="row-card">
        <div class="avatar order">${order.id.slice(-2)}</div>
        <div class="row-main">
          <strong>${order.meal}</strong>
          <span>${order.customer} -> ${order.prepper} - ${order.type} - ETA ${order.eta}</span>
          <div class="progress-track">
            ${statusFlow
              .slice(0, order.type === "pickup" ? 4 : 6)
              .map((step) => `<span class="${statusFlow.indexOf(step) <= statusFlow.indexOf(order.status) ? "done" : ""}"></span>`)
              .join("")}
          </div>
        </div>
        <div class="row-meta">
          <span class="status ${order.status}">${order.status.replaceAll("_", " ")}</span>
          <small>${money(order.total)}</small>
        </div>
      </div>
      <div class="action-bar">
        <button data-order="${order.id}">Advance status</button>
        <button class="soft">Message prepper</button>
        <button class="soft">Refund review</button>
      </div>
    </div>
  `;
}

function ordersView() {
  return `
    <section class="page-grid">
      <article class="panel wide">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Fulfillment</p>
            <h3>Orders and delivery control</h3>
          </div>
          <span class="live-pill">Live monitor on</span>
        </div>
        <div class="table-list">${state.orders.map(orderRow).join("")}</div>
      </article>
    </section>
  `;
}

function moderationView() {
  return `
    <section class="page-grid">
      <article class="panel wide">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Marketplace health</p>
            <h3>Content moderation</h3>
          </div>
        </div>
        <div class="table-list">
          ${state.moderation
            .map(
              (item) => `
                <div class="admin-record">
                  <div class="row-card">
                    <div class="avatar mod">${item.type[0]}</div>
                    <div class="row-main">
                      <strong>${item.subject}</strong>
                      <span>${item.type} by ${item.owner}</span>
                      <p>${item.reason}</p>
                    </div>
                    <div class="row-meta">
                      <span class="status ${item.severity}">${item.severity}</span>
                      <small>${item.status}</small>
                    </div>
                  </div>
                  <div class="action-bar">
                    <button data-case="${item.id}" data-verdict="approved">Approve</button>
                    <button data-case="${item.id}" data-verdict="limited">Limit reach</button>
                    <button data-case="${item.id}" data-verdict="removed">Remove</button>
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function paymentsView() {
  return `
    <section class="page-grid">
      <article class="panel">
        <p class="eyebrow">Payment stack</p>
        <h3>Provider workflow</h3>
        <div class="provider-grid">
          <span>Stripe cards</span>
          <span>Apple Pay</span>
          <span>Google Pay</span>
          <span>Venmo</span>
          <span>Zelle</span>
          <span>Cash pickup</span>
        </div>
      </article>
      <article class="panel">
        <p class="eyebrow">Payouts</p>
        <h3>Creator balances</h3>
        <div class="table-list">
          ${state.payouts
            .map(
              (payout) => `
                <div class="mini-row">
                  <div>
                    <strong>${payout.prepper}</strong>
                    <span>${payout.method}</span>
                  </div>
                  <div>
                    <strong>${money(payout.amount)}</strong>
                    <span class="status ${payout.status}">${payout.status}</span>
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function settingsView() {
  return `
    <section class="page-grid">
      <article class="panel wide settings-panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Platform controls</p>
            <h3>Admin settings</h3>
          </div>
        </div>
        <label>
          <span>Platform fee</span>
          <input type="range" min="0" max="20" value="${state.settings.platformFee}" data-setting="platformFee" />
          <strong>${state.settings.platformFee}%</strong>
        </label>
        <label>
          <span>Default delivery radius</span>
          <input type="range" min="1" max="30" value="${state.settings.deliveryRadius}" data-setting="deliveryRadius" />
          <strong>${state.settings.deliveryRadius} mi</strong>
        </label>
        <div class="toggle-row">
          <span>Automatic weekly payouts</span>
          <button class="${state.settings.autoPayouts ? "toggle on" : "toggle"}" data-toggle="autoPayouts">${state.settings.autoPayouts ? "On" : "Off"}</button>
        </div>
        <div class="toggle-row">
          <span>Emergency order pause</span>
          <button class="${state.settings.orderPause ? "toggle danger on" : "toggle danger"}" data-toggle="orderPause">${state.settings.orderPause ? "Paused" : "Active"}</button>
        </div>
      </article>
    </section>
  `;
}

function currentView() {
  const views = {
    overview: overviewView,
    preppers: preppersView,
    orders: ordersView,
    moderation: moderationView,
    payments: paymentsView,
    settings: settingsView,
  };
  return views[activeView]();
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <span>PD</span>
        <div>
          <strong>PrepDash</strong>
          <small>Admin Console</small>
        </div>
      </div>
      <nav>
        ${navItems
          .map(
            (item) => `
              <button class="${activeView === item.id ? "active" : ""}" data-view="${item.id}">
                ${icon(item.icon)}
                <span>${item.label}</span>
              </button>
            `,
          )
          .join("")}
      </nav>
    </aside>
    <main>
      <header class="topbar">
        <div>
          <p class="eyebrow">Creator marketplace operations</p>
          <h1>${navItems.find((item) => item.id === activeView).label}</h1>
        </div>
        <div class="admin-search">
          <input type="search" value="${escapeAttribute(searchTerm)}" data-global-search placeholder="Search orders, preppers, cases" />
          <button class="primary">${icon("bell")} Alerts</button>
        </div>
      </header>
      ${currentView()}
    </main>
  `;
  applySearch();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.dataset.view) {
    activeView = target.dataset.view;
    render();
  }

  if (target.dataset.prepper) {
    setPrepperStatus(target.dataset.prepper, target.dataset.status);
  }

  if (target.dataset.order) {
    advanceOrder(target.dataset.order);
  }

  if (target.dataset.case) {
    resolveCase(target.dataset.case, target.dataset.verdict);
  }

  if (target.dataset.toggle) {
    updateSetting(target.dataset.toggle, !state.settings[target.dataset.toggle]);
  }

  if (target.dataset.action === "reset-demo") {
    resetDemo();
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("[data-global-search]")) {
    searchTerm = target.value;
    applySearch();
    return;
  }

  if (target.matches("[data-setting]")) {
    updateSetting(target.dataset.setting, Number(target.value));
  }
});

render();
