
// --------------------
// SAVED CAFÉ
// --------------------

const openingStock = { cups: 12, milk: 6, pastries: 5 };
const supplyPacks = {
  cups: { name: "Clean cups", amount: 8, cost: 5, time: 3, max: 30 },
  milk: { name: "Milk", amount: 5, cost: 4, time: 3, max: 20 },
  pastries: { name: "Pastries", amount: 4, cost: 6, time: 4, max: 16 }
};
const trayCapacity = 3;
const maxLives = 5;

const startingCafe = {
  budget: 150,
  day: 1,
  lives: maxLives,
  unlocked: 0,
  tables: 3,
  wifi: 0,
  sound: 0,
  price: 5,
  music: 3,
  stock: { ...openingStock },
  special: { kind: "none", price: 4, limit: 5 },
  rep: { student: 0, social: 0, regular: 0 },
  staff: [{ name: "Juno", speed: 1.3, sloppy: 0.25, warmth: 0 }],
  regulars: {},  // returning customers remember how they were treated
  rating: 3,     // neighbourhood rating, smoothed from daily reviews
  trend: null    // today's neighbourhood trend: { day, id }
};

// Capture pristine defaults before the live café can change nested objects.
const freshCafeTemplate = JSON.stringify(startingCafe);
let lastLifeChange = 0;
let cafe;

try {
  cafe = {
    ...JSON.parse(freshCafeTemplate),
    ...JSON.parse(localStorage.getItem("cafeSave"))
  };
} catch {
  cafe = JSON.parse(freshCafeTemplate);
}
cafe.lives = Number.isFinite(cafe.lives) ? Math.max(0, Math.min(maxLives, Math.floor(cafe.lives))) : maxLives;
cafe.rep = { ...startingCafe.rep, ...cafe.rep };
cafe.staff = cafe.staff || [...startingCafe.staff];
cafe.regulars = cafe.regulars || {};
cafe.rating = Number.isFinite(cafe.rating) ? cafe.rating : 3;

cafe.stock = Object.fromEntries(Object.keys(openingStock).map(key => [key,
  Number.isFinite(cafe.stock?.[key]) ? Math.max(0, Math.min(supplyPacks[key].max, Math.floor(cafe.stock[key]))) : openingStock[key]
]));
cafe.special = { ...startingCafe.special, ...cafe.special };
if (!["none", "quick", "pastry"].includes(cafe.special.kind)) cafe.special.kind = "none";
cafe.special.price = Math.max(2, Math.min(12, Number(cafe.special.price) || 4));
cafe.special.limit = Math.max(1, Math.min(10, Math.floor(Number(cafe.special.limit) || 5)));

function saveGame() {
  try {
    localStorage.setItem("cafeSave", JSON.stringify(cafe));
  } catch (error) {
    console.warn("Progress could not be saved in this browser.", error);
  }
}

// --------------------
// RUN LIVES AND KEEPSAKES
// --------------------

function lifeIcon(filled, extraClass = "") {
  return `<svg class="life-heart ${filled ? "is-filled" : "is-empty"} ${extraClass}" viewBox="0 0 28 28" aria-hidden="true"><path d="M14 24S4 18 4 11a6 6 0 0 1 10-4 6 6 0 0 1 10 4c0 7-10 13-10 13z"/></svg>`;
}

function renderLives() {
  for (const id of ["scenarioLives", "setupLives", "playLives", "resultLives", "restartLives"]) {
    const meter = document.getElementById(id);
    if (!meter) continue;
    const change = id === "resultLives" ? lastLifeChange : 0;
    const key = `${cafe.lives}:${change}`;
    if (meter.dataset.key !== key) {
      meter.dataset.key = key;
      meter.innerHTML = Array.from({ length: maxLives }, (_, index) => lifeIcon(index < cafe.lives,
        change > 0 && index === cafe.lives - 1 ? "is-restored" : change < 0 && index === cafe.lives ? "is-lost" : "")).join("");
    }
    meter.classList.toggle("is-critical", cafe.lives === 1);
    meter.setAttribute("aria-label", `${cafe.lives} of ${maxLives} lives remaining`);
    meter.title = `${cafe.lives}/${maxLives} lives · All goals: +1 · Miss 2 or 3: −1 · Miss 1: unchanged`;
  }
}

function applyLifeResult(goals) {
  const met = goals.filter(goal => goal.value >= goal.target).length;
  const before = cafe.lives;
  const missed = goals.length - met;
  const change = missed === 0 ? 1 : missed >= 2 ? -1 : 0;
  cafe.lives = Math.max(0, Math.min(maxLives, before + change));
  lastLifeChange = cafe.lives - before;
  return met;
}

function keepsakeChoices() {
  const choices = [];
  if (cafe.tables > 0) choices.push({ id: "tables", kind: "tables", title: "One table", detail: "Begin with 4 tables", icon: "table" });
  for (const [index, member] of cafe.staff.entries()) {
    if (member.name === startingCafe.staff[0].name) continue;
    choices.push({ id: `staff-${index}`, kind: "staff", member, title: `Keep ${member.name}`,
      detail: `Juno + ${member.name} on Day 1`, icon: "staff" });
  }
  if (cafe.wifi > 0) choices.push({ id: "wifi", kind: "wifi", title: "Wi-Fi", detail: "Bring 1 upgrade level", icon: "wifi" });
  if (cafe.sound > 0) choices.push({ id: "sound", kind: "sound", title: "Acoustics", detail: "Bring 1 upgrade level", icon: "sound" });
  return choices;
}

function keepsakeIcon(kind) {
  const paths = {
    table: '<path d="M8 20h48v10H8zM13 30v24M51 30v24M24 30v15M42 30v15"/>',
    staff: '<path d="M24 13v10l-9 10v23h34V33l-9-10V13zM24 13h16M24 23h16M25 37h14v9H25z"/>',
    wifi: '<path d="M10 25a34 34 0 0 1 44 0M18 34a22 22 0 0 1 28 0M26 43a10 10 0 0 1 12 0"/><circle cx="32" cy="51" r="2"/>',
    sound: '<path d="M13 26h10l12-10v32L23 38H13zM44 25a13 13 0 0 1 0 14M51 19a22 22 0 0 1 0 26"/>'
  };
  return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
}

function renderKeepsakes() {
  const choices = keepsakeChoices();
  document.getElementById("keepsakeChoices").dataset.count = choices.length;
  document.getElementById("keepsakeChoices").innerHTML = choices.map(choice =>
    `<button class="keepsake-card" onclick="restartWithKeepsake('${choice.id}')" aria-label="Restart on Day 1: ${esc(choice.title)}. ${esc(choice.detail)}."><span class="keepsake-art">${keepsakeIcon(choice.icon)}</span><strong>${esc(choice.title)}</strong><small>${esc(choice.detail)}</small></button>`).join("");
  document.getElementById("restartFresh").hidden = choices.length > 0;
}

function restartWithKeepsake(id) {
  if (running || cafe.lives > 0) return;
  const choices = keepsakeChoices();
  const choice = choices.find(item => item.id === id);
  if (!choice && !(id === "none" && choices.length === 0)) return;
  const fresh = JSON.parse(freshCafeTemplate);
  if (choice?.kind === "tables") fresh.tables++;
  else if (choice?.kind === "staff") fresh.staff.push({ ...choice.member });
  else if (choice?.kind === "wifi" || choice?.kind === "sound") fresh[choice.kind] = 1;
  if (choice) fresh.keepsake = { kind: choice.kind, name: choice.title };
  cafe = fresh;
  lastLifeChange = 0;
  saveGame();
  showScreen("scenario");
}

// --------------------
// DAILY MISSIONS
// --------------------

const missions = [
  {
    title: "A Quiet Neighborhood Café",
    description: "Create a peaceful place for students and regulars.",
    hint: "Think about music, noise, and seating.",
    sales: 20,
    satisfaction: 70,
    happy: 3
  },
  {
    title: "The Lunch Rush",
    description: "Serve a busy crowd without losing customers.",
    hint: "More tables help, but service can become overwhelming.",
    sales: 35,
    satisfaction: 65,
    happy: 4
  },
  {
    title: "The Study Crowd",
    description: "Make students comfortable without losing regular customers.",
    hint: "Good Wi-Fi attracts students, but they stay longer.",
    sales: 30,
    satisfaction: 75,
    happy: 4
  }
];

function getMission() {
  return missions[Math.min(cafe.unlocked, missions.length - 1)];
}

function showMission() {
  const mission = getMission();

  document.getElementById("missionDay").textContent = cafe.day;
  document.getElementById("missionTitle").textContent = mission.title;
  document.getElementById("missionDescription").textContent =
    mission.description;

  document.getElementById("missionGoals").innerHTML = `
    <li><strong>$${mission.sales}</strong><span>earnings</span></li>
    <li><strong>${mission.satisfaction}%</strong><span>visit satisfaction</span></li>
    <li><strong>${mission.happy}</strong><span>happy completed visits</span></li>
  `;

  document.getElementById("missionHint").textContent = mission.hint;

  const trend = getTrend();
  document.getElementById("trendTitle").textContent = trend.title;
  document.getElementById("trendText").textContent =
    `${trend.blurb} Neighbourhood rating: ★ ${cafe.rating.toFixed(1)}.`;
}

// --------------------
// SCREENS AND SHOP
// --------------------

function showScreen(name) {
  if (cafe.lives <= 0 && ["scenario", "setup", "play"].includes(name)) name = "gameOver";
  const nextScreen = document.getElementById(name);
  if (!nextScreen) {
    console.error(`Screen "${name}" does not exist.`);
    return;
  }

  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  nextScreen.classList.add("active");

  if (name === "scenario") showMission();
  if (name === "setup") updateSetup();
  if (name === "gameOver") renderKeepsakes();
  renderLives();
}

function buyUpgrade(item, cost) {
  if (!["tables", "wifi", "sound"].includes(item)) return;

  if (cafe.budget < cost) {
    document.getElementById("message").textContent = "Not enough money!";
    return;
  }

  if (item === "tables" && cafe.tables >= 6) {
    document.getElementById("message").textContent =
      "No room for more tables!";
    return;
  }

  if (["wifi", "sound"].includes(item) && cafe[item] >= 3) {
    document.getElementById("message").textContent =
      "Maximum level reached!";
    return;
  }

  cafe.budget -= cost;
  cafe[item]++;

  saveGame();
  updateSetup();

  document.getElementById("message").textContent =
    "Upgrade purchased!";
}

function updateSetup() {
  document.getElementById("budget").textContent = cafe.budget;
  document.getElementById("staffCount").textContent = cafe.staff.length;
  const hire = document.getElementById("hireButton");
  hire.disabled = cafe.staff.length >= 3 || cafe.budget < 60;
  hire.dataset.state = cafe.staff.length >= 3 ? "full" : hire.disabled ? "unaffordable" : "available";
  document.getElementById("staffPrice").textContent = cafe.staff.length >= 3 ? "Full" : "$60";
  hire.setAttribute("aria-label", cafe.staff.length >= 3 ? "Staff limit reached" : cafe.budget < 60 ? "Hire a barista for 60 dollars; insufficient funds" : "Hire a barista for 60 dollars");

  ["tables", "wifi", "sound"].forEach(item => {
    document.getElementById(item).textContent = cafe[item];
  });

  document.getElementById("price").value = cafe.price;
  document.getElementById("music").value = cafe.music;
  document.getElementById("priceValue").textContent = cafe.price;
  document.getElementById("musicValue").textContent = cafe.music;

  document.querySelectorAll("[data-upgrade]").forEach(button => {
    const item = button.dataset.upgrade;
    const maximum = item === "tables" ? 6 : 3;
    const atMaximum = cafe[item] >= maximum;
    button.disabled = atMaximum || cafe.budget < Number(button.dataset.cost);
    document.getElementById(`${item}Price`).textContent = atMaximum ? "Full" : `$${button.dataset.cost}`;
    button.dataset.state = atMaximum ? "full" : button.disabled ? "unaffordable" : "available";
  });
  document.getElementById("specialKind").value = cafe.special.kind;
  document.getElementById("specialPrice").value = cafe.special.price;
  document.getElementById("specialLimit").value = cafe.special.limit;
  document.getElementById("specialPrice").disabled = cafe.special.kind === "none";
  document.getElementById("specialLimit").disabled = cafe.special.kind === "none";
  document.getElementById("specialDescription").textContent = cafe.special.kind === "quick"
    ? "Guests leave 3s after service."
    : cafe.special.kind === "pastry" ? "Uses 1 pastry · +5 mood · longer visits." : "";
  document.getElementById("setupSupplies").innerHTML = supplyMarkup(true);
  document.getElementById("shopStockSummary").textContent = `${cafe.stock.cups} cups · ${cafe.stock.milk} milk · ${cafe.stock.pastries} pastries`;
  document.getElementById("shopSpecialSummary").textContent = cafe.special.kind === "none" ? "Usual menu"
    : `${cafe.special.kind === "quick" ? "Espresso" : "Coffee + pastry"} · $${cafe.special.price}`;
  document.getElementById("shopTableSeats").textContent = cafe.tables < 6 ? `${tableArtwork(cafe.tables).chairs.length} seats next` : "All placed";
  updateTradeoffPreview();
  updateSetupPreview();
}

document.getElementById("price").oninput = function() {
  cafe.price = Number(this.value);
  saveGame();
  updateSetup();
};

document.getElementById("music").oninput = function() {
  cafe.music = Number(this.value);
  saveGame();
  updateSetup();
};

// --------------------
// CUSTOMER TYPES
// --------------------

const customerTypes = {
  student: {
    color: "#90a8bb",
    stay: 11,
    patience: 12,
    noiseTolerance: 4,
    priceAdjustment: -1,
    priceComfort: 3.8,
    priceSpread: 0.9
  },
  social: {
    color: "#d99c88",
    stay: 9,
    patience: 10,
    noiseTolerance: 9,
    priceAdjustment: 0,
    priceComfort: 7,
    priceSpread: 1.2
  },
  regular: {
    color: "#d6b274",
    stay: 8,
    patience: 14,
    noiseTolerance: 6,
    priceAdjustment: 0,
    priceComfort: 9,
    priceSpread: 1.25
  }
};

// All scene positions use the room's original proportions, independent of screen DPI.
const sceneSize = { width: 1000, height: 542 };
const tablePositions = [
  { x: 215, y: 270 },
  { x: 450, y: 405 },
  { x: 685, y: 405 },
  { x: 215, y: 405 },
  { x: 685, y: 270 },
  { x: 450, y: 270 }
];

const entrance = { x: 820, y: 238 };
// Use the machine already painted into the room; overlaying another duplicates it.
const coffeeMachineArea = { x: 475, y: 67, width: 98, height: 57 };

function tableArtwork(index) {
  // These drawings depict different shapes. Matching their leg height gives
  // both styles the same floor line without stretching either illustration.
  return index % 2
    ? {
      name: "smallTable", width: 105, seat: { x: -66, y: 12 },
      chairs: [
        { x: -94, y: -7, width: 56 },
        { x: 40, y: -7, width: 56, mirrored: true }
      ]
    }
    : {
      name: "table", width: 180, seat: { x: -45, y: -27 },
      chairs: [
        { x: -85, y: -44, width: 54 },
        { x: -15, y: -44, width: 54 },
        { x: -40, y: 15, width: 56, foreground: true, asset: "chairBack" },
        { x: 30, y: 11, width: 56, foreground: true, asset: "chairBack" }
      ]
    };
}

// Measured alpha bounds, with a pixel of padding to retain the outline.
const sceneAssets = {
  room: { file: "scene.png", crop: [18, 159, 1416, 767] },
  table: { file: "table.png", crop: [179, 477, 904, 481] },
  smallTable: { file: "smallTable.png", crop: [313, 399, 665, 613] },
  chair: { file: "chair.png", crop: [284, 119, 661, 1051] },
  chairBack: { file: "chair-back.png", crop: [106, 143, 784, 1309] }
};

const failedAssets = [];
const assetsReady = Promise.all(Object.values(sceneAssets).map(asset =>
  new Promise(resolve => {
    asset.image = new Image();
    asset.image.onload = resolve;
    asset.image.onerror = () => {
      failedAssets.push(asset.file);
      resolve();
    };
    asset.image.src = `assets/${asset.file}`;
  })
));

// --------------------
// GAME VARIABLES
// --------------------

const canvas = document.getElementById("cafeCanvas");
const ctx = canvas.getContext("2d");

let customers = [];
let dirtyTables = [];

let focus = { kind: "none", id: null };
let previewTable = null;
let counterTab = "supplies";
let hoveredTable = null;
let guestDrag = null;
let suppressCanvasClick = false;
let floatingNotes = [];
let paused = false;
let gameSpeed = 0.65;
let waitingParties = [];
let partyNumber = 0;
let running = false;
let startingDay = false;
let timeLeft = 60;
let spawnTimer = 0;
let lastFrame = 0;
let animationFrameId = null;
let customerNumber = 0;
const names = ["Ana", "Leo", "Mara", "Sam", "Iris", "Theo", "Noor", "Jules", "Pia", "Omar", "Lena", "Hugo", "Yara", "Ben", "Zoe", "Eli"];
let links = [];          // live customer-to-customer effects, drawn in the room
let seenLinks = new Set();
let story = [];          // cause-and-effect lines for the closing receipt
let emergenceClock = 0;
let neighbourEpisodes = new Map();
let neighbourCooldowns = new Map();
let neighbourReactions = new Map();
let connectionFlashes = new Map();
let emergenceMoments = new Map();
let neighbourRelief = new Map();
let neighbourExposure = new Map();
const reducedSceneMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;

let visitors = 0;
let sales = 0;
let noise = 0;
let selectedCustomer = null;

let tickets = [];   // orders: queued -> brewing -> ready -> carried
let staff = [];     // today's working baristas
let stock = { ...cafe.stock };
let dailySpecial = null;
let managerTask = null;
let deliveries = [];
let problems = [];
let operationNumber = 0;
let nextProblemIn = 12;
let problemSequence = 0;
let operationsStats = { restockCost: 0, specialSales: 0, specialSold: 0, trayServed: 0, fixed: 0, waste: 0, repeatSold: 0, repeatSales: 0 };

// Outcome counters
let outcomes;
let effects;
let arrivals;
let satisfactionTotal;
let completedVisits;
let customerSpending = {};

// --------------------
// START THE DAY
// --------------------

async function startDay() {
  if (cafe.lives <= 0) { showScreen("gameOver"); return; }
  if (running || startingDay) return;
  startingDay = true;
  document.getElementById("message").textContent = "Preparing the café artwork…";
  await assetsReady;
  startingDay = false;
  if (failedAssets.length > 0) {
    document.getElementById("message").textContent =
      `Could not load: ${failedAssets.join(", ")}. Reload the page to try again.`;
    return;
  }
  document.getElementById("message").textContent = "";
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);

  customers = [];
  cancelGuestDrag();
  dirtyTables = [];
  waitingParties = [];
  focus = { kind: "none", id: null };
  counterTab = "supplies";
  hoveredTable = null;
  previewTable = null;
  floatingNotes = [];
  document.getElementById("focusControls").dataset.key = "";
  document.querySelector(".more-actions").open = false;
  partyNumber = 0;
  paused = false;
  gameSpeed = 0.65;
  document.getElementById("pauseButton").textContent = "⏸ Pause";
  document.getElementById("speedControl").value = "0.65";

  timeLeft = 60;
  spawnTimer = 0;
  visitors = 0;
  sales = 0;
  noise = 0;
  selectedCustomer = null;
  customerNumber = 0;
  links = [];
  seenLinks = new Set();
  story = [];
  emergenceClock = 0;
  neighbourEpisodes.clear();
  neighbourCooldowns.clear();
  neighbourReactions.clear();
  connectionFlashes.clear();
  emergenceMoments.clear();
  neighbourRelief.clear();
  neighbourExposure.clear();

  tickets = [];
  stock = { ...cafe.stock };
  dailySpecial = { ...cafe.special, active: cafe.special.kind !== "none", remaining: cafe.special.limit, sold: 0 };
  managerTask = null;
  deliveries = [];
  problems = [];
  operationNumber = 0;
  nextProblemIn = 12;
  problemSequence = 0;
  operationsStats = { restockCost: 0, specialSales: 0, specialSold: 0, trayServed: 0, fixed: 0, waste: 0, repeatSold: 0, repeatSales: 0 };
  staff = cafe.staff.map(m => ({ ...m, role: "counter", energy: 100, cd: 2, rest: 0, grumpy: false, askedBreak: false }));
  renderStaff();
  requests = [];
  reservations = [];
  liveAct = null;
  requestSeq = 0;
  nextRequestIn = 6;
  reviews = [];
  phaseIndex = -1;
  updatePhase(false);

  outcomes = {
    happy: 0,
    unhappy: 0,
    unserved: 0,
    turnedAway: 0
  };

  effects = {
    wifiVisitors: 0,
    priceRefusals: 0,
    noSeats: 0,
    noiseComplaints: 0,
    waterGiven: 0,
    moves: 0,
    interventions: 0,
    requestsAccepted: 0,
    requestsDeclined: 0,
    reservationsKept: 0,
    reservationsMissed: 0
  };

  arrivals = {
    student: 0,
    social: 0,
    regular: 0
  };

  satisfactionTotal = 0;
  completedVisits = 0;
  customerSpending = Object.fromEntries(Object.keys(customerTypes).map(type => [type, { served: 0, guests: 0, revenue: 0 }]));

  document.getElementById("eventLog").innerHTML = "";
  const mission = getMission();

  document.getElementById("activeMission").textContent =
    `Day ${cafe.day} · ${mission.title}`;
  document.getElementById("salesGoal").textContent = mission.sales;
  document.getElementById("happyGoal").textContent = mission.happy;
  document.getElementById("satisfactionGoal").textContent = mission.satisfaction;
  document.querySelectorAll("#play details").forEach(details => { details.open = false; });

  document.getElementById("liveMusic").value = cafe.music;
  document.getElementById("liveMusicValue").textContent = cafe.music;
  document.getElementById("selectedCustomer").textContent = "None";

  running = true;
  showScreen("play");

  updateOrderStatus();
  renderInbox();
  renderBoard();
  renderWaiting();
  document.getElementById("actionFeedback").textContent = "Choose a waiting group to seat them.";
  updateLiveStats();
  drawCafe();
  addEvent("The doors are open. Staff handle drinks; choose a waiting group to seat them.");

  lastFrame = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// --------------------
