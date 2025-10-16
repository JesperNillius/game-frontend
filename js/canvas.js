// Global canvas and context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingQuality = "high";

// World dimensions
const worldWidth = 1300;
const worldHeight = 650;

// Export dimensions so other modules can use them
export { canvas, ctx, worldWidth, worldHeight };

export function resizeCanvas() {
    // Get the device pixel ratio to determine screen density
    const dpr = window.devicePixelRatio || 1;

    // Set the canvas display size (what you see on the page)
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    // Set the canvas's actual internal resolution to match the screen
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    // Scale the entire drawing context. All future drawing will be scaled up.
    ctx.scale(dpr, dpr);
}

// --- Drawing Functions ---

export function drawBackground() {
  ctx.fillStyle = '#344B34'; // Green grass color
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawHospitalLayout(rooms, walls, glowingRooms, images, scenery) {
  const floorColor = '#EFE1C8';
  const availableColor = '#51873C';
  const shadowColor = 'rgba(0, 0, 0, 0.3)';
  const shadowOffsetX = 7;
  const shadowOffsetY = 7;
  const wallColor = '#D1D1D1';

  rooms.forEach(room => {
    ctx.fillStyle = (room.name.startsWith("Room") && !room.isOccupied) ? availableColor : floorColor;
    ctx.fillRect(room.x - 1, room.y - 1, room.w + 2, room.h + 2);
  });

  if (glowingRooms.length > 0) {
    glowingRooms.forEach(room => {
      const centerX = room.x + room.w / 2;
      const centerY = room.y + room.h / 2;
      const radius = Math.min(room.w, room.h);
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, '#51873C');
      gradient.addColorStop(1, 'rgba(76, 175, 80, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(room.x, room.y, room.w, room.h);
    });
  }

  walls.forEach(wall => {
    ctx.fillStyle = shadowColor;
    ctx.fillRect(wall.x + shadowOffsetX, wall.y + shadowOffsetY, wall.w, wall.h);
  });

  walls.forEach(wall => {
    ctx.fillStyle = wallColor;
    ctx.fillRect(wall.x - 1, wall.y - 1, wall.w + 2, wall.h + 2);
  });

  rooms.forEach(room => {
    if (room.furniture) {
      room.furniture.forEach(item => {
        if (item.image && images[item.image] && images[item.image].complete) {
          const img = images[item.image];
          const imageWidth = item.w;
          const scaleFactor = imageWidth / img.naturalWidth;
          const imageHeight = img.naturalHeight * scaleFactor;

          ctx.save();
          ctx.translate(room.x + item.x + imageWidth / 2, room.y + item.y + imageHeight / 2);
          if (item.rotation) {
            ctx.rotate(item.rotation);
          }
          ctx.drawImage(img, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
          ctx.restore();
        }
      });
    }
  });
  scenery.forEach(item => {
        if (item.image && images[item.image] && images[item.image].complete) {
            const img = images[item.image];
            const imageWidth = item.w;
            const scaleFactor = imageWidth / img.naturalWidth;
            const imageHeight = img.naturalHeight * scaleFactor;

            // Simple drawing logic without rotation
            ctx.drawImage(img, item.x, item.y, imageWidth, imageHeight);
        }
    });
}

export function drawPatients(patients) {
    for (const p of patients) {
      if (p.showTriageGlow && p.triageLevel) {
          const glowRadius = p.radius * 2.5;
          const gradient = ctx.createRadialGradient(p.x, p.y, p.radius * 0.8, p.x, p.y, glowRadius);
          let glowColorRgb;
          if (p.triageLevel === 'red') glowColorRgb = '255, 69, 58';
          else if (p.triageLevel === 'yellow') glowColorRgb = '255, 214, 10';
          else glowColorRgb = '48, 209, 88';
          gradient.addColorStop(0.3, `rgba(${glowColorRgb}, 0.6)`);
          gradient.addColorStop(1, `rgba(${glowColorRgb}, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
      }
      const size = p.radius * 3.8;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      // ✅ Only draw the image if it exists and has loaded without errors.
      if (p.img && p.img.complete && p.img.naturalHeight !== 0) {
        ctx.drawImage(p.img, -size / 2, -size / 2, size, size);
      } else {
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = "#fff";
      ctx.font = "13px Arial";
      ctx.textAlign = "center";
      const patientName = p.name || p.Name || p.Namn || "Unknown";
      ctx.fillText(patientName, p.x, p.y - size / 2 - 6);
    }
}


export function renderLoop(camera, drawFunctions) {
    // 1. Save the clean, scaled state of the context
    ctx.save();

    // 2. Reset transformations and clear the entire screen
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. Restore the clean, scaled state
    ctx.restore();
    
    // 4. Draw the background color
    drawBackground();

    // 5. Apply the camera view transformations
    ctx.save();
    // Use clientWidth/clientHeight for centering, which respects the CSS size
    ctx.translate(canvas.clientWidth / 2, canvas.clientHeight / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 6. Draw all the game objects
    drawFunctions.forEach(fn => fn());

    // 7. Restore from the camera view, leaving a clean state for the next frame
    ctx.restore();

    requestAnimationFrame(() => renderLoop(camera, drawFunctions));
}