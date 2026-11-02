
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
  const effects = [];

  if (cafe.wifi > 0)
    effects.push("Wi-Fi may attract long-staying students.");

  if (cafe.tables > 3)
    effects.push("Extra tables increase capacity.");

  if (cafe.sound > 0)
    effects.push("Sound panels reduce noise.");

  if (cafe.music >= 7)
    effects.push("Loud music attracts social customers.");

  if (cafe.price >= 7)
    effects.push("High prices may turn away visitors.");

  document.getElementById("identity").textContent =
    "The atmosphere you’re creating";

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

  addEvent(`A ${type} found a table.`);
}

// --------------------
// COFFEE SERVICE
// --------------------

function updateOrderStatus() {
  const status = document.getElementById("orderStatus");
  const help = document.getElementById("serviceHelp");

  const messages = {
    idle: ["Ready for the next order", "Click a customer’s coffee bubble to take their order."],
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
  updateCustomerControls();
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
  updateCustomerControls();
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

      if (coffeeState === "carrying") {
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

  if (!preview && coffeeState !== "idle") {
    const machine = coffeeMachineArea;
    context.strokeStyle = coffeeState === "ready" ? "#f4d183" : "#fffaf3";
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
  customers.forEach(c => {
    ctx.textAlign = "center";

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

  updateLiveStats();

  if (timeLeft <= 0) {
    endDay();
  } else {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

function updateLiveStats() {
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
