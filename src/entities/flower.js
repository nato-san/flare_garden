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
    this.hitboxWidth = values.hitboxWidth;
    this.hitboxHeight = values.hitboxHeight;
    this.hitboxOffsetX = values.hitboxOffsetX;
    this.hitboxOffsetY = values.hitboxOffsetY;
    this.waterReceived = 0;
    this.requiredWater = values.requiredWater;
    this.score = values.score;
    this.isBloomed = false;
    this.bloomTimer = 0;
    this.hitTimer = 0;
  }

  getHitbox(cameraX) {
    return {
      x: this.worldX - cameraX - this.width / 2 + this.hitboxOffsetX,
      y: this.y - this.height + this.hitboxOffsetY,
      width: this.hitboxWidth,
      height: this.hitboxHeight,
    };
  }

  water() {
    if (this.isBloomed) return 0;
    this.waterReceived += 1;
    this.hitTimer = 0.22;
    if (this.waterReceived >= this.requiredWater) {
      this.isBloomed = true;
      this.bloomTimer = 0.45;
      return this.score;
    }
    return 0;
  }

  update(dt) {
    this.bloomTimer = Math.max(0, this.bloomTimer - dt);
    this.hitTimer = Math.max(0, this.hitTimer - dt);
  }

  draw(ctx, cameraX, assets) {
    const x = this.worldX - cameraX;
    const y = this.y;
    const imageKey = this.isBloomed ? "flowers.smallBloom" : "flowers.smallBud";
    const image = assets.get(imageKey);
    const scale = this.isBloomed ? 1 + this.bloomTimer * 0.45 : 1 + this.hitTimer * 0.28;
    const width = this.width * scale;
    const height = this.height * scale;

    drawImageOrFallback(
      ctx,
      image,
      (asset) => ctx.drawImage(asset, x - width / 2, y - height, width, height),
      () => this.drawFallback(ctx, x, y, width, height),
    );

    if (!this.isBloomed && this.requiredWater > 1 && this.waterReceived > 0) {
      this.drawWaterProgress(ctx, x, y);
    }

    if (this.hitTimer > 0) {
      this.drawHitSpark(ctx, x, y);
    }

    if (CONFIG.debug.showHitboxes) {
      this.drawDebugHitbox(ctx, cameraX);
    }
  }

  drawFallback(ctx, x, y, width, height) {
    const bloomProgress = this.isBloomed ? 1 : this.waterReceived / this.requiredWater;
    const typeScale = this.type === "large" ? 1.25 : this.type === "medium" ? 1.08 : 0.92;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(width / this.width, height / this.height);

    ctx.fillStyle = "rgba(119, 84, 49, 0.13)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 30 * typeScale, 7 * typeScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#67bd84";
    ctx.fillRect(-4, -this.height * 0.58, 8, this.height * 0.58);
    ctx.beginPath();
    ctx.ellipse(-this.width * 0.22, -this.height * 0.32, this.width * 0.22, 8, -0.5, 0, Math.PI * 2);
    ctx.ellipse(this.width * 0.22, -this.height * 0.42, this.width * 0.22, 8, 0.45, 0, Math.PI * 2);
    ctx.fill();

    if (this.isBloomed) {
      const headY = -this.height * 0.72;
      const petals = [
        ["#ff9fb6", 0, headY - 7, this.width * 0.2, this.height * 0.24],
        ["#ffd166", this.width * 0.23, headY + 5, this.width * 0.18, this.height * 0.22],
        ["#f48fb1", -this.width * 0.23, headY + 5, this.width * 0.18, this.height * 0.22],
        ["#ffc3a0", 0, headY + 17, this.width * 0.2, this.height * 0.22],
        ["#f6a6d6", 0, headY - 22, this.width * 0.18, this.height * 0.2],
      ];
      for (const [color, px, py, rx, ry] of petals) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fff0a6";
      ctx.beginPath();
      ctx.arc(0, headY, this.width * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const headY = -this.height * 0.72;
      const open = 1 + bloomProgress * 0.35;
      ctx.fillStyle = "#ff9fb6";
      ctx.beginPath();
      ctx.ellipse(0, headY, this.width * 0.23 * open, this.height * 0.22 * open, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f48fb1";
      ctx.beginPath();
      ctx.ellipse(-this.width * 0.08, headY - 4, this.width * 0.1, this.height * 0.15, -0.35, 0, Math.PI * 2);
      ctx.ellipse(this.width * 0.09, headY - 4, this.width * 0.1, this.height * 0.15, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawWaterProgress(ctx, x, y) {
    const text = `${this.waterReceived}/${this.requiredWater}`;
    ctx.save();
    ctx.fillStyle = "rgba(255, 248, 223, 0.86)";
    ctx.beginPath();
    ctx.roundRect(x - 18, y - this.height - 24, 36, 18, 6);
    ctx.fill();
    ctx.fillStyle = "#426a75";
    ctx.font = "800 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y - this.height - 15);
    ctx.restore();
  }

  drawHitSpark(ctx, x, y) {
    const alpha = this.hitTimer / 0.22;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#72d9f2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - this.height * 0.72, this.width * (0.28 + alpha * 0.12), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawDebugHitbox(ctx, cameraX) {
    const hitbox = this.getHitbox(cameraX);
    ctx.save();
    ctx.strokeStyle = "rgba(255, 68, 110, 0.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
    ctx.restore();
  }
}
