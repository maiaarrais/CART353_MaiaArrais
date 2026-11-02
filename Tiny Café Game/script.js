
// --------------------
// SAVED CAFÉ
// --------------------

const startingCafe = {
  budget: 150,
  day: 1,
  unlocked: 0,
  tables: 3,
  wifi: 0,
  sound: 0,
  price: 5,
  music: 3,
  rep: { student: 0, social: 0, regular: 0 },
  staff: [{ name: "Juno", speed: 1.3, sloppy: 0.25, warmth: 0 }],
  regulars: {}   // returning customers remember how they were treated
};

let cafe;

try {
  cafe = {
    ...startingCafe,
    ...JSON.parse(localStorage.getItem("cafeSave"))
  };
} catch {
  cafe = { ...startingCafe };
}
cafe.rep = { ...startingCafe.rep, ...cafe.rep };
cafe.staff = cafe.staff || [...startingCafe.staff];
cafe.regulars = cafe.regulars || {};

function saveGame() {
  try {
    localStorage.setItem("cafeSave", JSON.stringify(cafe));
  } catch (error) {
    console.warn("Progress could not be saved in this browser.", error);
  }
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
}

// --------------------
// SCREENS AND SHOP
// --------------------

function showScreen(name) {
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
  hire.textContent = cafe.staff.length >= 3 ? "Full" : "$60";

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
    button.textContent = atMaximum ? "Full" : `$${button.dataset.cost}`;
  });
  updateIdentity();
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

function updateIdentity() {
  const r = cafe.rep;
  const top = Object.keys(r).sort((x, y) => r[y] - r[x])[0];
  const leans = { student: "students", social: "a lively crowd", regular: "your regulars" };
  document.getElementById("identity").textContent = "What your café is becoming";
  document.getElementById("prediction").textContent = r[top] < 1
    ? "Your café hasn't decided what it is yet. Watch who stays and who leaves."
    : `Lately it leans toward ${leans[top]}. Whatever you change here pulls it somewhere.`;
}

// --------------------
// CUSTOMER TYPES
// --------------------