// LIVE EVENTS
// --------------------

function addEvent(message, warning = false) {
  document.getElementById("gameMessage").textContent = message;

  const log = document.getElementById("eventLog");
  const item = document.createElement("div");

  item.className = warning ? "event warning" : "event";
  item.textContent = message;

  log.prepend(item);

  // Keep only the newest eight messages
  while (log.children.length > 8) {
    log.lastChild.remove();
  }
}

// --------------------
// CUSTOMER ARRIVALS
// --------------------

function pickIdentity(type) {
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const pref = { student: ["tea", "espresso", "tea"], social: ["latte", "latte", "espresso"], regular: Object.keys(drinks) }[type].concat(getTrend().drinks);
  const here = customers.filter(c => !["leaving", "gone"].includes(c.state)).map(c => c.name);
  if (type === "regular") {
    const back = Object.entries(cafe.regulars).filter(([n, r]) => !here.includes(n) && r.mood > -2);
    if (back.length && Math.random() < 0.6) {
      const [name, r] = pick(back);
      return { name, drink: r.drink, usual: r.visits >= 2, returning: true };
    }
    const fresh = names.find(n => !here.includes(n) && !cafe.regulars[n]);
    if (fresh) {
      const drink = pick(pref);
      cafe.regulars[fresh] = { drink, visits: 0, mood: 0 };
      return { name: fresh, drink };
    }
  }
  const free = names.filter(n => !here.includes(n) && !cafe.regulars[n]);
  return { name: pick(free.length ? free : ["Guest"]), drink: pick(pref) };
}

function createCustomer() {
  const choices = ["student", "social", "regular"];

  for (let i = 0; i < cafe.wifi * 2; i++) {
    choices.push("student");
  }

  if (liveAct) choices.push("social", "social", "social");
  pushBias(choices);

  if (cafe.music >= 7) {
    choices.push("social", "social", "social");
  }

  // Reputation and the room's current mix feed back into who walks in next
  for (const t of Object.keys(cafe.rep)) {
    for (let i = 0; i < Math.round(cafe.rep[t]); i++) choices.push(t);
  }
  customers.filter(c => !["leaving", "gone"].includes(c.state))
    .forEach(c => choices.push(c.type));

  if (specialAvailable()) choices.push(...(dailySpecial.kind === "quick"
    ? ["regular", "regular", "social"] : ["social", "social", "regular"]));
  const type = choices[Math.floor(Math.random() * choices.length)];

  const size = pickOne(type === "social" ? [2, 2, 3, 4] : [1, 1, 2]);
  visitors += size;
  arrivals[type] += size;

  if (type === "student" && cafe.wifi > 0) {
    effects.wifiVisitors++;
    addEvent("A student is interested in your café's Wi-Fi.");
  }

  // Each crowd weighs the advertised espresso price differently, across the
  // whole slider range. Actual usual-menu orders keep the student's $1 reduction.
  const menuQuote = drinkPrice("espresso", type);
  const quotedPrice = specialAvailable() ? Math.min(menuQuote, dailySpecial.price) : menuQuote;
  if (Math.random() < priceRefusalChance(type, quotedPrice)) {
    outcomes.turnedAway += size;
    effects.priceRefusals += size;
    addEvent(`A ${type} party declined the $${quotedPrice} advertised price.`, true);
    return;
  }

  if (waitingParties.length >= 4) {
    outcomes.turnedAway += size;
    effects.noSeats += size;
    addEvent("The entrance is full. A new party went elsewhere.", true);
    return;
  }
  const who = pickIdentity(type);
  waitingParties.push({ id: ++partyNumber, type, who, size, wait: 22 });
  renderWaiting();
  addEvent(`${who.name}: party of ${size} at the door. Choose a table in the waiting list.`);
}

function seatCustomer(type, who, table, extra = {}) {
  const seat = tablePositions[table];
  const seatIndex = extra.seatIndex ?? 0;
  const seatOffset = seatOffsets(table)[seatIndex];
  const customer = {
    id: customerNumber++,
    name: who.name,
    drink: who.drink,
    usual: !!who.usual,
    type,
    table,
    seatIndex,
    partyId: extra.partyId ?? ++partyNumber,
    x: entrance.x,
    y: entrance.y,
    targetX: seat.x + seatOffset.x,
    targetY: seat.y + seatOffset.y,
    state: "walking",
    timer: 0,
    happiness: 75,
    patience: customerTypes[type].patience,
    outcomeRecorded: false,
    complaintMade: false,
    waterReceived: false,
    waterFeedback: 0,
    drinksServed: 0,
    visitLength: null,
    repeatAt: null,
    repeatConsidered: false,
    repeatPending: false,
    ...extra
  };
  customers.push(customer);
  return customer;
}

// --------------------
// COFFEE SERVICE
// --------------------

const drinks = {
  espresso: { brew: 2, bonus: 0 },
  latte: { brew: 4, bonus: 2 },
  tea: { brew: 2.5, bonus: -1 }
};
const slotCount = 2;
const hireable = [
  { name: "Rue", speed: 0.8, sloppy: 0.05, warmth: 1.5 },
  { name: "Kai", speed: 1.1, sloppy: 0.12, warmth: 0.7 }
];
const findCustomer = id => customers.find(c => c.id === id);
const needsDrink = c => !!c && (c.state === "waiting" || c.state === "drinking" && c.repeatPending);
const drinkPrice = (drink, type = "regular") => Math.max(1,
  cafe.price + drinks[drink].bonus + customerTypes[type].priceAdjustment);

function priceRefusalChance(type, price) {
  const traits = customerTypes[type];
  const chance = 1 / (1 + Math.exp(-(price - traits.priceComfort) / traits.priceSpread));
  return Math.max(0.02, Math.min(0.95, chance));
}

function visitDuration(customer) {
  if (customer.specialKind === "quick") return 3;
  const duration = customerTypes[customer.type].stay + getTrend().stay +
    (customer.specialKind === "pastry" ? 4 : 0) +
    (customer.type === "student" ? cafe.wifi * 3 : 0);
  return customer.type === "student" ? Math.min(20, duration) : duration;
}

function remainingVisit(customer) {
  return Math.max(0, (customer.visitLength ?? visitDuration(customer)) - customer.timer);
}

function considerStudentRefill(customer) {
  if (customer.type !== "student" || customer.specialKind === "quick" ||
      customer.repeatConsidered || customer.drinksServed < 1 || customer.timer < customer.repeatAt) return;
  customer.repeatConsidered = true;
  // One optional follow-up, with enough time to prepare it before checkout.
  if (remainingVisit(customer) < 7 || timeLeft < 8 || customer.happiness < 55 ||
      Math.random() >= Math.min(0.85, 0.4 + cafe.wifi * 0.15)) return;
  customer.repeatPending = true;
  customer.drink = Math.random() < 0.75 ? "tea" : "espresso";
  addFloat(customer, `Another ${customer.drink} · ${Math.ceil(remainingVisit(customer))}s left`);
  addEvent(`${customer.name} would like another ${customer.drink}. Their original departure time stays the same.`);
}

function updateTradeoffPreview() {
  const labels = { student: "Students", social: "Social", regular: "Regulars" };
  document.getElementById("priceImpact").innerHTML = Object.keys(customerTypes).map(type => {
    const price = drinkPrice("espresso", type);
    const acceptance = Math.round((1 - priceRefusalChance(type, price)) * 100);
    return `<div><span>${labels[type]}</span><strong>$${price}</strong><small>~${acceptance}% enter</small></div>`;
  }).join("");

}

function updateOrderStatus() {
  updateCarryingBanner();
}

function takeOrder(customer, by) {
  if (!needsDrink(customer) || tickets.some(t => t.id === customer.id)) return false;
  const repeat = !!customer.repeatPending;
  let special = null;
  if (!repeat && specialAvailable() && !customer.usual && Math.random() < 0.65) {
    special = { kind: dailySpecial.kind, price: dailySpecial.price };
    dailySpecial.remaining--;
    customer.drink = "espresso";
    addFloat(customer, dailySpecial.kind === "quick" ? "Express special" : "Coffee + pastry");
  }
  tickets.push({ id: customer.id, drink: customer.drink, state: "queued", timer: 0,
    price: special ? special.price : drinkPrice(customer.drink, customer.type), special, repeat });
  addEvent(`${by ? by.name + " took" : "You took"} ${customer.name}'s ${customer.drink} order.`);
  updateOrderStatus();
  return true;
}

// Distinguish a broken machine from an order waiting for supplies.
function coffeeServiceStatus() {
  if (problems.some(p => p.kind === "machine")) {
    return { state: "repair", label: "Machine stopped", detail: "Repair the coffee machine to resume brewing." };
  }
  const queued = tickets.filter(t => t.state === "queued" && needsDrink(findCustomer(t.id)));
  if (queued.length && queued.every(t => stockBlock(t))) {
    const missing = Object.keys(supplyPacks).filter(key => queued.some(t =>
      stock[key] < (drinkRecipe(t)[key] || 0)));
    return { state: "supplies", label: `Restock ${missing.join(" + ")}`,
      detail: `Orders need ${missing.map(key => supplyPacks[key].name.toLowerCase()).join(" and ")}. Restock at the counter.` };
  }
  return { state: "ready", label: "Machine ready", detail: "Orders brew automatically when supplies are available." };
}

function startBrew() {
  if (problems.some(p => p.kind === "machine") || tickets.filter(t => t.state === "brewing").length >= slotCount) return false;
  const t = tickets.find(x => x.state === "queued" && !stockBlock(x));
  if (!t) return false;
  const recipe = drinkRecipe(t);
  for (const [key, amount] of Object.entries(recipe)) stock[key] -= amount;
  t.stockUsed = true;
  t.state = "brewing";
  t.timer = drinks[t.drink].brew;
  return true;
}

function updateTickets(dt) {
  const working = staff.find(m => m.rest <= 0 && !m.assignment);
  if (working) customers.filter(needsDrink).forEach(c => {
    if (c.usual && !c.usualAsked) {
      c.usualAsked = true;
      story.push(`${c.name} asked for the usual.`);
    }
    takeOrder(c, working);
  });
  tickets.forEach(t => {
    if (t.state !== "brewing" || problems.some(p => p.kind === "machine")) return;
    t.timer -= dt;
    if (t.timer <= 0) t.state = "ready";
  });
  while (startBrew()) { /* fill every free slot */ }
  updateOrderStatus();
}

function useCoffeeMachine() {
  openFocus("machine");
}

function serve(customer, by) {
  const ticket = tickets.find(t => t.id === customer.id);
  if (!ticket || !["ready", "carried"].includes(ticket.state) || !needsDrink(customer)) return;
  const repeat = !!ticket.repeat;
  tickets = tickets.filter(t => t !== ticket);
  customer.state = "drinking";
  if (!repeat) {
    customer.waited = customer.timer;
    customer.timer = 0;
  }
  customer.repeatPending = false;
  customer.drinksServed++;

  let boost = repeat ? 5 : 15;
  let tip = 0;
  if (by && Math.random() < by.sloppy + (by.grumpy ? 0.15 : 0)) {
    boost = -10;
    customer.cause = `${by.name} got the order wrong`;
    story.push(`${by.name} mixed up ${customer.name}'s order.`);
    addEvent(`${by.name} mixed up ${customer.name}'s order.`, true);
  } else {
    if (by) boost += by.warmth * 4;
    const reg = cafe.regulars[customer.name];
    if (reg && reg.drink === customer.drink && reg.visits >= 2) {
      boost += 5;
      tip = 1;
      customer.boost = "they got their usual";
    }
  }
  customer.happiness = Math.max(0, Math.min(100, customer.happiness + boost));
  const revenue = (ticket.price ?? drinkPrice(customer.drink, customer.type)) + tip;
  if (!repeat) {
    customer.specialKind = ticket.special?.kind || null;
    customer.visitLength = visitDuration(customer);
    customer.repeatAt = 4 + Math.random() * 2;
  }
  if (ticket.special) {
    dailySpecial.sold++;
    operationsStats.specialSold++;
    operationsStats.specialSales += revenue;
    if (ticket.special.kind === "pastry") customer.happiness = Math.min(100, customer.happiness + 5);
  }
  if (repeat) {
    operationsStats.repeatSold++;
    operationsStats.repeatSales += revenue;
  }
  if (!by && ticket.state === "carried") operationsStats.trayServed++;
  sales += revenue;
  customerSpending[customer.type].served++;
  if (!repeat) customerSpending[customer.type].guests++;
  customerSpending[customer.type].revenue += revenue;
  addFloat(customer, `+$${revenue} ✓`);
  addEvent(`${by ? by.name + " served" : "You served"} ${customer.name}${repeat ? " another drink" : ""}. +$${revenue}${repeat ? "; departure unchanged" : ""}`);
  updateOrderStatus();
  updateCustomerControls();
}

function deliverCoffee(customer) {
  if (managerTask) { managerFeedback("Finish your current task before delivering the tray."); return; }
  const ticket = tickets.find(t => t.state === "carried" && t.id === customer.id) || carriedTickets()[0];
  if (!ticket || !needsDrink(customer)) return;
  if (ticket.id !== customer.id) {
    const target = findCustomer(ticket.id);
    managerFeedback(`This is ${target ? target.name + "’s" : "another guest’s"} ${ticket.drink}. Follow the highlighted guest.`);
    return;
  }
  serve(customer, null);
  managerFeedback(`${customer.drink} delivered · ${customer.name} · T${customer.table + 1}`);
}

function cancelOrder(id) {
  const cancelled = tickets.find(t => t.id === id);
  if (cancelled?.special && dailySpecial) dailySpecial.remaining++;
  if (cancelled?.stockUsed) operationsStats.waste++;
  if (tickets.some(t => t.id === id && t.state === "carried")) {
    const customer = findCustomer(id);
    document.getElementById("actionFeedback").textContent = `${customer ? customer.name : "The guest"} left. Their carried drink was cleared.`;
  }
  tickets = tickets.filter(t => t.id !== id);
  updateOrderStatus();
}

function describeStaff(m) {
  return [m.speed > 1.15 ? "fast" : m.speed < 0.9 ? "careful" : "steady",
    m.sloppy > 0.15 ? "sloppy" : "precise", m.warmth >= 1 ? "warm" : "", m.grumpy ? "grumpy" : ""].filter(Boolean).join(", ");
}

function renderStaff() {
  document.getElementById("staffRow").innerHTML = staff.map((m, i) =>
    `<div class="staff"><b>${m.name}</b><small id="staffTask-${i}" title="${describeStaff(m)}">${m.rest > 0 ? "☕ On break" : m.assignment ? "Helping with a problem" : m.task || "Ready"}</small>` +
    `<button onclick="toggleRole(${i})">${m.rest > 0 ? "On break" : m.role === "counter" ? "Counter" : "Floor"}</button>` +
    `<progress id="st-e-${i}" max="100" value="${m.energy}"></progress></div>`).join("");
}

function toggleRole(i) {
  staff[i].role = staff[i].role === "counter" ? "floor" : "counter";
  addEvent(`${staff[i].name} moves to the ${staff[i].role}.`);
  renderStaff();
}

function updateStaff(dt) {
  staff.forEach((m, i) => {
    m.cd -= dt * m.speed * (0.4 + 0.6 * m.energy / 100);
    const bar = document.getElementById(`st-e-${i}`);
    if (bar) bar.value = m.energy;
    const task = document.getElementById(`staffTask-${i}`);
    if (task) task.textContent = m.rest > 0 ? "☕ On break" : m.task || "Ready";
    if (m.rest > 0) {
      m.rest -= dt;
      if (m.rest <= 0) {
        m.rest = 0;
        m.grumpy = false;
        addEvent(`${m.name} is back from their break.`);
        renderStaff();
      }
      return;
    }
    if (m.assignment) {
      if (task) task.textContent = "Helping with a problem";
      return;
    }
    if (m.cd > 0) return;
    m.cd = 2;
    m.energy = Math.max(0, m.energy - 4);
    const jobs = {
      order: () => {
        const c = customers.find(x => needsDrink(x) && !tickets.some(t => t.id === x.id));
        return c ? takeOrder(c, m) : false;
      },
      deliver: () => {
        const t = tickets.find(x => x.state === "ready");
        const c = t && findCustomer(t.id);
        if (!needsDrink(c)) return false;
        serve(c, m);
        return true;
      },
      clean: () => {
        const cleanable = dirtyTables.filter(t => !customers.some(c => c.table === t && stillInside(c)) &&
          !problems.some(p => p.kind === "spill" && p.table === t));
        if (!cleanable.length) return false;
        // Tables with a booking coming up get cleaned first.
        const booked = reservations.filter(r => ["booked", "blocked"].includes(r.state)).map(r => r.table);
        const target = cleanable.find(t => booked.includes(t)) ?? cleanable[0];
        dirtyTables = dirtyTables.filter(t => t !== target);
        addEvent(`${m.name} cleaned a table.`);
        return true;
      }
    };
    const job = (m.role === "floor" ? ["deliver", "clean", "order"] : ["order", "deliver", "clean"]).find(k => jobs[k]());
    const service = coffeeServiceStatus();
    m.task = job ? { deliver: "☕ Delivering", clean: "🧽 Cleaning", order: "📝 Taking orders" }[job]
      : service.state !== "ready" ? service.label : "Ready";
    if (task) task.textContent = m.task;
  });
}

function hireStaff() {
  const msg = document.getElementById("message");
  const next = hireable.find(h => !cafe.staff.some(m => m.name === h.name));
  if (!next) { msg.textContent = "Your team is full."; return; }
  if (cafe.budget < 60) { msg.textContent = "Not enough money!"; return; }
  cafe.budget -= 60;
  cafe.staff.push({ ...next });
  saveGame();
  updateSetup();
  msg.textContent = `${next.name} joins the team.`;
}

// --------------------
// LIVE MANAGEMENT
// --------------------

document.getElementById("liveMusic").oninput = function() {
  cafe.music = Number(this.value);

  document.getElementById("liveMusicValue").textContent = cafe.music;

  saveGame();
};

document.getElementById("liveMusic").onchange = function() {
  if (running) {
    addEvent(`You changed the music volume to ${cafe.music}.`);
  }
};

function updateCustomerControls() {
  const customer = customers.find(c => c.id === selectedCustomer &&
    ["waiting", "drinking"].includes(c.state));
  const controls = document.getElementById("customerControls");
  const showCustomer = !!customer && focus.kind === "customer";
  controls.hidden = !showCustomer;
  updateFocusPanel();
  if (!customer) {
    document.getElementById("selectedCustomer").textContent = "None";
    return;
  }

  document.getElementById("selectedCustomer").textContent =
    `${customer.name} · Table ${customer.table + 1} · ${Math.round(customer.happiness)}% mood`;
  updateManagerControls(customer);
  renderPartyOrders(customer);
  const waiting = customer.state === "waiting";
  const remaining = waiting ? Math.max(0, 1 - customer.timer / customer.patience)
    : customer.repeatPending ? remainingVisit(customer) / (customer.visitLength ?? visitDuration(customer)) : 1;
  const meter = document.getElementById("selectedPatience");
  meter.value = Math.round(remaining * 100);
  meter.textContent = `${Math.round(remaining * 100)}%`;
  meter.hidden = !waiting && !customer.repeatPending;
  document.getElementById("patienceLabel").textContent = waiting
    ? `Patience · ${Math.round(remaining * 100)}%`
    : customer.repeatPending ? `Follow-up order · leaves in ${Math.ceil(remainingVisit(customer))}s`
    : `Enjoying their coffee · ${customer.drinksServed} served`;

  const button = document.getElementById("waterButton");
  button.hidden = !waiting;
  button.disabled = !!managerTask || customer.waterReceived || cafe.budget + sales < 2;
  button.textContent = customer.waterReceived ? "💧 Water given" : "💧 Water · $2";
  const waterMessage = !waiting ? ""
    : customer.waterFeedback > 0 ? "Patience refilled. A little more time to serve."
    : customer.waterReceived ? "Water already offered."
    : cafe.budget + sales < 2 ? "You need $2 to offer water."
    : "";
  const waterStatus = document.getElementById("waterStatus");
  if (waterStatus.textContent !== waterMessage) waterStatus.textContent = waterMessage;
}

function offerWater() {
  if (!running) return;
  if (managerTask) { managerFeedback("Finish your current task before offering water."); return; }
  const customer = customers.find(c => c.id === selectedCustomer);
  if (!customer || customer.state !== "waiting") {
    addEvent("Select a waiting customer to offer water.");
    return;
  }
  if (customer.waterReceived) {
    addEvent("This customer already received water.");
    return;
  }
  if (cafe.budget + sales < 2) {
    addEvent("You need $2 to offer water.", true);
    return;
  }

  sales -= 2;
  customer.timer = 0;
  customer.happiness = Math.min(100, customer.happiness + 20);
  customer.waterReceived = true;
  customer.waterFeedback = 2;
  addFloat(customer, "💧 + patience");
  effects.waterGiven++;
  updateLiveStats();
  drawCafe();
  drawCustomers();
  managerFeedback(`Water for ${customer.name}: patience refilled, mood +20 (up to 100). −$2`);
}

