import { CONFIG } from "./config.js";
import { stage1Layout } from "./stage1_layout.js";
import { AssetStore } from "./assets.js";
import { Player } from "./entities/player.js";
import { Flower } from "./entities/flower.js";

const STATE = {
  ready: "ready",
  countdown: "countdown",
  playing: "playing",
  arrived: "arrived",
  gameOver: "gameOver",
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
    this.particles = [];
    this.flowers = [];
    this.state = STATE.ready;
    this.currentWater = CONFIG.wateringCan.initialWater;
    this.refillMode = "normal";
    this.selectedMode = "normal";
    this.refillCount = 0;
    this.totalWaterUsed = 0;
    this.countdownIndex = 0;
    this.countdownTimer = 0;
    this.emptyFeedbackCooldown = 0;
    this.toastTimer = 0;
    this.refillFlashTimer = 0;
    this.scorePulseX = 96;
    this.autoRefillArmed = true;
    this.audioContext = null;
    this.animationFrame = 0;
    this.runtimeErrorShown = false;
    this.elapsedTime = 0;
    this.lastBloomElapsed = -999;
    this.chainBloomCount = 0;
    this.metrics = this.createMetrics();
  }

  async start() {
    await this.assets.loadAll();
    this.showModeSelect();
    this.lastTime = performance.now();
    this.animationFrame = requestAnimationFrame((time) => this.loop(time));
  }

  showModeSelect() {
    this.state = STATE.ready;
    this.input.setEnabled(false);
    this.input.clear();
    this.ui.modePanel.hidden = false;
    this.ui.countdown.hidden = true;
    this.ui.goalPanel.hidden = true;
    this.ui.gameOverPanel.hidden = true;
    this.ui.refillButton.hidden = true;
    this.resetStateValues(this.selectedMode);
    this.updateModeButtons();
    this.updateHud();
  }

  selectMode(mode) {
    this.selectedMode = mode;
    this.refillMode = mode;
    this.updateModeButtons();
    this.updateHud();
  }

  beginCountdown() {
    this.resetStateValues(this.selectedMode);
    this.state = STATE.countdown;
    this.input.setEnabled(false);
    this.ui.modePanel.hidden = true;
    this.ui.goalPanel.hidden = true;
    this.ui.gameOverPanel.hidden = true;
    this.ui.refillButton.hidden = true;
    this.countdownIndex = 0;
    this.countdownTimer = 0;
    this.ui.countdown.textContent = "3";
    this.ui.countdown.hidden = false;
    this.updateHud();
  }

  reset(mode = this.refillMode) {
    this.resetStateValues(mode);
    this.state = STATE.playing;
    this.input.setEnabled(true);
    this.ui.modePanel.hidden = true;
    this.ui.countdown.hidden = true;
    this.ui.goalPanel.hidden = true;
    this.ui.gameOverPanel.hidden = true;
    this.updateHud();
  }

  resetStateValues(mode) {
    this.cameraX = 0;
    this.score = 0;
    this.currentWater = CONFIG.wateringCan.initialWater;
    this.refillMode = mode;
    this.selectedMode = mode;
    this.refillCount = 0;
    this.totalWaterUsed = 0;
    this.waterCooldown = 0;
    this.waterDrops = [];
    this.floaters = [];
    this.particles = [];
    this.emptyFeedbackCooldown = 0;
    this.toastTimer = 0;
    this.refillFlashTimer = 0;
    this.autoRefillArmed = true;
    this.flowers = stage1Layout.flowers.map((flower) => new Flower(flower));
    this.elapsedTime = 0;
    this.lastBloomElapsed = -999;
    this.chainBloomCount = 0;
    this.metrics = this.createMetrics();
    this.player.reset();
    this.hideToast();
    this.ui.scoreLabel.textContent = "0 pt";
  }

  loop(time) {
    const dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;

    try {
      this.update(dt);
      this.draw();
    } catch (error) {
      console.error("Flare Garden runtime error", error);
      if (!this.runtimeErrorShown) {
        this.runtimeErrorShown = true;
        this.showToast("表示エラーを復帰しました");
      }
    }

    this.animationFrame = requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(dt) {
    const active = this.state === STATE.playing;
    this.player.update(dt, this.input, active);
    this.emptyFeedbackCooldown = Math.max(0, this.emptyFeedbackCooldown - dt * 1000);
    this.refillFlashTimer = Math.max(0, this.refillFlashTimer - dt * 1000);
    this.updateToast(dt);

    if (this.state === STATE.countdown) {
      this.updateCountdown(dt);
    }

    if (active) {
      this.elapsedTime += dt;
      this.cameraX += CONFIG.scrollSpeed * dt;
      this.cameraX = Math.min(this.cameraX, CONFIG.goalX);
      this.handleWatering(dt);
      this.updateFlowerVisibilityMetrics(dt);
      this.checkGoal();
      this.checkGameOver();
    }

    this.updateDrops(dt);
    this.flowers.forEach((flower) => flower.update(dt));
    this.updateParticles(dt);
    this.updateFloaters(dt);
    this.updateHud();
  }

  updateCountdown(dt) {
    const labels = ["3", "2", "1", "START!"];
    this.countdownTimer += dt * 1000;
    if (this.countdownTimer < 650) return;
    this.countdownTimer = 0;
    this.countdownIndex += 1;
    if (this.countdownIndex >= labels.length) {
      this.ui.countdown.hidden = true;
      this.state = STATE.playing;
      this.input.setEnabled(true);
      return;
    }
    this.ui.countdown.textContent = labels[this.countdownIndex];
  }

  handleWatering(dt) {
    if (!this.input.water) {
      this.waterCooldown = 0;
      return;
    }

    this.waterCooldown -= dt * 1000;
    if (this.waterCooldown <= 0 && this.waterDrops.length < CONFIG.water.maxActiveDrops) {
      if (this.currentWater <= 0) {
        this.handleEmptyWater();
        this.waterCooldown = CONFIG.water.intervalMs;
        return;
      }
      this.spawnWaterDrop();
      this.consumeWater();
      this.waterCooldown = CONFIG.water.intervalMs;
    }
  }

  consumeWater() {
    this.currentWater = Math.max(0, this.currentWater - 1);
    this.totalWaterUsed += 1;
    if (this.currentWater === 0 && this.refillMode === "auto") {
      this.autoRefillArmed = true;
      this.tryRefill("auto");
    }
  }

  handleEmptyWater() {
    if (this.refillMode === "auto" && this.autoRefillArmed && this.score >= CONFIG.wateringCan.refillCost) {
      this.tryRefill("auto");
      return;
    }

    if (this.cannotRefill()) {
      this.triggerGameOver();
      return;
    }

    if (this.emptyFeedbackCooldown > 0) return;
    this.emptyFeedbackCooldown = CONFIG.ui.emptyFeedbackCooldownMs;
    this.showToast(this.refillMode === "auto" ? "ポイント不足" : "お水がからっぽ！");
    this.bumpWaterGauge();
    this.setWaterButtonEmpty();
    this.playFeedbackSound("fail");
    if (this.refillMode === "auto") this.autoRefillArmed = false;
  }

  spawnWaterDrop() {
    const nozzle = this.player.getNozzlePosition();
    const dir = this.player.facing === "right" ? 1 : -1;
    this.waterDrops.push({
      x: nozzle.x,
      y: nozzle.y,
      worldX: nozzle.x + this.cameraX,
      vx: dir * CONFIG.water.horizontalSpeed,
      vy: CONFIG.water.initialVerticalSpeed,
      width: CONFIG.water.width,
      height: CONFIG.water.height,
      used: false,
    });
  }

  updateDrops(dt) {
    this.waterDrops = this.waterDrops.filter((drop) => {
      drop.worldX += drop.vx * dt;
      drop.x = drop.worldX - this.cameraX;
      drop.vy += CONFIG.water.gravity * dt;
      drop.y += drop.vy * dt;

      if (!drop.used) {
        for (const flower of this.flowers) {
          if (flower.isBloomed) continue;
          if (pointInRect(drop.x, drop.y, flower.getHitbox(this.cameraX))) {
            drop.used = true;
            const result = flower.water();
            this.spawnHitParticles(flower.worldX - this.cameraX, flower.y - flower.height * 0.72);
            this.playFeedbackSound("hit");
            if (result.bloomed) {
              this.metrics.bloomedTotal += 1;
              this.metrics.bloomedByType[flower.type] += 1;
              const chain = this.updateBloomChain();
              this.spawnBloomParticles(flower.worldX - this.cameraX, flower.y - flower.height * 0.72, chain);
              this.addScore(result.score, flower.worldX - this.cameraX, flower.y - flower.height, chain);
              this.playFeedbackSound("success", chain);
            }
            break;
          }
        }
      }

      const offscreen = drop.x < -80 || drop.x > CONFIG.canvasWidth + 80;
      const grounded = drop.y > CONFIG.groundY + 30;
      if (!drop.used && (offscreen || grounded)) {
        this.metrics.wastedWater += 1;
      }
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

  addScore(points, x, y, chain = 0) {
    this.score += points;
    this.ui.scoreLabel.textContent = `${this.score} pt`;
    const chainBoost = Math.min(3, Math.max(0, chain - 1));
    this.floaters.push({
      text: `+${points}`,
      x,
      y,
      age: 0,
      duration: 1,
      color: chainBoost > 0 ? "#d85770" : "#e87964",
      vy: -42 - chainBoost * 7,
      scale: 1 + chainBoost * 0.12,
    });
    if (this.refillMode === "auto" && this.currentWater === 0 && this.score >= CONFIG.wateringCan.refillCost) {
      this.autoRefillArmed = true;
      this.tryRefill("auto");
    }
  }

  updateFloaters(dt) {
    this.floaters = this.floaters.filter((floater) => {
      floater.age += dt;
      floater.x += (floater.vx || 0) * dt;
      floater.y += (floater.vy || -42) * dt;
      return floater.age < floater.duration;
    });
  }

  tryRefill(source) {
    if (this.state !== STATE.playing) return false;
    const can = CONFIG.wateringCan;
    if (this.currentWater >= can.maxWater) {
      if (source === "normal") this.denyRefill("満タンです");
      return false;
    }
    if (this.score < can.refillCost) {
      this.denyRefill("ポイントが足りません");
      if (source === "auto") this.autoRefillArmed = false;
      return false;
    }

    this.score = Math.max(0, this.score - can.refillCost);
    this.currentWater = Math.min(this.currentWater + can.refillAmount, can.maxWater);
    this.refillCount += 1;
    this.autoRefillArmed = true;
    this.ui.scoreLabel.textContent = `${this.score} pt`;
    this.showRefillFeedback(can);
    this.playFeedbackSound("success");
    this.updateHud();
    return true;
  }

  cannotRefill() {
    return this.currentWater <= 0 && this.score < CONFIG.wateringCan.refillCost;
  }

  checkGameOver() {
    if (this.state !== STATE.playing) return;
    if (!this.cannotRefill()) return;
    if (this.waterDrops.length > 0) return;
    this.triggerGameOver();
  }

  triggerGameOver() {
    if (this.state === STATE.gameOver || this.state === STATE.arrived) return;
    this.state = STATE.gameOver;
    this.input.setEnabled(false);
    this.input.clear();
    this.waterDrops = [];
    this.ui.gameOverScore.textContent = `スコア ${this.score}pt`;
    this.ui.gameOverWater.textContent = `残り水 ${this.currentWater} / ${CONFIG.wateringCan.maxWater}`;
    this.ui.gameOverRefills.textContent = `補充 ${this.refillCount}回`;
    this.ui.refillButton.hidden = true;
    this.ui.modePanel.hidden = true;
    this.ui.goalPanel.hidden = true;
    this.ui.countdown.hidden = true;
    this.ui.gameOverPanel.hidden = false;
    this.showToast("お水もポイントも足りません");
    this.playFeedbackSound("fail");
    this.updateHud();
  }

  denyRefill(message) {
    this.showToast(message);
    this.bumpWaterGauge();
    this.bumpRefillButton();
    this.playFeedbackSound("fail");
  }

  showRefillFeedback(can) {
    this.refillFlashTimer = CONFIG.ui.refillAnimationMs;
    this.showToast(`お水 +${can.refillAmount}`);
    this.floaters.push({
      text: `-${can.refillCost}pt`,
      x: this.scorePulseX,
      y: 76,
      age: 0,
      duration: 1,
      color: "#d85770",
      vy: -34,
    });
    this.floaters.push({
      text: `+${can.refillAmount}`,
      x: CONFIG.canvasWidth / 2,
      y: 82,
      age: 0,
      duration: 0.9,
      color: "#37bde0",
      vy: -18,
      vx: 22,
    });
  }

  createMetrics() {
    return {
      bloomedTotal: 0,
      bloomedByType: { small: 0, medium: 0, large: 0 },
      wastedWater: 0,
      noFlowerVisibleTime: 0,
      noFlowerVisibleCurrent: 0,
      noFlowerVisibleMax: 0,
    };
  }

  updateBloomChain() {
    const windowSec = CONFIG.flowerAnimation.chainWindowMs / 1000;
    if (this.elapsedTime - this.lastBloomElapsed <= windowSec) {
      this.chainBloomCount += 1;
    } else {
      this.chainBloomCount = 1;
    }
    this.lastBloomElapsed = this.elapsedTime;
    return this.chainBloomCount;
  }

  updateFlowerVisibilityMetrics(dt) {
    const hasVisibleTarget = this.flowers.some((flower) => {
      if (flower.isBloomed) return false;
      const x = flower.worldX - this.cameraX;
      return x > -flower.width && x < CONFIG.canvasWidth + flower.width;
    });

    if (hasVisibleTarget) {
      this.metrics.noFlowerVisibleCurrent = 0;
      return;
    }

    this.metrics.noFlowerVisibleCurrent += dt;
    this.metrics.noFlowerVisibleTime += dt;
    this.metrics.noFlowerVisibleMax = Math.max(this.metrics.noFlowerVisibleMax, this.metrics.noFlowerVisibleCurrent);
  }

  spawnHitParticles(x, y) {
    for (let i = 0; i < 3; i += 1) {
      const angle = -Math.PI / 2 + (i - 1) * 0.7;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 44,
        vy: Math.sin(angle) * 52,
        age: 0,
        duration: 0.28,
        radius: 3,
        color: "#72d9f2",
      });
    }
  }

  spawnBloomParticles(x, y, chain) {
    const count = CONFIG.flowerAnimation.particleCount + Math.min(2, Math.max(0, chain - 1));
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / count;
      const speed = 48 + (i % 3) * 18;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 26,
        age: 0,
        duration: 0.55,
        radius: 4 + (i % 2),
        color: i % 2 === 0 ? "#ff9fb6" : "#ffd166",
      });
    }
  }

  updateParticles(dt) {
    this.particles = this.particles.filter((particle) => {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 140 * dt;
      return particle.age < particle.duration;
    });
  }

  checkGoal() {
    const playerWorldX = this.cameraX + this.player.screenX;
    if (this.cameraX >= CONFIG.goalX - 220 || playerWorldX >= stage1Layout.goal.x) {
      this.state = STATE.arrived;
      this.input.setEnabled(false);
      this.waterDrops = [];
      this.ui.finalScore.textContent = `スコア ${this.score}pt`;
      this.ui.finalWater.textContent = `残り水 ${this.currentWater} / ${CONFIG.wateringCan.maxWater}`;
      this.ui.finalRefills.textContent = `補充 ${this.refillCount}回`;
      this.ui.refillButton.hidden = true;
      this.ui.gameOverPanel.hidden = true;
      this.ui.goalPanel.hidden = false;
    }
  }

  updateHud() {
    const can = CONFIG.wateringCan;
    const ratio = can.maxWater > 0 ? this.currentWater / can.maxWater : 0;
    this.ui.scoreLabel.textContent = `${this.score} pt`;
    this.ui.modeLabel.textContent = this.refillMode.toUpperCase();
    this.ui.waterLabel.textContent = `${this.currentWater} / ${can.maxWater}`;
    this.ui.waterFill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
    const progressMax = Math.max(1, stage1Layout.length - CONFIG.canvasWidth);
    const progress = clamp(this.cameraX / progressMax, 0, 1);
    this.ui.progressFill.style.width = `${progress * 100}%`;
    this.ui.areaLabel.textContent = areaName(this.getCurrentArea().id);

    this.ui.waterGauge.classList.toggle("is-low", this.currentWater > 0 && this.currentWater <= CONFIG.ui.lowWaterThreshold);
    this.ui.waterGauge.classList.toggle("is-empty", this.currentWater === 0);
    this.ui.waterGauge.classList.toggle("is-flashing", this.refillFlashTimer > 0);

    const showRefill = this.state === STATE.playing && this.refillMode === "normal";
    this.ui.refillButton.hidden = !showRefill;
    this.ui.refillButton.disabled = !showRefill;
  }

  updateModeButtons() {
    this.ui.modeButtons.forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.mode === this.selectedMode);
    });
  }

  getCurrentArea() {
    return (
      stage1Layout.areas.find((area) => this.cameraX >= area.startX && this.cameraX < area.endX) ||
      stage1Layout.areas[stage1Layout.areas.length - 1]
    );
  }

  getAreaBlend() {
    const current = this.getCurrentArea();
    const index = stage1Layout.areas.indexOf(current);
    const distance = CONFIG.stage.transitionDistance;
    const half = distance / 2;
    const next = stage1Layout.areas[index + 1];
    if (next && this.cameraX > current.endX - half) {
      return { from: current, to: next, t: clamp((this.cameraX - (current.endX - half)) / distance, 0, 1) };
    }

    const previous = stage1Layout.areas[index - 1];
    if (previous && this.cameraX < current.startX + half) {
      return { from: previous, to: current, t: clamp((this.cameraX - (current.startX - half)) / distance, 0, 1) };
    }

    return { from: current, to: current, t: 0 };
  }

  showToast(message) {
    this.ui.toast.textContent = message;
    this.ui.toast.hidden = false;
    this.toastTimer = CONFIG.ui.messageMs;
  }

  hideToast() {
    this.ui.toast.hidden = true;
    this.ui.toast.textContent = "";
    this.toastTimer = 0;
  }

  updateToast(dt) {
    if (this.toastTimer <= 0) return;
    this.toastTimer -= dt * 1000;
    if (this.toastTimer <= 0) this.hideToast();
  }

  bumpWaterGauge() {
    this.ui.waterGauge.classList.remove("is-shaking");
    void this.ui.waterGauge.offsetWidth;
    this.ui.waterGauge.classList.add("is-shaking");
  }

  bumpRefillButton() {
    this.ui.refillButton.classList.remove("is-denied");
    void this.ui.refillButton.offsetWidth;
    this.ui.refillButton.classList.add("is-denied");
  }

  setWaterButtonEmpty() {
    this.ui.waterButton.classList.add("is-empty");
    window.setTimeout(() => this.ui.waterButton.classList.remove("is-empty"), 180);
  }

  playFeedbackSound(type, chain = 1) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.audioContext ||= new AudioContext();
      const context = this.audioContext;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type === "success" ? "sine" : "triangle";
      const chainLift = Math.min(4, Math.max(0, chain - 1)) * CONFIG.flowerAnimation.chainPitchStep;
      oscillator.frequency.value = type === "success" ? 720 + chainLift : type === "hit" ? 460 : 180;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(type === "hit" ? 0.018 : 0.035, context.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (type === "hit" ? 0.08 : 0.16));
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + (type === "hit" ? 0.09 : 0.18));
    } catch {
      // Visual feedback remains the primary signal if audio is unavailable.
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
    this.drawParticles(ctx);
    this.drawFloaters(ctx);
    if (CONFIG.debug.showHitboxes) this.drawWaterDebug(ctx);
    if (CONFIG.debug.enabled && CONFIG.debug.showMetrics) this.drawDebugMetrics(ctx);
  }

  drawSky(ctx) {
    const blend = this.getAreaBlend();
    this.drawSkyForArea(ctx, blend.from.id, 1);
    if (blend.to.id !== blend.from.id && blend.t > 0) this.drawSkyForArea(ctx, blend.to.id, blend.t);
  }

  drawSkyForArea(ctx, area, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvasHeight);
    if (area === "forest") {
      gradient.addColorStop(0, "#b9e5f4");
      gradient.addColorStop(0.58, "#dcefc7");
      gradient.addColorStop(1, "#e7c99a");
    } else if (area === "rainbow-hill") {
      gradient.addColorStop(0, "#bdeeff");
      gradient.addColorStop(0.5, "#f9f1c8");
      gradient.addColorStop(1, "#ffd3b6");
    } else {
      gradient.addColorStop(0, "#bdeeff");
      gradient.addColorStop(0.55, "#f7efc4");
      gradient.addColorStop(1, "#f6cfa5");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    this.drawCloud(ctx, 210 - (this.cameraX * 0.12) % 1560, 130, 1.1);
    this.drawCloud(ctx, 720 - (this.cameraX * 0.1) % 1560, 86, 0.86);
    this.drawCloud(ctx, 1240 - (this.cameraX * 0.14) % 1560, 178, 1);
    if (area === "rainbow-hill") this.drawRainbow(ctx);
    ctx.restore();
  }

  drawRainbow(ctx) {
    const x = 840 - (this.cameraX * 0.05) % 760;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 16;
    const colors = ["#ff9fb6", "#ffd166", "#9bd889", "#72d9f2"];
    colors.forEach((color, index) => {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(x, 300, 220 - index * 20, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    });
    ctx.restore();
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
    const blend = this.getAreaBlend();
    this.drawMidgroundForArea(ctx, blend.from.id, 1);
    if (blend.to.id !== blend.from.id && blend.t > 0) this.drawMidgroundForArea(ctx, blend.to.id, blend.t);
  }

  drawMidgroundForArea(ctx, area, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (area === "forest") {
      this.drawHillBand(ctx, 0.28, 390, "#93c58c", "#76b077", 32);
      this.drawHillBand(ctx, 0.48, 480, "#c6b87c", "#b99d68", 58);
    } else if (area === "rainbow-hill") {
      this.drawHillBand(ctx, 0.28, 390, "#bfe6a3", "#9fd98a", 52);
      this.drawHillBand(ctx, 0.48, 462, "#ffd79e", "#f7ba79", 76);
      this.drawPaperFlowers(ctx);
    } else {
      this.drawHillBand(ctx, 0.28, 400, "#b6dda0", "#9fd18d", 42);
      this.drawHillBand(ctx, 0.48, 470, "#ffd18e", "#f6bd74", 84);
    }

    const treeGap = area === "forest" ? 330 : area === "rainbow-hill" ? 760 : 620;
    const treeStart = area === "forest" ? 180 : 320;
    for (let worldX = treeStart; worldX < stage1Layout.length; worldX += treeGap) {
      const x = worldX - this.cameraX * 0.58;
      const wrappedX = wrapX(x, -160, CONFIG.canvasWidth + 180);
      const y = area === "forest" ? 388 + (worldX % 4) * 14 : 420 + (worldX % 3) * 18;
      this.drawTree(ctx, wrappedX, y, area);
    }
    ctx.restore();
  }

  drawPaperFlowers(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    for (let worldX = 7350; worldX < stage1Layout.length; worldX += 420) {
      const x = worldX - this.cameraX * 0.38;
      const wrappedX = wrapX(x, -60, CONFIG.canvasWidth + 80);
      this.drawMiniBloom(ctx, wrappedX, 432 + Math.sin(worldX) * 18);
    }
    ctx.restore();
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

  drawTree(ctx, x, y, area = "meadow") {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = area === "forest" ? "#9f7658" : "#c98d69";
    ctx.beginPath();
    ctx.roundRect(-14, -16, 28, 96, 8);
    ctx.fill();
    ctx.fillStyle = area === "forest" ? "#77b981" : "#93cfa1";
    ctx.beginPath();
    ctx.ellipse(-28, -32, 52, 42, -0.25, 0, Math.PI * 2);
    ctx.ellipse(30, -48, 58, 46, 0.3, 0, Math.PI * 2);
    ctx.ellipse(6, -86, 52, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawForeground(ctx) {
    const area = this.getAreaBlend().to.id;
    ctx.fillStyle = area === "forest" ? "#b99065" : "#d7a46f";
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

    ctx.fillStyle = area === "forest" ? "#d0ae75" : "#f2c27c";
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

  drawWaterDebug(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(40, 164, 207, 0.9)";
    for (const drop of this.waterDrops) {
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFloaters(ctx) {
    for (const floater of this.floaters) {
      const alpha = 1 - floater.age / floater.duration;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = floater.color || "#e87964";
      ctx.font = `800 ${Math.round(34 * (floater.scale || 1))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(floater.text, floater.x, floater.y);
      ctx.restore();
    }
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      const alpha = 1 - particle.age / particle.duration;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.age * 8);
      ctx.beginPath();
      ctx.roundRect(-particle.radius, -particle.radius, particle.radius * 2, particle.radius * 2, 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawDebugMetrics(ctx) {
    const lines = [
      `time ${this.elapsedTime.toFixed(1)}s`,
      `bloom ${this.metrics.bloomedTotal}/${this.flowers.length}`,
      `S/M/L ${this.metrics.bloomedByType.small}/${this.metrics.bloomedByType.medium}/${this.metrics.bloomedByType.large}`,
      `water used ${this.totalWaterUsed}`,
      `waste ${this.metrics.wastedWater}`,
      `refill ${this.refillCount}`,
      `no flower total ${this.metrics.noFlowerVisibleTime.toFixed(1)}s`,
      `no flower max ${this.metrics.noFlowerVisibleMax.toFixed(1)}s`,
    ];
    const x = 300;
    const y = CONFIG.canvasHeight - 190;

    ctx.save();
    ctx.fillStyle = "rgba(64, 49, 34, 0.72)";
    ctx.beginPath();
    ctx.roundRect(x, y, 260, 174, 8);
    ctx.fill();
    ctx.fillStyle = "#fff8df";
    ctx.font = "700 17px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach((line, index) => ctx.fillText(line, x + 14, y + 12 + index * 20));
    ctx.restore();
  }
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function areaName(id) {
  if (id === "forest") return "紙の森";
  if (id === "rainbow-hill") return "虹の丘";
  return "はじまりの花畑";
}

function wrapX(value, min, max) {
  const size = max - min;
  return ((((value - min) % size) + size) % size) + min;
}
