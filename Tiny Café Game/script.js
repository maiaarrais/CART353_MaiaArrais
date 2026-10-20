
const canvas = document.getElementById("cafe");
const ctx = canvas.getContext("2d");

let isOpen = false;

const tables = [
  { x: 300, y: 130 },
  { x: 550, y: 130 },
  { x: 300, y: 350 },
  { x: 550, y: 350 }
];

function drawTable(x, y) {
  ctx.fillStyle = "#b8835c";
  ctx.fillRect(x - 40, y - 30, 80, 60);

  ctx.fillStyle = "#f5e9d5";
  ctx.beginPath();
  ctx.arc(x - 55, y, 15, 0, Math.PI * 2);
  ctx.arc(x + 55, y, 15, 0, Math.PI * 2);
  ctx.fill();
}

function drawCafe() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Floor
  ctx.fillStyle = "#ead9bf";
  ctx.fillRect(0, 0, 800, 500);

  // Counter
  ctx.fillStyle = "#a97859";
  ctx.fillRect(30, 50, 170, 90);

  ctx.fillStyle = "white";
  ctx.font = "20px Georgia";
  ctx.fillText("COFFEE", 65, 100);

  // Tables
  tables.forEach(table => {
    drawTable(table.x, table.y);
  });

  // Plant
  ctx.fillStyle = "#819879";
  ctx.beginPath();
  ctx.arc(80, 400, 30, 0, Math.PI * 2);
  ctx.fill();

  // Entrance
  ctx.fillStyle = "#74563f";
  ctx.font = "18px Georgia";
  ctx.fillText("Entrance →", 20, 250);
}

document.getElementById("openBtn").addEventListener("click", () => {
  isOpen = !isOpen;

  document.getElementById("openBtn").textContent =
    isOpen ? "Close Café" : "Open Café";

  document.getElementById("message").textContent =
    isOpen ? "Your café is open!" : "Your café is closed.";
});

drawCafe();