// --------------------
// COUNTER SUPPLIES, SPECIALS AND SMALL PROBLEMS
// --------------------
function specialDescription(kind) {
  return kind === "quick" ? "Express espresso: attracts a quicker crowd; guests finish 3s after service. Lower prices trade margin for turnover."
    : kind === "pastry" ? "Coffee + pastry: attracts social visitors; uses one pastry, gives +5 mood and adds up to 4s to the visit. Student visits still cap at 20s."
    : "No promotion. Your usual menu and visit lengths apply.";
}

function setDailySpecial() {
  const kind = document.getElementById("specialKind").value;
  if (!["none", "quick", "pastry"].includes(kind) || running) return;
  const changed = cafe.special.kind !== kind;
  cafe.special.kind = kind;
  cafe.special.price = changed ? (kind === "pastry" ? 8 : 4)
    : Math.max(2, Math.min(12, Number(document.getElementById("specialPrice").value) || cafe.special.price));
  cafe.special.limit = Math.max(1, Math.min(10, Math.floor(Number(document.getElementById("specialLimit").value) || 5)));
  saveGame();
  updateSetup();
}

function specialAvailable() {
  return !!dailySpecial?.active && dailySpecial.kind !== "none" && dailySpecial.remaining > 0;
}

function stopSpecial() {
  if (!running || !dailySpecial) return;
  dailySpecial.active = false;
  managerFeedback("Special paused. Orders already promised keep their offer price; new guests use the usual menu.");
}

function drinkRecipe(ticket) {
  return { cups: 1, milk: ticket.drink === "latte" ? 1 : 0, pastries: ticket.special?.kind === "pastry" ? 1 : 0 };
}

function stockBlock(ticket) {
  return Object.entries(drinkRecipe(ticket)).filter(([key, amount]) => stock[key] < amount)
    .map(([key]) => supplyPacks[key].name.toLowerCase()).join(" + ");
}

function supplyPending(key) {
  return deliveries.some(d => d.resource === key) || managerTask?.kind === "restock" && managerTask.resource === key;
}

function restock(key, urgent = false, setup = false) {
  const pack = supplyPacks[key];
  if (!pack || (setup ? running : !running)) return;
  const inventory = setup ? cafe.stock : stock;
  const cost = pack.cost + (urgent && !setup ? 4 : 0);
  const funds = setup ? cafe.budget : cafe.budget + sales;
  if (inventory[key] + pack.amount > pack.max || !setup && supplyPending(key)) return;
  if (funds < cost) {
    if (setup) document.getElementById("message").textContent = "Not enough money for that supply pack.";
    else managerFeedback("Not enough money for that supply pack.");
    return;
  }
  if (!setup && !urgent && managerTask) { managerFeedback("Finish your current task or use an urgent delivery."); return; }
  if (setup) {
    cafe.budget -= cost;
    inventory[key] += pack.amount;
    saveGame(); updateSetup();
    document.getElementById("message").textContent = `${pack.name}: +${pack.amount}. −$${cost}`;
    return;
  }
  sales -= cost;
  operationsStats.restockCost += cost;
  const task = { id: ++operationNumber, kind: "restock", resource: key, cost,
    time: urgent ? 4 : pack.time, total: urgent ? 4 : pack.time };
  if (urgent) deliveries.push(task); else managerTask = task;
  managerFeedback(urgent ? `${pack.name} delivery ordered. Arrives in 4s; you stay free. −$${cost}`
    : `Restocking ${pack.name.toLowerCase()} for ${pack.time}s. You can still manage seating. −$${cost}`);
}

function supplyMarkup(setup = false) {
  const inventory = setup ? cafe.stock : stock;
  return Object.entries(supplyPacks).map(([key, pack]) => {
    const full = inventory[key] + pack.amount > pack.max;
    const pending = !setup && supplyPending(key);
    const funds = cafe.budget + (setup ? 0 : sales);
    return `<div class="supply-row"><div><strong>${pack.name} <span class="${inventory[key] < 3 ? "stock-low" : ""}">${inventory[key]}</span></strong>
      <small>Pack +${pack.amount} · $${pack.cost}${setup ? "" : ` · ${pack.time}s of your time`}</small></div>
      <div class="supply-actions"><button onclick="restock('${key}',false,${setup})" ${full || pending || funds < pack.cost || !setup && managerTask ? "disabled" : ""}>${setup ? "Buy pack" : "Restock"}</button>
      ${setup ? "" : `<button onclick="restock('${key}',true)" ${full || pending || funds < pack.cost + 4 ? "disabled" : ""}>Delivery · $${pack.cost + 4}</button>`}</div>
      ${pending ? `<small id="delivery-${key}">Supply pack on its way</small>` : ""}</div>`;
  }).join("");
}

function carriedTickets() { return tickets.filter(t => t.state === "carried"); }

function loadTray() {
  if (!running || managerTask) { if (running) managerFeedback("Finish your task before loading the tray."); return; }
  const space = trayCapacity - carriedTickets().length;
  const ready = tickets.filter(t => t.state === "ready").slice(0, space);
  ready.forEach(t => { t.state = "carried"; });
  managerFeedback(ready.length ? `Loaded ${ready.length} drinks. Tray ${carriedTickets().length}/${trayCapacity}. Click a highlighted table to serve its drinks.`
    : "No tray space or ready drinks. Serve your tray first or wait for brewing.");
}

function deliverTrayToTable(table) {
  if (!running || managerTask) { if (running) managerFeedback("Finish your task before serving the tray."); return; }
  const ready = carriedTickets().map(t => findCustomer(t.id)).filter(c => c?.table === table && needsDrink(c));
  if (!ready.length) return;
  ready.forEach(c => serve(c, null));
  managerFeedback(`Served ${ready.length} tray drinks at T${table + 1}. ${carriedTickets().length} left on your tray.`);
}

function problemPosition(problem) {
  if (problem.kind === "machine") return { x: coffeeMachineArea.x + coffeeMachineArea.width / 2, y: coffeeMachineArea.y + 25 };
  if (problem.kind === "wifi") { const c = findCustomer(problem.customerId); return c ? { x: c.x + 26, y: c.y - 20 } : entrance; }
  return { x: tablePositions[problem.table].x + 45, y: tablePositions[problem.table].y + 45 };
}

function createProblem() {
  if (problems.length >= 2) return;
  const kinds = ["spill", "machine", "wifi"];
  for (let attempt = 0; attempt < kinds.length; attempt++) {
    const kind = kinds[(problemSequence + attempt) % kinds.length];
    if (problems.some(p => p.kind === kind)) continue;
    let problem;
    if (kind === "wifi") {
      const c = cafe.wifi > 0 && customers.find(c => c.type === "student" && isSeated(c));
      if (!c) continue;
      problem = { kind, customerId: c.id, title: `${c.name} needs Wi-Fi help`, detail: "Their mood slips while they cannot connect. Help them or send a staff member." };
    } else if (kind === "machine") {
      problem = { kind, title: "Coffee machine needs attention", detail: "Brewing has stopped. Ready drinks can still be served. Fix it yourself or take a barista off service." };
    } else {
      const occupied = [...new Set(customers.filter(isSeated).map(c => c.table))];
      if (!occupied.length) continue;
      const table = pickOne(occupied);
      problem = { kind, table, title: `Spill at T${table + 1}`, detail: "The spill blocks new seating and bothers guests already at this table. Wipe it yourself or send someone." };
    }
    problems.push({ ...problem, id: ++operationNumber });
    problemSequence = (kinds.indexOf(kind) + 1) % kinds.length;
    addEvent(problem.title, true);
    return;
  }
}

function handleProblem(id, delegate = false) {
  if (!running) return;
  const problem = problems.find(p => p.id === id);
  if (!problem || problem.assigned) return;
  if (delegate) {
    const worker = staff.find(m => m.rest <= 0 && !m.assignment);
    if (!worker) { managerFeedback("No available staff. Handle it yourself or wait for a break to end."); return; }
    worker.assignment = { problemId: id, time: 7, total: 7 };
    problem.assigned = worker.name;
    renderStaff();
    managerFeedback(`${worker.name} is handling the problem for 7s and is unavailable for normal service.`);
  } else {
    if (managerTask) { managerFeedback("Finish your current task or delegate this one."); return; }
    managerTask = { id: ++operationNumber, kind: "problem", problemId: id, time: 4, total: 4 };
    problem.assigned = "You";
    managerFeedback(problem.kind === "spill" ? "Cleaning the spill · 4s. You can still manage seating." : "You are handling the problem for 4s. You can still make seating decisions.");
  }
}

function resolveProblem(id) {
  const problem = problems.find(p => p.id === id);
  if (!problem) return;
  if (problem.kind === "wifi") {
    const customer = findCustomer(problem.customerId);
    if (customer && stillInside(customer)) {
      customer.happiness = Math.min(100, customer.happiness + 10);
      customer.boost = "someone helped with the Wi-Fi";
      addFloat(customer, "Wi-Fi fixed · +10 mood");
    }
  }
  problems = problems.filter(p => p.id !== id);
  if (problem.kind === "spill" && !customers.some(c => c.table === problem.table && stillInside(c))) {
    dirtyTables = dirtyTables.filter(table => table !== problem.table);
  }
  // Release the repair task before resuming normal service.
  if (managerTask?.problemId === id) managerTask = null;
  let releasedStaff = false;
  for (const worker of staff) {
    if (worker.assignment?.problemId !== id) continue;
    worker.assignment = null;
    worker.cd = 0;
    worker.task = "Ready";
    releasedStaff = true;
  }
  if (releasedStaff) renderStaff();
  operationsStats.fixed++;
  story.push(`${problem.title}: resolved by ${problem.assigned || "the manager"}.`);
  if (problem.kind === "machine") {
    // Fill free slots immediately; existing brews keep their remaining time
    // and already-consumed ingredients. New brews still require supplies.
    while (startBrew()) { /* resume queued drinks */ }
    const service = coffeeServiceStatus();
    const message = service.state === "supplies"
      ? `Machine repaired. ${service.detail}` : "Machine repaired. Brewing resumed.";
    document.getElementById("actionFeedback").textContent = message;
    addEvent(message, service.state === "supplies");
  } else if (problem.kind === "spill") {
    const message = `Spill cleaned at T${problem.table + 1}.`;
    document.getElementById("actionFeedback").textContent = message;
    addEvent(message);
    renderBoard();
  } else addEvent(`${problem.title}: sorted.`);
  updateOrderStatus();
  updateCustomerControls();
}

function updateOperations(dt) {
  if (managerTask) {
    managerTask.time -= dt;
    if (managerTask.time <= 0) {
      const task = managerTask; managerTask = null;
      if (task.kind === "restock") {
        stock[task.resource] += supplyPacks[task.resource].amount;
        addEvent(`${supplyPacks[task.resource].name} restocked.`);
      } else resolveProblem(task.problemId);
    }
  }
  deliveries.forEach(d => { d.time -= dt; });
  for (const d of deliveries.filter(d => d.time <= 0)) {
    stock[d.resource] += supplyPacks[d.resource].amount;
    addEvent(`${supplyPacks[d.resource].name} delivery arrived.`);
  }
  deliveries = deliveries.filter(d => d.time > 0);
  for (const m of staff) {
    if (!m.assignment || m.rest > 0) continue;
    const assignment = m.assignment;
    assignment.time -= dt;
    if (assignment.time <= 0 || !problems.some(p => p.id === assignment.problemId)) {
      if (assignment.time <= 0) resolveProblem(assignment.problemId);
      m.assignment = null; m.energy = Math.max(0, m.energy - 4); renderStaff();
    }
  }
  for (const problem of problems) {
    const affected = customers.filter(c => isSeated(c) && (problem.kind === "wifi" ? c.id === problem.customerId : problem.kind === "spill" && c.table === problem.table));
    affected.forEach(c => { c.happiness = Math.max(0, c.happiness - dt * 0.6); c.cause = problem.kind === "spill" ? "a spill was left at the table" : "they could not connect to Wi-Fi"; });
  }
  for (const p of problems.filter(p => p.kind === "wifi" && !customers.some(c => c.id === p.customerId && stillInside(c)))) {
    if (managerTask?.problemId === p.id) managerTask = null;
    problems = problems.filter(x => x !== p);
  }
  nextProblemIn -= dt;
  if (nextProblemIn <= 0 && timeLeft > 9) { createProblem(); nextProblemIn = 12 + Math.random() * 4; }
}

function settleOperations() {
  const cancelled = [...deliveries, ...(managerTask?.kind === "restock" ? [managerTask] : [])];
  const refund = cancelled.reduce((sum, t) => sum + t.cost, 0);
  if (refund) { sales += refund; operationsStats.restockCost -= refund; story.push(`Unfinished supply orders refunded at closing: $${refund}.`); }
  managerTask = null; deliveries = [];
  staff.forEach(m => { m.assignment = null; });
}

function problemMarkup(problem, compact = false) {
  const owner = problem.assigned;
  const action = problem.kind === "spill" ? "Clean spill" : problem.kind === "machine" ? "Repair machine" : "Fix Wi-Fi";
  return `<div class="problem-card">${compact ? "" : `<strong>${esc(problem.title)}</strong><p>${esc(problem.detail)}</p>`}
    ${owner ? `<small>${owner === "You" ? "You are" : `${esc(owner)} is`} ${problem.kind === "spill" ? "cleaning" : "handling it"} · <span id="problem-time-${problem.id}"></span></small>` :
      `<div class="table-actions"><button onclick="handleProblem(${problem.id})" ${managerTask ? "disabled" : ""}>${action} · 4s</button><button onclick="handleProblem(${problem.id},true)" ${staff.some(m=>m.rest<=0&&!m.assignment) ? "" : "disabled"}>Send staff · 7s</button></div>`}</div>`;
}

function updateProblemPopover() {
  const popover = document.getElementById("problemPopover");
  const problem = running && focus.kind === "problem" && problems.find(p => p.id === focus.id);
  popover.hidden = !problem;
  if (!problem) {
    popover.innerHTML = "";
    popover.dataset.key = "";
    return;
  }
  const key = JSON.stringify([problem.id, problem.assigned, !!managerTask,
    staff.some(m => m.rest <= 0 && !m.assignment)]);
  if (popover.dataset.key !== key) {
    popover.dataset.key = key;
    popover.innerHTML = `<div class="problem-popover-heading"><h3 id="problemPopoverTitle">${esc(problem.title)}</h3><button class="problem-close" onclick="openFocus('none')" aria-label="Close problem options">×</button></div>` + problemMarkup(problem, true);
  }
  const position = problemPosition(problem);
  const room = document.getElementById("sceneStage").getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const x = rect.left - room.left + position.x / sceneSize.width * rect.width;
  const y = rect.top - room.top + position.y / sceneSize.height * rect.height;
  const height = popover.getBoundingClientRect().height;
  popover.style.left = `${Math.max(8, Math.min(x - 140, room.width - 288))}px`;
  popover.style.top = `${Math.max(8, Math.min(y + 22, room.height - height - 8))}px`;
}

function tableAtPoint(point) {
  if (!point?.inside) return null;
  for (let table = 0; table < cafe.tables; table++) {
    const position = tablePositions[table], art = tableArtwork(table);
    if (Math.abs(point.x - position.x) <= art.width / 2 + 12 &&
        point.y >= position.y - 30 && point.y <= position.y + 90) return table;
  }
  return null;
}

function problemAtPoint(point) {
  if (!point?.inside) return null;
  return problems.find(p => {
    const pos = problemPosition(p);
    return Math.hypot(pos.x - point.x, pos.y - point.y) <= 24;
  });
}

function setCounterTab(tab) {
  if (!running || !["supplies", "tray", "special", "orders"].includes(tab)) return;
  counterTab = tab;
  openFocus("machine");
  document.getElementById(`counterTabButton-${tab}`)?.focus?.();
}

function counterOrderMarkup() {
  return tickets.map(t => {
    const c = findCustomer(t.id);
    if (!c) return "";
    return `<div class="drink-row"><span><b>${esc(c.name)} · T${c.table + 1}</b><small>${esc(t.drink)}${t.special ? " · special" : t.repeat ? " · follow-up" : ""} · ${esc(drinkStatus(c))}</small></span>` +
      (t.state === "ready" ? `<button onclick="pickupDrink(${c.id})" ${managerTask || carriedTickets().length >= trayCapacity ? "disabled" : ""}>Add to tray</button>` : "") + "</div>";
  }).join("") || '<p class="muted">No drink orders yet.</p>';
}

function counterMarkup() {
  const ready = tickets.filter(t => t.state === "ready").length;
  const tabs = [["supplies", "Supplies"], ["tray", `Tray ${carriedTickets().length}/${trayCapacity}`],
    ["special", "Special"], ["orders", `Orders ${tickets.length}`]];
  const nav = `<div class="counter-tabs" role="group" aria-label="Counter sections">${tabs.map(([id, label]) =>
    `<button id="counterTabButton-${id}" aria-pressed="${counterTab === id}" onclick="setCounterTab('${id}')">${label}</button>`).join("")}</div>`;
  let content;
  if (counterTab === "supplies") {
    content = supplyMarkup() + '<p class="counter-note">Restock: your time · Delivery: +$4</p>';
  } else if (counterTab === "tray") {
    const tray = carriedTickets();
    const tables = [...new Set(tray.map(t => findCustomer(t.id)?.table).filter(t => t != null))];
    content = `<button class="counter-load" onclick="loadTray()" ${managerTask || !ready || tray.length >= trayCapacity ? "disabled" : ""}>Load up to 3 ready drinks · ${ready} ready</button>` +
      (tray.length ? `<div class="tray-contents">${tray.map(t => {
        const c = findCustomer(t.id);
        return `<p>${esc(c?.name || "Guest")} · ${esc(t.drink)} · T${(c?.table ?? 0) + 1}</p>`;
      }).join("")}</div><div class="table-actions">${tables.map(table => `<button onclick="deliverTrayToTable(${table})" ${managerTask ? "disabled" : ""}>Serve T${table + 1}</button>`).join("")}</div>` : '<p class="muted">Your tray is empty.</p>');
  } else if (counterTab === "special") {
    content = dailySpecial && dailySpecial.kind !== "none"
      ? `<div class="counter-special"><strong>${dailySpecial.kind === "quick" ? "Express espresso" : "Coffee + pastry"} · $${dailySpecial.price}</strong><small>${dailySpecial.remaining} left · ${dailySpecial.sold} served${dailySpecial.active ? "" : " · paused"}</small><button onclick="stopSpecial()" ${dailySpecial.active ? "" : "disabled"}>Pause promotion</button></div>`
      : '<p class="muted">Usual menu today. Choose a special before opening.</p>';
  } else content = counterOrderMarkup();
  const fault = problems.find(p => p.kind === "machine");
  return nav + (fault ? `<button class="counter-fault" onclick="openFocus('problem',${fault.id})">! Machine needs attention</button>` : "") +
    `<section class="counter-tab-content" aria-label="${counterTab}">${content}</section>`;
}

function renderOperations() {
  const shortages = Object.keys(stock).filter(key => stock[key] < 3);
  const label = `Counter · ${shortages.length ? shortages.map(k=>`${supplyPacks[k].name} ${stock[k]}`).join(" / ") : `${stock.cups} cups · ${stock.milk} milk`} · Tray ${carriedTickets().length}/${trayCapacity}`;
  const status = document.getElementById("counterStatus");
  const service = coffeeServiceStatus();
  const counterLabel = service.state === "ready" ? label : `${service.label} · Tray ${carriedTickets().length}/${trayCapacity}`;
  status.dataset.service = service.state;
  status.title = service.detail;
  if (status.textContent !== counterLabel) status.textContent = counterLabel;
  const work = document.getElementById("managerWork");
  work.hidden = !managerTask;
  if (managerTask) {
    const label = managerTask.kind === "restock" ? `Restocking ${supplyPacks[managerTask.resource].name.toLowerCase()}`
      : problems.find(p => p.id === managerTask.problemId)?.kind === "spill" ? "Cleaning spill" : "Handling a café problem";
    document.getElementById("managerTaskName").textContent = `${label} · ${Math.max(0,Math.ceil(managerTask.time))}s`;
    document.getElementById("managerTaskProgress").value = 100 * (1 - managerTask.time / managerTask.total);
  }
  const issueMarkup = problems.map(p=>`<button class="attention-item blocked" onclick="openFocus('problem',${p.id})"><strong>${esc(p.title)}</strong><small>${p.assigned ? `${esc(p.assigned)} is handling it` : "Needs help"}</small></button>`).join("") || '<p class="empty muted">No spills or equipment problems.</p>';
  const list = document.getElementById("problemList");
  if (list.dataset.key !== issueMarkup) { list.dataset.key = issueMarkup; list.innerHTML = issueMarkup; }
  const pending = [...deliveries, ...(managerTask?.kind === "restock" ? [managerTask] : [])];
  for (const task of pending) {
    const timer=document.getElementById(`delivery-${task.resource}`);
    if(timer) timer.textContent=`${Math.max(0,Math.ceil(task.time))}s until +${supplyPacks[task.resource].amount}`;
  }
  for(const p of problems) {
    const task = problemTask(p);
    const timer = document.getElementById(`problem-time-${p.id}`);
    if (timer && task) timer.textContent = `${problemWorkPaused(p) ? "Paused · " : ""}${Math.max(0, Math.ceil(task.time))}s left`;
  }
}

