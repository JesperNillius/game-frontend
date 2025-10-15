import { canvas } from './canvas.js';

let zoomAnim = null;

export function animateZoom(camera, targetX, targetY, targetZoom) {
  if (zoomAnim) cancelAnimationFrame(zoomAnim);
  const startX = camera.x, startY = camera.y, startZoom = camera.zoom;
  const duration = 400;
  const startTime = performance.now();

  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    camera.x = startX + (targetX - startX) * t;
    camera.y = startY + (targetY - startY) * t;
    camera.zoom = startZoom + (targetZoom - startZoom) * t;
    if (t < 1) {
      zoomAnim = requestAnimationFrame(step);
    } else {
      zoomAnim = null;
    }
  }
  requestAnimationFrame(step);
}

export function screenToWorld(cssX, cssY, camera) {
    // 1. Convert from top-left of canvas to center-of-screen coordinates
    const translatedX = cssX - canvas.clientWidth / 2;
    const translatedY = cssY - canvas.clientHeight / 2;

    // 2. Un-scale the coordinates by the camera's zoom level
    const unscaledX = translatedX / camera.zoom;
    const unscaledY = translatedY / camera.zoom;

    // 3. Un-translate the coordinates by the camera's position to get the final world position
    const worldX = unscaledX + camera.x;
    const worldY = unscaledY + camera.y;

    return { x: worldX, y: worldY };
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function getRandomInRange(min, max, decimals) {
  // Convert the inputs from the Excel file into numbers
  const numMin = parseFloat(min);
  const numMax = parseFloat(max);
  const numDecimals = parseInt(decimals, 10) || 0;

  // If the min or max values are not valid numbers, we can't generate a result.
  if (isNaN(numMin) || isNaN(numMax)) {
    return 'N/A'; // Return a safe, non-breaking value like "Not Applicable"
  }

  const value = Math.random() * (numMax - numMin) + numMin;
  return value.toFixed(numDecimals);
}

export function inRoom(room, x, y) {
  return x > room.x && x < room.x + room.w && y > room.y && y < room.y + room.h;
}