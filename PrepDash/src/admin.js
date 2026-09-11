const STORAGE_KEY = "prepdash-admin-state-v1";

const seedState = {
  settings: {
    platformFee: 8,
    deliveryRadius: 12,
    autoPayouts: true,
    orderPause: false,
  },
  userProfile: {
    name: "Demo Customer",
    area: "Dallas, TX",
    primaryRole: "buyer",
    onboarded: false,
    dietaryPrefs: ["High protein", "Comfort", "No peanuts"],
    defaultMethod: "delivery",
    rewards: 420,
  },
  users: [
    { id: "usr-001", name: "Nia Carter", role: "buyer", area: "Dallas", orders: 12, status: "active" },
    { id: "usr-002", name: "Luis Green", role: "buyer", area: "Arlington", orders: 7, status: "active" },
    { id: "usr-003", name: "Chef Dre", role: "prepper", area: "Oak Cliff", orders: 128, status: "verified" },
    { id: "usr-004", name: "Auntie Mo", role: "prepper", area: "Plano", orders: 91, status: "verified" },
    { id: "usr-005", name: "Macro Mike", role: "prepper", area: "Arlington", orders: 54, status: "review" },
  ],
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
  meals: [
    {
      id: "meal-001",
      title: "Cajun Alfredo Bowls",
      prepper: "Chef Dre",
      area: "Oak Cliff",
      price: 16.25,
      image: "linear-gradient(135deg, #ff8a50, #6b2f1a)",
      tags: ["High protein", "Limited drop", "Dinner"],
      rating: 4.9,
      remaining: 8,
      available: true,
      sold: 128,
      prepTime: 35,
      delivery: true,
    },
    {
      id: "meal-002",
      title: "Caribbean Sunday Plates",
      prepper: "Auntie Mo's Bowls",
      area: "Plano",
      price: 18.5,
      image: "linear-gradient(135deg, #1f8a70, #ffd166)",
      tags: ["Comfort", "Pickup", "Family"],
      rating: 4.8,
      remaining: 14,
      available: true,
      sold: 91,
      prepTime: 45,
      delivery: true,
    },
    {
      id: "meal-003",
      title: "High Protein Breakfast Stack",
      prepper: "Macro Mike",
      area: "Arlington",
      price: 12.75,
      image: "linear-gradient(135deg, #315c99, #b7d7ff)",
      tags: ["Macros", "Breakfast", "Fitness"],
      rating: 4.5,
      remaining: 6,
      available: true,
      sold: 54,
      prepTime: 20,
      delivery: false,
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
  conversations: [
    {
      id: "chat-001",
      orderId: "ORD-1042",
      customer: "Nia Carter",
      prepper: "Chef Dre",
      meal: "Cajun Alfredo Bowls",
      unread: 2,
      messages: [
        { from: "customer", text: "Can you make one bowl extra spicy?", time: "6:02 PM" },
        { from: "prepper", text: "Absolutely. I will mark yours extra spicy.", time: "6:04 PM" },
        { from: "customer", text: "Perfect, thank you.", time: "6:05 PM" },
      ],
    },
    {
      id: "chat-002",
      orderId: "ORD-1041",
      customer: "Luis Green",
      prepper: "Macro Mike",
      meal: "High Protein Breakfast Stack",
      unread: 0,
      messages: [
        { from: "prepper", text: "Pickup window is 5:40 to 6:00 PM.", time: "5:10 PM" },
        { from: "customer", text: "Got it. I will be there around 5:45.", time: "5:12 PM" },
      ],
    },
  ],
  reviews: [
    { id: "rev-001", meal: "Cajun Alfredo Bowls", prepper: "Chef Dre", reviewer: "Nia Carter", rating: 5, text: "Fresh, hot, and the spice level was perfect." },
    { id: "rev-002", meal: "Caribbean Sunday Plates", prepper: "Auntie Mo's Bowls", reviewer: "Amara Wilson", rating: 5, text: "Tasted like a real Sunday plate. Portions were generous." },
    { id: "rev-003", meal: "High Protein Breakfast Stack", prepper: "Macro Mike", reviewer: "Luis Green", rating: 4, text: "Great macros and easy pickup." },
  ],
  creatorPosts: [
    { id: "post-001", creator: "Chef Dre", title: "Sauce pour preview", views: 1840, orders: 26, status: "boosted" },
    { id: "post-002", creator: "Auntie Mo's Bowls", title: "Sunday plate packing", views: 1322, orders: 18, status: "approved" },
    { id: "post-003", creator: "Macro Mike", title: "Breakfast macros explained", views: 760, orders: 9, status: "needs edit" },
  ],
  subscriptions: [
    { id: "sub-001", customer: "Nia Carter", prepper: "Chef Dre", plan: "Weekly dinner bowls", amount: 64 },
    { id: "sub-002", customer: "Luis Green", prepper: "Macro Mike", plan: "Fitness breakfast prep", amount: 51 },
  ],
  cart: [],
};

const navItems = [
  { id: "onboarding", label: "Onboarding", icon: "spark" },
  { id: "marketplace", label: "Marketplace", icon: "store" },
  { id: "liveFeed", label: "Live Feed", icon: "video" },
  { id: "checkout", label: "Checkout", icon: "bag" },
  { id: "prepperHub", label: "Prepper Hub", icon: "chef" },
  { id: "prepperSetup", label: "Prepper Setup", icon: "user" },
  { id: "messages", label: "Messages", icon: "message" },
  { id: "creatorAdmin", label: "Creator Admin", icon: "chart" },
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "preppers", label: "Preppers", icon: "shield" },
  { id: "orders", label: "Orders", icon: "receipt" },
  { id: "moderation", label: "Moderation", icon: "eye" },
  { id: "payments", label: "Payments", icon: "wallet" },
  { id: "settings", label: "Settings", icon: "sliders" },
];

const mobileNavItems = [
  { id: "marketplace", label: "Home", icon: "store" },
  { id: "liveFeed", label: "Feed", icon: "video" },
  { id: "checkout", label: "Cart", icon: "bag" },
  { id: "userOrders", label: "Orders", icon: "receipt" },
  { id: "messages", label: "Chat", icon: "message" },
  { id: "userProfile", label: "Me", icon: "user" },
];

const statusFlow = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "completed"];
let activeView = "onboarding";
let state = loadState();
let searchTerm = "";
let activeConversationId = "chat-001";
let selectedMealId = "meal-001";
let onboardingDraft = { role: "buyer", prefs: ["High protein"], services: ["pickup", "delivery"] };

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeState(JSON.parse(saved)) : structuredClone(seedState);
  } catch {
    return structuredClone(seedState);
  }
}

