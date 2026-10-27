
// --------------------
// CAFÉ DATA
// --------------------

const startingCafe = {
  budget: 150,
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
  localStorage.setItem("cafeSave", JSON.stringify(cafe));
}

// --------------------
// SCREENS AND SHOP
// --------------------

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  document.getElementById(name).classList.add("active");

  if (name === "setup") updateSetup();
}

function buyUpgrade(item, cost) {
  if (cafe.budget < cost) {
    document.getElementById("message").textContent =
      "Not enough money!";
    return;
  }

  if (item === "tables" && cafe.tables >= 6) {
    document.getElementById("message").textContent =
      "No more space for tables!";
    return;
  }

  if (["wifi", "sound"].includes(item) && cafe[item] >= 3) {
    document.getElementById("message").textContent =
      "Maximum upgrade level reached!";
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

document.getElementById("price").addEventListener("input", function() {
  cafe.price = Number(this.value);
  document.getElementById("priceValue").textContent = cafe.price;
  saveGame();
  updateIdentity();
});

document.getElementById("music").addEventListener("input", function() {
  cafe.music = Number(this.value);
  document.getElementById("musicValue").textContent = cafe.music;
  saveGame();
  updateIdentity();
});

function updateIdentity() {
  const effects = [];

  if (cafe.wifi > 0)
    effects.push("Wi-Fi attracts students who stay longer.");

  if (cafe.tables > 3)
    effects.push("Extra tables allow more customers inside.");

  if (cafe.sound > 0)
    effects.push("Sound panels reduce noise.");

  if (cafe.plants > 0)
    effects.push("Plants improve comfort.");

  if (cafe.music >= 7)
    effects.push("Loud music attracts social visitors.");

  if (cafe.price >= 7)
    effects.push("High prices may discourage customers.");

  document.getElementById("identity").textContent =
    "A café shaped by your decisions.";

  document.getElementById("prediction").textContent =
    effects.join(" ") || "Your café is small and welcoming.";
}

// --------------------
// CUSTOMER TYPES
// --------------------

const customerTypes = {
  student: {
    color: "#90a8bb",
    stay: 16,
    patience: 12,
    noiseTolerance: 4
  },
  social: {
    color: "#d99c88",
    stay: 10,
    patience: 9,
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

let visitors = 0;
let noise = 0;
let sales = 0;
let served = 0;
let lost = 0;
let totalHappiness = 0;
let reviews = 0;
let customerNumber = 0;

let arrivals = {
  student: 0,
  social: 0,
  regular: 0
};

// One coffee order can be prepared at a time
let currentOrder = null;
let coffeeState = "idle";
let brewTimer = 0;

// --------------------
// START DAY
// --------------------

function startDay() {
  customers = [];
  dirtyTables = [];

  timeLeft = 60;
  spawnTimer = 0;
  visitors = 0;
  noise = 0;
  sales = 0;
  served = 0;
  lost = 0;
  totalHappiness = 0;
  reviews = 0;

  arrivals = { student: 0, social: 0, regular: 0 };

  currentOrder = null;
  coffeeState = "idle";
  brewTimer = 0;

  running = true;

  showScreen("play");
  updateOrderStatus();

  showMessage("The café is open! Customers are arriving.");

  lastFrame = performance.now();
  requestAnimationFrame(gameLoop);
}

// --------------------
// CUSTOMER ARRIVALS
// --------------------

function createCustomer() {
  const choices = ["student", "social", "regular"];

  // Wi-Fi increases the chance of students
  for (let i = 0; i < cafe.wifi * 2; i++) {
    choices.push("student");
  }

  // Loud music attracts social customers
  if (cafe.music >= 7) {
    choices.push("social", "social", "social");
  }

  const type = choices[Math.floor(Math.random() * choices.length)];

  visitors++;
  arrivals[type]++;

  // Higher prices discourage some visitors
  if (Math.random() < Math.max(0, cafe.price - 5) * 0.15) {
    lost++;
    showMessage(`A ${type} left because coffee was too expensive.`);
    return;
  }

  // Customers cannot use dirty or occupied tables
  const occupied = customers
    .filter(c => c.state !== "gone")
    .map(c => c.table);

  const free = [];

  for (let i = 0; i < cafe.tables; i++) {
    if (!occupied.includes(i) && !dirtyTables.includes(i)) {
      free.push(i);
    }
  }

  if (free.length === 0) {
    lost++;
    showMessage(`A ${type} left. No clean tables available!`);
    return;
  }

  // Customers pick their own table
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
    reviewGiven: false
  });

  showMessage(`A ${type} entered the café.`);
}

// --------------------
// ORDERS AND COFFEE
// --------------------

function updateOrderStatus() {
  const status = document.getElementById("orderStatus");
  const help = document.getElementById("serviceHelp");

  if (coffeeState === "idle") {
    status.textContent = "No order selected";
    help.textContent = "Click a customer's ☕ bubble to take an order.";
  }

  if (coffeeState === "ordered") {
    status.textContent = "Order received!";
    help.textContent = "Click the COFFEE MACHINE to start brewing.";
  }

  if (coffeeState === "brewing") {
    status.textContent = "Brewing... " + Math.ceil(brewTimer) + "s";
    help.textContent = "Your coffee is being prepared.";
  }

  if (coffeeState === "ready") {
    status.textContent = "Coffee ready!";
    help.textContent = "Click the COFFEE MACHINE to pick it up.";
  }

  if (coffeeState === "carrying") {
    status.textContent = "Coffee in hand ☕";
    help.textContent = "Click the customer to deliver their drink.";
  }
}

function takeOrder(customer) {
  if (coffeeState !== "idle" || customer.state !== "waiting") return;

  currentOrder = customer.id;
  coffeeState = "ordered";

  showMessage(`Taking a ${customer.type}'s order.`);
  updateOrderStatus();
}

function useCoffeeMachine() {
  if (coffeeState === "ordered") {
    coffeeState = "brewing";
    brewTimer = 2.5;
    showMessage("Preparing coffee...");
  } else if (coffeeState === "ready") {
    coffeeState = "carrying";
    showMessage("Coffee picked up. Deliver it!");
  }

  updateOrderStatus();
}

function deliverCoffee(customer) {
  if (coffeeState !== "carrying") return;
  if (customer.id !== currentOrder) return;
  if (customer.state !== "waiting") return;

  customer.state = "drinking";
  customer.timer = 0;
  customer.happiness += 15;

  sales += cafe.price;
  served++;

  currentOrder = null;
  coffeeState = "idle";

  showMessage(`Coffee served! +$${cafe.price}`);
  updateOrderStatus();
}

// If a customer leaves while their coffee is being made
function cancelOrder(id) {
  if (currentOrder !== id) return;

  currentOrder = null;
  coffeeState = "idle";
  brewTimer = 0;

  showMessage("The customer left before their coffee was ready!");
  updateOrderStatus();
}

// --------------------
// CUSTOMER BEHAVIOR
// --------------------

function leaveCustomer(customer) {
  if (customer.state === "leaving" || customer.state === "gone") return;

  cancelOrder(customer.id);

  customer.state = "leaving";
  customer.timer = 0;

  // A used table must be cleaned
  if (!dirtyTables.includes(customer.table)) {
    dirtyTables.push(customer.table);
  }

  if (!customer.reviewGiven) {
    totalHappiness += Math.max(0, Math.min(100, customer.happiness));
    reviews++;
    customer.reviewGiven = true;
  }
}

function updateCustomers(dt) {
  const socialCount = customers.filter(c =>
    c.type === "social" &&
    !["leaving", "gone"].includes(c.state)
  ).length;

  const inside = customers.filter(c =>
    !["leaving", "gone"].includes(c.state)
  ).length;

  // Noise is produced by customers and music
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
        c.state = "waiting";
        c.timer = 0;
        showMessage(`A ${c.type} is ready to order.`);
      } else {
        const step = Math.min(distance, 110 * dt);

        c.x += dx / distance * step;
        c.y += dy / distance * step;
      }
    }

    else if (c.state === "waiting") {
      c.timer += dt;

      // Waiting too long reduces happiness
      c.happiness -= 2 * dt;

      if (c.timer >= c.patience) {
        c.happiness -= 25;
        lost++;
        showMessage(`An impatient ${c.type} left without coffee.`);
        leaveCustomer(c);
      }
    }

    else if (c.state === "drinking") {
      c.timer += dt;

      // Customer preferences affect happiness
      if (noise > traits.noiseTolerance) {
        c.happiness -= 4 * dt;
      }

      if (cafe.plants > 0) {
        c.happiness += 0.4 * dt;
      }

      if (c.type === "student" && cafe.wifi > 0) {
        c.happiness += 0.3 * dt;
      }

      let stayTime = traits.stay;

      if (c.type === "student") {
        stayTime += cafe.wifi * 5;
      }

      if (c.happiness < 30) {
        showMessage(`A ${c.type} left because they were unhappy.`);
        leaveCustomer(c);
      } else if (c.timer >= stayTime) {
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

  const x = (event.clientX - rect.left) * canvas.width / rect.width;
  const y = (event.clientY - rect.top) * canvas.height / rect.height;

  // Coffee machine area
  if (x >= 25 && x <= 185 && y >= 30 && y <= 115) {
    useCoffeeMachine();
    return;
  }

  // Click customers
  for (const customer of customers) {
    const distance = Math.hypot(customer.x - x, customer.y - y);

    if (distance < 35) {
      if (coffeeState === "carrying") {
        deliverCoffee(customer);
      } else {
        takeOrder(customer);
      }
      return;
    }
  }

  // Click dirty tables to clean them
  for (let i = 0; i < cafe.tables; i++) {
    const table = tablePositions[i];

    if (Math.hypot(table.x - x, table.y - y) < 40) {
      if (dirtyTables.includes(i)) {
        dirtyTables = dirtyTables.filter(t => t !== i);
        showMessage("Table cleaned! Ready for another customer.");
      }
      return;
    }
  }
});

// --------------------
// DRAWING
// --------------------

function drawCircle(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCafe() {
  ctx.clearRect(0, 0, 800, 500);

  // Floor
  ctx.fillStyle = "#ead9bf";
  ctx.fillRect(0, 0, 800, 500);

  // Coffee machine
  ctx.fillStyle = "#a67454";
  ctx.fillRect(25, 30, 160, 85);

  ctx.fillStyle = "#ffffff";
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
    drawCircle(c.x, c.y, 18, customerTypes[c.type].color);

    drawCircle(c.x - 5, c.y - 3, 2, "#49372e");
    drawCircle(c.x + 5, c.y - 3, 2, "#49372e");

    ctx.textAlign = "center";

    if (c.state === "waiting") {
      // Order bubble
      drawCircle(c.x, c.y - 35, 17, "#fffaf3");
      ctx.font = "19px Georgia";
      ctx.fillText("☕", c.x, c.y - 29);

      // Patience bar
      const fraction = Math.max(0,
        1 - c.timer / c.patience
      );

      ctx.fillStyle = "#e6c4b9";
      ctx.fillRect(c.x - 22, c.y + 22, 44, 6);

      ctx.fillStyle = fraction > 0.4 ? "#91a583" : "#c96e60";
      ctx.fillRect(c.x - 22, c.y + 22, 44 * fraction, 6);
    }

    if (c.state === "drinking") {
      ctx.font = "20px Georgia";
      ctx.fillText(c.happiness < 50 ? "😠" : "♥", c.x, c.y - 30);
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

  if (spawnTimer >= 4) {
    createCustomer();
    spawnTimer = 0;
  }

  // Brewing progresses with time
  if (coffeeState === "brewing") {
    brewTimer -= dt;

    if (brewTimer <= 0) {
      coffeeState = "ready";
      showMessage("Coffee is ready! Pick it up.");
    }

    updateOrderStatus();
  }

  updateCustomers(dt);
  drawCafe();
  drawCustomers();

  document.getElementById("time").textContent =
    Math.ceil(Math.max(0, timeLeft));

  document.getElementById("visitors").textContent = visitors;

  document.getElementById("inside").textContent =
    customers.filter(c =>
      !["leaving", "gone"].includes(c.state)
    ).length;

  document.getElementById("noise").textContent = noise;
  document.getElementById("sales").textContent = sales;

  if (timeLeft <= 0) {
    endDay();
  } else {
    requestAnimationFrame(gameLoop);
  }
}

function showMessage(message) {
  document.getElementById("gameMessage").textContent = message;
}

// --------------------
// END OF DAY
// --------------------

function endDay() {
  if (!running) return;

  running = false;

  // Give unfinished customers a final review
  customers.forEach(c => {
    if (!c.reviewGiven) {
      totalHappiness += Math.max(0, Math.min(100, c.happiness));
      reviews++;
      c.reviewGiven = true;
    }
  });

  const satisfaction = reviews > 0
    ? Math.round(totalHappiness / reviews)
    : 0;

  // Earnings carry into the next day
  cafe.budget += sales;
  saveGame();

  // Identify the main customer group
  let identity = "a mixed neighborhood café";

  if (arrivals.student > arrivals.social &&
      arrivals.student > arrivals.regular) {
    identity = "a study café";
  }

  if (arrivals.social > arrivals.student &&
      arrivals.social > arrivals.regular) {
    identity = "a lively social café";
  }

  if (arrivals.regular > arrivals.student &&
      arrivals.regular > arrivals.social) {
    identity = "a regulars' café";
  }

  document.querySelector("#results .card").innerHTML = `
    <h2>End of Day Report</h2>
    <p>💰 Sales: $${sales}</p>
    <p>☕ Orders served: ${served}</p>
    <p>😊 Satisfaction: ${satisfaction}%</p>
    <p>🚪 Customers lost: ${lost}</p>
    <p>💵 Money available: $${cafe.budget}</p>
    <h3>What Emerged?</h3>
    <p>Your café became ${identity}.</p>
    <p>Students: ${arrivals.student} |
       Social: ${arrivals.social} |
       Regulars: ${arrivals.regular}</p>
  `;

  showScreen("results");
}

updateSetup();
showScreen("setup");
