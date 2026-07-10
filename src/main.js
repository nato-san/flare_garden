import { Game } from "./game.js";
import { InputController } from "./input.js";

const canvas = document.getElementById("gameCanvas");
const input = new InputController();

const ui = {
  scoreLabel: document.getElementById("scoreLabel"),
  modeLabel: document.getElementById("modeLabel"),
  waterGauge: document.getElementById("waterGauge"),
  waterLabel: document.getElementById("waterLabel"),
  waterFill: document.getElementById("waterFill"),
  progressFill: document.getElementById("progressFill"),
  areaLabel: document.getElementById("areaLabel"),
  refillButton: document.getElementById("refillButton"),
  waterButton: document.querySelector("[data-action='water']"),
  toast: document.getElementById("toast"),
  modePanel: document.getElementById("modePanel"),
  goalPanel: document.getElementById("goalPanel"),
  finalScore: document.getElementById("finalScore"),
  finalWater: document.getElementById("finalWater"),
  finalRefills: document.getElementById("finalRefills"),
  restartButton: document.getElementById("restartButton"),
};

input.bind();

const game = new Game(canvas, input, ui);
ui.restartButton.addEventListener("click", () => game.showModeSelect());
ui.refillButton.addEventListener("click", () => game.tryRefill("normal"));
document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => game.startRun(button.dataset.mode));
});

game.start();
