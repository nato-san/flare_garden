import { Game } from "./game.js";
import { InputController } from "./input.js";

const canvas = document.getElementById("gameCanvas");
const input = new InputController();

const ui = {
  scoreLabel: document.getElementById("scoreLabel"),
  goalPanel: document.getElementById("goalPanel"),
  finalScore: document.getElementById("finalScore"),
  restartButton: document.getElementById("restartButton"),
};

input.bind();

const game = new Game(canvas, input, ui);
ui.restartButton.addEventListener("click", () => game.reset());

game.start();