function problemTask(problem) {
  return managerTask?.problemId === problem.id ? managerTask
    : staff.find(worker => worker.assignment?.problemId === problem.id)?.assignment || null;
}

function problemWorkPaused(problem) {
  return paused || !!guestDrag?.active || staff.some(worker =>
    worker.assignment?.problemId === problem.id && worker.rest > 0);
}

function drawProblems(context) {
  for (const problem of problems) {
    const position = problemPosition(problem);
    const task = problemTask(problem);
    if (problem.kind === "spill") {
      context.save();
      context.globalAlpha = 0.65;
      context.fillStyle = "#805435";
      context.beginPath();
      context.ellipse(position.x, position.y, 22, 10, -0.2, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    context.save();
    drawCircle(position.x, position.y, 14, task ? "#fffaf0" : "#f0d6c6", context);
    if (task) {
      const progress = Math.max(0, Math.min(1, 1 - task.time / Math.max(1, task.total)));
      context.lineWidth = 4;
      context.strokeStyle = "#fffaf0";
      context.beginPath();
      context.arc(position.x, position.y, 18, 0, Math.PI * 2);
      context.stroke();
      context.lineWidth = 3;
      context.strokeStyle = "#d6d9c6";
      context.stroke();
      context.strokeStyle = "#59633d";
      context.beginPath();
      context.arc(position.x, position.y, 18, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      context.stroke();
    }
    context.textAlign = "center";
    context.font = task ? "600 12px sans-serif" : "bold 15px sans-serif";
    context.fillStyle = task ? "#59633d" : "#98573c";
    context.fillText(task ? problemWorkPaused(problem) ? "Ⅱ" : String(Math.max(0, Math.ceil(task.time))) : "!", position.x, position.y + 5);
    context.restore();
  }
}

// --------------------
// REQUESTS INBOX & RESERVATION BOARD
// --------------------
// Requests are small decisions with knock-on effects. Each one touches a system
// that already exists (music, staff energy, tables, the room's mix of people),
// so the consequences surface through the neighbour effects and reputation.

let requests = [];
let reservations = [];
let liveAct = null;      // a busker currently playing
let requestSeq = 0;
let nextRequestIn = 6;
const requestTtl = 12;
const holdWindow = 12;   // seconds before arrival that a booked table is held
const arrivalWait = 8;   // how long a guest waits at the door for their table

const pickOne = list => list[Math.floor(Math.random() * list.length)];
const esc = s => String(s).replace(/[&<>"']/g, ch =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const elapsed = () => 60 - timeLeft;
const stillInside = c => !["leaving", "gone"].includes(c.state);
const isSeated = c => ["waiting", "drinking"].includes(c.state);
const activeBookings = () => reservations.filter(r => ["booked", "blocked"].includes(r.state));
const heldTables = () => activeBookings().filter(r => r.at - elapsed() <= holdWindow).map(r => r.table);
const tableOpen = t => !problems.some(p => p.kind === "spill" && p.table === t) && !dirtyTables.includes(t) && !customers.some(c => c.table === t && stillInside(c));

function weightedType() {
  const bag = ["student", "social", "regular"];
  for (const t of Object.keys(cafe.rep)) {
    for (let i = 0; i < Math.round(cafe.rep[t]); i++) bag.push(t);
  }
  return pickOne(bag);
}

const requestKinds = {
  reservation: {
    make() {
      if (elapsed() > 30 || cafe.tables < 2) return null;
      if (activeBookings().length + requests.filter(r => r.kind === "reservation").length >= 2) return null;
      const taken = [...activeBookings().map(r => r.table),
        ...requests.filter(r => r.kind === "reservation").map(r => r.data.table)];
      const open = [...Array(cafe.tables).keys()].filter(t => !taken.includes(t));
      if (!open.length) return null;
      const table = pickOne(open);
      const type = weightedType();
      const who = pickIdentity(type);
      const at = Math.round(elapsed() + 18 + Math.random() * 8);
      const size = Math.min(pickOne([1, 2, 3, 4]), tableArtwork(table).chairs.length);
      return {
        title: `${who.name} would like to book Table ${table + 1}`,
        text: `${size} ${type} guest${size > 1 ? "s" : ""}, arriving when the timer reads ${60 - at}s. The table is held for them from ${60 - at + holdWindow}s.`,
        yes: "Book it", no: "Decline", data: { table, type, who, at, size }
      };
    },
    accept(req) {
      const { table, type, who, at, size } = req.data;
      reservations.push({ id: req.id, table, type, who, at, size, state: "booked", wait: arrivalWait, held: false });
      story.push(`You booked Table ${table + 1} for ${who.name}.`);
      addEvent(`Booked Table ${table + 1} for ${who.name}.`);
    },
    decline(req, expired) {
      const { who } = req.data;
      story.push(expired ? `You never answered ${who.name}'s booking request.` : `You turned down ${who.name}'s booking.`);
      addEvent(`${who.name}'s booking request was ${expired ? "left unanswered" : "declined"}.`);
    }
  },

  music: {
    make() {
      const c = customers.find(x => isSeated(x) && !x.askedMusic &&
        ((x.type === "social" && cafe.music < 9) || (x.type === "regular" && cafe.music > 1)));
      if (!c) return null;
      c.askedMusic = true;
      const dir = c.type === "social" ? 2 : -2;
      return {
        title: `${c.name} asks about the music`,
        text: dir > 0 ? "Could it be a bit louder? It would suit the mood. (Others may not enjoy it.)"
          : "Could it be a bit quieter? It's hard to chat. (The lively crowd may drift off.)",
        yes: dir > 0 ? "Turn it up" : "Turn it down", no: "Leave it", data: { ref: c.id, dir }
      };
    },
    accept(req) {
      const { ref, dir } = req.data;
      cafe.music = Math.max(0, Math.min(10, cafe.music + dir));
      document.getElementById("liveMusic").value = cafe.music;
      document.getElementById("liveMusicValue").textContent = cafe.music;
      saveGame();
      const c = findCustomer(ref);
      if (c && stillInside(c)) {
        c.happiness = Math.min(100, c.happiness + 8);
        c.boost = "the owner listened to their music request";
      }
      story.push(`You turned the music ${dir > 0 ? "up" : "down"} for ${c ? c.name : "a guest"}.`);
      addEvent(`Music ${dir > 0 ? "up" : "down"} to ${cafe.music}.`);
    },
    decline(req) {
      const c = findCustomer(req.data.ref);
      if (c && stillInside(c)) {
        c.happiness = Math.max(0, c.happiness - 8);
        c.cause = `${c.name}'s music request was waved off`;
        story.push(`You left the music alone and ${c.name} noticed.`);
      }
      addEvent("You left the music as it was.");
    }
  },

  live: {
    make() {
      if (liveAct || elapsed() > 38) return null;
      const name = pickOne(["Odile", "Marcus", "Lucía"]);
      return {
        title: `${name}, a busker, offers to play`,
        text: "Twenty seconds of guitar for tips. The lively crowd will love it. It adds noise, and studying won't be easy.",
        yes: "Let them play", no: "Not today", data: { name }
      };
    },
    accept(req) {
      liveAct = { name: req.data.name, t: 20 };
      story.push(`${liveAct.name} started playing live music.`);
      addEvent(`${liveAct.name} starts playing.`);
    },
    decline(req) {
      addEvent(`${req.data.name} wandered off with their guitar.`);
    }
  },

  break: {
    make() {
      const idx = staff.findIndex(m => m.energy < 60 && !m.rest && !m.askedBreak && !m.assignment);
      if (idx < 0) return null;
      staff[idx].askedBreak = true;
      const m = staff[idx];
      return {
        title: `${m.name} is running low`,
        text: "A 10-second break would help. They'll be away for a while; pushing on may make them grumpy and error-prone.",
        yes: "Take a break", no: "Not now", data: { idx }
      };
    },
    accept(req) {
      const m = staff[req.data.idx];
      m.rest = 10;
      m.energy = Math.min(100, m.energy + 35);
      story.push(`${m.name} took a break and came back sharper.`);
      addEvent(`${m.name} takes a short break.`);
      renderStaff();
    },
    decline(req, expired) {
      const m = staff[req.data.idx];
      m.grumpy = true;
      story.push(`${m.name} was ${expired ? "left waiting" : "told to push on"} and got grumpy. Orders started slipping.`);
      addEvent(`${m.name} looks unimpressed.`, true);
      renderStaff();
    }
  }
};

function updateRequests(dt) {
  requests.forEach(r => { r.ttl -= dt; });
  requests.filter(r => r.ttl <= 0).forEach(r => resolveRequest(r.id, false, true));

  nextRequestIn -= dt;
  if (nextRequestIn <= 0 && requests.length < 3 && timeLeft > 8) {
    const kinds = Object.keys(requestKinds);
    const order = requestSeq === 0
      ? ["reservation", ...kinds.filter(k => k !== "reservation")]
      : kinds.sort(() => Math.random() - 0.5);
    for (const kind of order) {
      const made = requestKinds[kind].make();
      if (!made) continue;
      requests.push({ id: ++requestSeq, kind, ttl: requestTtl, ...made });
      addEvent(`New request: ${made.title}`);
      renderInbox();
      break;
    }
    nextRequestIn = 9 + Math.random() * 6;
  }
  tickDesk();
}

function resolveRequest(id, accepted, expired = false) {
  const req = requests.find(r => r.id === id);
  if (!req || !running) return;
  requests = requests.filter(r => r !== req);
  requestKinds[req.kind][accepted ? "accept" : "decline"](req, expired);
  if (accepted) effects.requestsAccepted++; else effects.requestsDeclined++;
  document.getElementById("actionFeedback").textContent = document.getElementById("gameMessage").textContent;
  renderInbox();
  renderBoard();
  updateCustomerControls();
}

function updateReservations(dt) {
  reservations.forEach(r => {
    if (r.state === "booked") {
      if (!r.held && r.at - elapsed() <= holdWindow) {
        r.held = true;
        addEvent(`Table ${r.table + 1} is now held for ${r.who.name}.`);
        renderBoard();
      }
      if (elapsed() >= r.at) {
        if (tableOpen(r.table)) {
          seatReservation(r, false);
        } else {
          r.state = "blocked";
          r.wait = arrivalWait;
          addEvent(`${r.who.name} is at the door and Table ${r.table + 1} isn't ready.`, true);
          renderBoard();
        }
      }
    } else if (r.state === "blocked") {
      if (tableOpen(r.table)) {
        seatReservation(r, true);
      } else {
        r.wait -= dt;
        if (r.wait <= 0) missReservation(r);
      }
    }
  });
}

function seatReservation(r, late) {
  r.state = "seated";
  effects.reservationsKept++;
  visitors += r.size || 1;
  arrivals[r.type] += r.size || 1;
  seatParty(r.type, r.who, r.table, r.size || 1, {
    reserved: true,
    patience: customerTypes[r.type].patience + 4,
    happiness: late ? 70 : 85
  });
  story.push(late ? `${r.who.name} waited at the door, then got their table.` : `${r.who.name} arrived to a table that was ready.`);
  addEvent(`${r.who.name} arrives for Table ${r.table + 1}.`);
  renderBoard();
}

function missReservation(r) {
  r.state = "missed";
  outcomes.turnedAway += r.size || 1;
  effects.reservationsMissed++;
  const n = r.table + 1;
  const why = dirtyTables.includes(r.table) ? `Table ${n} was never cleaned` : `someone was still at Table ${n}`;
  cafe.rep[r.type] = Math.max(0, cafe.rep[r.type] - 0.8);
  story.push(`${r.who.name}'s booking fell through because ${why}.`);
  addEvent(`${r.who.name} gave up waiting and left.`, true);
  renderBoard();
}

function updateLiveAct(dt) {
  if (!liveAct) return;
  liveAct.t -= dt;
  customers.filter(c => isSeated(c) && c.type === "social").forEach(c => {
    c.happiness = Math.min(100, c.happiness + dt);
    c.boost = c.boost || "the live music";
  });
  if (liveAct.t > 0) return;
  const fans = customers.filter(c => isSeated(c) && c.type === "social").length;
  const tip = 2 + 2 * fans;
  sales += tip;
  story.push(`${liveAct.name}'s set drew ${fans} social guest${fans === 1 ? "" : "s"}. Tips: $${tip}.`);
  addEvent(`${liveAct.name} finishes. Tips: +$${tip}`);
  liveAct = null;
  renderBoard();
}

function reservationText(r) {
  if (r.state === "booked") return `arrives in ${Math.max(0, Math.ceil(r.at - elapsed()))}s${r.held ? " · table held" : ""}`;
  if (r.state === "blocked") return `waiting at the door · ${Math.max(0, Math.ceil(r.wait))}s. Clear the table!`;
  return r.state === "seated" ? "seated" : "gave up waiting";
}

function renderInbox() {
  document.getElementById("inboxCount").textContent = requests.length || "";
  document.getElementById("inboxList").innerHTML = requests.map(r =>
    `<button class="attention-item" onclick="openFocus('request', ${r.id})"><strong>${esc(r.title)}</strong><progress id="rq-t-${r.id}" max="${requestTtl}" value="${r.ttl}" aria-label="Time to answer"></progress></button>`
  ).join("") || '<p class="muted empty">No requests</p>';
}

function renderBoard() {
  const rows = activeBookings().map(r =>
    `<button class="attention-item ${r.state}" onclick="openFocus('booking', ${r.id})"><strong>🔖 ${r.size || 1} guests · T${r.table + 1}</strong><small id="rv-${r.id}">${esc(reservationText(r))}</small></button>`);
  if (liveAct) rows.push(`<button class="attention-item" onclick="openFocus('live')"><strong>🎸 ${esc(liveAct.name)}</strong><small id="live-left">${Math.ceil(liveAct.t)}s left</small></button>`);
  document.getElementById("boardList").innerHTML = rows.join("") || '<p class="muted empty">No active bookings</p>';
}

// Cheap per-frame updates that never rebuild the buttons under the player's cursor.
function tickDesk() {
  requests.forEach(r => {
    const bar = document.getElementById(`rq-t-${r.id}`);
    if (bar) bar.value = Math.max(0, r.ttl);
  });
  reservations.forEach(r => {
    const el = document.getElementById(`rv-${r.id}`);
    const text = reservationText(r);
    if (el && el.textContent !== text) el.textContent = text;
  });
  if (focus.kind === "booking") {
    const booking = reservations.find(r => r.id === focus.id);
    if (booking) document.getElementById("serviceHelp").textContent = reservationText(booking);
  }
  const live = document.getElementById("live-left");
  if (live && liveAct) live.textContent = `${Math.max(0, Math.ceil(liveAct.t))}s left`;
}

document.getElementById("inboxList").addEventListener("click", event => {
  const button = event.target.closest("button[data-req]");
  if (button) resolveRequest(Number(button.dataset.req), button.dataset.answer === "yes");
});

// --------------------
// DAY PHASES, NEIGHBOURHOOD TRENDS & REVIEWS
// --------------------
// The day moves through three phases that reshape who walks in. A trend, known
// from the morning brief, pushes the whole neighbourhood in one direction.
// Customers then write reviews built from what actually happened to them, and
// the resulting rating nudges how busy the café is tomorrow.

const trends = [
  { id: "ordinary", title: "An ordinary day", weight: 2, bias: {}, rate: 1, noise: 0, stay: 0, drinks: [],
    blurb: "Nothing special is happening nearby." },
  { id: "exams", title: "Exam week", weight: 2, bias: { student: 5 }, rate: 1, noise: 0, stay: 3, drinks: ["espresso", "espresso"],
    blurb: "Students are flooding in, and they stay a while. Wi-Fi and quiet matter today." },
  { id: "festival", title: "Street festival", weight: 2, bias: { social: 5 }, rate: 0.8, noise: 2, stay: 0, drinks: ["latte", "latte"],
    blurb: "Crowds and noise spill in from outside. Expect a lively room." },
  { id: "market", title: "Market morning", weight: 2, bias: { regular: 5 }, rate: 0.95, noise: 0, stay: 0, drinks: [],
    blurb: "Neighbours stop by on their way home. Regulars are out in force." },
  { id: "cold", title: "Cold snap", weight: 2, bias: {}, rate: 1, noise: 0, stay: 2, drinks: ["latte", "latte", "tea", "tea"],
    blurb: "Everyone wants something warm. Lattes and tea lead, and the machine will be busy." },
  { id: "rain", title: "Rainy day", weight: 1, bias: { student: 2, regular: 2 }, rate: 1.25, noise: -1, stay: 4, drinks: ["tea"],
    blurb: "Fewer people come out, but those who do stay and stay." }
];

function getTrend() {
  if (!cafe.trend || cafe.trend.day !== cafe.day) {
    const previous = cafe.trend && cafe.trend.id;
    const id = !cafe.trend && cafe.day === 1
      ? "ordinary"   // a gentle first day
      : pickOne(trends.filter(t => t.id !== previous).flatMap(t => Array(t.weight).fill(t.id)));
    cafe.trend = { day: cafe.day, id };
    saveGame();
  }
  return trends.find(t => t.id === cafe.trend.id) || trends[0];
}

const phases = [
  { name: "Morning", from: 0, rate: 1.2, bias: { student: 2, regular: 2 }, tint: "rgba(255, 214, 140, 0.10)",
    line: "Morning: a gentle start. Students and regulars drift in." },
  { name: "Lunch rush", from: 20, rate: 0.8, bias: { social: 3 }, tint: "rgba(255, 255, 255, 0)",
    line: "Lunch rush: the room is filling up fast." },
  { name: "Evening", from: 42, rate: 1, bias: { student: 3, regular: 1 }, tint: "rgba(110, 80, 150, 0.14)",
    line: "Evening: things slow down and people settle in." }
];
let phaseIndex = -1;

function currentPhase() {
  const t = elapsed();
  let phase = phases[0];
  for (const p of phases) if (t >= p.from) phase = p;
  return phase;
}

function updatePhase(announce = true) {
  const phase = currentPhase();
  const index = phases.indexOf(phase);
  if (index === phaseIndex) return;
  phaseIndex = index;
  document.getElementById("phaseName").textContent = phase.name;
  document.getElementById("trendName").textContent = getTrend().title;
  if (announce) addEvent(phase.line);
}

function pushBias(choices) {
  for (const source of [getTrend().bias, currentPhase().bias]) {
    for (const [type, count] of Object.entries(source)) {
      for (let i = 0; i < count; i++) choices.push(type);
    }
  }
}

// A good rating brings a few more people through the door; a poor one, fewer.
const ratingRate = () => 1 - Math.max(-0.12, Math.min(0.12, (cafe.rating - 3) * 0.06));
const starString = n => "★".repeat(n) + "☆".repeat(5 - n);

// ---- Reviews ----

let reviews = [];

function recordReview(c, outcome) {
  let stars = Math.max(1, Math.min(5, Math.round(c.happiness / 20)));
  if (outcome === "unserved") stars = Math.min(stars, 2);
  reviews.push({
    name: c.name, type: c.type, drink: c.drink, stars, outcome,
    cause: c.cause || (outcome === "unserved" ? "they waited too long" : ""),
    boost: c.boost || "",
    loud: !!c.complaintMade,
    wifi: cafe.wifi > 0,
    reserved: !!c.reserved,
    longWait: (c.waited || 0) > c.patience * 0.7
  });
}

const reviewOpeners = {
  5: ["A real find.", "Instantly my new spot.", "Warm, calm, lovely."],
  4: ["Really nice little café.", "Would happily come back.", "Good vibes."],
  3: ["Decent, with a catch.", "Fine. Not perfect.", "Mixed feelings."],
  2: ["Not the best visit.", "Wanted to like it.", "A rough one."],
  1: ["Sadly, no.", "Would not repeat.", "Disappointing."]
};

function writeReview(r) {
  const bits = [];
  if (r.outcome === "unserved") bits.push("I never even got my drink.");
  if (r.stars <= 3 && r.cause) bits.push(`Lost a star because ${r.cause}.`);
  if (r.stars >= 3 && r.boost) bits.push(`The highlight: ${r.boost}.`);
  if (r.loud && r.stars <= 3) bits.push("Far too loud for me.");
  if (r.type === "student" && r.wifi && r.stars >= 3) bits.push("The Wi-Fi was a lifesaver.");
  if (r.reserved) bits.push(r.stars >= 4 ? "They had our table ready." : "Even with a booking it wasn't smooth.");
  if (r.longWait && r.stars >= 3) bits.push("A bit of a wait, though.");
  if (r.outcome !== "unserved") {
    if (r.stars >= 4) bits.push(`The ${r.drink} was ${pickOne(["spot on", "just right"])}.`);
    else if (r.stars <= 2) bits.push(`The ${r.drink} was meh.`);
  }
  return [pickOne(reviewOpeners[r.stars]), ...bits.slice(0, 2)].join(" ");
}

function renderReviews() {
  const box = document.getElementById("resultReviews");
  const line = document.getElementById("resultRating");
  if (!reviews.length) {
    line.textContent = "No reviews today. Nobody stayed long enough to write one.";
    box.innerHTML = "";
    return;
  }
  const average = reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;
  cafe.rating = Math.round((cafe.rating * 0.6 + average * 0.4) * 100) / 100;
  line.textContent = `Today ★ ${average.toFixed(1)} from ${reviews.length} visit${reviews.length === 1 ? "" : "s"} · ` +
    `neighbourhood rating ★ ${cafe.rating.toFixed(1)}`;

  const sorted = [...reviews].sort((a, b) => a.stars - b.stars);
  const chosen = new Set([sorted[0], sorted[sorted.length - 1]]);
  const rest = reviews.filter(r => !chosen.has(r)).sort(() => Math.random() - 0.5);
  while (chosen.size < Math.min(4, reviews.length) && rest.length) chosen.add(rest.pop());

  box.innerHTML = [...chosen].sort((a, b) => b.stars - a.stars).map(r =>
    `<div class="review"><div class="stars" aria-label="${r.stars} out of 5 stars">${starString(r.stars)}</div>` +
    `<p>“${esc(writeReview(r))}”</p><small>${esc(r.name)}, ${esc(r.type)}</small></div>`).join("");
}

// --------------------
// CUSTOMER OUTCOMES
// --------------------

function adjustRep(customer, amount, fallback) {
  const r = cafe.rep;
  r[customer.type] = Math.max(0, Math.min(6, r[customer.type] + amount));
  story.push(amount > 0
    ? `${customer.name} (${customer.type}) left happy${customer.boost ? " because " + customer.boost : ""}.`
    : `${customer.name} (${customer.type}) left unhappy because ${customer.cause || fallback}.`);
}

function recordOutcome(customer, outcome) {
  if (customer.outcomeRecorded) return;

  customer.outcomeRecorded = true;
  outcomes[outcome]++;

  // Only customers who actually sat down contribute reviews
  satisfactionTotal += Math.max(0, Math.min(100, customer.happiness));
  completedVisits++;
  recordReview(customer, outcome);
  const relief = neighbourRelief.get(customer.id);
  if (outcome === "happy" && relief && !neighbourLinks().some(link => link.kind === "annoy" && link.quiet.id === customer.id)) {
    emergenceMoments.set(`guest-${customer.id}`, { kind: "recovery", priority: 4, at: emergenceClock,
      text: `${customer.name} left happy after ${relief.followUp}.` });
  }
}

function leaveCustomer(customer) {
  if (["leaving", "gone"].includes(customer.state)) return;

  const wasServed = customer.state === "drinking";

  if (wasServed) {
    const outcome = customer.happiness >= 60 ? "happy" : "unhappy";

    recordOutcome(customer, outcome);
    adjustRep(customer, outcome === "happy" ? 0.5 : -0.3, "the visit fell flat");

    addEvent(
      outcome === "happy"
        ? `A satisfied ${customer.type} finished and left. ♥`
        : `A ${customer.type} finished but was unhappy.`,
      outcome === "unhappy"
    );
  } else {
    recordOutcome(customer, "unserved");
    adjustRep(customer, -0.3, "they waited too long");
    addEvent(`A ${customer.type} left without being served.`, true);
  }

  if (customer.reserved) {
    if (wasServed && customer.happiness >= 60) {
      cafe.rep[customer.type] = Math.min(6, cafe.rep[customer.type] + 0.5);
      sales += 3;
      story.push(`${customer.name}'s reservation paid off. They left a $3 tip.`);
    } else {
      cafe.rep[customer.type] = Math.max(0, cafe.rep[customer.type] - 0.5);
      story.push(`${customer.name} booked a table and left disappointed. Word gets around.`);
    }
  }

  const reg = cafe.regulars[customer.name];
  if (reg && customer.type === "regular") {
    reg.visits++;
    reg.mood += wasServed && customer.happiness >= 60 ? 1 : -1;
    if (reg.mood < -1) story.push(`${customer.name} may not come back.`);
  }

  cancelOrder(customer.id);

  customer.state = "leaving";
  customer.timer = 0;

  if (!customers.some(c => c.table === customer.table && stillInside(c)) &&
      !dirtyTables.includes(customer.table)) {
    dirtyTables.push(customer.table);
  }

  if (selectedCustomer === customer.id) {
    selectedCustomer = null;
    document.getElementById("selectedCustomer").textContent = "None";
  }
  renderWaiting();
  updateCustomerControls();
}

// --------------------
// CUSTOMER BEHAVIOR
// --------------------

function addLink(a, b, kind, text) {
  links.push({ a, b, kind });
  const key = kind + [a.id, b.id].sort().join("-");
  if (!seenLinks.has(key)) {
    seenLinks.add(key);
    story.push(text);
    addEvent(text, kind === "annoy");
  }
}

// One pure rule serves both the live simulation and the seating forecast.
function neighbourEffect(a, b) {
  if (a.partyId != null && a.partyId === b.partyId) return null;
  if (Math.hypot(a.x - b.x, a.y - b.y) > 270) return null;
  const loudA = a.type === "social" && !(a.quietFor > 0);
  const loudB = b.type === "social" && !(b.quietFor > 0);
  const damp = Math.max(0.3, 1 - cafe.sound * 0.2);
  if (loudA && b.type === "student" || loudB && a.type === "student") {
    const loud = loudA ? a : b, quiet = loudA ? b : a;
    return { kind: "annoy", aRate: loudA ? 0.8 * damp : -2.5 * damp,
      bRate: loudA ? -2.5 * damp : 0.8 * damp, loud, quiet,
      text: `${quiet.name} is distracted by ${loud.name}'s table.` };
  }
  if (loudA && loudB || a.type === "regular" && b.type === "regular") {
    const rate = 0.8 * (loudA && loudB ? damp : 1);
    return { kind: "buzz", aRate: rate, bRate: rate,
      boost: "good company was nearby", text: `${a.name} and ${b.name} are hitting it off${loudA && loudB && cafe.sound > 0 ? " (panels soften their buzz)" : ""}.` };
  }
  if (a.type === "student" && b.type === "student") {
    return { kind: "buzz", aRate: 0.4, bRate: 0.4,
      boost: "the quiet suited studying", text: `${a.name} and ${b.name} are studying side by side.` };
  }
  return null;
}

function neighbourLinks(guests = customers.filter(isSeated)) {
  const result = [];
  for (let i = 0; i < guests.length; i++) {
    for (let j = i + 1; j < guests.length; j++) {
      const a = guests[i], b = guests[j], effect = neighbourEffect(a, b);
      if (effect) result.push({ a, b, ...effect });
    }
  }
  return result;
}

function roomNoise(guests = customers.filter(stillInside)) {
  const social = guests.filter(c => c.type === "social" && !(c.quietFor > 0)).length;
  return Math.max(0, cafe.music + social * 2 + Math.max(0, guests.length - 3) +
    (liveAct ? 3 : 0) + getTrend().noise - cafe.sound * 2);
}

function connectionKey(effect) {
  return `${effect.kind}:${[effect.a.table, effect.b.table].sort((a, b) => a - b).join(":")}`;
}

function showNeighbourReaction(customer, kind, sourceId = null) {
  const current = neighbourReactions.get(customer.id);
  if (current && emergenceClock - current.at < 2.2 && current.kind === "distracted" && kind !== "relief") return;
  neighbourReactions.set(customer.id, { kind, sourceId, at: emergenceClock });
}

function trackNeighbourEpisodes(effects, dt) {
  if (dt <= 0) return;
  emergenceClock += dt;
  const groups = new Map();
  for (const effect of effects) {
    if (effect.kind === "annoy") neighbourExposure.set(effect.quiet.id, emergenceClock);
    const parties = [effect.a.partyId ?? effect.a.id, effect.b.partyId ?? effect.b.id].sort((a, b) => a - b);
    const key = `${connectionKey(effect)}:${parties.join(":")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(effect);
  }
  const next = new Map();
  for (const [key, group] of groups) {
    const first = group[0];
    const episode = neighbourEpisodes.get(key) || { duration: 0, recorded: false };
    if (!neighbourEpisodes.has(key) && emergenceClock - (neighbourCooldowns.get(key) ?? -Infinity) >= 7) {
      neighbourCooldowns.set(key, emergenceClock);
      connectionFlashes.set(connectionKey(first), { at: emergenceClock });
      const guests = new Map();
      for (const effect of group) {
        for (const [guest, rate, other] of [[effect.a, effect.aRate, effect.b], [effect.b, effect.bRate, effect.a]]) {
          const existing = guests.get(guest.id);
          if (!existing || rate < existing.rate) guests.set(guest.id, { guest, rate, other });
        }
      }
      for (const { guest, rate, other } of guests.values()) {
        showNeighbourReaction(guest, rate < 0 ? "distracted" : first.kind === "annoy" ? "energy"
          : guest.type === "student" && other.type === "student" ? "study" : "company", other.id);
      }
    }
    episode.duration += dt;
    if (!episode.recorded && episode.duration >= 2) {
      episode.recorded = true;
      if (first.kind === "annoy") {
        for (const effect of group) emergenceMoments.set(`guest-${effect.quiet.id}`, {
          kind: "distraction", priority: 2, at: emergenceClock,
          text: `${effect.quiet.name} was distracted by ${effect.loud.name}'s lively table.`
        });
      } else emergenceMoments.set(`company-${key}`, {
        kind: "company", priority: 1, at: emergenceClock,
        text: first.a.type === "student" && first.b.type === "student"
          ? `${first.a.name} and ${first.b.name} found a good spot to study near each other.`
          : `${first.a.name} and ${first.b.name} hit it off across neighbouring tables.`
      });
    }
    next.set(key, episode);
  }
  neighbourEpisodes = next;
  for (const [id, reaction] of neighbourReactions) if (emergenceClock - reaction.at >= 2.2) neighbourReactions.delete(id);
  for (const [key, flash] of connectionFlashes) if (emergenceClock - flash.at >= 2.6) connectionFlashes.delete(key);
}

// Record an observed improvement after an actual seating or quiet intervention.
function noteNeighbourRelief(before, action, followUp) {
  const stillDistracted = new Set(neighbourLinks().filter(link => link.kind === "annoy").map(link => link.quiet.id));
  for (const effect of before.filter(link => link.kind === "annoy")) {
    const guest = effect.quiet;
    if (!isSeated(guest) || !neighbourExposure.has(guest.id) || stillDistracted.has(guest.id)) continue;
    const prior = neighbourRelief.get(guest.id);
    if (prior?.at === emergenceClock) continue;
    neighbourRelief.set(guest.id, { action, followUp, at: emergenceClock });
    showNeighbourReaction(guest, "relief");
    emergenceMoments.set(`guest-${guest.id}`, { kind: "relief", priority: 3, at: emergenceClock,
      text: `${action} stopped the distraction for ${guest.name}.` });
  }
}

function renderEmergenceSummary() {
  const moments = [...emergenceMoments.values()].sort((a, b) => b.priority - a.priority || b.at - a.at).slice(0, 3);
  document.getElementById("emergenceSummary").hidden = !moments.length;
  document.getElementById("emergenceMoments").innerHTML = moments.map(moment =>
    `<li class="moment-${moment.kind}"><span aria-hidden="true">${moment.kind === "distraction" ? "!" : moment.kind === "company" ? "♡" : "✓"}</span><p>${esc(moment.text)}</p></li>`).join("");
}

function applyNeighborEffects(inside, dt) {
  links = [];
  const effects = neighbourLinks(inside.filter(isSeated));
  trackNeighbourEpisodes(effects, dt);
  for (const effect of effects) {
    const { a, b, aRate, bRate, kind, text } = effect;
    a.happiness += aRate * dt;
    b.happiness += bRate * dt;
    if (kind === "annoy") {
      effect.quiet.cause = `${effect.loud.name}'s lively table sat too close`;
      effect.loud.boost = "the room had energy";
    } else a.boost = b.boost = effect.boost;
    addLink(a, b, kind, text);
  }
}

function updateCustomers(dt) {
  const inside = customers.filter(c =>
    !["leaving", "gone"].includes(c.state)
  );

  noise = roomNoise(inside);

  applyNeighborEffects(inside, dt);

  customers.forEach(c => {
    c.quietFor = Math.max(0, (c.quietFor || 0) - dt);
    c.waterFeedback = Math.max(0, (c.waterFeedback || 0) - dt);
    const traits = customerTypes[c.type];

    if (c.state === "walking") {
      const dx = c.targetX - c.x;
      const dy = c.targetY - c.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 4) {
        c.x = c.targetX;
        c.y = c.targetY;
        c.state = "waiting";
        c.timer = 0;
      } else {
        const step = Math.min(distance, 110 * dt);
        c.x += dx / distance * step;
        c.y += dy / distance * step;
      }
    }

    else if (c.state === "waiting") {
      c.timer += dt;
      c.happiness -= 1.5 * dt;

      if (c.timer >= c.patience) {
        c.happiness -= 20;
        leaveCustomer(c);
      }
    }

    else if (c.state === "drinking") {
      c.timer += dt;

      // Noise affects customers differently
      if (noise > traits.noiseTolerance) {
        c.cause = "the café was too noisy";
        c.happiness -= 4 * dt;

        if (!c.complaintMade && c.timer > 2) {
          c.complaintMade = true;
          effects.noiseComplaints++;
          addEvent(`A ${c.type} thinks the café is too noisy!`, true);
        }
      }

      if (c.type === "student" && cafe.wifi > 0) {
        c.happiness += 0.4 * dt;
      }

      const stayTime = c.visitLength ?? visitDuration(c);
      if (c.happiness < 30 || c.timer >= stayTime) leaveCustomer(c);
      else considerStudentRefill(c);
    }

    else if (c.state === "leaving") {
      const dx = entrance.x - c.x;
      const dy = entrance.y - c.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 5) {
        c.state = "gone";
      } else {
        const step = Math.min(distance, 130 * dt);
        c.x += dx / distance * step;
        c.y += dy / distance * step;
      }
    }

    c.happiness = Math.max(0, Math.min(100, c.happiness));
  });

  customers = customers.filter(c => c.state !== "gone");
}

