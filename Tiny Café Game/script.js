
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
  plants: 0,
  price: 5,
  music: 3
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

  document.getElementById("missionGoals").textContent =
    `Earn $${mission.sales}, reach ${mission.satisfaction}% satisfaction, and have ${mission.happy} happy customers.`;

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

  ["tables", "wifi", "sound", "plants"].forEach(item => {
    document.getElementById(item).textContent = cafe[item];
  });

  document.getElementById("price").value = cafe.price;
  document.getElementById("music").value = cafe.music;
  document.getElementById("priceValue").textContent = cafe.price;
  document.getElementById("musicValue").textContent = cafe.music;

  updateIdentity();
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
  const effects = [];

  if (cafe.wifi > 0)
    effects.push("Wi-Fi may attract long-staying students.");

  if (cafe.tables > 3)
    effects.push("Extra tables increase capacity.");

  if (cafe.sound > 0)
    effects.push("Sound panels reduce noise.");

  if (cafe.plants > 0)
    effects.push("Plants improve comfort.");

  if (cafe.music >= 7)
    effects.push("Loud music attracts social customers.");

  if (cafe.price >= 7)
    effects.push("High prices may turn away visitors.");

  document.getElementById("identity").textContent =
    "Your choices will shape the café.";

  document.getElementById("prediction").textContent =
    effects.join(" ") || "A small, simple neighborhood café.";
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

const tablePositions = [
  { x: 270, y: 120 },
  { x: 510, y: 120 },
  { x: 270, y: 320 },
  { x: 510, y: 320 },
  { x: 390, y: 220 },
  { x: 650, y: 220 }
];

// --------------------
// GAME VARIABLES
// --------------------

const canvas = document.getElementById("cafeCanvas");
const ctx = canvas.getContext("2d");

let customers = [];
let dirtyTables = [];

let running = false;
let timeLeft = 60;
let spawnTimer = 0;
let lastFrame = 0;
let animationFrameId = null;
let customerNumber = 0;

let visitors = 0;
let sales = 0;
let noise = 0;
let selectedCustomer = null;

let currentOrder = null;
let coffeeState = "idle";
let brewTimer = 0;

// Outcome counters
let outcomes;
let effects;
let arrivals;
let satisfactionTotal;
let completedVisits;

// --------------------
// START THE DAY
// --------------------

