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
  countdown: document.getElementById("countdown"),
  modePanel: document.getElementById("modePanel"),
  journeyButton: document.getElementById("journeyButton"),
  modeButtons: [...document.querySelectorAll("[data-mode]")],
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
ui.journeyButton.addEventListener("click", () => game.beginCountdown());
ui.modeButtons.forEach((button) => {
  button.addEventListener("click", () => game.selectMode(button.dataset.mode));
});

game.start();
