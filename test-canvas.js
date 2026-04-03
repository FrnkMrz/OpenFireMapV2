const { createCanvas } = require('canvas');
const fs = require('fs');
const canvas = createCanvas(100, 100);
const ctx = canvas.getContext('2d');

function drawCanvasIcon(ctx, x, y, type, isStation, isDefib) {
  ctx.save();
  ctx.translate(x, y);

  const scale = isStation ? 0.4 : 0.35;
  ctx.scale(scale, scale);
  ctx.translate(-50, -50); // Center at 0,0

  // Kreis
  ctx.fillStyle = "red";
  ctx.strokeStyle = "white";
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(50, 50, 45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  let char = 'U';
  if (char) {
    ctx.fillStyle = "white";
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char, 50, 55);
  }
  ctx.restore();
}

ctx.fillStyle = "white";
ctx.fillRect(0,0,100,100);
drawCanvasIcon(ctx, 50, 50, 'underground', false, false);

fs.writeFileSync('test_marker.png', canvas.toBuffer());
console.log("Image saved.");
