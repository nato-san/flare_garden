import { CONFIG } from "../config.js";
import { drawImageOrFallback } from "../assets.js";

export class Player {
  constructor() {
    this.worldX = CONFIG.player.startWorldX;
    this.screenX = CONFIG.player.startScreenX;
    this.y = CONFIG.player.y;
    this.width = CONFIG.player.width;
    this.height = CONFIG.player.height;
    this.facing = "right";
    this.floatTime = 0;
  }

  reset() {
    this.worldX = CONFIG.player.startWorldX;
    this.screenX = CONFIG.player.startScreenX;
    this.y = CONFIG.player.y;
    this.facing = "right";
    this.floatTime = 0;
  }

  update(dt, input, active, cameraX) {
    this.floatTime += dt;
    if (!active) {
      this.updateScreenX(cameraX);
      return { dx: 0, forward: 0, back: 0 };
    }

    let direction = 0;
    if (input.left) direction -= 1;
    if (input.right) direction += 1;
    let verticalDirection = 0;
    if (input.up) verticalDirection -= 1;
    if (input.down) verticalDirection += 1;
    if (input.moveTargetWorldX !== null) {
      const delta = input.moveTargetWorldX - this.worldX;
      if (Math.abs(delta) > CONFIG.player.dragDeadZone) direction = Math.sign(delta);
      else direction = 0;
    }

    if (direction < 0) this.facing = "left";
    if (direction > 0) this.facing = "right";

    const previousWorldX = this.worldX;
    if (input.moveTargetX !== null) {
      const maxStep = CONFIG.player.dragMoveSpeed * dt;
      const delta = input.moveTargetWorldX - this.worldX;
      this.worldX += clamp(delta, -maxStep, maxStep);
      if (CONFIG.player.verticalMovementEnabled && input.moveTargetY !== null) {
        const verticalDelta = input.moveTargetY - this.y;
        if (Math.abs(verticalDelta) > CONFIG.player.dragVerticalDeadZone) {
          this.y += clamp(verticalDelta, -maxStep, maxStep);
        }
      }
    } else {
      this.worldX += direction * CONFIG.player.moveSpeed * dt;
      this.y += verticalDirection * CONFIG.player.verticalMoveSpeed * dt;
    }
    this.worldX = clamp(this.worldX, CONFIG.player.minWorldX, CONFIG.player.maxWorldX);
    this.y = clamp(this.y, CONFIG.player.minY, CONFIG.player.maxY);
    this.updateScreenX(cameraX);
    const dx = this.worldX - previousWorldX;
    return { dx, forward: Math.max(0, dx), back: Math.max(0, -dx) };
  }

  updateScreenX(cameraX) {
    this.screenX = this.worldX - cameraX;
  }

  getNozzlePosition() {
    const bob = Math.sin(this.floatTime * 4.2) * 10;
    const dir = this.facing === "right" ? 1 : -1;
    return {
      x: this.screenX + dir * CONFIG.water.nozzleOffsetX,
      y: this.y + bob + CONFIG.water.nozzleOffsetY,
    };
  }

  draw(ctx, assets) {
    const image = assets.get("characters.player");
    const bob = Math.sin(this.floatTime * 4.2) * 10;
    const x = this.screenX;
    const y = this.y + bob;

    drawImageOrFallback(
      ctx,
      image,
      (asset) => {
        ctx.save();
        ctx.translate(x, y);
        if (this.facing === "left") ctx.scale(-1, 1);
        ctx.drawImage(asset, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
      },
      () => this.drawFallback(ctx, x, y),
    );
  }

  drawFallback(ctx, x, y) {
    const wingFlap = Math.sin(this.floatTime * 13);
    const wingLift = wingFlap * 0.35;

    ctx.save();
    ctx.fillStyle = "rgba(117, 80, 55, 0.08)";
    ctx.beginPath();
    ctx.ellipse(x - 8, CONFIG.groundY + 18, 72, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, y);
    if (this.facing === "left") ctx.scale(-1, 1);
    ctx.rotate(-0.12);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.74)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-95 - i * 20, 30 + i * 9);
      ctx.quadraticCurveTo(-122 - i * 10, 25 + i * 7, -145 - i * 20, 32 + i * 8);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255, 224, 122, 0.82)";
    for (const sparkle of [
      [-126, -12, 5],
      [-158, 12, 3],
      [-116, 54, 3],
    ]) {
      ctx.save();
      ctx.translate(sparkle[0], sparkle[1]);
      ctx.rotate(this.floatTime * 4);
      ctx.beginPath();
      ctx.moveTo(0, -sparkle[2] * 2);
      ctx.lineTo(sparkle[2], 0);
      ctx.lineTo(0, sparkle[2] * 2);
      ctx.lineTo(-sparkle[2], 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.shadowColor = "rgba(196, 156, 105, 0.24)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = "#fff7ef";
    ctx.beginPath();
    ctx.ellipse(-56, -25, 58, 24, -0.85 - wingLift, 0, Math.PI * 2);
    ctx.ellipse(-78, 4, 48, 19, -0.38 - wingLift, 0, Math.PI * 2);
    ctx.ellipse(-96, 31, 36, 14, -0.14 - wingLift, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(233, 204, 171, 0.7)";
    ctx.beginPath();
    ctx.ellipse(-56, -25, 58, 24, -0.85 - wingLift, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f4c99e";
    ctx.beginPath();
    ctx.arc(-30, -42, 17, 0, Math.PI * 2);
    ctx.arc(22, -46, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f4c99e";
    ctx.beginPath();
    ctx.ellipse(-24, 50, 18, 11, 0.55, 0, Math.PI * 2);
    ctx.ellipse(22, 52, 18, 11, -0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f8d7b2";
    ctx.beginPath();
    ctx.ellipse(-8, 10, 58, 43, 0.08, 0, Math.PI * 2);
    ctx.arc(16, -33, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffe8cb";
    ctx.beginPath();
    ctx.ellipse(20, -20, 24, 18, 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#664332";
    ctx.beginPath();
    ctx.arc(30, -39, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(44, -24, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#8bb8c5";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(38, 14);
    ctx.lineTo(78, 7);
    ctx.lineTo(90, 13);
    ctx.stroke();
    ctx.fillStyle = "#aee3ef";
    ctx.beginPath();
    ctx.roundRect(31, 15, 34, 25, 8);
    ctx.fill();
    ctx.fillStyle = "#7bc8db";
    ctx.beginPath();
    ctx.arc(72, 22, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
