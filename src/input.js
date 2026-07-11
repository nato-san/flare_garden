import { CONFIG } from "./config.js";

export class InputController {
  constructor() {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.water = false;
    this.enabled = true;
    this.heldPointers = new Map();
    this.heldPointerStartedAt = new Map();
    this.actionPulseTimers = new Map();
    this.movePointerId = null;
    this.moveTargetX = null;
    this.moveTargetY = null;
    this.moveTargetWorldX = null;
    this.waterPulseTimer = 0;
    this.getCameraX = () => 0;
    this.getPlayerPoint = () => null;
  }

  bind(canvas, getCameraX = () => 0, getPlayerPoint = () => null) {
    this.getCameraX = getCameraX;
    this.getPlayerPoint = getPlayerPoint;
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
    canvas.addEventListener("dblclick", (event) => this.pulseWater(event));
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
    this.up = false;
    this.down = false;
    this.water = false;
    this.movePointerId = null;
    this.moveTargetX = null;
    this.moveTargetY = null;
    this.moveTargetWorldX = null;
    window.clearTimeout(this.waterPulseTimer);
    this.waterPulseTimer = 0;
    this.actionPulseTimers.forEach((timer) => window.clearTimeout(timer));
    this.actionPulseTimers.clear();
    this.heldPointers.clear();
    this.heldPointerStartedAt.clear();
    document.querySelectorAll("[data-action]").forEach((button) => button.classList.remove("is-held"));
  }

  handleKey(event, isDown) {
    const key = event.key?.toLowerCase();
    const isW = event.code === "KeyW" || key === "w";
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyA", "KeyD", "KeyS"].includes(event.code) || isW) {
      event.preventDefault();
    }
    if (!this.enabled) return;

    if (isW) {
      if (isDown) this.pulseWater(event);
      return;
    }

    if ((event.code === "ArrowLeft" || event.code === "KeyA") && isDown) this.clearMoveTarget();
    if ((event.code === "ArrowRight" || event.code === "KeyD") && isDown) this.clearMoveTarget();
    if ((event.code === "ArrowUp" || event.code === "ArrowDown" || event.code === "KeyS") && isDown) this.clearMoveTarget();
    if (event.code === "ArrowLeft" || event.code === "KeyA") this.left = isDown;
    if (event.code === "ArrowRight" || event.code === "KeyD") this.right = isDown;
    if (event.code === "ArrowUp") this.up = isDown;
    if (event.code === "ArrowDown" || event.code === "KeyS") this.down = isDown;
    if (event.code === "Space") this.water = isDown;
  }

  pressButton(event, button) {
    event.preventDefault();
    if (!this.enabled) return;

    button.setPointerCapture(event.pointerId);
    const action = button.dataset.action;
    if (["left", "right", "up", "down"].includes(action)) this.clearMoveTarget();
    this.heldPointers.set(event.pointerId, action);
    this.heldPointerStartedAt.set(event.pointerId, performance.now());
    button.classList.add("is-held");
    this.setAction(action, true);
  }

  releaseButton(event, button) {
    event.preventDefault();
    const action = this.heldPointers.get(event.pointerId) || button.dataset.action;
    const startedAt = this.heldPointerStartedAt.get(event.pointerId) || performance.now();
    const wasTap = performance.now() - startedAt < 220;
    this.heldPointers.delete(event.pointerId);
    this.heldPointerStartedAt.delete(event.pointerId);
    button.classList.remove("is-held");

    const stillHeld = [...this.heldPointers.values()].includes(action);
    if (!stillHeld) {
      this.setAction(action, false);
      if (wasTap && ["left", "right", "up", "down"].includes(action)) this.pulseAction(action);
    }
  }

  setAction(action, isDown) {
    if (action === "left") this.left = isDown;
    if (action === "right") this.right = isDown;
    if (action === "up") this.up = isDown;
    if (action === "down") this.down = isDown;
    if (action === "water") this.water = isDown;
  }

  pulseAction(action) {
    window.clearTimeout(this.actionPulseTimers.get(action));
    this.setAction(action, true);
    const timer = window.setTimeout(() => {
      const stillHeld = [...this.heldPointers.values()].includes(action);
      if (!stillHeld) this.setAction(action, false);
      this.actionPulseTimers.delete(action);
    }, 180);
    this.actionPulseTimers.set(action, timer);
  }

  startDirectMove(event, canvas) {
    if (!this.enabled || this.movePointerId !== null) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    this.movePointerId = event.pointerId;
    this.setMoveTarget(canvasPointFromEvent(event, canvas), { assistNearPlayer: event.pointerType === "touch" });
  }

  updateDirectMove(event, canvas) {
    if (!this.enabled || event.pointerId !== this.movePointerId) return;
    event.preventDefault();
    this.setMoveTarget(canvasPointFromEvent(event, canvas), { assistNearPlayer: event.pointerType === "touch" });
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
    this.setMoveTarget(canvasPointFromEvent(event, canvas), { assistNearPlayer: false });
  }

  updateMouseMove(event, canvas) {
    if (!this.enabled || this.movePointerId !== "mouse") return;
    event.preventDefault();
    this.setMoveTarget(canvasPointFromEvent(event, canvas), { assistNearPlayer: false });
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
    this.setMoveTarget(canvasPointFromTouch(event.touches[0], canvas), { assistNearPlayer: true });
  }

  updateTouchMove(event, canvas) {
    if (!this.enabled || this.movePointerId !== "touch" || event.touches.length === 0) return;
    event.preventDefault();
    this.setMoveTarget(canvasPointFromTouch(event.touches[0], canvas), { assistNearPlayer: true });
  }

  endTouchMove(event) {
    if (this.movePointerId !== "touch") return;
    event.preventDefault();
    this.movePointerId = null;
  }

  setMoveTarget(point, options = {}) {
    const target = options.assistNearPlayer ? this.assistedTarget(point) : point;
    this.moveTargetX = target.x;
    this.moveTargetY = target.y;
    this.moveTargetWorldX = this.getCameraX() + target.x;
  }

  assistedTarget(point) {
    const player = this.getPlayerPoint();
    if (!player) return point;
    const dx = point.x - player.x;
    const dy = point.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > CONFIG.player.touchAssistRadius || distance < CONFIG.player.dragDeadZone) return point;
    const scale = CONFIG.player.touchAssistTargetDistance / distance;
    return {
      x: player.x + dx * scale,
      y: player.y + dy * scale,
    };
  }

  clearMoveTarget() {
    this.moveTargetX = null;
    this.moveTargetY = null;
    this.moveTargetWorldX = null;
  }

  pulseWater(event) {
    event.preventDefault();
    if (!this.enabled) return;

    this.water = true;
    window.clearTimeout(this.waterPulseTimer);
    this.waterPulseTimer = window.setTimeout(() => {
      const waterButtonHeld = [...this.heldPointers.values()].includes("water");
      if (!waterButtonHeld) this.water = false;
      this.waterPulseTimer = 0;
    }, 340);
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
