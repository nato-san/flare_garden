export class InputController {
  constructor() {
    this.left = false;
    this.right = false;
    this.water = false;
    this.enabled = true;
    this.heldPointers = new Map();
    this.movePointerId = null;
    this.moveTargetX = null;
  }

  bind(canvas) {
    window.addEventListener("keydown", (event) => this.handleKey(event, true));
    window.addEventListener("keyup", (event) => this.handleKey(event, false));
    window.addEventListener("blur", () => this.clear());

    canvas.addEventListener("pointerdown", (event) => this.startDirectMove(event, canvas));
    canvas.addEventListener("pointermove", (event) => this.updateDirectMove(event, canvas));
    canvas.addEventListener("pointerup", (event) => this.endDirectMove(event));
    canvas.addEventListener("pointercancel", (event) => this.endDirectMove(event));
    canvas.addEventListener("lostpointercapture", (event) => this.endDirectMove(event));
    window.addEventListener("pointermove", (event) => this.updateDirectMove(event, canvas));
    window.addEventListener("pointerup", (event) => this.endDirectMove(event));
    window.addEventListener("pointercancel", (event) => this.endDirectMove(event));
    canvas.addEventListener("mousedown", (event) => this.startMouseMove(event, canvas));
    canvas.addEventListener("mousemove", (event) => this.updateMouseMove(event, canvas));
    window.addEventListener("mousemove", (event) => this.updateMouseMove(event, canvas));
    window.addEventListener("mouseup", (event) => this.endMouseMove(event));
    canvas.addEventListener("touchstart", (event) => this.startTouchMove(event, canvas), { passive: false });
    canvas.addEventListener("touchmove", (event) => this.updateTouchMove(event, canvas), { passive: false });
    canvas.addEventListener("touchend", (event) => this.endTouchMove(event), { passive: false });
    canvas.addEventListener("touchcancel", (event) => this.endTouchMove(event), { passive: false });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());

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
    this.movePointerId = null;
    this.moveTargetX = null;
    this.heldPointers.clear();
    document.querySelectorAll("[data-action]").forEach((button) => button.classList.remove("is-held"));
  }

  handleKey(event, isDown) {
    if (["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD"].includes(event.code)) {
      event.preventDefault();
    }
    if (!this.enabled) return;

    if ((event.code === "ArrowLeft" || event.code === "KeyA") && isDown) this.moveTargetX = null;
    if ((event.code === "ArrowRight" || event.code === "KeyD") && isDown) this.moveTargetX = null;
    if (event.code === "ArrowLeft" || event.code === "KeyA") this.left = isDown;
    if (event.code === "ArrowRight" || event.code === "KeyD") this.right = isDown;
    if (event.code === "Space") this.water = isDown;
  }

  pressButton(event, button) {
    event.preventDefault();
    if (!this.enabled) return;

    button.setPointerCapture(event.pointerId);
    const action = button.dataset.action;
    if (action === "left" || action === "right") this.moveTargetX = null;
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

  startDirectMove(event, canvas) {
    if (!this.enabled || this.movePointerId !== null) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    this.movePointerId = event.pointerId;
    this.moveTargetX = canvasPointFromEvent(event, canvas).x;
  }

  updateDirectMove(event, canvas) {
    if (!this.enabled || event.pointerId !== this.movePointerId) return;
    event.preventDefault();
    this.moveTargetX = canvasPointFromEvent(event, canvas).x;
  }

  endDirectMove(event) {
    if (event.pointerId !== this.movePointerId) return;
    event.preventDefault();
    this.movePointerId = null;
  }

  startMouseMove(event, canvas) {
    if (!this.enabled || this.movePointerId !== null) return;
    event.preventDefault();
    this.movePointerId = "mouse";
    this.moveTargetX = canvasPointFromEvent(event, canvas).x;
  }

  updateMouseMove(event, canvas) {
    if (!this.enabled || this.movePointerId !== "mouse") return;
    event.preventDefault();
    this.moveTargetX = canvasPointFromEvent(event, canvas).x;
  }

  endMouseMove(event) {
    if (this.movePointerId !== "mouse") return;
    event.preventDefault();
    this.movePointerId = null;
  }

  startTouchMove(event, canvas) {
    if (!this.enabled || this.movePointerId !== null || event.touches.length === 0) return;
    event.preventDefault();
    this.movePointerId = "touch";
    this.moveTargetX = canvasPointFromTouch(event.touches[0], canvas).x;
  }

  updateTouchMove(event, canvas) {
    if (!this.enabled || this.movePointerId !== "touch" || event.touches.length === 0) return;
    event.preventDefault();
    this.moveTargetX = canvasPointFromTouch(event.touches[0], canvas).x;
  }

  endTouchMove(event) {
    if (this.movePointerId !== "touch") return;
    event.preventDefault();
    this.movePointerId = null;
  }
}

function canvasPointFromEvent(event, canvas) {
  return canvasPointFromClient(event.clientX, event.clientY, canvas);
}

function canvasPointFromTouch(touch, canvas) {
  return canvasPointFromClient(touch.clientX, touch.clientY, canvas);
}

function canvasPointFromClient(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}
