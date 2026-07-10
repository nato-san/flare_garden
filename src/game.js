import { CONFIG } from "./config.js";
import { stage1Layout } from "./stage1_layout.js";
import { AssetStore } from "./assets.js";
import { Player } from "./entities/player.js";
import { Flower } from "./entities/flower.js";

const STATE = {
  playing: "playing",
  arrived: "arrived",
};

export class Game {
  constructor(canvas, input, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = input;
    this.ui = ui;
    this.assets = new AssetStore();
    this.player = new Player();
    this.lastTime = 0;
    this.cameraX = 0;
    this.score = 0;
    this.waterCooldown = 0;
    this.waterDrops = [];
    this.floaters = [];
    this.flowers = [];
    this.state = STATE.playing;
    this.animationFrame = 0;
  }

  async start() {
    await this.assets.loadAll();
    this.reset();
    this.lastTime = performance.now();
    this.animationFrame = requestAnimationFrame((time) => this.loop(time));
  }

  reset() {
    this.cameraX = 0;
    this.score = 0;
    this.waterCooldown = 0;
    this.waterDrops = [];
    this.floaters = [];
    this.flowers = stage1Layout.flowers.map((flower) => new Flower(flower));
    this.player.reset();
    this.state = STATE.playing;
    this.input.setEnabled(true);
    this.ui.goalPanel.hidden = true;
    this.ui.scoreLabel.textContent = "0 pt";
  }

