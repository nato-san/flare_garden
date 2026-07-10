import { CONFIG } from "../config.js";
import { drawImageOrFallback } from "../assets.js";

export class Flower {
  constructor(data) {
    const values = CONFIG.flower[data.type];
    this.id = data.id;
    this.type = data.type;
    this.worldX = data.x;
    this.y = data.y;
    this.width = values.width;
    this.height = values.height;
    this.waterReceived = 0;
    this.requiredWater = values.requiredWater;
    this.score = values.score;
    this.isBloomed = false;
    this.bloomTimer = 0;
  }

  getBounds(cameraX) {
    const paddingX = CONFIG.water.hitPaddingX;
    const paddingY = CONFIG.water.hitPaddingY;
    return {
      x: this.worldX - cameraX - this.width / 2 - paddingX,
      y: this.y - this.height + paddingY,
      width: this.width + paddingX * 2,
      height: this.height - paddingY * 0.5,
    };
  }

  water() {
    if (this.isBloomed) return 0;
    this.waterReceived += 1;
    if (this.waterReceived >= this.requiredWater) {
      this.isBloomed = true;
      this.bloomTimer = 0.45;
      return this.score;
    }
    return 0;
  }

  update(dt) {
    this.bloomTimer = Math.max(0, this.bloomTimer - dt);
  }

  draw(ctx, cameraX, assets) {
    const x = this.worldX - cameraX;
    const y = this.y;
    const imageKey = this.isBloomed ? "flowers.smallBloom" : "flowers.smallBud";
    const image = assets.get(imageKey);
    const scale = this.isBloomed ? 1 + this.bloomTimer * 0.45 : 1;
    const width = this.width * scale;
    const height = this.height * scale;

    drawImageOrFallback(
      ctx,
      image,
      (asset) => ctx.drawImage(asset, x - width / 2, y - height, width, height),
      () => this.drawFallback(ctx, x, y, width, height),
    );
  }

  drawFallback(ctx, x, y, width, height) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(width / this.width, height / this.height);

    ctx.fillStyle = "rgba(119, 84, 49, 0.13)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 42, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#67bd84";
    ctx.fillRect(-5, -58, 10, 58);
    ctx.beginPath();
    ctx.ellipse(-22, -32, 22, 10, -0.5, 0, Math.PI * 2);
    ctx.ellipse(22, -42, 22, 10, 0.45, 0, Math.PI * 2);
    ctx.fill();

    if (this.isBloomed) {
      const petals = [
        ["#ff9fb6", 0, -78, 18, 26],
        ["#ffd166", 20, -66, 16, 24],
        ["#f48fb1", -20, -66, 16, 24],
        ["#ffc3a0", 0, -54, 18, 24],
        ["#f6a6d6", 0, -92, 16, 22],
      ];
      for (const [color, px, py, rx, ry] of petals) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fff0a6";
      ctx.beginPath();
      ctx.arc(0, -70, 15, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#ff9fb6";
      ctx.beginPath();
      ctx.ellipse(0, -70, 22, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f48fb1";
      ctx.beginPath();
      ctx.ellipse(-7, -74, 10, 17, -0.35, 0, Math.PI * 2);
      ctx.ellipse(8, -74, 10, 17, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
