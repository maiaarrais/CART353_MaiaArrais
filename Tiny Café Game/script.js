
// Starting café
const startingCafe = {
  budget: 150,
  tables: 3,
  wifi: 0,
  sound: 0,
  plants: 0,
  price: 5,
  music: 3
};

// Load saved café or start a new one
let cafe;

try {
  cafe = JSON.parse(localStorage.getItem("cafeSave")) || {
    ...startingCafe
  };
} catch {
  cafe = { ...startingCafe };
}

function saveGame() {
  localStorage.setItem("cafeSave", JSON.stringify(cafe));
}

// Change screens
function showScreen(screenName) {
  const selectedScreen = document.getElementById(screenName);

  if (!selectedScreen) {
    document.getElementById("message").textContent =
      "The café play screen is not available yet.";
    return;
  }

  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  selectedScreen.classList.add("active");

  if (screenName === "setup") {
    updateSetup();
  }
}

// Buy furniture and upgrades
function buyUpgrade(item, cost) {
  if (cafe.budget < cost) {
    document.getElementById("message").textContent =
      "Not enough money!";
    return;
  }

  if (item === "tables" && cafe.tables >= 6) {
    document.getElementById("message").textContent =
      "No room for more tables!";
    return;
  }

  if ((item === "wifi" || item === "sound") && cafe[item] >= 3) {
    document.getElementById("message").textContent =
      "Maximum upgrade level reached!";
    return;
  }

  cafe.budget -= cost;
  cafe[item]++;

  document.getElementById("message").textContent =
    "Upgrade purchased!";

  saveGame();
  updateSetup();
}

// Update setup information
function updateSetup() {
  document.getElementById("budget").textContent = cafe.budget;
  document.getElementById("tables").textContent = cafe.tables;
  document.getElementById("wifi").textContent = cafe.wifi;
  document.getElementById("sound").textContent = cafe.sound;
  document.getElementById("plants").textContent = cafe.plants;

  document.getElementById("price").value = cafe.price;
  document.getElementById("music").value = cafe.music;

  document.getElementById("priceValue").textContent = cafe.price;
  document.getElementById("musicValue").textContent = cafe.music;

  updateIdentity();
}

// Coffee price
document.getElementById("price").addEventListener("input", function() {
  cafe.price = Number(this.value);
  document.getElementById("priceValue").textContent = cafe.price;

  saveGame();
  updateIdentity();
});

// Music volume
document.getElementById("music").addEventListener("input", function() {
  cafe.music = Number(this.value);
  document.getElementById("musicValue").textContent = cafe.music;

  saveGame();
  updateIdentity();
});

// Show possible effects of decisions
function updateIdentity() {
  const effects = [];

  if (cafe.wifi > 0) {
    effects.push("Better Wi-Fi may attract more students.");
  }

  if (cafe.tables >= 5) {
    effects.push("Extra seating allows more customers inside.");
  }

  if (cafe.sound > 0) {
    effects.push("Sound panels help keep noise under control.");
  }

  if (cafe.plants > 0) {
    effects.push("Plants make the café more comfortable.");
  }

  if (cafe.music >= 7) {
    effects.push("Loud music may attract social customers.");
  }

  if (cafe.price >= 7) {
    effects.push("Higher prices may discourage some visitors.");
  }

  // These are predictions, not guaranteed outcomes
  document.getElementById("identity").textContent =
    "A café shaped by your decisions.";

  document.getElementById("prediction").textContent =
    effects.length > 0
      ? effects.join(" ")
      : "Your café is currently small, simple, and welcoming.";
}

updateSetup();


// Canvas
const canvas = document.getElementById("cafeCanvas");
const ctx = canvas.getContext("2d");

// Customer types
const customerTypes = {
  student: {
    color: "#90a8bb",
    stay: 20,
    noiseTolerance: 4
  },

  social: {
    color: "#d99c88",
    stay: 12,
    noiseTolerance: 9
  },

  regular: {
    color: "#d6b274",
    stay: 9,
    noiseTolerance: 6
  }
};

// Table locations
const tablePositions = [
  { x: 270, y: 120 },
  { x: 510, y: 120 },
  { x: 270, y: 320 },
  { x: 510, y: 320 },
  { x: 390, y: 220 },
  { x: 650, y: 220 }
];

// Simulation variables
let customers = [];
let visitors = 0;
let noise = 0;
let timeLeft = 60;
let spawnTimer = 0;
let running = false;
let lastFrame = 0;
let customerNumber = 0;