  loop(time) {
    const dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;

    this.update(dt);
    this.draw();

    this.animationFrame = requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(dt) {
    const active = this.state === STATE.playing;
    this.player.update(dt, this.input, active);

    if (active) {
      this.cameraX += CONFIG.scrollSpeed * dt;
      this.cameraX = Math.min(this.cameraX, CONFIG.goalX);
      this.handleWatering(dt);
      this.checkGoal();
    }

    this.updateDrops(dt);
    this.flowers.forEach((flower) => flower.update(dt));
    this.updateFloaters(dt);
  }

  handleWatering(dt) {
    if (!this.input.water) {
      this.waterCooldown = 0;
      return;
    }

    this.waterCooldown -= dt * 1000;
    if (this.waterCooldown <= 0 && this.waterDrops.length < CONFIG.water.maxActiveDrops) {
      this.spawnWaterDrop();
      this.waterCooldown = CONFIG.water.intervalMs;
    }
  }

  spawnWaterDrop() {
    const nozzle = this.player.getNozzlePosition();
    const dir = this.player.facing === "right" ? 1 : -1;
    this.waterDrops.push({
      x: nozzle.x,
      y: nozzle.y,
      worldX: nozzle.x + this.cameraX,
      vx: dir * CONFIG.water.speed,
      vy: CONFIG.water.upwardSpeed,
      width: CONFIG.water.width,
      height: CONFIG.water.height,
      used: false,
    });
  }

  updateDrops(dt) {
    this.waterDrops = this.waterDrops.filter((drop) => {
      drop.worldX += drop.vx * dt;
      drop.x = drop.worldX - this.cameraX;
      drop.vy += CONFIG.gravity * dt;
      drop.y += drop.vy * dt;

      if (!drop.used) {
        for (const flower of this.flowers) {
          if (flower.isBloomed) continue;
          if (rectsOverlap(this.dropBounds(drop), flower.getBounds(this.cameraX))) {
            drop.used = true;
            const gained = flower.water();
            if (gained > 0) this.addScore(gained, flower.worldX - this.cameraX, flower.y - flower.height);
            break;
          }
        }
      }

      const offscreen = drop.x < -80 || drop.x > CONFIG.canvasWidth + 80;
      const grounded = drop.y > CONFIG.groundY + 30;
      return !drop.used && !offscreen && !grounded;
    });
  }

  dropBounds(drop) {
    return {
      x: drop.x - drop.width / 2,
      y: drop.y - drop.height / 2,
      width: drop.width,
      height: drop.height,
    };
  }

  addScore(points, x, y) {
    this.score += points;
    this.ui.scoreLabel.textContent = `${this.score} pt`;
    this.floaters.push({ text: `+${points}`, x, y, age: 0, duration: 1 });
  }

  updateFloaters(dt) {
    this.floaters = this.floaters.filter((floater) => {
      floater.age += dt;
      floater.y -= 42 * dt;
      return floater.age < floater.duration;
    });
  }

  checkGoal() {
    const playerWorldX = this.cameraX + this.player.screenX;
    if (this.cameraX >= CONFIG.goalX - 220 || playerWorldX >= stage1Layout.goal.x) {
      this.state = STATE.arrived;
      this.input.setEnabled(false);
      this.waterDrops = [];
      this.ui.finalScore.textContent = `${this.score} pt`;
      this.ui.goalPanel.hidden = false;
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    this.drawSky(ctx);
    this.drawMidground(ctx);
    this.drawForeground(ctx);
    this.drawGoal(ctx);
    this.flowers.forEach((flower) => flower.draw(ctx, this.cameraX, this.assets));
    this.drawWaterDrops(ctx);
    this.player.draw(ctx, this.assets);
    this.drawFloaters(ctx);
  }

  drawSky(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvasHeight);
    gradient.addColorStop(0, "#bdeeff");
    gradient.addColorStop(0.55, "#f7efc4");
    gradient.addColorStop(1, "#f6cfa5");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    this.drawCloud(ctx, 210 - (this.cameraX * 0.12) % 1560, 130, 1.1);
    this.drawCloud(ctx, 720 - (this.cameraX * 0.1) % 1560, 86, 0.86);
    this.drawCloud(ctx, 1240 - (this.cameraX * 0.14) % 1560, 178, 1);
  }

  drawCloud(ctx, x, y, scale) {
    for (let offset = -1560; offset <= 1560; offset += 1560) {
      ctx.save();
      ctx.translate(x + offset, y);
      ctx.scale(scale, scale);
      ctx.fillStyle = "#fff7ef";
      ctx.beginPath();
      ctx.ellipse(-44, 12, 50, 24, 0, 0, Math.PI * 2);
      ctx.ellipse(0, 0, 54, 32, 0, 0, Math.PI * 2);
      ctx.ellipse(52, 14, 48, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawMidground(ctx) {
    this.drawHillBand(ctx, 0.28, 400, "#b6dda0", "#9fd18d", 42);
    this.drawHillBand(ctx, 0.48, 470, "#ffd18e", "#f6bd74", 84);

    for (let worldX = 320; worldX < stage1Layout.length; worldX += 620) {
      const x = worldX - this.cameraX * 0.58;
      this.drawTree(ctx, wrapX(x, -160, CONFIG.canvasWidth + 180), 420 + (worldX % 3) * 18);
    }
  }

  drawHillBand(ctx, parallax, baseY, colorA, colorB, wave) {
    ctx.fillStyle = colorA;
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.canvasHeight);
    for (let x = -80; x <= CONFIG.canvasWidth + 80; x += 80) {
      const world = x + this.cameraX * parallax;
      const y = baseY + Math.sin(world / 220) * wave;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(CONFIG.canvasWidth, CONFIG.canvasHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colorB;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, baseY + 90, CONFIG.canvasWidth, CONFIG.canvasHeight - baseY);
    ctx.globalAlpha = 1;
  }

  drawTree(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#c98d69";
    ctx.beginPath();
    ctx.roundRect(-14, -16, 28, 96, 8);
    ctx.fill();
    ctx.fillStyle = "#93cfa1";
    ctx.beginPath();
    ctx.ellipse(-28, -32, 52, 42, -0.25, 0, Math.PI * 2);
    ctx.ellipse(30, -48, 58, 46, 0.3, 0, Math.PI * 2);
    ctx.ellipse(6, -86, 52, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawForeground(ctx) {
    ctx.fillStyle = "#d7a46f";
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.groundY);
    for (let x = 0; x <= CONFIG.canvasWidth; x += 80) {
      const y = CONFIG.groundY + Math.sin((x + this.cameraX) / 130) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(CONFIG.canvasWidth, CONFIG.canvasHeight);
    ctx.lineTo(0, CONFIG.canvasHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f2c27c";
    for (let worldX = 0; worldX < stage1Layout.length; worldX += 130) {
      const x = worldX - this.cameraX;
      if (x < -40 || x > CONFIG.canvasWidth + 40) continue;
      ctx.beginPath();
      ctx.ellipse(x, CONFIG.groundY + 22 + Math.sin(worldX) * 6, 46, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGoal(ctx) {
    const x = stage1Layout.goal.x - this.cameraX;
    const y = stage1Layout.goal.y;
    if (x < -260 || x > CONFIG.canvasWidth + 260) return;

    const image = this.assets.get("environment.goalGate");
    if (image) {
      ctx.drawImage(image, x - 120, y - 170, 240, 210);
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(117, 80, 55, 0.14)";
    ctx.beginPath();
    ctx.ellipse(0, 140, 170, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#80c990";
    ctx.fillRect(-105, -8, 28, 150);
    ctx.fillRect(77, -8, 28, 150);
    ctx.beginPath();
    ctx.arc(0, 0, 112, Math.PI, Math.PI * 2);
    ctx.lineWidth = 28;
    ctx.strokeStyle = "#80c990";
    ctx.stroke();

    for (let i = 0; i < 12; i += 1) {
      const angle = Math.PI + (Math.PI * i) / 11;
      const px = Math.cos(angle) * 112;
      const py = Math.sin(angle) * 112;
      this.drawMiniBloom(ctx, px, py);
    }

    ctx.fillStyle = "#fff4cd";
    ctx.beginPath();
    ctx.roundRect(-128, 36, 256, 64, 8);
    ctx.fill();
    ctx.fillStyle = "#8a5a3a";
    ctx.font = "700 30px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Flare Garden", 0, 68);
    ctx.restore();
  }

  drawMiniBloom(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#ff9fb6";
    for (let i = 0; i < 5; i += 1) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.ellipse(0, -13, 8, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff0a6";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawWaterDrops(ctx) {
    for (const drop of this.waterDrops) {
      ctx.save();
      ctx.translate(drop.x, drop.y);
      ctx.fillStyle = "#72d9f2";
      ctx.beginPath();
      ctx.ellipse(0, 0, drop.width * 0.45, drop.height * 0.58, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.beginPath();
      ctx.ellipse(-4, -5, 4, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawFloaters(ctx) {
    for (const floater of this.floaters) {
      const alpha = 1 - floater.age / floater.duration;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#e87964";
      ctx.font = "800 34px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(floater.text, floater.x, floater.y);
      ctx.restore();
    }
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function wrapX(value, min, max) {
  const size = max - min;
  return ((((value - min) % size) + size) % size) + min;
}