// --------------------
// CLICK INTERACTIONS
// --------------------

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const scaleX = rect.width / canvas.offsetWidth;
  const scaleY = rect.height / canvas.offsetHeight;
  const drawingScale = Math.min(canvas.clientWidth / sceneSize.width, canvas.clientHeight / sceneSize.height);
  if (drawingScale <= 0) return null;
  const offsetX = (canvas.clientWidth - sceneSize.width * drawingScale) / 2;
  const offsetY = (canvas.clientHeight - sceneSize.height * drawingScale) / 2;
  const x = ((event.clientX - rect.left) / scaleX - canvas.clientLeft - offsetX) / drawingScale;
  const y = ((event.clientY - rect.top) / scaleY - canvas.clientTop - offsetY) / drawingScale;
  return { x, y, inside: x >= 0 && x <= sceneSize.width && y >= 0 && y <= sceneSize.height };
}

function guestAtPoint(point) {
  if (!point?.inside) return null;
  return customers.slice().reverse().find(c => isSeated(c) &&
    (Math.hypot(c.x - point.x, c.y - point.y) < 24 ||
      Math.hypot(c.x - point.x, c.y - 41 - point.y) < 18));
}

function dropTableAt(point) {
  if (!point?.inside) return null;
  let best = null, distance = Infinity;
  for (let t = 0; t < cafe.tables; t++) {
    const table = tablePositions[t], art = tableArtwork(t);
    const left = Math.min(-art.width / 2, ...art.chairs.map(c => c.x)) - 8;
    const right = Math.max(art.width / 2, ...art.chairs.map(c => c.x + c.width)) + 8;
    if (point.x < table.x + left || point.x > table.x + right ||
        point.y < table.y - 55 || point.y > table.y + 112) continue;
    const d = Math.hypot(point.x - table.x, point.y - table.y - 25);
    if (d < distance) { best = t; distance = d; }
  }
  return best;
}

function draggingParty() {
  const customer = guestDrag?.active && findCustomer(guestDrag.customerId);
  return customer && isSeated(customer) ? partyOf(customer) : [];
}

function dragMessage() {
  const group = draggingParty();
  if (!group.length) return "";
  const table = guestDrag.target;
  if (table === group[0].table) return "Original table · release here to keep the party in place.";
  if (table == null) return `Time held · Moving ${group.length} guests together. Drop on a highlighted table · Escape cancels.`;
  const blocked = tableBlockReason(table, group.length);
  return blocked ? `T${table + 1}: ${blocked}. Choose a highlighted table.`
    : `Time held · Release to move ${group.length} guests to T${table + 1} · ${activeSeatingPreview()?.label || ""} · mood −4 each · drinks kept.`;
}

function updateDragHint() {
  const hint = document.getElementById("dragHint");
  hint.hidden = !guestDrag?.active;
  const message = dragMessage();
  if (hint.textContent !== message) hint.textContent = message;
}

function cancelGuestDrag() {
  const pointerId = guestDrag?.pointerId;
  if (guestDrag?.active) suppressCanvasClick = true;
  guestDrag = null;
  canvas.classList.remove("is-dragging");
  document.getElementById("dragHint").hidden = true;
  if (pointerId != null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
}

canvas.addEventListener("pointerdown", event => {
  if (!running || event.isPrimary === false || event.button !== 0) return;
  suppressCanvasClick = false;
  const point = canvasPoint(event);
  if (problemAtPoint(point)) return;
  const customer = guestAtPoint(point);
  if (!customer) return;
  guestDrag = { pointerId: event.pointerId, customerId: customer.id,
    startX: event.clientX, startY: event.clientY, point, active: false, target: null };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", event => {
  hoveredTable = tableAtPoint(canvasPoint(event));
  if (focus.kind === "waiting") setSeatingPreview(hoveredTable);
  if (!guestDrag || guestDrag.pointerId !== event.pointerId) return;
  if (!guestDrag.active && Math.hypot(event.clientX - guestDrag.startX, event.clientY - guestDrag.startY) < 7) return;
  if (!guestDrag.active) {
    guestDrag.active = true;
    openFocus("customer", guestDrag.customerId);
    canvas.classList.add("is-dragging");
  }
  event.preventDefault();
  guestDrag.point = canvasPoint(event);
  guestDrag.target = dropTableAt(guestDrag.point);
  updateDragHint();
});

canvas.addEventListener("pointerup", event => {
  if (!guestDrag || guestDrag.pointerId !== event.pointerId) return;
  const drag = guestDrag;
  const target = dropTableAt(canvasPoint(event));
  if (drag.active) suppressCanvasClick = true;
  cancelGuestDrag();
  if (!drag.active) return;
  if (target == null) managerFeedback("Move cancelled. Drop on a highlighted table to move the party.");
  else movePartyTo(drag.customerId, target);
});

canvas.addEventListener("pointerleave", () => {
  hoveredTable = null;
  if (focus.kind === "waiting") setSeatingPreview(null);
});

canvas.addEventListener("pointercancel", () => {
  suppressCanvasClick = !!guestDrag?.active;
  cancelGuestDrag();
});
canvas.addEventListener("lostpointercapture", () => { if (guestDrag) cancelGuestDrag(); });
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !guestDrag?.active && focus.kind !== "none") openFocus("none");
  if (event.key === "Escape" && guestDrag) {
    suppressCanvasClick = guestDrag.active;
    cancelGuestDrag();
    event.preventDefault();
  }
});

canvas.addEventListener("click", event => {
  if (suppressCanvasClick) { suppressCanvasClick = false; return; }
  if (!running) return;
  const point = canvasPoint(event);
  if (!point?.inside) return;
  const { x, y } = point;

  const problem = problemAtPoint(point);
  if (problem) { openFocus("problem", problem.id); return; }

  if (x >= coffeeMachineArea.x &&
      x <= coffeeMachineArea.x + coffeeMachineArea.width &&
      y >= coffeeMachineArea.y &&
      y <= coffeeMachineArea.y + coffeeMachineArea.height) {
    useCoffeeMachine();
    return;
  }

  const guest = guestAtPoint(point);
  if (guest) {
    if (tickets.some(t => t.state === "carried")) deliverCoffee(guest);
    openFocus("customer", guest.id);
    return;
  }

  for (let i = 0; i < cafe.tables; i++) {
    const table = tablePositions[i];
    const artwork = tableArtwork(i);

    if (Math.abs(table.x - x) < artwork.width / 2 && y > table.y - 14 && y < table.y + 20) {
      if (carriedTickets().some(t => findCustomer(t.id)?.table === i)) { deliverTrayToTable(i); return; }
      if (focus.kind === "waiting") {
        const party = waitingParties.find(p => p.id === focus.id);
        if (party && availableTables(party.size).includes(i)) {
          seatWaiting(party.id, i);
          return;
        }
      }
      openFocus("table", i);
      return;
    }
  }
});

// --------------------
// DRAWING
// --------------------

function drawCircle(x, y, r, color, context = ctx) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2);
  context.fill();
}

