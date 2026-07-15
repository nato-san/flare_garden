import { Game } from "./game.js";
import { InputController } from "./input.js";
import { CONFIG } from "./config.js";

installCanvasFallbacks();
restoreBrowserPreviewMode();
applyDebugQuery();

const canvas = document.getElementById("gameCanvas");
const input = new InputController();

const ui = {
  scoreLabel: document.getElementById("scoreLabel"),
  modeLabel: document.getElementById("modeLabel"),
  waterGauge: document.getElementById("waterGauge"),
  waterLabel: document.getElementById("waterLabel"),
  waterFill: document.getElementById("waterFill"),
  timePanel: document.getElementById("timePanel"),
  timeLabel: document.getElementById("timeLabel"),
  timeFill: document.getElementById("timeFill"),
  progressFill: document.getElementById("progressFill"),
  areaLabel: document.getElementById("areaLabel"),
  refillButton: document.getElementById("refillButton"),
  waterButton: document.querySelector("[data-action='water']"),
  toast: document.getElementById("toast"),
  countdown: document.getElementById("countdown"),
  modePanel: document.getElementById("modePanel"),
  journeyButton: document.getElementById("journeyButton"),
  orientationContinueButton: document.getElementById("orientationContinueButton"),
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  goalPanel: document.getElementById("goalPanel"),
  gameStatusLabel: document.getElementById("gameStatusLabel"),
  finalScore: document.getElementById("finalScore"),
  finalWater: document.getElementById("finalWater"),
  finalRefills: document.getElementById("finalRefills"),
  finalDetails: document.getElementById("finalDetails"),
  restartButton: document.getElementById("restartButton"),
};

const game = new Game(canvas, input, ui);
input.bind(canvas, () => game.cameraX, () => ({ x: game.player.screenX, y: game.player.y }));
ui.restartButton.addEventListener("click", () => game.showModeSelect());
ui.refillButton.addEventListener("click", () => game.tryRefill("normal"));
ui.journeyButton.addEventListener("click", () => game.beginCountdown());
bindBrowserPreviewButton(ui.orientationContinueButton);
ui.modeButtons.forEach((button) => {
  button.addEventListener("click", () => game.selectMode(button.dataset.mode));
});

game.start();

function enableBrowserPreviewMode() {
  document.body.classList.add("is-browser-preview");
  document.getElementById("orientationPanel")?.setAttribute("hidden", "");
  try {
    window.sessionStorage.setItem("flareGardenBrowserPreview", "1");
  } catch {
    // The button still works when storage is unavailable.
  }
}

function restoreBrowserPreviewMode() {
  try {
    if (window.sessionStorage.getItem("flareGardenBrowserPreview") === "1") {
      document.body.classList.add("is-browser-preview");
      document.getElementById("orientationPanel")?.setAttribute("hidden", "");
    }
  } catch {
    // Storage can be blocked in some browser contexts.
  }
}

function bindBrowserPreviewButton(button) {
  const continueInBrowser = (event) => {
    event.preventDefault();
    enableBrowserPreviewMode();
  };
  button.addEventListener("click", continueInBrowser);
  button.addEventListener("pointerup", continueInBrowser);
  button.addEventListener("touchend", continueInBrowser, { passive: false });
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") continueInBrowser(event);
  });
}

function applyDebugQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("debug") === "1") {
    CONFIG.debug.enabled = true;
  }
  if (params.get("hitboxes") === "1") {
    CONFIG.debug.showHitboxes = true;
  }
  if (params.get("metrics") === "1") {
    CONFIG.debug.enabled = true;
    CONFIG.debug.showMetrics = true;
  }
  const timeLimit = Number(params.get("time"));
  if (Number.isFinite(timeLimit) && timeLimit > 0) {
    CONFIG.timer.timeLimitSeconds = timeLimit;
  }
}

function installCanvasFallbacks() {
  const prototype = window.CanvasRenderingContext2D?.prototype;
  if (!prototype || prototype.roundRect) return;

  prototype.roundRect = function roundRect(x, y, width, height, radius = 0) {
    const radii = Array.isArray(radius) ? radius : [radius, radius, radius, radius];
    const [topLeft, topRight, bottomRight, bottomLeft] = radii.map((value) =>
      Math.max(0, Math.min(Number(value) || 0, Math.abs(width) / 2, Math.abs(height) / 2)),
    );

    this.moveTo(x + topLeft, y);
    this.lineTo(x + width - topRight, y);
    this.quadraticCurveTo(x + width, y, x + width, y + topRight);
    this.lineTo(x + width, y + height - bottomRight);
    this.quadraticCurveTo(x + width, y + height, x + width - bottomRight, y + height);
    this.lineTo(x + bottomLeft, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - bottomLeft);
    this.lineTo(x, y + topLeft);
    this.quadraticCurveTo(x, y, x + topLeft, y);
    return this;
  };
}
