import { ASSET_MANIFEST } from "./asset_manifest.js";

export class AssetStore {
  constructor(manifest = ASSET_MANIFEST) {
    this.manifest = manifest;
    this.images = new Map();
  }

  async loadAll() {
    const entries = [];
    this.collectEntries(this.manifest, [], entries);
    await Promise.all(entries.map(([key, src]) => this.loadImage(key, src)));
  }

  get(key) {
    return this.images.get(key) || null;
  }

  collectEntries(node, path, entries) {
    for (const [name, value] of Object.entries(node)) {
      const nextPath = [...path, name];
      if (typeof value === "string" && value.length > 0) {
        entries.push([nextPath.join("."), value]);
      } else if (value && typeof value === "object") {
        this.collectEntries(value, nextPath, entries);
      }
    }
  }

  loadImage(key, src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        this.images.set(key, image);
        resolve();
      };
      image.onerror = () => resolve();
      image.src = src;
    });
  }
}

export function drawImageOrFallback(ctx, image, drawImage, drawFallback) {
  if (image && image.complete && image.naturalWidth > 0) {
    drawImage(image);
    return;
  }
  drawFallback();
}