function prepareSceneCanvas(target) {
  const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  const width = Math.round(sceneSize.width * ratio);
  const height = Math.round(sceneSize.height * ratio);
  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
  const context = target.getContext("2d");
  context.setTransform(width / sceneSize.width, 0, 0, height / sceneSize.height, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return context;
}

// Width determines height so none of the source artwork gets stretched.
function drawAsset(name, x, y, width, context) {
  const asset = sceneAssets[name];
  const height = width * asset.crop[3] / asset.crop[2];
  context.drawImage(asset.image, ...asset.crop, x, y, width, height);
}

function drawChair(table, chair, context) {
  context.save();
  context.translate(table.x + chair.x + (chair.mirrored ? chair.width : 0), table.y + chair.y);
  if (chair.mirrored) context.scale(-1, 1);
  drawAsset(chair.asset || "chair", 0, 0, chair.width, context);
  context.restore();
}

function groupedRelationships(effects) {
  const groups = new Map();
  for (const effect of effects) {
    const tables = [effect.a.table, effect.b.table].sort((a, b) => a - b);
    const key = `${tables.join(":")}:${effect.kind}`;
    if (!groups.has(key)) groups.set(key, { ...effect, count: 0 });
    groups.get(key).count++;
  }
  return [...groups.values()];
}

function drawRelationshipLines(context, effects, forecast = false) {
  context.save();
  for (const link of groupedRelationships(effects)) {
    const start = tablePositions[link.a.table], end = tablePositions[link.b.table];
    const middleX = (start.x + end.x) / 2, middleY = (start.y + end.y) / 2 + 22;
    const color = link.kind === "annoy" ? "#a55b3e" : "#687946";
    const flash = !forecast && connectionFlashes.get(connectionKey(link));
    const fresh = flash && emergenceClock - flash.at < 2.6;
    context.strokeStyle = color;
    context.lineWidth = fresh ? 3.5 : 1.5 + Math.min(1, link.count * 0.15);
    context.globalAlpha = forecast ? 0.85 : fresh ? reducedSceneMotion ? 0.9 : 0.95 - (emergenceClock - flash.at) * 0.2 : 0.26;
    context.setLineDash(forecast || link.kind === "annoy" ? [6, 6] : []);
    context.beginPath();
    context.moveTo(start.x, start.y + 28);
    context.quadraticCurveTo(middleX, middleY - 28, end.x, end.y + 28);
    context.stroke();
    context.setLineDash([]);
    context.globalAlpha = 0.95;
    drawCircle(middleX, middleY - 11, fresh ? 12 : 9, "#fffaf3", context);
    context.fillStyle = color;
    context.textAlign = "center";
    context.font = "bold 12px sans-serif";
    context.fillText(link.kind === "annoy" ? "!" : "+", middleX, middleY - 7);
  }
  context.restore();
}

function drawRoomAtmosphere(context) {
  context.save();
  context.beginPath();
  context.rect(40, 218, 920, 300);
  context.clip();
  const volume = roomNoise();
  context.fillStyle = `rgba(179, 94, 45, ${Math.min(0.07, volume * 0.005)})`;
  context.fillRect(40, 218, 920, 300);
  const sources = new Map();
  for (const c of customers.filter(isSeated)) {
    if (c.type === "social" && !(c.quietFor > 0)) sources.set(c.table, (sources.get(c.table) || 0) + 1);
  }
  for (const [table, count] of sources) {
    const position = tablePositions[table];
    const strength = Math.min(0.22, 0.07 + count * 0.035) * Math.max(0.3, 1 - cafe.sound * 0.2);
    const glow = context.createRadialGradient(position.x, position.y + 25, 15,
      position.x, position.y + 25, 220);
    glow.addColorStop(0, `rgba(194, 98, 41, ${strength})`);
    glow.addColorStop(1, "rgba(194, 98, 41, 0)");
    context.fillStyle = glow;
    context.fillRect(position.x - 220, position.y - 195, 440, 440);
  }
  context.restore();
}

function drawSeatingGhosts(context, forecast, table, foreground) {
  if (!forecast || forecast.blocked || forecast.table !== table) return;
  context.save();
  context.globalAlpha = 0.45;
  for (const ghost of forecast.ghosts) {
    if (!!tableArtwork(table).chairs[ghost.seatIndex].foreground !== foreground) continue;
    drawCustomerBody(ghost, context);
    context.shadowColor = "#d9a441"; context.shadowBlur = 14;
    drawCircle(ghost.x, ghost.y + 20, 20, "#d9a44133", context);
    context.shadowBlur = 0;
  }
  context.restore();
}

function updateRoomInsights() {
  const all = groupedRelationships(neighbourLinks());
  const groups = all.slice().sort((a, b) => (b.kind === "annoy") - (a.kind === "annoy"));
  const html = groups.slice(0, 3).map(link => `<button class="room-insight ${link.kind}"
    onclick="openFocus('customer', ${link.kind === "annoy" ? link.quiet.id : link.a.id})">
    <span aria-hidden="true">${link.kind === "annoy" ? "!" : "+"}</span>${esc(link.text)}</button>`).join("") +
    (all.length > 3 ? `<span class="insight-more">${all.length - 3} more table connections drawn in the room</span>` : "");
  const container = document.getElementById("roomInsights");
  const markup = html || '<span class="muted">Seat parties near each other to see who helps or distracts whom.</span>';
  if (container.dataset.key !== markup) { container.innerHTML = markup; container.dataset.key = markup; }
}


// --------------------
// TABLE GLOW + SHOP SPOTS
// --------------------

function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// A crisp floor marker stays readable against the painted wood.
function drawTableGlow(context, table, artwork, color, strong) {
  const rx = artwork.width / 2 + 30;
  const ry = 47;
  context.save();
  context.beginPath();
  context.ellipse(table.x, table.y + 52, rx, ry, 0, 0, Math.PI * 2);
  context.fillStyle = withAlpha(color, strong ? 0.18 : 0.09);
  context.fill();
  context.strokeStyle = "#fffaf0";
  context.lineWidth = strong ? 8 : 6;
  context.stroke();
  context.strokeStyle = color;
  context.lineWidth = strong ? 4 : 2.5;
  context.stroke();
  context.restore();
}

const shopCosts = { tables: 40 };
let shopHotspots = [], shopHover = null, shopFlash = null;

function drawPill(context, x, y, text, state) {
  context.save();
  context.font = "600 13px -apple-system, Segoe UI, sans-serif";
  const w = context.measureText(text).width + 52;
  const h = 36;
  const cx = Math.max(w / 2 + 8, Math.min(sceneSize.width - w / 2 - 8, x));
  const left = cx - w / 2;
  const top = y - h / 2;
  const active = state === "hover";
  const disabled = state === "disabled";
  const accent = disabled ? "#766755" : "#59633d";

  context.shadowColor = "rgba(61, 48, 37, 0.22)";
  context.shadowBlur = 5;
  context.shadowOffsetY = 2;
  context.fillStyle = active ? "#59633d" : "#fffaf0";
  context.beginPath();
  context.roundRect(left, top, w, h, 8);
  context.fill();
  context.shadowColor = "transparent";
  context.strokeStyle = active ? "#fffaf0" : accent;
  context.lineWidth = active ? 2.5 : 1.5;
  context.stroke();

  drawCircle(left + 18, y, 10, active ? "#fffaf0" : accent, context);
  context.fillStyle = active ? "#59633d" : "#fffaf0";
  context.font = "600 16px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(disabled ? "−" : "+", left + 18, y + 1);
  context.font = "600 13px -apple-system, Segoe UI, sans-serif";
  context.fillStyle = active ? "#fffaf0" : disabled ? "#766755" : "#3d3025";
  context.textAlign = "left";
  context.fillText(text, left + 35, y + 1);
  context.restore();
  return { x: left, y: top, w, h };
}

// Setup only: named purchase tags identify the next available upgrades.
function drawShopSpots(context) {
  shopHotspots = [];
  const labels = { tables: "Table" };
  const add = (kind, x, y, w, h, tagY, ghost) => {
    const cost = shopCosts[kind];
    const affordable = cafe.budget >= cost;
    const hover = shopHover === kind;
    context.save();
    context.globalAlpha = hover ? 0.9 : 0.55;
    ghost();
    context.restore();
    const tag = drawPill(context, x, tagY, `${labels[kind]} · $${cost}`, !affordable ? "disabled" : hover ? "hover" : "idle");
    shopHotspots.push({ kind, cost, x: x - w / 2, y: y - h / 2, w, h, tag });
  };
  if (cafe.tables < 6) {
    const t = tablePositions[cafe.tables], art = tableArtwork(cafe.tables);
    drawTableGlow(context, t, art, "#59633d", shopHover === "tables");
    add("tables", t.x, t.y + 40, art.width, 110, t.y + 40, () => drawAsset(art.name, t.x - art.width / 2, t.y - 12, art.width, context));
  }
  if (shopFlash && performance.now() < shopFlash.until) {
    context.save(); context.font = "600 20px Georgia, serif"; context.textAlign = "center";
    context.fillStyle = "#fffaf0"; context.strokeStyle = "rgba(61,48,37,.7)"; context.lineWidth = 4;
    context.strokeText(shopFlash.text, shopFlash.x, shopFlash.y); context.fillText(shopFlash.text, shopFlash.x, shopFlash.y);
    context.restore();
  }
}

function shopPoint(event) {
  const r = event.currentTarget.getBoundingClientRect();
  return { x: (event.clientX - r.left) * sceneSize.width / r.width, y: (event.clientY - r.top) * sceneSize.height / r.height };
}
function shopHit(p) {
  const contains = bounds => p.x >= bounds.x && p.x <= bounds.x + bounds.w &&
    p.y >= bounds.y && p.y <= bounds.y + bounds.h;
  // Tags take priority when their edges overlap a nearby object's hit area.
  return shopHotspots.find(h => h.tag && contains(h.tag)) || shopHotspots.find(contains);
}

const setupCanvasEl = document.getElementById("setupCanvas");
setupCanvasEl.addEventListener("pointermove", event => {
  const hit = shopHit(shopPoint(event));
  const next = hit ? hit.kind : null;
  setupCanvasEl.style.cursor = hit ? "pointer" : "default";
  if (next !== shopHover) { shopHover = next; updateSetupPreview(); }
});
setupCanvasEl.addEventListener("pointerleave", () => { shopHover = null; updateSetupPreview(); });
setupCanvasEl.addEventListener("click", event => {
  const hit = shopHit(shopPoint(event));
  if (!hit) return;
  const before = cafe.budget;
  buyUpgrade(hit.kind, hit.cost);
  const bought = cafe.budget < before;
  shopFlash = { text: bought ? `\u2212$${hit.cost}` : "Not enough money", x: hit.x + hit.w / 2, y: hit.y - 8, until: performance.now() + 1400 };
  updateSetupPreview();
  setTimeout(updateSetupPreview, 1450);
});

function drawCafe(target = canvas, preview = false) {
  const context = prepareSceneCanvas(target);
  context.clearRect(0, 0, sceneSize.width, sceneSize.height);
  drawAsset("room", 0, 0, sceneSize.width, context);
  const seatingPreview = !preview && activeSeatingPreview();
  if (!preview) {
    drawRoomAtmosphere(context);
    drawRelationshipLines(context, neighbourLinks());
    if (seatingPreview && !seatingPreview.blocked) drawRelationshipLines(context, seatingPreview.connections, true);
  }

  // Draw back to front. Seated heads sit between the chair and the tabletop.
  const layers = tablePositions.slice(0, cafe.tables).map((table, index) => ({
    y: table.y + 35, table, index
  }));
  if (!preview) {
    customers.filter(c => ["walking", "leaving"].includes(c.state))
      .forEach(customer => layers.push({ y: customer.y + 18, customer }));
  }
  layers.sort((a, b) => a.y - b.y);
  for (const layer of layers) {
    if (layer.customer) {
      drawCustomerBody(layer.customer, context);
      continue;
    }
    const { table, index } = layer;
    const artwork = tableArtwork(index);
    const trayTarget = !preview && carriedTickets().some(t => findCustomer(t.id)?.table === index);
    const party = !preview && focus.kind === "waiting" && waitingParties.find(p => p.id === focus.id);
    const moving = preview ? [] : draggingParty();
    const destination = moving.length && index !== moving[0].table && !tableBlockReason(index, moving.length);
    const dragHover = guestDrag?.active && guestDrag.target === index;
    if (trayTarget || party && availableTables(party.size).includes(index) || focus.kind === "table" && focus.id === index || destination || dragHover) {
      const forecast = party && seatingForecast(party, index);
      let tone = forecast?.tone === "risk" ? "#a55b3e" : forecast?.tone === "good" ? "#687946" : "#d9a441";
      if (moving.length) tone = dragHover && !destination && index !== moving[0].table ? "#a55b3e" : "#687946";
      drawTableGlow(context, table, artwork, tone, previewTable === index || dragHover);
    }
    // Round tables have opposing side chairs. Rectangles have two per long
    // edge, with front chairs drawn after the tabletop to preserve their backs.
    for (const chair of artwork.chairs.filter(chair => !chair.foreground)) {
      drawChair(table, chair, context);
    }
    if (!preview) {
      customers.filter(c => c.table === index && !artwork.chairs[c.seatIndex]?.foreground && ["waiting", "drinking"].includes(c.state))
        .forEach(c => drawCustomerBody(c, context));
    }
    drawSeatingGhosts(context, seatingPreview, index, false);
    drawAsset(artwork.name, table.x - artwork.width / 2, table.y - 12, artwork.width, context);
    drawSeatingGhosts(context, seatingPreview, index, true);
    if (!preview) customers.filter(c => c.table === index && artwork.chairs[c.seatIndex]?.foreground && isSeated(c))
      .forEach(c => drawCustomerBody(c, context));
    for (const chair of artwork.chairs.filter(chair => chair.foreground)) {
      drawChair(table, chair, context);
    }
    context.textAlign = "center";
    context.fillStyle = "#3d3025";
    context.font = "12px sans-serif";
    const occupied = preview ? 0 : customers.filter(c => c.table === index && stillInside(c)).length;
    const focused = focus.kind === "table" && focus.id === index ||
      focus.kind === "customer" && findCustomer(focus.id)?.table === index;
    const showTableLabel = !preview && (focused || hoveredTable === index || trayTarget ||
      !!party || !!destination || dragHover || seatingPreview?.table === index);
    if (showTableLabel) context.fillText(`T${index + 1} · ${occupied}/${artwork.chairs.length}`, table.x, table.y + 100);
    const booking = !preview && reservations.find(r => r.table === index && ["booked", "blocked"].includes(r.state));
    if (booking && (showTableLabel || focus.kind === "booking" && focus.id === booking.id)) {
      const tagY = table.y + 34;
      context.fillStyle = "#fffaf3";
      context.fillRect(table.x - 38, tagY - 10, 76, 20);
      context.strokeStyle = booking.state === "blocked" ? "#b66f51" : booking.held ? "#59633d" : "#d9cbb5";
      context.lineWidth = 2;
      context.strokeRect(table.x - 38, tagY - 10, 76, 20);
      context.fillStyle = "#3d3025";
      context.textAlign = "center";
      context.font = "11px sans-serif";
      context.fillText(`🔖 ${booking.size || 1} · ${Math.max(0, Math.ceil(booking.at - elapsed()))}s`, table.x, tagY + 4);
    }
    if (booking && !showTableLabel && !(focus.kind === "booking" && focus.id === booking.id)) {
      drawCircle(table.x, table.y + 34, 11, "#fffaf3", context);
      context.fillStyle = "#59633d";
      context.font = "13px sans-serif";
      context.fillText("🔖", table.x, table.y + 39);
    }
    if (!preview && dirtyTables.includes(index)) {
      drawCircle(table.x, table.y, 14, "#fffaf3", context);
      context.textAlign = "center";
      context.font = "20px Georgia";
      context.fillText("🧽", table.x, table.y + 6);
    }
  }

  if (preview) drawShopSpots(context);

  if (!preview) {
    context.fillStyle = currentPhase().tint;
    context.fillRect(0, 0, sceneSize.width, sceneSize.height);
  }

  if (!preview) drawProblems(context);

  if (!preview && tickets.some(t => t.state !== "queued")) {
    const machine = coffeeMachineArea;
    context.strokeStyle = tickets.some(t => t.state === "ready") ? "#f4d183" : "#fffaf3";
    context.lineWidth = 2;
    context.strokeRect(machine.x - 3, machine.y - 3, machine.width + 6, machine.height + 6);
  }
}

let artworkLoaded = false;
assetsReady.then(() => {
  artworkLoaded = failedAssets.length === 0;
  updateSetupPreview();
});

// Reuse the scene's cropped furniture artwork in the clickable shop card.
function drawShopTable() {
  const target = document.getElementById("shopTableCanvas");
  if (!target || !artworkLoaded) return;
  const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  target.width = Math.round(240 * ratio);
  target.height = Math.round(164 * ratio);
  const context = target.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, 240, 164);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const art = tableArtwork(Math.min(cafe.tables, 5));
  const table = { x: 120, y: 52 };
  for (const chair of art.chairs.filter(c => !c.foreground)) drawChair(table, chair, context);
  drawAsset(art.name, table.x - art.width / 2, table.y - 12, art.width, context);
  for (const chair of art.chairs.filter(c => c.foreground)) drawChair(table, chair, context);
}

function updateSetupPreview() {
  const preview = document.getElementById("setupCanvas");
  if (preview && artworkLoaded) {
    drawCafe(preview, true);
    drawShopTable();
  }
  for (const key of ["tables", "wifi", "sound"]) {
    const label = document.getElementById(`preview${key[0].toUpperCase()}${key.slice(1)}`);
    if (label) label.textContent = cafe[key];
  }
  const day = document.getElementById("setupDay");
  if (day) day.textContent = cafe.day;
}

function drawCustomerBody(c, context) {
  const carried = tickets.find(t => t.state === "carried" && t.id === c.id);
  if (selectedCustomer === c.id || carried) drawCircle(c.x, c.y, 24, carried ? "#f4d183" : "#fffaf3", context);
  drawCircle(c.x, c.y, 18, customerTypes[c.type].color, context);
  const reaction = neighbourReactions.get(c.id);
  const other = reaction && findCustomer(reaction.sourceId);
  const glance = !reducedSceneMotion && reaction && emergenceClock - reaction.at < 2.2 && other ? Math.sign(other.x - c.x) * 2 : 0;
  drawCircle(c.x - 5 + glance, c.y - 3, 2, "#49372e", context);
  drawCircle(c.x + 5 + glance, c.y - 3, 2, "#49372e", context);
  context.strokeStyle = "#49372e";
  context.lineWidth = 1.5;
  context.beginPath();
  if (c.happiness >= 60) context.arc(c.x, c.y + 3, 6, 0, Math.PI);
  else if (c.happiness < 40) context.arc(c.x, c.y + 11, 5, Math.PI, 2 * Math.PI);
  else { context.moveTo(c.x - 5, c.y + 7); context.lineTo(c.x + 5, c.y + 7); }
  context.stroke();
}

function drawDrinkIcon(x, y, drink, fill = 1, context = ctx) {
  context.fillStyle = "#fffaf3";
  context.fillRect(x - 7, y - 8, 14, 15);
  context.fillStyle = drink === "tea" ? "#7c8758" : drink === "latte" ? "#c08e60" : "#704b34";
  const height = Math.max(0, Math.min(1, fill)) * 11;
  context.fillRect(x - 5, y + 5 - height, 10, height);
  context.strokeStyle = "#49372e";
  context.lineWidth = 1.5;
  context.strokeRect(x - 7, y - 8, 14, 15);
  context.beginPath();
  context.arc(x + 8, y - 1, 4, -Math.PI / 2, Math.PI / 2);
  context.stroke();
}

function drawNeighbourReaction(customer, context = ctx) {
  const reaction = neighbourReactions.get(customer.id);
  if (!reaction || emergenceClock - reaction.at >= 2.2) return;
  const age = emergenceClock - reaction.at;
  const negative = reaction.kind === "distracted";
  const color = negative ? "#a55b3e" : "#687946";
  const symbols = { distracted: "!", company: "♡", study: "▤", energy: "♪", relief: "✓" };
  context.save();
  context.globalAlpha = reducedSceneMotion ? 1 : Math.min(1, (2.2 - age) / 0.6);
  // A short signed segment shows the neighbour mood change without a new meter.
  context.beginPath();
  context.arc(customer.x, customer.y, 27, -Math.PI / 2, -Math.PI / 2 + (negative ? -1 : 1) * Math.PI * 0.65, negative);
  context.strokeStyle = "#fffaf0";
  context.lineWidth = 6;
  context.stroke();
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.stroke();
  const x = customer.x - 30, y = customer.y - 24 - (reducedSceneMotion ? 0 : Math.min(4, age * 3));
  drawCircle(x, y, 12, "#fffaf0", context);
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = color;
  context.font = "bold 14px sans-serif";
  context.textAlign = "center";
  context.fillText(symbols[reaction.kind], x, y + 5);
  context.font = "bold 10px sans-serif";
  context.fillText(negative ? "−" : "+", customer.x + (negative ? -24 : 24), customer.y - 20);
  context.restore();
}