function drawCircle(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCafe() {
  // Floor
  ctx.fillStyle = "#ead9bf";
  ctx.fillRect(0, 0, 800, 500);

  // Counter
  ctx.fillStyle = "#a67454";
  ctx.fillRect(25, 30, 160, 85);

  ctx.fillStyle = "white";
  ctx.font = "20px Georgia";
  ctx.fillText("COFFEE", 55, 80);

  // Tables
  for (let i = 0; i < cafe.tables; i++) {
    const table = tablePositions[i];

    drawCircle(table.x, table.y, 35, "#ad7956");
    drawCircle(table.x, table.y, 27, "#c7956b");
  }

  // Plants
  for (let i = 0; i < cafe.plants; i++) {
    const x = 65 + (i % 5) * 45;
    const y = 185 + Math.floor(i / 5) * 45;

    drawCircle(x, y, 15, "#819879");
  }

  // Entrance
  ctx.fillStyle = "#654b3b";
  ctx.font = "18px Georgia";
  ctx.fillText("ENTRANCE ↑", 30, 475);
}


function createCustomer() {
  let choices = ["student", "social", "regular"];

  // Better Wi-Fi attracts students
  for (let i = 0; i < cafe.wifi * 2; i++) {
    choices.push("student");
  }

  // Loud music attracts social customers
  if (cafe.music >= 7) {
    choices.push("social", "social", "social");
  }

  const type = choices[Math.floor(Math.random() * choices.length)];

  visitors++;

  // Find available tables
  const occupied = customers
    .filter(c => c.state !== "leaving")
    .map(c => c.table);

  const freeTables = [];

  for (let i = 0; i < cafe.tables; i++) {
    if (!occupied.includes(i)) {
      freeTables.push(i);
    }
  }

  if (freeTables.length === 0) {
    showMessage("A customer left because there were no available tables!");
    return;
  }

  // Expensive coffee discourages some customers
  if (cafe.price >= 7 && Math.random() < 0.35) {
    showMessage("A customer left because coffee was too expensive!");
    return;
  }

  const table = freeTables[Math.floor(Math.random() * freeTables.length)];
  const position = tablePositions[table];

  customers.push({
    id: customerNumber++,
    type: type,
    table: table,
    x: 70,
    y: 450,
    targetX: position.x,
    targetY: position.y + 50,
    state: "walking",
    timer: 0,
    happiness: 80
  });

  showMessage(`A ${type} entered the café!`);
}


function updateCustomers(dt) {
  const socialCount = customers.filter(c =>
    c.type === "social" && c.state !== "leaving"
  ).length;

  const inside = customers.filter(c =>
    c.state !== "leaving"
  ).length;

  // Noise emerges from music and customers
  noise = Math.max(0,
    cafe.music +
    socialCount * 2 +
    Math.max(0, inside - 3) -
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
        c.state = "sitting";
        c.timer = 0;
      } else {
        const step = Math.min(distance, 110 * dt);
        c.x += dx / distance * step;
        c.y += dy / distance * step;
      }
    }

    else if (c.state === "sitting") {
      c.timer += dt;

      // Noise reduces happiness
      if (noise > traits.noiseTolerance) {
        c.happiness -= 5 * dt;
      }

      // Plants improve comfort
      if (cafe.plants > 0) {
        c.happiness += 0.5 * dt;
      }

      let stayTime = traits.stay;

      // Wi-Fi encourages longer study sessions
      if (c.type === "student") {
        stayTime += cafe.wifi * 5;
      }

      if (c.timer >= stayTime || c.happiness < 35) {
        c.state = "leaving";
        showMessage(`A ${c.type} left the café.`);
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
  });

  customers = customers.filter(c => c.state !== "gone");
}

function drawCustomers() {
  customers.forEach(c => {
    const traits = customerTypes[c.type];

    // Customer body
    drawCircle(c.x, c.y, 18, traits.color);

    // Eyes
    drawCircle(c.x - 5, c.y - 3, 2, "#49372e");
    drawCircle(c.x + 5, c.y - 3, 2, "#49372e");

    // Reactions
    ctx.textAlign = "center";
    ctx.font = "20px Georgia";

    if (c.state === "sitting") {
      if (c.happiness < 50) {
        ctx.fillText("😠", c.x, c.y - 30);
      } else if (c.type === "student" && cafe.wifi > 0) {
        ctx.fillText("📶", c.x, c.y - 30);
      } else {
        ctx.fillText("♥", c.x, c.y - 30);
      }
    }

    ctx.textAlign = "left";
  });
}

function startDay() {
  customers = [];
  visitors = 0;
  noise = 0;
  timeLeft = 60;
  spawnTimer = 0;
  running = true;

  showScreen("play");

  lastFrame = performance.now();
  requestAnimationFrame(gameLoop);
}

function gameLoop(now) {
  if (!running) return;

  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  timeLeft -= dt;
  spawnTimer += dt;

  if (spawnTimer >= 4) {
    createCustomer();
    spawnTimer = 0;
  }

  updateCustomers(dt);

  drawCafe();
  drawCustomers();

  document.getElementById("time").textContent =
    Math.ceil(Math.max(0, timeLeft));

  document.getElementById("visitors").textContent = visitors;

  document.getElementById("inside").textContent =
    customers.filter(c => c.state !== "leaving").length;

  document.getElementById("noise").textContent = noise;

  if (timeLeft <= 0) {
    endDay();
  } else {
    requestAnimationFrame(gameLoop);
  }
}

function showMessage(text) {
  document.getElementById("gameMessage").textContent = text;
}

function endDay() {
  running = false;
  showScreen("setup");
}
