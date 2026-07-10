export class InputController {
  constructor() {
    this.left = false;
    this.right = false;
    this.water = false;
    this.enabled = true;
    this.heldPointers = new Map();
  }

  bind() {
    window.addEventListener("keydown", (event) => this.handleKey(event, true));
    window.addEventListener("keyup", (event) => this.handleKey(event, false));
    window.addEventListener("blur", () => this.clear());

    document.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => this.pressButton(event, button));
      button.addEventListener("pointerup", (event) => this.releaseButton(event, button));
      button.addEventListener("pointercancel", (event) => this.releaseButton(event, button));
      button.addEventListener("lostpointercapture", (event) => this.releaseButton(event, button));
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });

    document.addEventListener(
      "touchmove",
      (event) => {
        event.preventDefault();
      },
      { passive: false },
    );
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.clear();
  }

  clear() {
    this.left = false;
    this.right = false;
    this.water = false;
    this.heldPointers.clear();
    document.querySelectorAll("[data-action]").forEach((button) => button.classList.remove("is-held"));
  }

  handleKey(event, isDown) {
    if (["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD"].includes(event.code)) {
      event.preventDefault();
    }
    if (!this.enabled) return;

    if (event.code === "ArrowLeft" || event.code === "KeyA") this.left = isDown;
    if (event.code === "ArrowRight" || event.code === "KeyD") this.right = isDown;
    if (event.code === "Space") this.water = isDown;
  }

  pressButton(event, button) {
    event.preventDefault();
    if (!this.enabled) return;

    button.setPointerCapture(event.pointerId);
    const action = button.dataset.action;
    this.heldPointers.set(event.pointerId, action);
    button.classList.add("is-held");
    this.setAction(action, true);
  }

  releaseButton(event, button) {
    event.preventDefault();
    const action = this.heldPointers.get(event.pointerId) || button.dataset.action;
    this.heldPointers.delete(event.pointerId);
    button.classList.remove("is-held");

    const stillHeld = [...this.heldPointers.values()].includes(action);
    if (!stillHeld) this.setAction(action, false);
  }

  setAction(action, isDown) {
    if (action === "left") this.left = isDown;
    if (action === "right") this.right = isDown;
    if (action === "water") this.water = isDown;
  }
}
