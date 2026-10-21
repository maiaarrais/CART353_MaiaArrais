
const canvas = document.getElementById("cafe");
const ctx = canvas.getContext("2d");

// Daily challenges
const challenges = [
  {
    title: "First Opening",
    description: "Open a welcoming neighborhood café.",
    sales: 30,
    satisfaction: 60
  },
  {
    title: "The Lunch Rush",
    description: "Handle more customers during a busy afternoon.",
    sales: 55,
    satisfaction: 60
  },
  {
    title: "The Study Crowd",
    description: "Create a comfortable café for studying.",
    sales: 65,
    satisfaction: 70
  }
];

// Saved café
function newCafe() {
  return {
    day: 1,
    money: 170,
    unlocked: 0,
    tables: 3,
    wifi: 0,
    sound: 0,
    plants: 0,
    price: 5,
    music: 3
  };
}

let cafe = loadCafe();

function loadCafe() {
  try {
    return JSON.parse(localStorage.getItem("littleCafe")) || newCafe();
  } catch {
    return newCafe();
  }
}

function saveCafe() {
  localStorage.setItem("littleCafe", JSON.stringify(cafe));
}

// Current day
let customers = [];
let sales = 0;
let visitors = 0;
let happyTotal = 0;
let reviews = 0;
let lostCustomers = 0;
let timeLeft = 45;
let running = false;
let lastFrame = 0;
let spawnTimer = 0;
let noise = 0;
let customerId = 0;
let counts = { student: 0, social: 0, regular: 0 };

// Screen navigation
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  document.getElementById(name).classList.add("active");

  if (name === "scenario") showChallenge();
  if (name === "setup") showSetup();
}

// Scenario
function currentChallenge() {
  return challenges[Math.min(cafe.unlocked, challenges.length - 1)];
}

function showChallenge() {
  const challenge = currentChallenge();

  document.getElementById("challengeTitle").textContent =
    challenge.title;

  document.getElementById("challengeDescription").textContent =
    challenge.description;

  document.getElementById("challengeGoals").textContent =
    `Earn $${challenge.sales} and reach ${challenge.satisfaction}% satisfaction.`;
}

// Setup screen
function showSetup() {
  document.getElementById("dayNumber").textContent = cafe.day;
  document.getElementById("setupMoney").textContent = cafe.money;

  document.getElementById("price").value = cafe.price;
  document.getElementById("music").value = cafe.music;

  document.getElementById("priceValue").textContent = cafe.price;
  document.getElementById("musicValue").textContent = cafe.music;
  document.getElementById("setupMessage").textContent =
    `Tables: ${cafe.tables} | Wi-Fi: ${cafe.wifi} | Sound panels: ${cafe.sound} | Plants: ${cafe.plants}`;
}

// Buy permanent upgrades
function buy(item, cost) {
  if (cafe.money < cost) {
    document.getElementById("setupMessage").textContent =
      "Not enough money!";
    return;
  }

  if ((item === "wifi" || item === "sound") && cafe[item] >= 3) {
    document.getElementById("setupMessage").textContent =
      "This upgrade is already at its maximum level!";
    return;
  }

  if (item === "table" && cafe.tables >= 6) {
    document.getElementById("setupMessage").textContent =
      "Your café has no room for more tables!";
    return;
  }

  cafe.money -= cost;

  if (item === "table") cafe.tables++;
  else cafe[item]++;

  saveCafe();
  showSetup();
}

// Configuration
document.getElementById("price").oninput = function() {
  cafe.price = Number(this.value);
  document.getElementById("priceValue").textContent = cafe.price;
  saveCafe();
};

document.getElementById("music").oninput = function() {
  cafe.music = Number(this.value);
  document.getElementById("musicValue").textContent = cafe.music;
  saveCafe();
};

document.getElementById("liveMusic").oninput = function() {
  cafe.music = Number(this.value);
  document.getElementById("liveMusicValue").textContent = cafe.music;
  saveCafe();
};

// Customer types
const types = {
  student: {
    color: "#8da9b9",
    patience: 11,
    stay: 18,
    noiseTolerance: 3
  },
  social: {
    color: "#d99a88",
    patience: 9,
    stay: 12,
    noiseTolerance: 9
  },
  regular: {
    color: "#d5ad65",
    patience: 13,
    stay: 9,
    noiseTolerance: 6
  }
};

// Table positions
const tablePositions = [
  { x: 280, y: 125 },
  { x: 510, y: 125 },
  { x: 280, y: 310 },
  { x: 510, y: 310 },
  { x: 395, y: 220 },
  { x: 640, y: 220 }
];