function startDay() {
  if (running) return;
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

  currentOrder = null;
  coffeeState = "idle";
  brewTimer = 0;

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
  document.getElementById("activeMission").textContent =
    getMission().title;

  document.getElementById("liveMusic").value = cafe.music;
  document.getElementById("liveMusicValue").textContent = cafe.music;
  document.getElementById("selectedCustomer").textContent = "None";

  running = true;
  showScreen("play");

  updateOrderStatus();
  addEvent("The café is open!");

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

function createCustomer() {
  const choices = ["student", "social", "regular"];

  for (let i = 0; i < cafe.wifi * 2; i++) {
    choices.push("student");
  }

  if (cafe.music >= 7) {
    choices.push("social", "social", "social");
  }

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

  customers.push({
    id: customerNumber++,
    type,
    table,
    x: 70,
    y: 450,
    targetX: seat.x,
    targetY: seat.y + 48,
    state: "walking",
    timer: 0,
    happiness: 75,
    patience: customerTypes[type].patience,
    outcomeRecorded: false,
    complaintMade: false,
    waterReceived: false
  });

  addEvent(`A ${type} found a table.`);
}

// --------------------
// COFFEE SERVICE
// --------------------

function updateOrderStatus() {
  const status = document.getElementById("orderStatus");
  const help = document.getElementById("serviceHelp");

  const messages = {
    idle: ["No order selected", "Click a customer's coffee bubble."],
    ordered: ["Order received", "Click the coffee machine to brew."],
    brewing: ["Brewing...", "Your coffee is being prepared."],
    ready: ["Coffee ready!", "Click the machine to pick it up."],
    carrying: ["Coffee in hand", "Click the correct customer to deliver."]
  };

  const message = messages[coffeeState];

  status.textContent =
    coffeeState === "brewing"
      ? `Brewing... ${Math.ceil(brewTimer)}s`
      : message[0];

  help.textContent = message[1];
}

function takeOrder(customer) {
  if (coffeeState !== "idle" || customer.state !== "waiting") return;

  currentOrder = customer.id;
  coffeeState = "ordered";
  updateOrderStatus();

  addEvent(`You took a ${customer.type}'s order.`);
}

function useCoffeeMachine() {
  if (coffeeState === "ordered") {
    coffeeState = "brewing";
    brewTimer = 2.5;
    addEvent("Coffee is brewing.");
  } else if (coffeeState === "ready") {
    coffeeState = "carrying";
    addEvent("Coffee picked up. Deliver it!");
  }

  updateOrderStatus();
}

function deliverCoffee(customer) {
  if (coffeeState !== "carrying") return;
  if (currentOrder !== customer.id) return;
  if (customer.state !== "waiting") return;

  customer.state = "drinking";
  customer.timer = 0;
  customer.happiness = Math.min(100, customer.happiness + 15);

  sales += cafe.price;

  currentOrder = null;
  coffeeState = "idle";

  updateOrderStatus();
  addEvent(`You served a ${customer.type}. +$${cafe.price}`);
}

function cancelOrder(id) {
  if (currentOrder !== id) return;

  currentOrder = null;
  coffeeState = "idle";
  brewTimer = 0;
  updateOrderStatus();
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

function offerWater() {
  if (!running || selectedCustomer === null) return;

  const customer = customers.find(c => c.id === selectedCustomer);

  if (!customer || !["waiting", "drinking"].includes(customer.state)) {
    addEvent("Select a seated customer first.");
    return;
  }

  if (customer.waterReceived) {
    addEvent("This customer already received water.");
    return;
  }

  if (cafe.budget + sales < 2) {
    addEvent("Not enough money for free water.", true);
    return;
  }

  // Water costs $2, but improves customer mood
  sales -= 2;
  customer.happiness = Math.min(100, customer.happiness + 20);
  customer.waterReceived = true;
  effects.waterGiven++;

  addEvent(`You offered a ${customer.type} free water. Their mood improved!`);
}

// --------------------
// CUSTOMER OUTCOMES
// --------------------

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

    addEvent(
      outcome === "happy"
        ? `A satisfied ${customer.type} finished and left. ♥`
        : `A ${customer.type} finished but was unhappy.`,
      outcome === "unhappy"
    );
  } else {
    recordOutcome(customer, "unserved");
    addEvent(`A ${customer.type} left without being served.`, true);
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
}

// --------------------
// CUSTOMER BEHAVIOR
// --------------------

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

  customers.forEach(c => {
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

      if (cafe.plants > 0) {
        c.happiness += 0.5 * dt;
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
      const dx = 70 - c.x;
      const dy = 450 - c.y;
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

  // Map the content area, excluding the canvas border, to drawing coordinates.
  const scaleX = rect.width / canvas.offsetWidth;
  const scaleY = rect.height / canvas.offsetHeight;
  const x = (event.clientX - rect.left - canvas.clientLeft * scaleX) *
    canvas.width / (canvas.clientWidth * scaleX);
  const y = (event.clientY - rect.top - canvas.clientTop * scaleY) *
    canvas.height / (canvas.clientHeight * scaleY);

  if (x >= 25 && x <= 185 && y >= 30 && y <= 115) {
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

      document.getElementById("selectedCustomer").textContent =
        `${c.type} (${Math.round(c.happiness)}% happy)`;

      if (coffeeState === "carrying") {
        deliverCoffee(c);
      } else {
        takeOrder(c);
      }

      return;
    }
  }

  for (let i = 0; i < cafe.tables; i++) {
    const table = tablePositions[i];

    if (Math.hypot(table.x - x, table.y - y) < 38) {
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

function drawCircle(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawCafe() {
  ctx.clearRect(0, 0, 800, 500);

  ctx.fillStyle = "#ead9bf";
  ctx.fillRect(0, 0, 800, 500);

  // Coffee station
  ctx.fillStyle = "#a67454";
  ctx.fillRect(25, 30, 160, 85);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "17px Georgia";
  ctx.fillText("☕ MACHINE", 105, 65);
  ctx.font = "13px Georgia";
  ctx.fillText("Click here", 105, 90);

  // Tables
  for (let i = 0; i < cafe.tables; i++) {
    const table = tablePositions[i];

    drawCircle(table.x, table.y, 35, "#ad7956");
    drawCircle(table.x, table.y, 27, "#c7956b");

    if (dirtyTables.includes(i)) {
      ctx.font = "23px Georgia";
      ctx.fillText("🧽", table.x, table.y + 7);
    }
  }

  // Plants
  for (let i = 0; i < cafe.plants; i++) {
    const x = 65 + (i % 5) * 45;
    const y = 185 + Math.floor(i / 5) * 45;

    drawCircle(x, y, 15, "#819879");
  }

  ctx.fillStyle = "#654b3b";
  ctx.font = "18px Georgia";
  ctx.textAlign = "left";
  ctx.fillText("ENTRANCE ↑", 25, 475);
}

function drawCustomers() {
  customers.forEach(c => {
    const traits = customerTypes[c.type];

    // Selected customer
    if (selectedCustomer === c.id) {
      drawCircle(c.x, c.y, 23, "#ffffff");
    }

    drawCircle(c.x, c.y, 18, traits.color);

    drawCircle(c.x - 5, c.y - 3, 2, "#49372e");
    drawCircle(c.x + 5, c.y - 3, 2, "#49372e");

    ctx.textAlign = "center";

    if (c.state === "waiting") {
      drawCircle(c.x, c.y - 35, 17, "#fffaf3");
      ctx.font = "18px Georgia";
      ctx.fillText("☕", c.x, c.y - 29);

      // Patience indicator
      const remaining = Math.max(0, 1 - c.timer / c.patience);

      ctx.fillStyle = "#e6c4b9";
      ctx.fillRect(c.x - 22, c.y + 22, 44, 6);

      ctx.fillStyle = remaining > 0.4 ? "#91a583" : "#c96e60";
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

  if (coffeeState === "brewing") {
    brewTimer -= dt;

    if (brewTimer <= 0) {
      coffeeState = "ready";
      addEvent("Coffee ready! Pick it up.");
    }
    updateOrderStatus();
  }

  updateCustomers(dt);
  drawCafe();
  drawCustomers();

  document.getElementById("time").textContent =
    Math.ceil(Math.max(0, timeLeft));

  document.getElementById("sales").textContent = sales;

  document.getElementById("served").textContent =
    outcomes.happy + outcomes.unhappy +
    customers.filter(c => c.state === "drinking").length;

  document.getElementById("happy").textContent = outcomes.happy;

  document.getElementById("turnedAway").textContent =
    outcomes.turnedAway;

  document.getElementById("noise").textContent = noise;

  if (timeLeft <= 0) {
    endDay();
  } else {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
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
    won ? "Mission Complete! ⭐" : "Mission Not Completed";

  document.getElementById("resultMessage").textContent =
    `Sales: $${sales} / $${mission.sales}
Satisfaction: ${satisfaction}% / ${mission.satisfaction}%
Happy customers: ${outcomes.happy} / ${mission.happy}`;

  document.getElementById("resultCustomers").textContent =
    `♥ Served & happy: ${outcomes.happy}
☹ Served & unhappy: ${outcomes.unhappy}
⌛ Left unserved: ${outcomes.unserved}
🚪 Turned away: ${outcomes.turnedAway}
☕ Still inside at closing: ${unfinished}`;

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