function drawCustomers() {
  customers.filter(isSeated).forEach(c => {
    const ticket = tickets.find(t => t.id === c.id);
    const selected = c.id === selectedCustomer;
    const waiting = needsDrink(c);
    const lowPatience = c.state === "waiting" && c.timer / c.patience >= 0.6 ||
      c.repeatPending && remainingVisit(c) <= 5;
    const lowMood = c.happiness < 50;
    const ready = ticket && ["ready", "carried"].includes(ticket.state);
    // Calm, served guests keep only the expression on their actual face.
    if (lowMood || selected) {
      const faceX = c.x - 32, faceY = c.y + 1;
      drawCircle(faceX, faceY, 10, lowMood ? "#f0d6c6" : "#e5ead9");
      ctx.fillStyle = "#49372e";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(lowMood ? "☹" : c.happiness >= 60 ? "☺" : "−", faceX, faceY + 5);
    }
    if (selected || lowPatience || lowMood) {
      const remaining = c.state === "waiting" ? Math.max(0, 1 - c.timer / c.patience)
        : c.repeatPending ? remainingVisit(c) / (c.visitLength ?? visitDuration(c)) : c.happiness / 100;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#e5d8c2";
      ctx.beginPath(); ctx.arc(c.x, c.y, 22, 0, 2 * Math.PI); ctx.stroke();
      ctx.strokeStyle = remaining > 0.4 ? "#7c8758" : "#b66f51";
      ctx.beginPath(); ctx.arc(c.x, c.y, 22, -Math.PI / 2, -Math.PI / 2 + remaining * 2 * Math.PI); ctx.stroke();
    }
    const bubbleX = c.x, bubbleY = c.y - 41;
    const showBubble = c.waterFeedback > 0 || lowMood || waiting && (selected || lowPatience || ready);
    const brewing = waiting && ticket?.state === "brewing";
    if (showBubble) drawCircle(bubbleX, bubbleY, 17, "#fffaf3");
    ctx.textAlign = "center";
    ctx.fillStyle = "#49372e";
    ctx.font = "17px sans-serif";
    if (c.waterFeedback > 0) ctx.fillText("💧", bubbleX, bubbleY + 6);
    else if (waiting && (showBubble || brewing)) {
      // Brewing remains visible as a small filling cup, without a speech bubble.
      const fill = !ticket ? 0 : brewing ? 1 - ticket.timer / drinks[ticket.drink].brew : ready ? 1 : 0;
      drawDrinkIcon(bubbleX - 3, bubbleY, c.drink, fill);
      if (showBubble) {
        ctx.font = "12px sans-serif";
        ctx.fillStyle = ready ? "#59633d" : "#98573c";
        ctx.fillText(lowPatience && !ready ? "!" : !ticket ? "?" : { queued: "◷", brewing: "♨", ready: "✓", carried: "➜" }[ticket.state], bubbleX + 12, bubbleY + 10);
      }
    } else if (lowMood) ctx.fillText("!", bubbleX, bubbleY + 6);
    if (c.specialKind && selected) {
      ctx.font = "13px sans-serif";
      ctx.fillText(c.specialKind === "pastry" ? "🥐" : "→", c.x + 29, c.y - 16);
    }
    if (c.type === "social") {
      ctx.font = "14px sans-serif";
      ctx.fillText(c.quietFor > 0 ? "🤫" : "♫", c.x + 29, c.y + 5);
    }
    drawNeighbourReaction(c);
    if (c.id === selectedCustomer || ticket?.state === "carried") {
      ctx.font = "12px sans-serif";
      const label = `${c.name} · T${c.table + 1}`;
      const width = ctx.measureText(label).width + 12;
      ctx.fillStyle = "#fffaf3";
      ctx.fillRect(c.x - width / 2, c.y + 27, width, 19);
      ctx.fillStyle = "#3d3025"; ctx.fillText(label, c.x, c.y + 41);
    }
  });
  const machine = coffeeMachineArea;
  ctx.textAlign = "center";
  ctx.font = "13px sans-serif";
  const ready = tickets.filter(t => t.state === "ready").length;
  const brewing = tickets.filter(t => t.state === "brewing").length;
  if (brewing || ready || focus.kind === "machine") {
    ctx.fillStyle = "#fffaf3"; ctx.fillRect(machine.x - 10, machine.y + machine.height + 7, machine.width + 20, 24);
    ctx.fillStyle = "#3d3025"; ctx.fillText(`♨ ${brewing}    ✓ ${ready}`, machine.x + machine.width / 2, machine.y + machine.height + 24);
  }
  floatingNotes.forEach(n => {
    ctx.globalAlpha = Math.min(1, n.life);
    ctx.fillStyle = "#fffaf3";
    ctx.font = "13px sans-serif";
    const width = ctx.measureText(n.text).width + 12;
    ctx.fillRect(n.x - width / 2, n.y - (2 - n.life) * 16 - 18, width, 22);
    ctx.fillStyle = "#3d3025";
    ctx.fillText(n.text, n.x, n.y - (2 - n.life) * 16 - 2);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  drawDraggedParty();
}

function drawDraggedParty() {
  const group = draggingParty();
  if (!group.length || !guestDrag.point) return;
  const x = Math.max(65, Math.min(sceneSize.width - 65, guestDrag.point.x));
  const y = Math.max(40, Math.min(sceneSize.height - 25, guestDrag.point.y));
  ctx.save();
  ctx.globalAlpha = 0.8;
  group.forEach((c, i) => drawCustomerBody({ ...c, x: x + (i - (group.length - 1) / 2) * 22, y }, ctx));
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#fffaf3";
  ctx.fillRect(x - 63, y - 48, 126, 21);
  ctx.fillStyle = "#3d3025";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Moving ${group.length} guests`, x, y - 33);
  ctx.restore();
}

// --------------------
// GAME LOOP
// --------------------

function gameLoop(now) {
  if (!running) return;

  const dt = paused || guestDrag?.active ? 0 : Math.min((now - lastFrame) / 1000, 0.05) * gameSpeed;
  lastFrame = now;

  timeLeft -= dt;
  spawnTimer += dt;
  updatePhase();

  // Slightly faster arrivals on later challenges
  const interval = Math.max(1.8,
    Math.max(2.8, 4 - cafe.unlocked * 0.5) * currentPhase().rate * getTrend().rate * ratingRate() * (specialAvailable() ? 0.9 : 1));

  if (spawnTimer >= interval) {
    createCustomer();
    spawnTimer = 0;
  }

  if (!paused && !guestDrag?.active) {
    updateOperations(dt);
    updateWaiting(dt);
    updateTickets(dt);
    updateStaff(dt);
    updateRequests(dt);
    updateReservations(dt);
    updateLiveAct(dt);

    updateCustomers(dt);
    floatingNotes.forEach(n => { n.life -= dt; });
    floatingNotes = floatingNotes.filter(n => n.life > 0);
  }
  drawCafe();
  drawCustomers();

  updateLiveStats();

  if (timeLeft <= 0) {
    endDay();
  } else {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

function updateIdentityBar() {
  const room = { student: 0, social: 0, regular: 0 };
  customers.forEach(c => {
    if (!["leaving", "gone"].includes(c.state)) room[c.type]++;
  });
  for (const t of Object.keys(room)) {
    const el = document.getElementById(`id-${t}`);
    if (el) el.style.flexGrow = 0.4 + cafe.rep[t] + room[t];
  }
}

function updateLiveStats() {
  renderOperations();
  updateRoomInsights();
  updateIdentityBar();
  updateConcerns();
  updateCarryingBanner();
  document.getElementById("liveNoiseLabel").textContent = noise > 8 ? "Loud" : noise > 4 ? "Lively" : "Quiet";
  document.getElementById("time").textContent = Math.ceil(Math.max(0, timeLeft));
  document.getElementById("sales").textContent = sales;
  document.getElementById("served").textContent = Object.values(customerSpending).reduce((sum, group) => sum + group.served, 0);
  document.getElementById("happy").textContent = outcomes.happy;
  document.getElementById("turnedAway").textContent = outcomes.turnedAway;
  document.getElementById("noise").textContent = noise;
  document.getElementById("liveSatisfaction").textContent = completedVisits > 0
    ? Math.round(satisfactionTotal / completedVisits) : 0;
  document.querySelector(".time-stat").classList.toggle("is-urgent", timeLeft <= 10);
  updateCustomerControls();
}

function missionGoalResults(mission, satisfaction) {
  return [
    { label: "Earnings", value: sales, target: mission.sales, prefix: "$", suffix: "" },
    { label: "Visit satisfaction", value: satisfaction, target: mission.satisfaction, prefix: "", suffix: "%" },
    { label: "Happy completed visits", value: outcomes.happy, target: mission.happy, prefix: "", suffix: "" }
  ];
}

function renderResultGoals(mission, satisfaction) {
  const goals = missionGoalResults(mission, satisfaction);
  document.getElementById("resultGoals").innerHTML = goals.map(goal => {
    const met = goal.value >= goal.target;
    const percent = Math.max(0, Math.min(100, goal.value / goal.target * 100));
    return `<div class="result-goal"><div class="goal-line"><strong>${goal.label}</strong>
      <span class="${met ? "goal-met" : ""}">${goal.prefix}${goal.value}${goal.suffix} / ${goal.prefix}${goal.target}${goal.suffix} · ${met ? "Met" : "Not met"}</span></div>
      <progress max="100" value="${percent}" aria-label="${goal.label}">${Math.round(percent)}%</progress></div>`;
  }).join("");
}

// --------------------
// END OF DAY
// --------------------

function endDay() {
  if (!running) return;
  running = false;
  cancelGuestDrag();
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  settleOperations();
  cafe.stock = { ...stock };
  // Only completed visits contribute to the outcomes
  const satisfaction = completedVisits > 0
    ? Math.round(satisfactionTotal / completedVisits)
    : 0;

  const mission = getMission();

  const metGoals = applyLifeResult(missionGoalResults(mission, satisfaction));
  const won = metGoals === 3;
  const runEnded = cafe.lives === 0;

  // Revenue and live expenses carry to the next day
  cafe.budget += sales;

  if (won && cafe.unlocked < missions.length - 1) {
    cafe.unlocked++;
  }

  // Identify actual café visitor mix
  let identity = "a mixed neighborhood café";

  if (arrivals.student > arrivals.social &&
      arrivals.student > arrivals.regular) {
    identity = "a study café";
  } else if (arrivals.social > arrivals.student &&
             arrivals.social > arrivals.regular) {
    identity = "a social café";
  } else if (arrivals.regular > arrivals.student &&
             arrivals.regular > arrivals.social) {
    identity = "a regulars' café";
  }

  const unfinished = customers.filter(c =>
    !["leaving", "gone"].includes(c.state)
  ).length;

  document.getElementById("resultTitle").textContent =
    runEnded ? "A fresh start awaits." : won ? "A day well spent." : "Every day is a fresh start.";

  document.getElementById("resultMessage").textContent = runEnded
    ? `Day ${cafe.day} · Choose one keepsake and begin again.`
    : won ? `Day ${cafe.day} · All three goals met.`
    : metGoals > 0 ? `Day ${cafe.day} · Some goals met. Keep shaping your café.`
    : `Day ${cafe.day} · Try a new approach tomorrow.`;
  document.getElementById("nextDayButton").innerHTML = `${runEnded ? "Choose a keepsake" : "A new day"} <span aria-hidden="true">→</span>`;
  renderResultGoals(mission, satisfaction);
  document.querySelectorAll("#results details").forEach(details => { details.open = false; });

  document.getElementById("resultCustomers").textContent =
    `Served & happy: ${outcomes.happy}
Served & unhappy: ${outcomes.unhappy}
Left unserved: ${outcomes.unserved}
Turned away: ${outcomes.turnedAway}
Still inside at closing: ${unfinished}`;

  document.getElementById("resultEffects").textContent =
    `Wi-Fi interested visitors: ${effects.wifiVisitors}
Price refusals: ${effects.priceRefusals}
No available tables: ${effects.noSeats}
Noise complaints: ${effects.noiseComplaints}
Water offered: ${effects.waterGiven}
Parties relocated: ${effects.moves}
Manager interventions: ${effects.interventions}
Requests accepted / declined: ${effects.requestsAccepted} / ${effects.requestsDeclined}
Reservations kept / missed: ${effects.reservationsKept} / ${effects.reservationsMissed}
Neighbourhood today: ${getTrend().title}`;

  document.getElementById("resultIdentity").textContent =
    `Your café became ${identity}.
Students: ${arrivals.student}
Social customers: ${arrivals.social}
Regulars: ${arrivals.regular}`;

  const lean = Object.keys(cafe.rep).sort((x, y) => cafe.rep[y] - cafe.rep[x])[0];
  document.getElementById("resultIdentity").textContent +=
    `\nReputation now leans toward: ${cafe.rep[lean] >= 1 ? lean + "s" : "nobody yet"}`;
  document.getElementById("resultStory").textContent =
    story.slice(-12).join("\n") || "A quiet day. Nothing out of the ordinary.";

  renderEmergenceSummary();
  renderReviews();
  document.getElementById("resultEffects").textContent +=
    `\nSupply costs: $${operationsStats.restockCost}\nSpecials served: ${operationsStats.specialSold} ($${operationsStats.specialSales})\nTray deliveries: ${operationsStats.trayServed}\nProblems fixed: ${operationsStats.fixed}\nPrepared drinks wasted: ${operationsStats.waste}\nStock carried forward: ${stock.cups} cups, ${stock.milk} milk, ${stock.pastries} pastries`;
  document.getElementById("resultEffects").textContent += "\n\nSpending by crowd (before supply costs):\n" +
    Object.entries(customerSpending).map(([type, result]) =>
      `${type}: ${result.guests} guests · ${result.served} drinks · $${result.revenue} · $${(result.guests ? result.revenue / result.guests : 0).toFixed(2)} per guest`
    ).join("\n");
  document.getElementById("resultEffects").textContent += `\nStudent follow-up drinks: ${operationsStats.repeatSold} · $${operationsStats.repeatSales} extra revenue`;
  document.getElementById("resultMoney").textContent = cafe.budget;

  if (!runEnded) cafe.day++;
  saveGame();
  showScreen("results");
}

function nextDay() {
  showScreen(cafe.lives === 0 ? "gameOver" : "scenario");
}

// --------------------
// PLAYER MANAGEMENT
// --------------------
function seatOffsets(table) {
  return tableArtwork(table).chairs.map(chair => ({
    x: chair.x + chair.width / 2,
    y: chair.y + (chair.foreground ? 6 : 19)
  }));
}

function tableBlockReason(table, size, ignoreBooking = null) {
  if (table < 0 || table >= cafe.tables) return "Not purchased yet";
  if (tableArtwork(table).chairs.length < size) return `Too small for ${size} guests`;
  if (customers.some(c => c.table === table && stillInside(c))) return "Occupied";
  if (problems.some(p => p.kind === "spill" && p.table === table)) return "Spill needs clearing";
  if (dirtyTables.includes(table)) return "Needs cleaning";
  const booking = activeBookings().find(r => r !== ignoreBooking && r.table === table);
  return booking ? `Booked for ${booking.who.name}` : "";
}

function availableTables(size, ignoreBooking = null) {
  return Array.from({ length: cafe.tables }, (_, t) => t)
    .filter(t => !tableBlockReason(t, size, ignoreBooking));
}

function seatingForecast(party, table) {
  const blocked = tableBlockReason(table, party.size);
  if (blocked) return { table, blocked, tone: "blocked", label: blocked, notes: [], ghosts: [], connections: [] };
  const ghosts = seatOffsets(table).slice(0, party.size).map((seat, i) => ({
    id: `preview-${i}`, partyId: `preview-party-${party.id}`, table, seatIndex: i,
    name: i === 0 ? party.who.name : `${party.who.name}'s guest ${i + 1}`,
    type: party.type, x: tablePositions[table].x + seat.x, y: tablePositions[table].y + seat.y,
    state: "preview", happiness: 75, quietFor: party.quietFor || 0
  }));
  // Walking parties are evaluated at their assigned seats, once they arrive.
  const existing = customers.filter(stillInside)
    .filter(c => party.movingPartyId == null || c.partyId !== party.movingPartyId)
    .map(c => c.state === "walking"
    ? { ...c, x: c.targetX, y: c.targetY } : c);
  const connections = [], notes = new Map();
  let rate = 0, harm = false, benefit = false;
  for (const guest of ghosts) {
    for (const other of existing) {
      const effect = neighbourEffect(guest, other);
      if (!effect) continue;
      connections.push({ a: guest, b: other, ...effect });
      rate += effect.aRate;
      harm ||= effect.aRate < 0 || effect.bRate < 0;
      benefit ||= effect.aRate > 0 || effect.bRate > 0;
      const key = `${other.table}-${effect.kind}`;
      const note = effect.kind === "annoy"
        ? guest.type === "student"
          ? `${party.who.name}'s students would be distracted by ${other.name}'s social table (T${other.table + 1}).`
          : `${other.name} (student, T${other.table + 1}) would be distracted by this party.`
        : `${other.name}'s ${other.type} table (T${other.table + 1}): ${guest.type === "student" ? "studying side by side" : "good company for both tables"} (+${effect.aRate.toFixed(2)} mood/s${guest.type === "social" && cafe.sound > 0 ? "; panels soften the buzz" : ""}).`;
      if (!notes.has(key)) notes.set(key, note);
    }
  }
  const beforeNoise = roomNoise(), projectedNoise = roomNoise([...existing, ...ghosts]);
  const noisy = projectedNoise > customerTypes[party.type].noiseTolerance;
  if (noisy) notes.set("noise", `Room noise ${projectedNoise} exceeds this party's comfort (${customerTypes[party.type].noiseTolerance}); mood falls while drinking.`);
  const affected = existing.filter(c => beforeNoise <= customerTypes[c.type].noiseTolerance &&
    projectedNoise > customerTypes[c.type].noiseTolerance);
  if (affected.length) notes.set("room", `Extra room noise would also put ${[...new Set(affected.map(c => c.name))].join(", ")} above their comfort limit.`);
  if (!connections.length) notes.set("space", "No neighbouring table effects within range.");
  const tone = harm || noisy || affected.length ? "risk" : benefit ? "good" : "neutral";
  const label = harm ? benefit ? "Company & distraction" : "Distraction risk"
    : noisy || affected.length ? "Noise risk" : benefit ? "Good company" : "No neighbour effects";
  return { table, blocked: "", tone, label, notes: [...notes.values()], ghosts, connections,
    rate: rate / party.size, beforeNoise, projectedNoise };
}

function forecastHeadline(forecast) {
  if (forecast.blocked) return forecast.blocked;
  const distraction = forecast.connections.find(link => link.kind === "annoy");
  if (distraction) return `${distraction.quiet.name} (${distraction.quiet.type}) would be distracted by ${distraction.loud.name}.`;
  if (forecast.projectedNoise > forecast.beforeNoise && forecast.tone === "risk") {
    return `Noise would rise to ${forecast.projectedNoise}; this could disturb guests.`;
  }
  const company = forecast.connections.find(link => link.kind === "buzz");
  if (company) return company.a.type === "student" && company.b.type === "student"
    ? `Good study company for ${company.b.name}.` : `Good company for ${company.b.name}.`;
  return forecast.tone === "risk" ? "The room is too noisy for this party." : "A little space; no nearby table effects.";
}

function updateSeatingPreviewTip() {
  const tip = document.getElementById("seatingPreviewTip");
  const forecast = running && activeSeatingPreview();
  tip.hidden = !forecast || !!forecast.blocked;
  if (tip.hidden) { tip.dataset.key = ""; return; }
  const headline = forecastHeadline(forecast);
  const key = `${forecast.table}:${forecast.tone}:${headline}`;
  if (tip.dataset.key !== key) {
    tip.dataset.key = key;
    tip.dataset.tone = forecast.tone;
    tip.innerHTML = `<strong>Preview · T${forecast.table + 1}</strong><p>${esc(headline)}</p>`;
  }
  const stage = document.getElementById("sceneStage").getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const table = tablePositions[forecast.table];
  const bounds = tip.getBoundingClientRect();
  const x = rect.left - stage.left + table.x / sceneSize.width * rect.width;
  const y = rect.top - stage.top + (table.y + 90) / sceneSize.height * rect.height;
  tip.style.left = `${Math.max(8, Math.min(x - 120, stage.width - 248))}px`;
  tip.style.top = `${Math.max(8, Math.min(y, stage.height - bounds.height - 8))}px`;
}

function setSeatingPreview(table) {
  const party = focus.kind === "waiting" && waitingParties.find(p => p.id === focus.id);
  previewTable = party && table != null && !tableBlockReason(table, party.size) ? table : null;
  updateSeatingPreviewTip();
}

function activeSeatingPreview() {
  const group = draggingParty();
  if (group.length && guestDrag.target != null && guestDrag.target !== group[0].table) {
    const c = group[0];
    return seatingForecast({ id: `move-${c.partyId}`, movingPartyId: c.partyId,
      type: c.type, size: group.length, who: { name: c.name }, quietFor: c.quietFor }, guestDrag.target);
  }
  const party = focus.kind === "waiting" && waitingParties.find(p => p.id === focus.id);
  return party && previewTable != null ? seatingForecast(party, previewTable) : null;
}

function seatingCards(party) {
  return '<p class="forecast-note">Hover or focus a table to preview. Choose Seat here to confirm.</p>' +
    Array.from({ length: cafe.tables }, (_, table) => {
      const f = seatingForecast(party, table);
      const signed = f.rate > 0 ? "+" : "";
      return `<article class="seating-card ${f.tone}" onpointerenter="setSeatingPreview(${table})" onpointerleave="setSeatingPreview(null)" onfocusin="setSeatingPreview(${table})">
        <div class="seating-card-heading"><strong>T${table + 1} · ${tableArtwork(table).chairs.length} seats</strong><span>${esc(f.label)}</span></div>
        <p class="forecast-headline">${esc(forecastHeadline(f))}</p>
        ${f.blocked ? "" : `<details class="forecast-details"><summary>Why?</summary><ul>${f.notes.map(note => `<li>${esc(note)}</li>`).join("")}</ul>
        <p class="forecast-numbers">Neighbour mood / guest: ${signed}${f.rate.toFixed(1)}/s · Room noise: ${f.beforeNoise} → ${f.projectedNoise}</p></details>`}
        <button onclick="seatWaiting(${party.id}, ${table})" onfocus="setSeatingPreview(${table})" onblur="setSeatingPreview(null)" ${f.blocked ? "disabled" : ""}>${f.blocked ? "Unavailable" : `Seat here · T${table + 1}`}</button>
      </article>`;
    }).join("");
}

function seatParty(type, who, table, size, extra = {}) {
  const partyId = ++partyNumber;
  for (let i = 0; i < size; i++) {
    seatCustomer(type, i === 0 ? who : pickIdentity(type), table,
      { ...extra, partyId, seatIndex: i });
  }
}

function seatWaiting(id, table) {
  if (!running) return;
  const party = waitingParties.find(p => p.id === id);
  if (!party || !availableTables(party.size).includes(table)) {
    managerFeedback("That table is occupied, dirty, booked, or too small.");
    return;
  }
  waitingParties = waitingParties.filter(p => p !== party);
  seatParty(party.type, party.who, table, party.size);
  managerFeedback(`You seated ${party.who.name}'s party of ${party.size} at Table ${table + 1}. Each guest needs a drink.`);
  openFocus("table", table);
  renderWaiting();
}