// Start the day
function startDay() {
  customers = [];
  sales = 0;
  visitors = 0;
  happyTotal = 0;
  reviews = 0;
  lostCustomers = 0;
  counts = { student: 0, social: 0, regular: 0 };

  timeLeft = 45;
  spawnTimer = 0;
  noise = 0;
  running = true;

  document.getElementById("playDay").textContent = cafe.day;
  document.getElementById("liveMusic").value = cafe.music;
  document.getElementById("liveMusicValue").textContent = cafe.music;

  showScreen("play");

  lastFrame = performance.now();
  requestAnimationFrame(gameLoop);
}

// Customers arrive independently
function spawnCustomer() {
  const choices = ["student", "social", "regular"];

  // Better Wi-Fi attracts more students
  for (let i = 0; i < cafe.wifi; i++) {
    choices.push("student");
  }

  const type = choices[Math.floor(Math.random() * choices.length)];
  const settings = types[type];

  visitors++;
  counts[type]++;

  const usedTables = customers
    .filter(c => c.state !== "leaving")
    .map(c => c.table);

  const freeTables = [];

  for (let i = 0; i < cafe.tables; i++) {
    if (!usedTables.includes(i)) freeTables.push(i);
  }

  // No seating available
  if (freeTables.length === 0) {
    lostCustomers++;
    addReview(20);
    return;
  }

  // Customers select their own table
  const table = freeTables[Math.floor(Math.random() * freeTables.length)];
  const position = tablePositions[table];

  // Higher prices reduce willingness to stay
  if (cafe.price >= 7 && Math.random() < 0.3) {
    lostCustomers++;
    addReview(35);
    return;
  }

  customers.push({
    id: customerId++,
    type: type,
    table: table,
    x: 75,
    y: 430,
    targetX: position.x,
    targetY: position.y + 48,
    state: "walking",
    timer: 0,
    patience: settings.patience,
    stay: settings.stay,
    happiness: 75
  });
}

// Record a customer review
function addReview(score) {
  happyTotal += Math.max(0, Math.min(100, score));
  reviews++;
}

