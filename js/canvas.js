// Global canvas and context
let canvas = null;
let ctx = null;

// World dimensions
const worldWidth = 1300;
const worldHeight = 650;

export { canvas, ctx, worldWidth, worldHeight };

/**
 * Initializes the canvas and context variables. This must be called after the DOM is loaded.
 */
export function initCanvas() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
}

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
    // --- REVISED: Akutrum is always red for dramatic effect ---
    if (room.name === 'Room 4') {
        ctx.fillStyle = '#8B3A3A'; // A distinct, constant red for the Akutrum
    } else if (room.name.startsWith("Room") && !room.isOccupied) {
        ctx.fillStyle = availableColor; // Default green for available rooms
    } else {
        ctx.fillStyle = floorColor; // Default beige for occupied/other rooms
    }
    ctx.fillRect(room.x - 1, room.y - 1, room.w + 2, room.h + 2);
  });

  if (glowingRooms.length > 0) {
    glowingRooms.forEach(room => {
      const centerX = room.x + room.w / 2;
      const centerY = room.y + room.h / 2;
      const radius = Math.min(room.w, room.h);
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

      // --- NEW: Use a different highlight color for the Akutrum ---
      if (room.name === 'Room 4') {
        // A lighter, more vibrant red for the highlight
        gradient.addColorStop(0, '#C06161'); 
        gradient.addColorStop(1, 'rgba(192, 97, 97, 0)');
      } else {
        // The existing green highlight for all other rooms
        gradient.addColorStop(0, '#5fa046ff');
        gradient.addColorStop(1, 'rgba(81, 135, 60, 0)');
      }

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
      if (p.showTriageGlow && p.triageLevel && p.assignedRoom === null) { // Only show glow if in waiting room
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
      // --- FIX: Round coordinates to prevent sub-pixel rendering artifacts (ghosting). ---
      // This snaps the character to the nearest whole pixel before drawing.
      ctx.translate(Math.round(p.x), Math.round(p.y));
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

export function drawSpeechBubble(bubbleCenterX, bubbleCenterY, text, patientX, patientY, patientRadius) {
    // --- Bubble Style ---
    const bubblePadding = 8; // Further reduced padding for a smaller bubble
    const bubbleRadius = 8;
    const tailHeight = 10;
    
    // --- NEW: Dynamic Dot Animation ---
    // If the text is '...', we animate it. Otherwise, we draw the static text.
    if (text === '...') {
        const now = performance.now();
        const cycleDuration = 1200; // Total cycle time in milliseconds
        const elapsedInCycle = now % cycleDuration;

        if (elapsedInCycle > 800) text = '...';
        else if (elapsedInCycle > 400) text = '..';
        else text = '.';
    }
    // --- End of New Logic ---

    // --- Text Style ---
    ctx.font = 'bold 18px Arial'; // Smaller font size
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // --- Calculate Dimensions ---
    const textMetrics = ctx.measureText(text);
    const bubbleWidth = textMetrics.width + bubblePadding * 2;
    const bubbleHeight = 20 + bubblePadding; // Further reduced height

    // --- NEW: Make the tail width dynamic ---
    const tailWidth = Math.min(15, bubbleWidth * 0.4); // Tail is 80% of bubble width, or 15px max

    const bubbleX = bubbleCenterX - bubbleWidth / 2;
    const bubbleY = bubbleCenterY - bubbleHeight / 2;
    
    // --- Draw Bubble ---
    ctx.fillStyle = '#555'; // Match the anamnesis chat bubble color

    // --- NEW: Draw a rounded rectangle with one sharp corner (bottom-right) to act as a tail ---
    ctx.beginPath();
    ctx.moveTo(bubbleX + bubbleRadius, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth - bubbleRadius, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + bubbleRadius); // Top-right corner

    // This is the sharp bottom-right corner that points toward the patient
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight); 

    ctx.lineTo(bubbleX + bubbleRadius, bubbleY + bubbleHeight);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - bubbleRadius); // Bottom-left corner

    ctx.lineTo(bubbleX, bubbleY + bubbleRadius);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + bubbleRadius, bubbleY); // Top-left corner
    ctx.closePath();
    ctx.fill();
    // No stroke for a flat look
    
    // --- Draw Text ---
    ctx.fillStyle = 'white';
    ctx.fillText(text, bubbleCenterX, bubbleCenterY);
}


export function renderLoop(camera, drawFunctions) {
    // --- FINAL FIX: Use a more robust method to clear the canvas ---
    // This ensures that any previous transformations (scaling, translating)
    // do not affect the clearRect operation.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    // ---
    
    drawBackground();

    ctx.save();
    ctx.translate(canvas.clientWidth / 2, canvas.clientHeight / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Draw all the game objects
    drawFunctions.forEach(fn => fn());

    // Restore from the camera view, leaving a clean state for the next frame.
    ctx.restore();

    requestAnimationFrame(() => renderLoop(camera, drawFunctions));
}