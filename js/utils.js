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
export function getVitalColor(vital, value, age) {
    const pediatricVitalsByAge = [
        { ageMax: 1/12, AF: { min: 30, max: 60 }, Puls: { min: 100, max: 180 }, BT_systolic: { min: 60 } },
        { ageMax: 1,    AF: { min: 25, max: 50 }, Puls: { min: 100, max: 160 }, BT_systolic: { min: 70 } },
        { ageMax: 3,    AF: { min: 20, max: 30 }, Puls: { min: 80,  max: 130 }, BT_systolic: { min: 80 } },
        { ageMax: 5,    AF: { min: 20, max: 25 }, Puls: { min: 80,  max: 120 }, BT_systolic: { min: 80 } },
        { ageMax: 12,   AF: { min: 15, max: 20 }, Puls: { min: 70,  max: 110 }, BT_systolic: { min: 90 } },
        { ageMax: 18,   AF: { min: 12, max: 16 }, Puls: { min: 60,  max: 100 }, BT_systolic: { min: 90 } }
    ];

    const adultVitals = {
        AF: { min: 12, max: 20 }, Puls: { min: 60, max: 100 }, BT_systolic: { min: 90 },
        Saturation: { min: 95 }, Temp: { yellow: 38.0, orange: 39.0, red: 40.0 }
    };

    const getVitalsForAge = (age) => {
        if (age === undefined || age === null || age >= 18) return adultVitals;
        const ranges = pediatricVitalsByAge.find(range => age <= range.ageMax);
        return ranges ? { ...adultVitals, ...ranges } : adultVitals;
    };

    const refs = getVitalsForAge(age);
    const red = '#FF5252', orange = '#FFC107', yellow = '#FFEE58';

    switch (vital) {
        case 'AF':
            if (!refs.AF) return null;
            if (value > refs.AF.max + 10 || value < refs.AF.min - 8) return red;
            if (value > refs.AF.max + 5 || value < refs.AF.min - 4) return orange;
            if (value > refs.AF.max || value < refs.AF.min) return yellow;
            break;
        case 'Saturation':
            if (value < 90) return red;
            if (value < 92) return orange;
            if (value < 95) return yellow;
            break;
        case 'BT_systolic': // The key passed for Blood Pressure
            if (!refs.BT_systolic) return null;
            if (value < refs.BT_systolic.min - 20) return red;
            if (value < refs.BT_systolic.min - 10) return orange;
            if (value < refs.BT_systolic.min) return yellow;
            break;
        case 'Puls':
            if (!refs.Puls) return null;
            if (value > refs.Puls.max + 40 || value < refs.Puls.min - 30) return red;
            if (value > refs.Puls.max + 20 || value < refs.Puls.min - 15) return orange;
            if (value > refs.Puls.max || value < refs.Puls.min) return yellow;
            break;
        case 'RLS':
            if (value > 1) return red;
            break;
        case 'Temp':
            const tempRefs = refs.Temp || adultVitals.Temp;
            if (value >= tempRefs.red) return red;
            if (value >= tempRefs.orange) return orange;
            if (value >= tempRefs.yellow) return yellow;
            break;
    }
    return null;
}