// Simulation rules
function update(dt) {
  timeLeft -= dt;
  spawnTimer += dt;

  const challengeIndex = Math.min(cafe.unlocked, 2);
  const spawnInterval = [3.5, 2.6, 2.4][challengeIndex];

  if (spawnTimer >= spawnInterval) {
    spawnCustomer();
    spawnTimer = 0;
  }

  const socialCount = customers.filter(c =>
    c.type === "social" && c.state !== "leaving"
  ).length;

  const crowding = customers.filter(c =>
    c.state !== "leaving"
  ).length;

  noise = Math.max(0,
    cafe.music +
    socialCount * 2 +
    Math.max(0, crowding - 3) -
    cafe.sound * 2
  );

  customers.forEach(c => {
    const settings = types[c.type];

    if (c.state === "walking") {
      const dx = c.targetX - c.x;
      const dy = c.targetY - c.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 3) {
        c.x = c.targetX;
        c.y = c.targetY;
        c.state = "waiting";
        c.timer = 0;
      } else {
        const step = Math.min(distance, 100 * dt);
        c.x += dx / distance * step;
        c.y += dy / distance * step;
      }
    }

    else if (c.state === "waiting") {
      c.timer += dt;

      if (c.timer > c.patience) {
        c.happiness -= 40;
        leaveCustomer(c);
      }
    }

    else if (c.state === "eating") {
      c.timer += dt;

      // Noise affects noise-sensitive customers
      if (noise > settings.noiseTolerance) {
        c.happiness -= 3 * dt;
      }

      // Plants improve atmosphere
      if (cafe.plants > 0) {
        c.happiness += 0.5 * dt;
      }

      // Students enjoy Wi-Fi and stay longer
      let stayTime = c.stay;

      if (c.type === "student" && cafe.wifi > 0) {
        stayTime += cafe.wifi * 3;
      }

      if (c.happiness < 35 || c.timer >= stayTime) {
        leaveCustomer(c);
      }
    }

    else if (c.state === "leaving") {
      const dx = 75 - c.x;
      const dy = 430 - c.y;
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

  updateStats();
}

function leaveCustomer(c) {
  c.state = "leaving";
  addReview(c.happiness);
}

// Player serves an order
function serveCustomer(c) {
  if (c.state !== "waiting") return;

  c.state = "eating";
  c.timer = 0;

  c.happiness += 10;

  sales += cafe.price;
}

// Click customer orders
canvas.addEventListener("click", event => {
  if (!running) return;

  const rect = canvas.getBoundingClientRect();

  const x = (event.clientX - rect.left) * canvas.width / rect.width;
  const y = (event.clientY - rect.top) * canvas.height / rect.height;

  customers.forEach(c => {
    if (c.state === "waiting") {
      const distance = Math.hypot(c.x - x, c.y - y);

      if (distance < 36) {
        serveCustomer(c);
      }
    }
  });

  updateStats();
});

function updateStats() {
  document.getElementById("time").textContent =
    Math.ceil(Math.max(0, timeLeft));

  document.getElementById("sales").textContent = sales;
  document.getElementById("noise").textContent = noise;
  document.getElementById("visitors").textContent = visitors;
}

// Drawing
function drawCircle(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, 800, 480);

  // Floor
  ctx.fillStyle = "#ead9bf";
  ctx.fillRect(0, 0, 800, 480);

  // Counter
  ctx.fillStyle = "#a67454";
  ctx.fillRect(25, 35, 155, 85);

  ctx.fillStyle = "white";
  ctx.font = "20px Georgia";
  ctx.fillText("COFFEE", 55, 85);

  // Tables
  for (let i = 0; i < cafe.tables; i++) {
    const table = tablePositions[i];

    drawCircle(table.x, table.y, 34, "#ad7956");
    drawCircle(table.x, table.y, 26, "#c7956b");
  }

  // Plants
  for (let i = 0; i < cafe.plants; i++) {
    const x = 55 + (i % 6) * 45;
    const y = 175 + Math.floor(i / 6) * 45;

    drawCircle(x, y, 15, "#819879");
  }

  // Entrance
  ctx.fillStyle = "#654b3b";
  ctx.font = "18px Georgia";
  ctx.fillText("ENTRANCE", 25, 460);

  // Customers
  customers.forEach(c => {
    drawCircle(c.x, c.y, 17, types[c.type].color);

    // Face
    ctx.fillStyle = "#49372e";
    drawCircle(c.x - 5, c.y - 3, 2, "#49372e");
    drawCircle(c.x + 5, c.y - 3, 2, "#49372e");

    // Waiting order
    if (c.state === "waiting") {
      drawCircle(c.x, c.y - 35, 17, "#fffaf3");

      ctx.fillStyle = "#49372e";
      ctx.font = "18px Georgia";
      ctx.textAlign = "center";
      ctx.fillText("☕", c.x, c.y - 29);
      ctx.textAlign = "left";
    }

    // Drinking
    if (c.state === "eating") {
      ctx.fillStyle = "#49372e";
      ctx.font = "13px Georgia";
      ctx.fillText("♥", c.x + 16, c.y - 18);
    }
  });
}

// Animation loop
function gameLoop(now) {
  if (!running) return;

  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  update(dt);
  draw();

  if (timeLeft <= 0) {
    endDay();
  } else {
    requestAnimationFrame(gameLoop);
  }
}

// End of day
function endDay() {
  running = false;

  // Include remaining customers in satisfaction
  customers.forEach(c => {
    if (c.state !== "leaving" && c.state !== "gone") {
      addReview(c.happiness);
    }
  });

  const satisfaction = reviews > 0
    ? Math.round(happyTotal / reviews)
    : 0;

  const challenge = currentChallenge();

  const won =
    sales >= challenge.sales &&
    satisfaction >= challenge.satisfaction;

  cafe.money += sales;

  if (won && cafe.unlocked < challenges.length - 1) {
    cafe.unlocked++;
  }

  document.getElementById("reportDay").textContent = cafe.day;

  document.getElementById("resultTitle").textContent =
    won ? "Challenge Complete! ⭐" : "Another Day at the Café";

  document.getElementById("resultMessage").textContent =
    won
      ? "Great work! Your café is growing."
      : "Not quite there yet. Try adjusting your setup.";

  document.getElementById("reportStats").textContent =
    `Sales: $${sales} | Satisfaction: ${satisfaction}% | Visitors: ${visitors} | Turned away: ${lostCustomers} | Total money: $${cafe.money}`;

  // Describe the customer mix that emerged
  let identity = "a neighborhood café";

  if (counts.student > counts.social &&
      counts.student > counts.regular) {
    identity = "a student study café";
  }

  if (counts.social > counts.student &&
      counts.social > counts.regular) {
    identity = "a lively social café";
  }

  let explanation = `Your café became ${identity}. `;

  if (lostCustomers > 0) {
    explanation += `${lostCustomers} visitors left without ordering. `;
  }

  if (cafe.wifi > 0) {
    explanation += "Your Wi-Fi encouraged students to visit and stay longer. ";
  }

  if (cafe.music >= 7) {
    explanation += "Loud music made the environment less comfortable for quiet customers.";
  }

  document.getElementById("emergenceText").textContent = explanation;

  cafe.day++;
  saveCafe();

  showScreen("report");
}

function nextDay() {
  showScreen("scenario");
}

// Reset saved game
function resetGame() {
  if (!confirm("Start over and delete your café progress?")) return;

  cafe = newCafe();
  saveCafe();
  showScreen("scenario");
}

// First screen
showScreen("start");