function renderWaiting() {
  const list = document.getElementById("waitingList");
  const key = waitingParties.map(p => p.id).join(",");
  if (list.dataset.key !== key) {
    list.dataset.key = key;
    list.innerHTML = waitingParties.map(p => `<button class="attention-item" onclick="openFocus('waiting', ${p.id})"><strong>🚪 ${esc(p.who.name)} · ${p.size} guests</strong><small id="wait-${p.id}">${Math.ceil(p.wait)}s</small></button>`).join("") || '<p class="muted empty">No one waiting</p>';
  }
  waitingParties.forEach(p => {
    const timer = document.getElementById(`wait-${p.id}`);
    if (timer) timer.textContent = `${Math.max(0, Math.ceil(p.wait))}s`;
  });
}

function updateWaiting(dt) {
  waitingParties.forEach(p => { p.wait -= dt; });
  waitingParties.filter(p => p.wait <= 0).forEach(p => {
    outcomes.turnedAway += p.size;
    effects.noSeats += p.size;
    addEvent(`${p.who.name}'s party of ${p.size} left the waiting list.`, true);
  });
  waitingParties = waitingParties.filter(p => p.wait > 0);
  renderWaiting();
}

function managerFeedback(message) {
  document.getElementById("actionFeedback").textContent = message;
  story.push(message);
  addEvent(message);
  updateCustomerControls();
  updateLiveStats();
  renderWaiting();
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  document.getElementById("pauseButton").textContent = paused ? "▶ Resume" : "⏸ Pause";
  managerFeedback(paused ? "Paused. You can seat, move, and plan while time is stopped." : "The café is running again.");
}

function partyOf(c) {
  return customers.filter(x => x.partyId === c.partyId && stillInside(x));
}

function updateManagerControls(c) {
  const group = partyOf(c);
  const options = availableTables(group.length);
  const select = document.getElementById("moveTable");
  const markup = options.map(t => `<option value="${t}">T${t + 1} · ${tableArtwork(t).chairs.length} seats</option>`).join("");
  if (select.dataset.options !== markup) {
    select.innerHTML = markup || '<option value="">No free table</option>';
    select.dataset.options = markup;
  }
  document.getElementById("moveButton").disabled = !options.length;
  document.getElementById("calmButton").disabled = c.type !== "social" || c.quietFor > 0;
  document.getElementById("refundButton").disabled = c.refunded || cafe.budget + sales < 3;
  document.getElementById("finishButton").disabled = group.some(x => x.state !== "drinking");
  const ticket = tickets.find(t => t.id === c.id);
  document.getElementById("priorityButton").hidden = !needsDrink(c) || !!ticket && ticket.state !== "queued";
  document.getElementById("calmButton").hidden = c.type !== "social";
  const help = document.getElementById("helpDrinkButton");
  help.hidden = !ticket || !["ready", "carried"].includes(ticket.state);
  help.textContent = ticket?.state === "carried" ? "✓ Deliver to " + c.name : "☕ Pick up " + c.drink;
  const carrying = tickets.find(t => t.state === "carried");
  help.disabled = !!managerTask || !!carrying && carrying.id !== c.id && carriedTickets().length >= trayCapacity;
  const issue = c.repeatPending ? `Another ${c.drink} requested. Checkout in ${Math.ceil(remainingVisit(c))}s; serving it won't extend the visit.`
    : c.state === "waiting" ? ""
    : noise > customerTypes[c.type].noiseTolerance ? "Too noisy here. Lower music or calm a nearby social party."
    : "";
  document.getElementById("customerIssue").textContent = issue;
}

function movePartyTo(customerId, table) {
  if (!running) return;
  const c = findCustomer(customerId);
  if (!c || !isSeated(c)) return;
  const group = partyOf(c);
  if (c.table === table) return;
  const blocked = tableBlockReason(table, group.length);
  if (blocked) {
    managerFeedback(`Can't move to T${table + 1}: ${blocked.toLowerCase()}.`);
    return;
  }
  const old = c.table;
  const beforeNeighbours = neighbourLinks();
  group.forEach((x, i) => {
    const offset = seatOffsets(table)[i];
    x.table = table;
    x.seatIndex = i;
    x.x = x.targetX = tablePositions[table].x + offset.x;
    x.y = x.targetY = tablePositions[table].y + offset.y;
    x.happiness = Math.max(0, x.happiness - 4);
  });
  if (!dirtyTables.includes(old)) dirtyTables.push(old);
  noteNeighbourRelief(beforeNeighbours, `Moving ${c.name}'s party`, `you moved ${c.name}'s party away from distractions`);
  effects.moves++;
  managerFeedback(`Moved ${c.name}'s party to T${table + 1}. Mood −4 each; orders kept. Clean T${old + 1} for the next guests.`);
  renderBoard();
}

function moveSelectedParty() {
  const value = document.getElementById("moveTable").value;
  if (value !== "") movePartyTo(selectedCustomer, Number(value));
}

function customerAction(action) {
  if (!running) return;
  const c = findCustomer(selectedCustomer);
  if (!c || !isSeated(c)) return;
  if (action === "calm" && c.type === "social" && !(c.quietFor > 0)) {
    const beforeNeighbours = neighbourLinks();
    partyOf(c).forEach(x => { x.quietFor = 12; x.happiness = Math.max(0, x.happiness - 5); addFloat(x, "🤫 12s · −5"); });
    noteNeighbourRelief(beforeNeighbours, `Asking ${c.name}'s party for quiet`, `you asked ${c.name}'s party for quiet`);
    managerFeedback(`${c.name}'s party will keep quiet for 12s. Less room and neighbour noise; party mood −5.`);
  } else if (action === "refund" && !c.refunded && cafe.budget + sales >= 3) {
    sales -= 3;
    c.refunded = true;
    c.happiness = Math.min(100, c.happiness + 25);
    addFloat(c, "+25 mood · −$3");
    c.boost = "the manager offered a refund";
    managerFeedback(`You offered ${c.name} a $3 goodwill refund. Mood +25, up to 100. Noise still needs attention.`);
  } else if (action === "priority" && needsDrink(c)) {
    takeOrder(c);
    const t = tickets.find(t => t.id === c.id);
    if (t) {
      if (t.state !== "queued") { managerFeedback("This drink is already in progress."); return; }
      tickets = [t, ...tickets.filter(x => x !== t)];
      addFloat(c, "↑ Order first");
      managerFeedback(`${c.name} is first in the queue. Brewing drinks finish first.`);
    }
  } else if (action === "finish" && partyOf(c).every(x => x.state === "drinking")) {
    partyOf(c).forEach(x => {
      x.happiness = Math.max(0, x.happiness - 8);
      x.cause = "the manager asked for the table back";
      leaveCustomer(x);
    });
    managerFeedback(`The party finished early. Mood −8 each; the table needs cleaning. Their final mood determines the review.`);
  } else return;
  effects.interventions++;
}

function bookingControls(r) {
  const choices = Array.from({ length: cafe.tables }, (_, t) => t).filter(t =>
    t !== r.table && tableArtwork(t).chairs.length >= (r.size || 1) &&
    !activeBookings().some(other => other !== r && other.table === t));
  return `<div class="table-actions">${choices.map(t => `<button onclick="reassignBooking(${r.id}, ${t})">Move booking to T${t + 1}${tableOpen(t) ? " · ready" : " · occupied/dirty"}</button>`).join("")}` +
    `<button onclick="cleanBooking(${r.id})">Clean booked table</button></div>`;
}

function reassignBooking(id, table) {
  if (!running) return;
  const r = activeBookings().find(r => r.id === id);
  if (!r || table < 0 || table >= cafe.tables || tableArtwork(table).chairs.length < (r.size || 1) ||
      activeBookings().some(other => other !== r && other.table === table)) return;
  r.table = table;
  managerFeedback(`Booking moved to T${table + 1}. ${tableOpen(table) ? "Clean and ready." : "Move its occupants and clean before arrival."}`);
  renderBoard();
}

function cleanBooking(id) {
  if (!running) return;
  const r = activeBookings().find(r => r.id === id);
  if (!r) return;
  if (customers.some(c => c.table === r.table && stillInside(c))) {
    managerFeedback(`T${r.table + 1} is occupied. Select a guest and move their party, or reassign this booking.`);
    return;
  }
  dirtyTables = dirtyTables.filter(t => t !== r.table);
  managerFeedback(`T${r.table + 1} is clean and ready for ${r.who.name}.`);
}

function stopPerformance() {
  if (!running || !liveAct) return;
  const name = liveAct.name;
  liveAct = null;
  managerFeedback(`You ended ${name}'s set early. Live noise removed; no performance tips earned.`);
  renderBoard();
}


// --------------------
// SELECTION AND VISUAL FEEDBACK
// --------------------
function addFloat(customer, text) {
  floatingNotes.push({ x: customer.x, y: customer.y - 57, text, life: 2 });
  floatingNotes = floatingNotes.slice(-8);
}

function drinkStatus(customer) {
  if (customer.state === "drinking" && !customer.repeatPending) return `♡ Served · ${customer.drinksServed} drinks`;
  if (customer.state === "walking") return "→ Taking a seat";
  if (!stillInside(customer)) return "Visit finished";
  const ticket = tickets.find(t => t.id === customer.id);
  const prefix = customer.repeatPending ? `Follow-up · ${Math.ceil(remainingVisit(customer))}s left · ` : "";
  if (ticket?.state === "queued") {
    if (problems.some(p=>p.kind==="machine")) return prefix + "Machine stopped · needs attention";
    const missing=stockBlock(ticket);
    if(missing)return prefix + `Waiting for ${missing}`;
  }
  if(ticket?.state==="brewing"&&problems.some(p=>p.kind==="machine"))return prefix + "Brewing paused · fix machine";
  return prefix + (!ticket ? "◷ Waiting to order" : {
    queued: "◷ Queued", brewing: "♨ Brewing", ready: "✓ Ready", carried: "➜ You are carrying it"
  }[ticket.state]);
}

function openFocus(kind, id = null) {
  if (!running) return;
  const changed = focus.kind !== kind || focus.id !== id;
  focus = { kind, id };
  if (changed) {
    if (kind === "machine" && coffeeServiceStatus().state === "supplies") counterTab = "supplies";
    previewTable = null;
    document.getElementById("sceneActionPanel").scrollTop = 0;
  }
  selectedCustomer = kind === "customer" ? id : null;
  if (changed) document.querySelector(".more-actions").open = false;
  document.getElementById("focusControls").dataset.key = "";
  updateCustomerControls();
}

function updateCarryingBanner() {
  const tray = carriedTickets().map(t => ({ ticket: t, customer: findCustomer(t.id) })).filter(x => x.customer);
  const banner = document.getElementById("carryingBanner");
  banner.hidden = !tray.length;
  if (!tray.length) return;
  const tables = [...new Set(tray.map(x => x.customer.table))];
  const html = `<strong>Your tray · ${tray.length}/${trayCapacity}</strong><span>${tray.map(x => `${esc(x.customer.name)}'s ${esc(x.ticket.drink)} → T${x.customer.table + 1}`).join(" · ")}</span>
    <div class="table-actions">${tables.map(t => `<button onclick="deliverTrayToTable(${t})" ${managerTask ? "disabled" : ""}>Serve T${t + 1}</button>`).join("")}</div>`;
  if (banner.dataset.key !== html) { banner.dataset.key = html; banner.innerHTML = html; }
}

function pickupDrink(id) {
  if (!running) return;
  if (managerTask) { managerFeedback("Finish your current task before loading drinks."); return; }
  if (carriedTickets().length >= trayCapacity) { managerFeedback("Your tray is full. Serve a highlighted table first."); return; }
  const t = tickets.find(t => t.id === id && t.state === "ready");
  const c = t && findCustomer(id);
  if (!t || !needsDrink(c)) { managerFeedback("This drink is no longer waiting at the counter."); return; }
  t.state = "carried";
  openFocus("customer", id);
  managerFeedback(`Added ${c.name}'s ${c.drink} to your tray · ${carriedTickets().length}/${trayCapacity}.`);
}

function helpSelectedDrink() {
  const c = findCustomer(selectedCustomer);
  if (!c) return;
  const ticket = tickets.find(t => t.id === c.id);
  if (ticket?.state === "carried") deliverCoffee(c);
  else pickupDrink(c.id);
}

function renderPartyOrders(customer) {
  const list = document.getElementById("partyOrderList");
  const party = partyOf(customer);
  const html = party.map(c => `<button class="party-order${c.id === selectedCustomer ? " is-selected" : ""}" onclick="openFocus('customer', ${c.id})"><span>${esc(c.name)} · ${esc(c.drink)}</span><small>${drinkStatus(c)}</small></button>`).join("");
  if (list.dataset.key !== html) {
    list.dataset.key = html;
    list.innerHTML = html;
  }
}

function cleanTable(table) {
  if (!running || table < 0 || table >= cafe.tables) return;
  const spill = problems.find(p => p.kind === "spill" && p.table === table);
  if (spill) { openFocus("problem", spill.id); return; }
  if (managerTask) { managerFeedback("Finish your current task before cleaning."); return; }
  if (customers.some(c => c.table === table && stillInside(c))) {
    managerFeedback(`T${table + 1} is occupied. Move the party before cleaning.`);
    return;
  }
  dirtyTables = dirtyTables.filter(t => t !== table);
  managerFeedback(`🧽 T${table + 1} clean and ready`);
  renderBoard();
}

function updateFocusPanel() {
  updateSeatingPreviewTip();
  updateProblemPopover();
  const scenePanel = document.getElementById("sceneActionPanel");
  const activeProblem = focus.kind === "problem" && problems.some(p => p.id === focus.id);
  scenePanel.hidden = !running || !!guestDrag?.active || focus.kind === "none" || focus.kind === "waiting" || activeProblem ||
    focus.kind === "problem" && coffeeServiceStatus().state !== "supplies";
  scenePanel.dataset.focus = focus.kind;
  const container = document.getElementById("focusControls");
  const title = document.getElementById("orderStatus");
  const detail = document.getElementById("serviceHelp");
  const seated = customers.filter(stillInside);
  const planningParty = focus.kind === "waiting" && waitingParties.find(p => p.id === focus.id);
  document.getElementById("seatingPlanner").hidden = !planningParty;
  document.querySelector(".attention-panel").classList.toggle("is-planning", !!planningParty);
  document.querySelector(".room-workspace").classList.toggle("is-planning", !!planningParty);
  container.classList.toggle("seating-mode", focus.kind === "waiting");
  const key = JSON.stringify(focus.kind === "waiting" ? [focus, !!planningParty,
    seated.map(c => [c.id, c.table, c.seatIndex, c.type, c.quietFor > 0]),
    dirtyTables, reservations.map(r => [r.id, r.table, r.state]),
    cafe.music, cafe.sound, getTrend().noise, !!liveAct, cafe.tables, problems.map(p=>[p.id,p.table])] :
    [focus, counterTab, seated.map(c => [c.id, c.table, c.state, c.repeatPending, c.seatIndex, c.type, c.quietFor > 0]),
    cafe.music, cafe.sound, getTrend().noise, dirtyTables,
    tickets.map(t => [t.id, t.state]), waitingParties.map(p => p.id),
    reservations.map(r => [r.id, r.table, r.state]), requests.map(r => r.id), !!liveAct, cafe.tables,
    stock, managerTask && [managerTask.id,managerTask.kind], deliveries.map(d=>d.id),
    problems.map(p=>[p.id,p.assigned]), staff.map(m=>[!!m.assignment,m.rest>0]),
    dailySpecial && [dailySpecial.active,dailySpecial.remaining,dailySpecial.sold]]);
  if (focus.kind === "customer") {
    const c = findCustomer(focus.id);
    title.textContent = c ? `${c.name} · Table ${c.table + 1}` : "Visit finished";
    detail.textContent = c ? `${c.drink} · ${drinkStatus(c)}` : "Select another guest or table.";
    container.hidden = true;
    return;
  }
  container.hidden = false;
  if (container.dataset.key === key) return;
  container.dataset.key = key;
  let html = "";
  if (focus.kind === "none") {
    title.textContent = "Select a guest, table, or request";
    detail.textContent = "Staff handle orders and delivery. You manage the room.";
  }
  if (focus.kind === "machine") {
    title.textContent = "The counter";
    detail.textContent = "";
    html = counterMarkup();
  }
  if (focus.kind === "problem") {
    const problem = problems.find(p=>p.id===focus.id);
    const service = coffeeServiceStatus();
    title.textContent = problem ? problem.title : "Problem resolved";
    detail.textContent = problem ? "Handle it yourself, or take a staff member away from service."
      : service.state === "supplies" ? service.detail : "The café is running a little more smoothly.";
    if (problem) detail.textContent = problem.assigned ? `${problem.assigned} is handling it.` : "Choose an action beside the warning in the room.";
    else if (service.state === "supplies") html = `<button onclick="openFocus('machine')">Restock supplies</button>`;
  }
  if (focus.kind === "waiting") {
    const p = waitingParties.find(p => p.id === focus.id);
    title.textContent = p ? `${p.who.name} · ${p.size} guests` : "Party no longer waiting";
    detail.textContent = p ? "Choose who sits next to whom. Green links help; rust links warn of distractions." : "Select another group.";
    if (p) {
      document.getElementById("seatingPlannerTitle").textContent = `${p.who.name} · ${p.size} ${p.type} guests`;
      document.getElementById("seatingOptions").innerHTML = seatingCards(p);
      html = '<p class="muted">Compare the table forecasts beside the room. You can pause while you decide.</p>';
    }
  }
  if (focus.kind === "table") {
    const table = focus.id;
    const guests = seated.filter(c => c.table === table);
    title.textContent = `Table ${table + 1} · ${guests.length}/${tableArtwork(table).chairs.length} seats`;
    const booking = activeBookings().find(r => r.table === table);
    detail.textContent = dirtyTables.includes(table) ? "🧽 Needs cleaning" : booking ? `🔖 Held for ${booking.who.name}` : guests.length ? "Select a guest for their actions." : "Clean and available.";
    html = guests.map(c => `<button onclick="openFocus('customer', ${c.id})">${esc(c.name)} · ${drinkStatus(c)}</button>`).join("");
    if (dirtyTables.includes(table)) html += `<button onclick="cleanTable(${table})">🧽 Clean table</button>`;
    if (booking) html += `<button onclick="openFocus('booking', ${booking.id})">🔖 Manage booking</button>`;
    html += problems.filter(p=>p.table===table&&p.kind==='spill').map(problemMarkup).join('');
  }
  if (focus.kind === "request") {
    const r = requests.find(r => r.id === focus.id);
    title.textContent = r ? r.title : "Request handled";
    detail.textContent = r ? r.text : "Select another situation.";
    if (r) html = `<button class="yes" onclick="resolveRequest(${r.id}, true)">${esc(r.yes)}</button><button onclick="resolveRequest(${r.id}, false)">${esc(r.no)}</button>`;
  }
  if (focus.kind === "booking") {
    const r = reservations.find(r => r.id === focus.id);
    title.textContent = r ? `🔖 ${r.who.name} · ${r.size || 1} guests · T${r.table + 1}` : "Booking finished";
    detail.textContent = r ? reservationText(r) : "Select another situation.";
    if (r && activeBookings().includes(r)) html = bookingControls(r);
  }
  if (focus.kind === "live") {
    title.textContent = liveAct ? `🎸 ${liveAct.name}` : "Performance finished";
    detail.textContent = liveAct ? "Adds noise and attracts social guests." : "";
    if (liveAct) html = '<button onclick="stopPerformance()">End set early · no tips</button>';
  }
  container.innerHTML = html;
}

function updateConcerns() {
  const list = document.getElementById("concernList");
  const concerns = customers.filter(isSeated).filter(c =>
    c.state === "waiting" && c.timer / c.patience > 0.55 || c.repeatPending && remainingVisit(c) <= 5 || c.happiness < 50 ||
    c.type === "social" && !(c.quietFor > 0) && noise > 5);
  const parties = new Set();
  const items = concerns.filter(c => {
    if (parties.has(c.partyId)) return false;
    parties.add(c.partyId);
    return true;
  }).slice(0, 3);
  const html = items.map(c => {
    const issue = c.repeatPending && remainingVisit(c) <= 5 ? "Follow-up order · checkout soon" : c.state === "waiting" && c.timer / c.patience > 0.55 ? "◔ Low patience" : c.type === "social" && !(c.quietFor > 0) ? "♫ Loud party" : "☹ Low mood";
    return `<button class="attention-item" onclick="openFocus('customer', ${c.id})"><strong>T${c.table + 1} · ${esc(c.name)}</strong><small>${issue}</small></button>`;
  }).join("") || '<p class="muted empty">✓ No urgent concerns</p>';
  if (list.dataset.key !== html) { list.dataset.key = html; list.innerHTML = html; }
  const overview = document.getElementById("roomOverview");
  const room = Array.from({ length: cafe.tables }, (_, t) => {
    const count = customers.filter(c => c.table === t && stillInside(c)).length;
    return `<button onclick="openFocus('table', ${t})">T${t + 1} · ${count}/${tableArtwork(t).chairs.length}${dirtyTables.includes(t) ? " · 🧽" : ""}</button>`;
  }).join("");
  if (overview.dataset.key !== room) { overview.dataset.key = room; overview.innerHTML = room; }
}

// A saved exhausted run must choose its keepsake before opening again.
showScreen(cafe.lives === 0 ? "gameOver" : "scenario");