const customerTypes = {
  student: {
    color: "#90a8bb",
    stay: 12,
    patience: 12,
    noiseTolerance: 4
  },
  social: {
    color: "#d99c88",
    stay: 9,
    patience: 10,
    noiseTolerance: 9
  },
  regular: {
    color: "#d6b274",
    stay: 8,
    patience: 14,
    noiseTolerance: 6
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
const seatOffset = { x: -16, y: -25 };

function tableArtwork(index) {
  // These drawings depict different shapes. Matching their leg height gives
  // both styles the same floor line without stretching either illustration.
  return index % 2
    ? { name: "smallTable", width: 105 }
    : { name: "table", width: 180 };
}

// Measured alpha bounds, with a pixel of padding to retain the outline.
const sceneAssets = {
  room: { file: "scene.png", crop: [18, 159, 1416, 767] },
  table: { file: "table.png", crop: [179, 477, 904, 481] },
  smallTable: { file: "smallTable.png", crop: [313, 399, 665, 613] },
  chair: { file: "chair.png", crop: [284, 119, 661, 1051] }
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

let visitors = 0;
let sales = 0;
let noise = 0;
let selectedCustomer = null;

let tickets = [];   // orders: queued -> brewing -> ready -> carried
let staff = [];     // today's working baristas

// Outcome counters
let outcomes;
let effects;
let arrivals;
let satisfactionTotal;
let completedVisits;

// --------------------
// START THE DAY
// --------------------

async function startDay() {
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
  document.getElementById("message").textContent = "What will you improve today?";
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);

  customers = [];
  dirtyTables = [];

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

  tickets = [];
  staff = cafe.staff.map(m => ({ ...m, role: "counter", energy: 100, cd: 2 }));
  renderStaff();

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
    waterGiven: 0
  };

  arrivals = {
    student: 0,
    social: 0,
    regular: 0
  };

  satisfactionTotal = 0;
  completedVisits = 0;

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
  updateLiveStats();
  drawCafe();
  addEvent("The doors are open. Click a customer’s coffee bubble to begin.");

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
  const pref = { student: ["tea", "espresso", "tea"], social: ["latte", "latte", "espresso"], regular: Object.keys(drinks) }[type];
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

  if (cafe.music >= 7) {
    choices.push("social", "social", "social");
  }

  // Reputation and the room's current mix feed back into who walks in next
  for (const t of Object.keys(cafe.rep)) {
    for (let i = 0; i < Math.round(cafe.rep[t]); i++) choices.push(t);
  }
  customers.filter(c => !["leaving", "gone"].includes(c.state))
    .forEach(c => choices.push(c.type));

  const type = choices[Math.floor(Math.random() * choices.length)];

  visitors++;
  arrivals[type]++;

  if (type === "student" && cafe.wifi > 0) {
    effects.wifiVisitors++;
    addEvent("A student is interested in your café's Wi-Fi.");
  }

  // Price can discourage visitors
  if (Math.random() < Math.max(0, cafe.price - 5) * 0.15) {
    outcomes.turnedAway++;
    effects.priceRefusals++;
    addEvent(`A ${type} refused your coffee price.`, true);
    return;
  }

  const occupied = customers
    .filter(c => c.state !== "leaving" && c.state !== "gone")
    .map(c => c.table);

  const free = [];

  for (let i = 0; i < cafe.tables; i++) {
    if (!occupied.includes(i) && !dirtyTables.includes(i)) {
      free.push(i);
    }
  }

  if (free.length === 0) {
    outcomes.turnedAway++;
    effects.noSeats++;
    addEvent(`A ${type} left because no clean table was available.`, true);
    return;
  }

  const table = free[Math.floor(Math.random() * free.length)];
  const seat = tablePositions[table];

  const who = pickIdentity(type);

  customers.push({
    id: customerNumber++,
    name: who.name,
    drink: who.drink,
    usual: !!who.usual,
    type,
    table,
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
    waterFeedback: 0
  });

  addEvent(who.returning ? `${who.name} is back.` : `${who.name}, a ${type}, found a table.`);
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
const drinkPrice = drink => cafe.price + drinks[drink].bonus;

function updateOrderStatus() {
  const count = state => tickets.filter(t => t.state === state).length;
  const carrying = tickets.find(t => t.state === "carried");
  const who = carrying && findCustomer(carrying.id);
  document.getElementById("orderStatus").textContent = who
    ? `Carrying ${carrying.drink} for ${who.name}`
    : `${count("queued")} queued · ${count("brewing")}/${slotCount} brewing · ${count("ready")} ready`;
  document.getElementById("serviceHelp").textContent = who
    ? "Click the right customer to deliver it."
    : "Click a bubble to take an order. Drinks brew on their own; click the machine to pick one up.";
}

function takeOrder(customer, by) {
  if (customer.state !== "waiting" || tickets.some(t => t.id === customer.id)) return false;
  tickets.push({ id: customer.id, drink: customer.drink, state: "queued", timer: 0 });
  addEvent(`${by ? by.name + " took" : "You took"} ${customer.name}'s ${customer.drink} order.`);
  updateOrderStatus();
  return true;
}

function startBrew() {
  if (tickets.filter(t => t.state === "brewing").length >= slotCount) return false;
  const t = tickets.find(x => x.state === "queued");
  if (!t) return false;
  t.state = "brewing";
  t.timer = drinks[t.drink].brew;
  return true;
}

function updateTickets(dt) {
  customers.forEach(c => {
    if (c.usual && !c.usualAsked && c.state === "waiting") {
      c.usualAsked = true;
      story.push(`${c.name} asked for the usual.`);
      takeOrder(c);
    }
  });
  tickets.forEach(t => {
    if (t.state !== "brewing") return;
    t.timer -= dt;
    if (t.timer <= 0) t.state = "ready";
  });
  while (startBrew()) { /* fill every free slot */ }
  updateOrderStatus();
}

function useCoffeeMachine() {
  if (tickets.some(t => t.state === "carried")) return;
  const ready = tickets.find(t => t.state === "ready");
  if (ready) ready.state = "carried";
  updateOrderStatus();
}

function serve(customer, by) {
  const ticket = tickets.find(t => t.id === customer.id);
  tickets = tickets.filter(t => t !== ticket);
  customer.state = "drinking";
  customer.timer = 0;

  let boost = 15;
  let tip = 0;
  if (by && Math.random() < by.sloppy) {
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
  sales += drinkPrice(customer.drink) + tip;
  addEvent(`${by ? by.name + " served" : "You served"} ${customer.name}. +$${drinkPrice(customer.drink) + tip}`);
  updateOrderStatus();
  updateCustomerControls();
}

function deliverCoffee(customer) {
  const ticket = tickets.find(t => t.state === "carried");
  if (!ticket || ticket.id !== customer.id || customer.state !== "waiting") return;
  serve(customer, null);
}

function cancelOrder(id) {
  tickets = tickets.filter(t => t.id !== id);
  updateOrderStatus();
}

function describeStaff(m) {
  return [m.speed > 1.15 ? "fast" : m.speed < 0.9 ? "careful" : "steady",
    m.sloppy > 0.15 ? "sloppy" : "precise", m.warmth >= 1 ? "warm" : ""].filter(Boolean).join(", ");
}

function renderStaff() {
  document.getElementById("staffRow").innerHTML = staff.map((m, i) =>
    `<div class="staff"><b>${m.name}</b><small>${describeStaff(m)}</small>` +
    `<button onclick="toggleRole(${i})">${m.role === "counter" ? "Counter" : "Floor"}</button>` +
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
    if (m.cd > 0) return;
    m.cd = 3;
    m.energy = Math.max(0, m.energy - 4);
    const jobs = {
      order: () => {
        const c = customers.find(x => x.state === "waiting" && !tickets.some(t => t.id === x.id));
        return c ? takeOrder(c, m) : false;
      },
      deliver: () => {
        const t = tickets.find(x => x.state === "ready");
        const c = t && findCustomer(t.id);
        if (!c || c.state !== "waiting") return false;
        serve(c, m);
        return true;
      },
      clean: () => {
        if (!dirtyTables.length) return false;
        dirtyTables.shift();
        addEvent(`${m.name} cleaned a table.`);
        return true;
      }
    };
    (m.role === "floor" ? ["deliver", "clean", "order"] : ["order", "deliver", "clean"]).some(k => jobs[k]());
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
  controls.hidden = !customer;
  if (!customer) {
    document.getElementById("selectedCustomer").textContent = "None";
    return;
  }

  document.getElementById("selectedCustomer").textContent =
    `${customer.type} · ${Math.round(customer.happiness)}% mood`;
  const waiting = customer.state === "waiting";
  const remaining = waiting ? Math.max(0, 1 - customer.timer / customer.patience) : 1;
  const meter = document.getElementById("selectedPatience");
  meter.value = Math.round(remaining * 100);
  meter.textContent = `${Math.round(remaining * 100)}%`;
  meter.hidden = !waiting;
  document.getElementById("patienceLabel").textContent = waiting
    ? `Patience · ${Math.round(remaining * 100)}%`
    : "Enjoying their coffee";

  const button = document.getElementById("waterButton");
  button.hidden = !waiting;
  button.disabled = customer.waterReceived || cafe.budget + sales < 2;
  button.textContent = customer.waterReceived ? "Water given" : "Give water · $2";
  const waterMessage = !waiting ? ""
    : customer.waterFeedback > 0 ? "Patience refilled. A little more time to serve."
    : customer.waterReceived ? "One water per customer."
    : cafe.budget + sales < 2 ? "You need $2 to offer water."
    : "Refills patience once while they wait.";
  const waterStatus = document.getElementById("waterStatus");
  if (waterStatus.textContent !== waterMessage) waterStatus.textContent = waterMessage;
}

function offerWater() {
  if (!running) return;
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
  effects.waterGiven++;
  updateLiveStats();
  drawCafe();
  drawCustomers();
  addEvent(`Water for the ${customer.type}. Patience fully restored. −$2`);
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

  const reg = cafe.regulars[customer.name];
  if (reg && customer.type === "regular") {
    reg.visits++;
    reg.mood += wasServed && customer.happiness >= 60 ? 1 : -1;
    if (reg.mood < -1) story.push(`${customer.name} may not come back.`);
  }

  cancelOrder(customer.id);

  customer.state = "leaving";
  customer.timer = 0;

  if (!dirtyTables.includes(customer.table)) {
    dirtyTables.push(customer.table);
  }

  if (selectedCustomer === customer.id) {
    selectedCustomer = null;
    document.getElementById("selectedCustomer").textContent = "None";
  }
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

// Seated customers affect whoever sits near them; the effects feed reputation.
function applyNeighborEffects(inside, dt) {
  links = [];
  const damp = Math.max(0.3, 1 - cafe.sound * 0.2);
  const seated = inside.filter(c => ["waiting", "drinking"].includes(c.state));
  for (let i = 0; i < seated.length; i++) {
    for (let j = i + 1; j < seated.length; j++) {
      const a = seated[i], b = seated[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) > 270) continue;
      const social = [a, b].filter(c => c.type === "social");
      const students = [a, b].filter(c => c.type === "student");
      if (social.length === 1 && students.length === 1) {
        const [loud] = social, [quiet] = students;
        quiet.happiness -= 2.5 * dt * damp;
        loud.happiness += 0.8 * dt;
        quiet.cause = `${loud.name}'s lively table sat too close`;
        loud.boost = "the room had energy";
        addLink(a, b, "annoy", `${quiet.name} is distracted by ${loud.name}'s table.`);
      } else if (social.length === 2 || (a.type === "regular" && b.type === "regular")) {
        a.happiness += 0.8 * dt; b.happiness += 0.8 * dt;
        a.boost = b.boost = "good company was nearby";
        addLink(a, b, "buzz", `${a.name} and ${b.name} are hitting it off.`);
      } else if (students.length === 2) {
        a.happiness += 0.4 * dt; b.happiness += 0.4 * dt;
        a.boost = b.boost = "the quiet suited studying";
        addLink(a, b, "buzz", `${a.name} and ${b.name} are studying side by side.`);
      }
    }
  }
}

function updateCustomers(dt) {
  const inside = customers.filter(c =>
    !["leaving", "gone"].includes(c.state)
  );

  const socialCount = inside.filter(c => c.type === "social").length;

  noise = Math.max(0,
    cafe.music +
    socialCount * 2 +
    Math.max(0, inside.length - 3) -
    cafe.sound * 2
  );

  applyNeighborEffects(inside, dt);

  customers.forEach(c => {
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

      let stayTime = traits.stay;

      if (c.type === "student") {
        stayTime += cafe.wifi * 5;
      }

      if (c.happiness < 30 || c.timer >= stayTime) {
        leaveCustomer(c);
      }
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

canvas.addEventListener("click", event => {
  if (!running) return;

  const rect = canvas.getBoundingClientRect();

  // Match object-fit: contain, including its centered empty space and border.
  const scaleX = rect.width / canvas.offsetWidth;
  const scaleY = rect.height / canvas.offsetHeight;
  const drawingScale = Math.min(
    canvas.clientWidth / sceneSize.width,
    canvas.clientHeight / sceneSize.height
  );
  if (drawingScale <= 0) return;

  const offsetX = (canvas.clientWidth - sceneSize.width * drawingScale) / 2;
  const offsetY = (canvas.clientHeight - sceneSize.height * drawingScale) / 2;
  const x = ((event.clientX - rect.left) / scaleX -
    canvas.clientLeft - offsetX) / drawingScale;
  const y = ((event.clientY - rect.top) / scaleY -
    canvas.clientTop - offsetY) / drawingScale;

  if (x < 0 || x > sceneSize.width || y < 0 || y > sceneSize.height) return;

  if (x >= coffeeMachineArea.x &&
      x <= coffeeMachineArea.x + coffeeMachineArea.width &&
      y >= coffeeMachineArea.y &&
      y <= coffeeMachineArea.y + coffeeMachineArea.height) {
    useCoffeeMachine();
    return;
  }

  for (const c of customers) {
    if (["leaving", "gone", "walking"].includes(c.state)) continue;

    const clickedBody = Math.hypot(c.x - x, c.y - y) < 18;
    const clickedBubble = c.state === "waiting" &&
      Math.hypot(c.x - x, c.y - 35 - y) < 17;

    if (clickedBody || clickedBubble) {
      selectedCustomer = c.id;

      if (tickets.some(t => t.state === "carried")) {
        deliverCoffee(c);
      } else {
        takeOrder(c);
      }
      updateCustomerControls();
      return;
    }
  }

  for (let i = 0; i < cafe.tables; i++) {
    const table = tablePositions[i];
    const artwork = tableArtwork(i);

    if (Math.abs(table.x - x) < artwork.width / 2 && y > table.y - 14 && y < table.y + 20) {
      if (dirtyTables.includes(i)) {
        dirtyTables = dirtyTables.filter(t => t !== i);
        addEvent("Table cleaned! It's available again.");
      }
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

function drawCafe(target = canvas, preview = false) {
  const context = prepareSceneCanvas(target);
  context.clearRect(0, 0, sceneSize.width, sceneSize.height);
  drawAsset("room", 0, 0, sceneSize.width, context);

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
    drawAsset("chair", table.x - 53.5, table.y - 38, 75, context);
    if (!preview) {
      customers.filter(c => c.table === index && ["waiting", "drinking"].includes(c.state))
        .forEach(c => drawCustomerBody(c, context));
    }
    const artwork = tableArtwork(index);
    drawAsset(artwork.name, table.x - artwork.width / 2, table.y - 12, artwork.width, context);
    if (!preview && dirtyTables.includes(index)) {
      drawCircle(table.x, table.y, 14, "#fffaf3", context);
      context.textAlign = "center";
      context.font = "20px Georgia";
      context.fillText("🧽", table.x, table.y + 6);
    }
  }

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

function updateSetupPreview() {
  const preview = document.getElementById("setupCanvas");
  if (preview && artworkLoaded) drawCafe(preview, true);
  for (const key of ["tables", "wifi", "sound"]) {
    const label = document.getElementById(`preview${key[0].toUpperCase()}${key.slice(1)}`);
    if (label) label.textContent = cafe[key];
  }
  const day = document.getElementById("setupDay");
  const mission = document.getElementById("setupMission");
  if (day) day.textContent = cafe.day;
  if (mission) mission.textContent = getMission().title;
}

function drawCustomerBody(c, context) {
  if (selectedCustomer === c.id) drawCircle(c.x, c.y, 23, "#ffffff", context);
  drawCircle(c.x, c.y, 18, customerTypes[c.type].color, context);
  drawCircle(c.x - 5, c.y - 3, 2, "#49372e", context);
  drawCircle(c.x + 5, c.y - 3, 2, "#49372e", context);
}

function drawCustomers() {
  links.forEach(({ a, b, kind }) => {
    ctx.strokeStyle = kind === "annoy" ? "#b66f51" : "#7c8758";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "16px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(kind === "annoy" ? "💢" : "✨", (a.x + b.x) / 2, (a.y + b.y) / 2 + 6);
  });

  customers.forEach(c => {
    ctx.textAlign = "center";

    if (["waiting", "drinking"].includes(c.state)) {
      ctx.strokeStyle = c.happiness > 65 ? "#7c8758" : c.happiness > 40 ? "#d6b274" : "#b66f51";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 21, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "#3d3025";
      const tk = tickets.find(t => t.id === c.id);
      const mark = c.state === "drinking" ? "" : tk ? { queued: " …", brewing: " ♨", ready: " ✔", carried: " ➜" }[tk.state] : " ?";
      ctx.fillText(`${c.name} · ${c.drink}${mark}`, c.x, c.y + 40);
    }

    if (c.state === "waiting") {
      drawCircle(c.x, c.y - 35, 17, "#fffaf3");
      ctx.font = "18px Georgia";
      ctx.fillText(c.waterFeedback > 0 ? "💧" : "☕", c.x, c.y - 29);

      // Patience indicator
      const remaining = Math.max(0, 1 - c.timer / c.patience);

      ctx.fillStyle = "#e6c4b9";
      ctx.fillRect(c.x - 22, c.y + 22, 44, 6);

      ctx.fillStyle = c.waterFeedback > 0 ? "#6593a0"
        : remaining > 0.4 ? "#7c8758" : "#b66f51";
      ctx.fillRect(c.x - 22, c.y + 22, 44 * remaining, 6);
    }

    if (c.state === "drinking") {
      ctx.font = "19px Georgia";

      let reaction = "♥";

      if (c.happiness < 50) reaction = "😠";
      else if (c.type === "student" && cafe.wifi > 0) reaction = "📶";

      ctx.fillText(reaction, c.x, c.y - 30);
    }

    ctx.textAlign = "left";
  });
}

// --------------------
// GAME LOOP
// --------------------

function gameLoop(now) {
  if (!running) return;

  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  timeLeft -= dt;
  spawnTimer += dt;

  // Slightly faster arrivals on later challenges
  const interval = Math.max(2.8, 4 - cafe.unlocked * 0.5);

  if (spawnTimer >= interval) {
    createCustomer();
    spawnTimer = 0;
  }

  updateTickets(dt);
  updateStaff(dt);

  updateCustomers(dt);
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
  updateIdentityBar();
  document.getElementById("time").textContent = Math.ceil(Math.max(0, timeLeft));
  document.getElementById("sales").textContent = sales;
  document.getElementById("served").textContent = outcomes.happy + outcomes.unhappy +
    customers.filter(c => c.state === "drinking").length;
  document.getElementById("happy").textContent = outcomes.happy;
  document.getElementById("turnedAway").textContent = outcomes.turnedAway;
  document.getElementById("noise").textContent = noise;
  document.getElementById("liveSatisfaction").textContent = completedVisits > 0
    ? Math.round(satisfactionTotal / completedVisits) : 0;
  document.querySelector(".time-stat").classList.toggle("is-urgent", timeLeft <= 10);
  updateCustomerControls();
}

function renderResultGoals(mission, satisfaction) {
  const goals = [
    { label: "Earnings", value: sales, target: mission.sales, prefix: "$", suffix: "" },
    { label: "Visit satisfaction", value: satisfaction, target: mission.satisfaction, prefix: "", suffix: "%" },
    { label: "Happy completed visits", value: outcomes.happy, target: mission.happy, prefix: "", suffix: "" }
  ];
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
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Only completed visits contribute to the outcomes
  const satisfaction = completedVisits > 0
    ? Math.round(satisfactionTotal / completedVisits)
    : 0;

  const mission = getMission();

  const won =
    sales >= mission.sales &&
    satisfaction >= mission.satisfaction &&
    outcomes.happy >= mission.happy;

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
    won ? "A day well spent." : "Every day is a fresh start.";

  document.getElementById("resultMessage").textContent = won
    ? `Day ${cafe.day} · All three goals met.`
    : `Day ${cafe.day} · Keep shaping your café and try this mission again.`;
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
Free water offered: ${effects.waterGiven}`;

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

  document.getElementById("resultMoney").textContent = cafe.budget;

  cafe.day++;
  saveGame();
  showScreen("results");
}

function nextDay() {
  showScreen("scenario");
}

// Begin with today's mission before preparing the café.
showScreen("scenario");