function normalizeState(saved) {
  const meals = (saved.meals || structuredClone(seedState.meals)).map((meal) => ({
    available: true,
    sold: 0,
    prepTime: 30,
    ...meal,
  }));

  return {
    ...structuredClone(seedState),
    ...saved,
    settings: { ...seedState.settings, ...(saved.settings || {}) },
    userProfile: { ...seedState.userProfile, ...(saved.userProfile || {}) },
    users: saved.users || structuredClone(seedState.users),
    preppers: saved.preppers || structuredClone(seedState.preppers),
    meals,
    orders: saved.orders || structuredClone(seedState.orders),
    moderation: saved.moderation || structuredClone(seedState.moderation),
    payouts: saved.payouts || structuredClone(seedState.payouts),
    auditLog: saved.auditLog || structuredClone(seedState.auditLog),
    conversations: saved.conversations || structuredClone(seedState.conversations),
    reviews: saved.reviews || structuredClone(seedState.reviews),
    creatorPosts: saved.creatorPosts || structuredClone(seedState.creatorPosts),
    subscriptions: saved.subscriptions || structuredClone(seedState.subscriptions),
    cart: saved.cart || [],
  };
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
    store: '<path d="M4 10h16l-1-6H5z"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/><path d="M4 10c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2"/>',
    video: '<path d="M4 6h11v12H4z"/><path d="m15 10 5-3v10l-5-3z"/>',
    bag: '<path d="M6 8h12l-1 13H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
    chef: '<path d="M6 13.9A4.5 4.5 0 1 1 8.4 6a4 4 0 0 1 7.2 0A4.5 4.5 0 1 1 18 13.9V21H6z"/><path d="M6 17h12"/>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-3"/>',
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

function setOnboardingRole(role) {
  onboardingDraft.role = role;
  render();
}

function toggleDraftValue(group, value) {
  const list = onboardingDraft[group] || [];
  onboardingDraft[group] = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  render();
}

function completeOnboarding() {
  state.userProfile.onboarded = true;
  state.userProfile.primaryRole = onboardingDraft.role;
  state.userProfile.dietaryPrefs = onboardingDraft.prefs.length ? onboardingDraft.prefs : state.userProfile.dietaryPrefs;
  addAudit(`${state.userProfile.name} completed ${onboardingDraft.role} onboarding`);
  activeView = onboardingDraft.role === "prepper" || onboardingDraft.role === "both" ? "prepperSetup" : "marketplace";
  saveState();
  render();
}

function savePrepperSetup() {
  const name = document.querySelector("[data-prepper-name]")?.value.trim() || "New Prepper Kitchen";
  const area = document.querySelector("[data-prepper-area]")?.value.trim() || state.userProfile.area;
  const bio = document.querySelector("[data-prepper-bio]")?.value.trim() || "Fresh local meals made with care.";
  const existing = state.preppers.find((prepper) => prepper.name === name);
  if (existing) {
    existing.area = area;
    existing.status = "pending";
    existing.docs = ["Food Handler Pending", "Kitchen Photos Pending"];
  } else {
    state.preppers.unshift({
      id: `prep-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      area,
      rank: "Rising Prepper",
      status: "pending",
      score: 62,
      docs: ["Food Handler Pending", "Kitchen Photos Pending", bio],
      revenue: 0,
      rating: 0,
      flags: 0,
    });
  }
  state.users.unshift({ id: `usr-${Math.floor(1000 + Math.random() * 9000)}`, name, role: "prepper", area, orders: 0, status: "pending" });
  addAudit(`${name} submitted prepper onboarding`);
  activeView = "prepperHub";
  saveState();
  render();
}

function addToCart(mealId) {
  const meal = state.meals.find((item) => item.id === mealId);
  if (!meal || meal.remaining <= 0) return;
  const cartItem = state.cart.find((item) => item.mealId === mealId);
  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    state.cart.push({ mealId, quantity: 1, method: meal.delivery ? "delivery" : "pickup" });
  }
  addAudit(`${meal.title} added to customer cart`);
  activeView = "checkout";
  render();
}

function openMeal(mealId) {
  const meal = state.meals.find((item) => item.id === mealId);
  if (!meal) return;
  selectedMealId = mealId;
  activeView = "mealDetail";
  render();
}

function removeFromCart(mealId) {
  state.cart = state.cart.filter((item) => item.mealId !== mealId);
  saveState();
  render();
}

function placeCartOrder() {
  if (state.cart.length === 0) return;
  state.cart.forEach((cartItem) => {
    const meal = state.meals.find((item) => item.id === cartItem.mealId);
    if (!meal) return;
    const subtotal = meal.price * cartItem.quantity;
    const fee = Number((subtotal * (state.settings.platformFee / 100)).toFixed(2));
    const deliveryFee = cartItem.method === "delivery" ? 4.99 : 0;
    meal.remaining = Math.max(0, meal.remaining - cartItem.quantity);
    meal.sold += cartItem.quantity;
    const orderId = `ORD-${Math.floor(1100 + Math.random() * 8000)}`;
    state.orders.unshift({
      id: orderId,
      meal: meal.title,
      customer: "Demo Customer",
      prepper: meal.prepper,
      status: "pending",
      type: cartItem.method,
      total: Number((subtotal + fee + deliveryFee).toFixed(2)),
      eta: cartItem.method === "delivery" ? "45 min" : "30 min",
      risk: "low",
    });
    state.conversations.unshift({
      id: `chat-${orderId}`,
      orderId,
      customer: "Demo Customer",
      prepper: meal.prepper,
      meal: meal.title,
      unread: 1,
      messages: [
        {
          from: "customer",
          text: cartItem.method === "delivery" ? "Order placed. Please message me when it heads out." : "Order placed. Please message me when pickup is ready.",
          time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        },
      ],
    });
  });
  state.cart = [];
  addAudit("Customer checkout created new pending order");
  activeView = "orders";
  saveState();
  render();
}

function toggleMealAvailability(mealId) {
  const meal = state.meals.find((item) => item.id === mealId);
  if (!meal) return;
  meal.available = !meal.available;
  if (!meal.available) {
    meal.remaining = 0;
  } else if (meal.remaining === 0) {
    meal.remaining = 10;
  }
  addAudit(`${meal.title} marked ${meal.available ? "available" : "paused"}`);
  render();
}

function createMealDrop() {
  const id = `meal-${Math.floor(100 + Math.random() * 900)}`;
  state.meals.unshift({
    id,
    title: "Sunday Smokehouse Drop",
    prepper: "Chef Dre",
    area: "Oak Cliff",
    price: 19.5,
    image: "linear-gradient(135deg, #1f1d1a, #ff5722)",
    tags: ["Meal drop", "Dinner", "Limited"],
    rating: 4.9,
    remaining: 20,
    available: true,
    sold: 0,
    prepTime: 55,
    delivery: true,
  });
  addAudit("Chef Dre created Sunday Smokehouse Drop");
  render();
}

function openConversation(conversationId) {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return;
  activeConversationId = conversationId;
  conversation.unread = 0;
  saveState();
  render();
}

function sendMessage() {
  const input = document.querySelector("[data-message-input]");
  const text = input?.value.trim();
  if (!text) return;
  const conversation = state.conversations.find((item) => item.id === activeConversationId);
  if (!conversation) return;
  conversation.messages.push({
    from: "prepper",
    text,
    time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
  });
  addAudit(`Message sent in ${conversation.orderId}`);
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

function onboardingView() {
  const prefs = ["High protein", "Vegan", "Keto", "Comfort", "Family meals", "No peanuts", "Halal", "Low sodium"];
  const services = ["pickup", "delivery", "cook at home", "subscriptions", "meal drops"];
  return `
    <section class="onboarding-shell">
      <article class="onboarding-card">
        <p class="eyebrow">Welcome to PrepDash</p>
        <h2>Choose how you want to use the local food marketplace.</h2>
        <p>Buy from home preppers, sell as a creator kitchen, or do both from one account.</p>
        <div class="role-grid">
          ${[
            ["buyer", "Buyer", "Order local meals, join drops, chat with preppers."],
            ["prepper", "Prepper", "Sell meals, manage orders, build a creator food brand."],
            ["both", "Both", "Buy meals and launch your own kitchen profile."],
          ]
            .map(
              ([role, title, text]) => `
                <button class="${onboardingDraft.role === role ? "role-card active" : "role-card"}" data-onboarding-role="${role}">
                  <strong>${title}</strong>
                  <span>${text}</span>
                </button>
              `,
            )
            .join("")}
        </div>
        <div class="onboarding-section">
          <h3>Food preferences</h3>
          <div class="chip-control">
            ${prefs
              .map(
                (pref) => `
                  <button class="${onboardingDraft.prefs.includes(pref) ? "chip-button active" : "chip-button"}" data-draft-group="prefs" data-draft-value="${pref}">
                    ${pref}
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>
        <div class="onboarding-section">
          <h3>Services you care about</h3>
          <div class="chip-control">
            ${services
              .map(
                (service) => `
                  <button class="${onboardingDraft.services.includes(service) ? "chip-button active" : "chip-button"}" data-draft-group="services" data-draft-value="${service}">
                    ${service}
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>
        <div class="sticky-cta">
          <button class="ghost" data-view="marketplace">Skip for now</button>
          <button class="primary" data-complete-onboarding>${icon("check")} Continue</button>
        </div>
      </article>
    </section>
  `;
}

function prepperSetupView() {
  return `
    <section class="onboarding-shell prepper-setup">
      <article class="onboarding-card">
        <p class="eyebrow">Prepper onboarding</p>
        <h2>Set up your kitchen profile for admin review.</h2>
        <p>This creates the creator profile customers will see after verification.</p>
        <div class="form-grid">
          <label>
            <span>Kitchen name</span>
            <input data-prepper-name value="Chef Dre" />
          </label>
          <label>
            <span>Neighborhood</span>
            <input data-prepper-area value="Oak Cliff" />
          </label>
          <label class="wide-input">
            <span>Bio</span>
            <textarea data-prepper-bio>Comfort food, high-protein bowls, and weekly meal drops made fresh for Dallas customers.</textarea>
          </label>
        </div>
        <div class="setup-checklist">
          <div>${icon("check")} Food handler certificate</div>
          <div>${icon("check")} Kitchen photos</div>
          <div>${icon("check")} Payout account</div>
          <div>${icon("check")} Pickup/delivery rules</div>
        </div>
        <button class="primary" data-save-prepper>${icon("chef")} Submit prepper profile</button>
      </article>
    </section>
  `;
}

function creatorAdminView() {
  const gmv = state.orders.reduce((sum, order) => sum + order.total, 0);
  const creatorCount = state.users.filter((user) => user.role === "prepper").length;
  const buyerCount = state.users.filter((user) => user.role === "buyer").length;
  const contentOrders = state.creatorPosts.reduce((sum, post) => sum + post.orders, 0);
  return `
    <section class="page-grid overview-grid">
      <div class="stat-grid">
        ${[
          ["GMV", money(gmv), "Order value across marketplace", "success"],
          ["Creators", creatorCount, "Prepper accounts", "primary"],
          ["Buyers", buyerCount, "Customer accounts", "warning"],
          ["Content orders", contentOrders, "Orders attributed to posts", "danger"],
        ]
          .map(
            ([label, value, hint, tone]) => `
              <article class="stat-card ${tone}">
                <span>${label}</span>
                <strong>${value}</strong>
                <small>${hint}</small>
              </article>
            `,
          )
          .join("")}
      </div>
      <article class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Creator content</p>
            <h3>Post performance</h3>
          </div>
        </div>
        <div class="table-list">
          ${state.creatorPosts
            .map(
              (post) => `
                <div class="mini-row admin-record">
                  <div>
                    <strong>${post.title}</strong>
                    <span>${post.creator} - ${post.views} views</span>
                  </div>
                  <div>
                    <strong>${post.orders} orders</strong>
                    <span class="status ${post.status === "needs edit" ? "medium" : "verified"}">${post.status}</span>
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Users</p>
            <h3>Buyer and prepper accounts</h3>
          </div>
        </div>
        <div class="table-list">
          ${state.users
            .map(
              (user) => `
                <div class="mini-row admin-record">
                  <div>
                    <strong>${user.name}</strong>
                    <span>${user.role} - ${user.area}</span>
                  </div>
                  <div>
                    <strong>${user.orders} orders</strong>
                    <span class="status ${user.status}">${user.status}</span>
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
      <article class="panel wide">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Recurring revenue</p>
            <h3>Subscriptions</h3>
          </div>
        </div>
        <div class="subscription-grid">
          ${state.subscriptions
            .map(
              (sub) => `
                <div class="subscription-card admin-record">
                  <strong>${sub.plan}</strong>
                  <span>${sub.customer} with ${sub.prepper}</span>
                  <b>${money(sub.amount)} / week</b>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function mealCard(meal, isFeed = false) {
  return `
    <article class="${isFeed ? "feed-card" : "meal-card"} admin-record">
      <div class="meal-art" style="background: ${meal.image}">
        <span>${meal.remaining} left</span>
      </div>
      <div class="meal-body">
        <div>
          <p class="eyebrow">${meal.area}</p>
          <h3>${meal.title}</h3>
          <p>${meal.prepper} - ${meal.rating.toFixed(1)} rating</p>
        </div>
        <div class="chip-wrap">${meal.tags.map((tag) => `<span class="chip">${tag}</span>`).join("")}</div>
        <div class="meal-actions">
          <strong>${money(meal.price)}</strong>
          <div class="meal-button-row">
            <button class="ghost" data-open-meal="${meal.id}">View</button>
            <button class="primary" data-add-meal="${meal.id}">${icon("bag")} Add</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function marketplaceView() {
  const verifiedPreppers = state.preppers.filter((prepper) => prepper.status === "verified").length;
  const liveDrops = state.meals.filter((meal) => meal.available && meal.remaining <= 10).length;
  const featuredPreppers = state.preppers.slice(0, 3);
  return `
    <section class="mobile-welcome">
      <div>
        <span>Delivering to</span>
        <strong>${state.userProfile.area}</strong>
      </div>
      <button class="ghost" data-view="userProfile">${icon("user")}</button>
    </section>
    <section class="customer-hero">
      <div>
        <p class="eyebrow">Real food. Real local cooks.</p>
        <h2>Skip the chains. Order from the best home preppers nearby.</h2>
        <p>Browse verified creator kitchens, limited drops, pickup meals, and delivery-ready plates.</p>
      </div>
      <div class="hero-metrics">
        <span>${verifiedPreppers} verified preppers</span>
        <span>${state.meals.reduce((sum, meal) => sum + meal.remaining, 0)} meals available</span>
        <span>${liveDrops} live drops</span>
      </div>
    </section>
    <section class="quick-filter-row">
      ${["Near me", "High protein", "Comfort", "Dinner", "Pickup"].map((item) => `<button>${item}</button>`).join("")}
    </section>
    <section class="page-grid">
      <article class="panel wide">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Explore</p>
            <h3>Available meals</h3>
          </div>
          <button class="ghost" data-view="liveFeed">${icon("video")} Open feed</button>
        </div>
        <div class="meal-grid">${state.meals.map((meal) => mealCard(meal)).join("")}</div>
      </article>
      <article class="panel wide">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Creator kitchens</p>
            <h3>Featured preppers</h3>
          </div>
          <button class="ghost" data-view="creatorAdmin">Creator stats</button>
        </div>
        <div class="prepper-card-grid">
          ${featuredPreppers
            .map(
              (prepper) => `
                <div class="prepper-public-card admin-record">
                  <div class="avatar">${prepper.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
                  <div>
                    <strong>${prepper.name}</strong>
                    <span>${prepper.rank} - ${prepper.area}</span>
                    <small>${prepper.rating.toFixed(1)} rating - ${prepper.total_orders || prepper.revenue ? money(prepper.revenue) : "New creator"} earned</small>
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

function liveFeedView() {
  return `
    <section class="feed-shell">
      <div class="feed-copy">
        <p class="eyebrow">PrepLive preview</p>
        <h2>Creator commerce for local food</h2>
        <p>Short-form meal drops come first: preppers show freshness, customers order in the moment, and live streaming can come later once trust and ordering are solid.</p>
      </div>
      <div class="feed-stack">
        ${state.meals.map((meal) => mealCard(meal, true)).join("")}
      </div>
    </section>
  `;
}

function checkoutView() {
  const rows = state.cart.map((cartItem) => {
    const meal = state.meals.find((item) => item.id === cartItem.mealId);
    if (!meal) return "";
    const subtotal = meal.price * cartItem.quantity;
    const fee = subtotal * (state.settings.platformFee / 100);
    const deliveryFee = cartItem.method === "delivery" ? 4.99 : 0;
    return `
      <div class="checkout-row admin-record">
        <div>
          <strong>${meal.title}</strong>
          <span>${meal.prepper} - ${cartItem.quantity} item - ${cartItem.method}</span>
        </div>
        <div>
          <strong>${money(subtotal + fee + deliveryFee)}</strong>
          <button data-remove-meal="${meal.id}">Remove</button>
        </div>
      </div>
    `;
  });
  const total = state.cart.reduce((sum, cartItem) => {
    const meal = state.meals.find((item) => item.id === cartItem.mealId);
    if (!meal) return sum;
    const subtotal = meal.price * cartItem.quantity;
    return sum + subtotal + subtotal * (state.settings.platformFee / 100) + (cartItem.method === "delivery" ? 4.99 : 0);
  }, 0);

  return `
    <section class="page-grid">
      <article class="panel wide checkout-panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Customer checkout</p>
            <h3>Cart and payment workflow</h3>
          </div>
          <button class="ghost" data-view="marketplace">Keep browsing</button>
        </div>
        ${
          rows.length
            ? `<div class="table-list">${rows.join("")}</div>
               <div class="checkout-total">
                 <span>Includes platform fee and delivery fee where needed</span>
                 <strong>${money(total)}</strong>
                 <button class="primary" data-place-order>${icon("check")} Place order</button>
               </div>`
            : `<div class="empty-state">
                 <h2>Your cart is ready when you are.</h2>
                 <p>Add a meal from Marketplace or Live Feed to test the order flow.</p>
                 <button class="primary" data-view="marketplace">Browse meals</button>
               </div>`
        }
      </article>
    </section>
  `;
}

function mealDetailView() {
  const meal = state.meals.find((item) => item.id === selectedMealId) || state.meals[0];
  const mealReviews = state.reviews.filter((review) => review.meal === meal?.title || review.prepper === meal?.prepper);
  if (!meal) {
    return `<div class="empty-state"><h2>No meal selected.</h2><button class="primary" data-view="marketplace">Browse meals</button></div>`;
  }

  return `
    <section class="meal-detail-screen">
      <button class="ghost back-button" data-view="marketplace">Back</button>
      <div class="meal-detail-art" style="background: ${meal.image}">
        <span>${meal.remaining} left today</span>
      </div>
      <article class="meal-detail-body">
        <p class="eyebrow">${meal.area}</p>
        <h2>${meal.title}</h2>
        <p>${meal.prepper} - ${meal.rating.toFixed(1)} rating - ${meal.prepTime} min prep</p>
        <div class="chip-wrap">${meal.tags.map((tag) => `<span class="chip">${tag}</span>`).join("")}</div>
        <div class="detail-stats">
          <span><strong>${money(meal.price)}</strong> per plate</span>
          <span><strong>${meal.delivery ? "Delivery" : "Pickup"}</strong> available</span>
          <span><strong>${meal.sold}</strong> ordered</span>
        </div>
        <div class="prepper-mini-card">
          <div class="avatar">${meal.prepper.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
          <div>
            <strong>${meal.prepper}</strong>
            <span>Verified local prepper with repeat customers nearby.</span>
          </div>
        </div>
        <section class="review-strip">
          <h3>Customer reviews</h3>
          ${mealReviews
            .map(
              (review) => `
                <div class="review-card">
                  <strong>${review.rating}/5 rating</strong>
                  <span>${review.text}</span>
                  <small>${review.reviewer}</small>
                </div>
              `,
            )
            .join("")}
        </section>
        <div class="sticky-cta">
          <button class="ghost" data-view="messages">${icon("message")} Ask</button>
          <button class="primary" data-add-meal="${meal.id}">${icon("bag")} Add to cart</button>
        </div>
      </article>
    </section>
  `;
}

function userOrdersView() {
  const customerOrders = state.orders.filter((order) => ["Demo Customer", "Nia Carter", "Luis Green"].includes(order.customer));
  return `
    <section class="page-grid">
      <article class="panel wide">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Your food</p>
            <h3>Active and past orders</h3>
          </div>
          <button class="ghost" data-view="marketplace">Order again</button>
        </div>
        <div class="table-list">
          ${customerOrders
            .map(
              (order) => `
                <div class="mobile-order-card admin-record">
                  <div class="row-card">
                    <div class="avatar order">${order.id.slice(-2)}</div>
                    <div class="row-main">
                      <strong>${order.meal}</strong>
                      <span>${order.prepper} - ${order.type} - ETA ${order.eta}</span>
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
                    <button data-view="messages">${icon("message")} Message</button>
                    <button data-view="marketplace">Reorder</button>
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

function userProfileView() {
  const userSubs = state.subscriptions.filter((sub) => sub.customer === state.userProfile.name || sub.customer === "Nia Carter");
  return `
    <section class="profile-screen">
      <article class="profile-hero panel">
        <div class="avatar large">${state.userProfile.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
        <div>
          <p class="eyebrow">Customer profile</p>
          <h2>${state.userProfile.name}</h2>
          <p>${state.userProfile.area} - ${state.userProfile.defaultMethod} preferred</p>
        </div>
      </article>
      <section class="page-grid">
        <article class="panel">
          <p class="eyebrow">Preferences</p>
          <h3>Food profile</h3>
          <div class="chip-wrap">${state.userProfile.dietaryPrefs.map((pref) => `<span class="chip">${pref}</span>`).join("")}</div>
        </article>
        <article class="panel">
          <p class="eyebrow">Rewards</p>
          <h3>${state.userProfile.rewards} points</h3>
          <p>Earn points by ordering local meals, reviewing preppers, and joining meal drops.</p>
        </article>
        <article class="panel wide">
          <p class="eyebrow">Subscriptions</p>
          <h3>Weekly meal plans</h3>
          <div class="subscription-grid">
            ${userSubs
              .map(
                (sub) => `
                  <div class="subscription-card admin-record">
                    <strong>${sub.plan}</strong>
                    <span>${sub.prepper}</span>
                    <b>${money(sub.amount)} / week</b>
                  </div>
                `,
              )
              .join("")}
          </div>
        </article>
        <article class="panel wide settings-panel">
          <p class="eyebrow">Account</p>
          <div class="toggle-row">
            <span>Browser order notifications</span>
            <button class="toggle on">On</button>
          </div>
          <div class="toggle-row">
            <span>Show high-protein meals first</span>
            <button class="toggle on">On</button>
          </div>
        </article>
      </section>
    </section>
  `;
}

function prepperHubView() {
  const prepperName = "Chef Dre";
  const prepper = state.preppers.find((item) => item.name === prepperName) || state.preppers[0];
  const prepperMeals = state.meals.filter((meal) => meal.prepper === prepperName);
  const prepperOrders = state.orders.filter((order) => order.prepper === prepperName);
  const activeOrders = prepperOrders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const monthlyRevenue = prepperOrders.reduce((sum, order) => sum + order.total, 0);
  const availableMeals = prepperMeals.filter((meal) => meal.available && meal.remaining > 0).length;
  const topMeal = [...prepperMeals].sort((a, b) => b.sold - a.sold)[0];

  return `
    <section class="prepper-hero">
      <div>
        <p class="eyebrow">Prepper workspace</p>
        <h2>${prepper.name}</h2>
        <p>${prepper.rank} in ${prepper.area}. Manage orders, meal drops, availability, and monthly performance.</p>
      </div>
      <div class="hero-metrics">
        <span>${activeOrders.length} active orders</span>
        <span>${availableMeals} meals live</span>
        <span>${money(monthlyRevenue)} this month</span>
      </div>
    </section>
    <section class="page-grid">
      <article class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Kitchen queue</p>
            <h3>Upcoming orders</h3>
          </div>
          <span class="live-pill">Auto-refresh ready</span>
        </div>
        <div class="table-list">
          ${
            activeOrders.length
              ? activeOrders.map(orderRow).join("")
              : `<div class="empty-state compact"><h3>No active orders</h3><p>New customer checkouts will land here instantly.</p></div>`
          }
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Menu control</p>
            <h3>Availability</h3>
          </div>
          <button class="primary" data-create-drop>${icon("video")} New drop</button>
        </div>
        <div class="table-list">
          ${prepperMeals
            .map(
              (meal) => `
                <div class="menu-row admin-record">
                  <div>
                    <strong>${meal.title}</strong>
                    <span>${money(meal.price)} - ${meal.remaining} left - ${meal.prepTime} min prep</span>
                  </div>
                  <button class="${meal.available ? "toggle on" : "toggle"}" data-toggle-meal="${meal.id}">
                    ${meal.available ? "Live" : "Paused"}
                  </button>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
      <article class="panel wide">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Earnings</p>
            <h3>Revenue trends</h3>
          </div>
          <strong>${topMeal ? `Top seller: ${topMeal.title}` : "No meals yet"}</strong>
        </div>
        <div class="earnings-grid">
          ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            .map((day, index) => {
              const value = [34, 48, 29, 65, 82, 96, 72][index];
              return `<div class="bar-item"><span style="height:${value}%"></span><small>${day}</small></div>`;
            })
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function messagesView() {
  const activeConversation =
    state.conversations.find((conversation) => conversation.id === activeConversationId) || state.conversations[0];
  activeConversationId = activeConversation?.id || "";

  return `
    <section class="messages-shell">
      <aside class="conversation-list panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Coordination</p>
            <h3>Order chats</h3>
          </div>
          <span class="status pending">${state.conversations.reduce((sum, item) => sum + item.unread, 0)} unread</span>
        </div>
        ${state.conversations
          .map(
            (conversation) => `
              <button class="${conversation.id === activeConversationId ? "conversation active" : "conversation"} admin-record" data-open-chat="${conversation.id}">
                <strong>${conversation.customer}</strong>
                <span>${conversation.meal}</span>
                <small>${conversation.orderId} with ${conversation.prepper}</small>
                ${conversation.unread ? `<b>${conversation.unread}</b>` : ""}
              </button>
            `,
          )
          .join("")}
      </aside>
      <article class="chat-panel panel">
        ${
          activeConversation
            ? `<div class="panel-head">
                <div>
                  <p class="eyebrow">${activeConversation.orderId}</p>
                  <h3>${activeConversation.meal}</h3>
                </div>
                <span class="live-pill">Real-time ready</span>
              </div>
              <div class="message-stack">
                ${activeConversation.messages
                  .map(
                    (message) => `
                      <div class="message ${message.from}">
                        <span>${message.text}</span>
                        <small>${message.from} - ${message.time}</small>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
              <div class="message-compose">
                <input data-message-input placeholder="Type pickup, ingredient, or delivery update" />
                <button class="primary" data-send-message>${icon("message")} Send</button>
              </div>`
            : `<div class="empty-state"><h2>No conversations yet.</h2><p>Order messages will appear here.</p></div>`
        }
      </article>
    </section>
  `;
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
    onboarding: onboardingView,
    marketplace: marketplaceView,
    liveFeed: liveFeedView,
    checkout: checkoutView,
    mealDetail: mealDetailView,
    userOrders: userOrdersView,
    userProfile: userProfileView,
    prepperSetup: prepperSetupView,
    prepperHub: prepperHubView,
    messages: messagesView,
    creatorAdmin: creatorAdminView,
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
  const currentLabel = [...navItems, ...mobileNavItems, { id: "mealDetail", label: "Meal" }].find((item) => item.id === activeView)?.label || "PrepDash";
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
          <h1>${currentLabel}</h1>
        </div>
        <div class="admin-search">
          <input type="search" value="${escapeAttribute(searchTerm)}" data-global-search placeholder="Search orders, preppers, cases" />
          <button class="ghost" data-view="checkout">${icon("bag")} ${state.cart.reduce((sum, item) => sum + item.quantity, 0)}</button>
          <button class="primary">${icon("bell")} Alerts</button>
        </div>
      </header>
      ${currentView()}
    </main>
    <nav class="mobile-bottom-nav" aria-label="Mobile customer navigation">
      ${mobileNavItems
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

  if (target.dataset.onboardingRole) {
    setOnboardingRole(target.dataset.onboardingRole);
  }

  if (target.dataset.draftGroup && target.dataset.draftValue) {
    toggleDraftValue(target.dataset.draftGroup, target.dataset.draftValue);
  }

  if (target.hasAttribute("data-complete-onboarding")) {
    completeOnboarding();
  }

  if (target.hasAttribute("data-save-prepper")) {
    savePrepperSetup();
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

  if (target.dataset.addMeal) {
    addToCart(target.dataset.addMeal);
  }

  if (target.dataset.openMeal) {
    openMeal(target.dataset.openMeal);
  }

  if (target.dataset.removeMeal) {
    removeFromCart(target.dataset.removeMeal);
  }

  if (target.hasAttribute("data-place-order")) {
    placeCartOrder();
  }

  if (target.dataset.toggleMeal) {
    toggleMealAvailability(target.dataset.toggleMeal);
  }

  if (target.hasAttribute("data-create-drop")) {
    createMealDrop();
  }

  if (target.dataset.openChat) {
    openConversation(target.dataset.openChat);
  }

  if (target.hasAttribute("data-send-message")) {
    sendMessage();
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.matches("[data-message-input]")) {
    sendMessage();
  }
});

render();
