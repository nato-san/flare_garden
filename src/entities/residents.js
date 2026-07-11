import { CONFIG } from "../config.js";
import { drawImageOrFallback } from "../assets.js";

export class Frog {
  constructor(data) {
    this.id = data.id;
    this.homeX = data.x;
    this.worldX = data.x;
    this.y = data.y;
    this.state = "idle";
    this.fullness = 0;
    this.absorbedWater = 0;
    this.reward = null;
    this.rewardClaimed = false;
    this.leaveTimer = 0;
    this.mouthTimer = 0;
  }

  update(dt, player) {
    if (this.state === "gone") return;
    this.mouthTimer = Math.max(0, this.mouthTimer - dt);

    if (this.state === "full") {
      this.leaveTimer += dt;
      this.worldX += 90 * dt;
      if (this.leaveTimer > 1.8) this.state = "gone";
      return;
    }

    const distance = Math.abs(player.worldX - this.worldX);
    if (distance <= CONFIG.frog.detectionRange) this.state = "chase";
    if (this.state !== "chase") return;

    const direction = Math.sign(player.worldX - this.worldX);
    this.worldX += direction * CONFIG.frog.moveSpeed * dt;
  }

  canAbsorb(drop) {
    if (this.state === "gone" || this.state === "full") return false;
    const dx = drop.worldX - this.worldX;
    const dy = drop.y - (this.y - 48);
    return Math.hypot(dx, dy) <= CONFIG.frog.waterSuctionRange;
  }

  absorb(drop) {
    this.mouthTimer = 0.28;
    this.fullness += 1;
    this.absorbedWater += 1;
    drop.used = true;
    drop.x += (this.worldX - drop.worldX) * 0.35;
    drop.y += (this.y - 48 - drop.y) * 0.35;
    if (this.fullness >= CONFIG.frog.requiredWaterForFull) {
      this.state = "full";
    }
  }

  draw(ctx, cameraX, assets) {
    if (this.state === "gone") return;
    const image = assets.get("enemies.frog");
    const x = this.worldX - cameraX;
    if (x < -140 || x > CONFIG.canvasWidth + 140) return;
    const belly = this.state === "full" ? 1.22 : 1 + this.fullness * 0.012;
    const mouthOpen = this.mouthTimer > 0;

    drawImageOrFallback(
      ctx,
      image,
      (asset) => ctx.drawImage(asset, x - 48, this.y - 72, 96, 86),
      () => {
        ctx.save();
        ctx.translate(x, this.y);
        ctx.fillStyle = "rgba(72, 104, 61, 0.18)";
        ctx.beginPath();
        ctx.ellipse(0, 8, 48, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.scale(belly, belly);
        ctx.fillStyle = "#75b96f";
        ctx.beginPath();
        ctx.ellipse(0, -28, 42, 34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d7f0a4";
        ctx.beginPath();
        ctx.ellipse(0, -14, 28, 21, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5c8d58";
        ctx.beginPath();
        ctx.arc(-20, -55, 12, 0, Math.PI * 2);
        ctx.arc(20, -55, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#233b2d";
        ctx.beginPath();
        ctx.arc(-20, -56, 4, 0, Math.PI * 2);
        ctx.arc(20, -56, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#4f754e";
        ctx.lineWidth = 4;
        ctx.beginPath();
        if (mouthOpen) ctx.ellipse(0, -36, 18, 8, 0, 0, Math.PI);
        else ctx.arc(0, -39, 18, 0.15, Math.PI - 0.15);
        ctx.stroke();
        ctx.restore();
      },
    );

    if (this.fullness > 0 && this.state !== "full") {
      ctx.save();
      ctx.fillStyle = "rgba(255, 248, 223, 0.88)";
      ctx.beginPath();
      ctx.roundRect(x - 30, this.y - 104, 60, 18, 6);
      ctx.fill();
      ctx.fillStyle = "#4f754e";
      ctx.font = "800 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${this.fullness}/${CONFIG.frog.requiredWaterForFull}`, x, this.y - 95);
      ctx.restore();
    }
  }
}

export class Bird {
  constructor(data) {
    this.id = data.id;
    this.triggerX = data.triggerX;
    this.direction = data.direction;
    this.y = data.y;
    this.state = "waiting";
    this.warningTimer = 0;
    this.worldX = data.triggerX;
    this.hasHit = false;
  }

  update(dt, game) {
    if (this.state === "done") return;
    if (this.state === "waiting" && game.player.worldX >= this.triggerX) {
      this.state = "warning";
      this.warningTimer = CONFIG.bird.warningDurationMs;
      game.metrics.birdWarnings += 1;
      return;
    }

    if (this.state === "warning") {
      this.warningTimer -= dt * 1000;
      if (this.warningTimer <= 0) {
        this.state = "flying";
        this.worldX = this.direction === "left" ? game.cameraX + CONFIG.canvasWidth + 90 : game.cameraX - 90;
      }
      return;
    }

    if (this.state !== "flying") return;
    const sign = this.direction === "left" ? -1 : 1;
    this.worldX += sign * CONFIG.bird.speed * dt;
    if (!this.hasHit && this.collidesWith(game.player)) {
      this.hasHit = true;
      game.handleBirdHit(this);
    }
    const screenX = this.worldX - game.cameraX;
    if (screenX < -160 || screenX > CONFIG.canvasWidth + 160) this.state = "done";
  }

  collidesWith(player) {
    const dx = Math.abs(this.worldX - player.worldX);
    const dy = Math.abs(this.y - player.y);
    return dx < 70 && dy < 58;
  }

  draw(ctx, cameraX, assets) {
    if (this.state === "waiting" || this.state === "done") return;
    if (this.state === "warning") {
      const x = this.direction === "left" ? CONFIG.canvasWidth - 42 : 42;
      ctx.save();
      ctx.fillStyle = "rgba(255, 248, 223, 0.9)";
      ctx.beginPath();
      ctx.roundRect(x - 24, this.y - 42, 48, 58, 8);
      ctx.fill();
      ctx.fillStyle = "#d85770";
      ctx.font = "900 30px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", x, this.y - 20);
      ctx.fillStyle = "#7aa8b4";
      ctx.font = "900 20px sans-serif";
      ctx.fillText("羽", x, this.y + 6);
      ctx.restore();
      return;
    }

    const image = assets.get("enemies.bird");
    const x = this.worldX - cameraX;
    const wing = Math.sin(performance.now() / 80) * 10;
    drawImageOrFallback(
      ctx,
      image,
      (asset) => ctx.drawImage(asset, x - 46, this.y - 34, 92, 68),
      () => {
        ctx.save();
        ctx.translate(x, this.y);
        if (this.direction === "right") ctx.scale(-1, 1);
        ctx.fillStyle = "#7aa8b4";
        ctx.beginPath();
        ctx.ellipse(0, 0, 36, 21, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#9ed3de";
        ctx.beginPath();
        ctx.ellipse(-18, -8, 34, 11 + wing * 0.18, -0.45, 0, Math.PI * 2);
        ctx.ellipse(18, -8, 34, 11 - wing * 0.18, 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f4c76f";
        ctx.beginPath();
        ctx.moveTo(-38, -2);
        ctx.lineTo(-56, -10);
        ctx.lineTo(-44, 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#233b2d";
        ctx.beginPath();
        ctx.arc(-16, -7, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
    );
  }
}
