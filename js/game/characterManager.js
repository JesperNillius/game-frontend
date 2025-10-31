import * as api from '../api.js';
import { API_URL } from '../api.js';
import * as utils from '../utils.js';
import { canvas, ctx } from '../canvas.js';

export default class CharacterManager {
    constructor(game) {
        this.game = game;
        // --- NEW: Define walkable areas for wandering patients ---
        // --- REVISED: Added padding to keep patients away from walls and room entrances ---
        const corridorPadding = 30; // How far to stay from the room doors
        const waitingRoomPadding = 20; // How far to stay from the waiting room walls
        this.walkableAreas = [
            // Waiting Room
            { x: 1060 + waitingRoomPadding, y: 10 + waitingRoomPadding, w: 200 - (waitingRoomPadding * 2), h: 630 - (waitingRoomPadding * 2) },
            // Corridor
            { x: 20, y: 260 + corridorPadding, w: 1040, h: 170 - (corridorPadding * 2) }
        ];
    }

    drawCharacterShadows() {
        const shadowOffsetX = 4;
        const shadowOffsetY = 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

        for (const patient of this.game.patients) {
            ctx.beginPath();
            // --- FIX: Round shadow coordinates to match the character's rounded position. ---
            // This prevents the shadow from "vibrating" behind the character during movement.
            const shadowX = Math.round(patient.x) + shadowOffsetX;
            const shadowY = Math.round(patient.y) + shadowOffsetY;
            ctx.arc(shadowX, shadowY, patient.radius * 1.7, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const parent of this.game.parents) {
            ctx.beginPath();
            const shadowX = Math.round(parent.x) + shadowOffsetX;
            const shadowY = Math.round(parent.y) + shadowOffsetY;
            ctx.arc(shadowX, shadowY, 14 * 1.7, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- NEW: Draw a shadow for the nurse ---
        const nurse = this.game.nurse;
        if (nurse) {
            ctx.beginPath();
            const shadowX = Math.round(nurse.x) + shadowOffsetX;
            const shadowY = Math.round(nurse.y) + shadowOffsetY;
            ctx.arc(shadowX, shadowY, 14 * 1.7, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    updateNurse() {
        const nurse = this.game.nurse;
        if (!nurse || nurse.state === 'idle') return;

        // --- FIX: Handle state-based logic BEFORE movement logic ---
        // 1. Handle the turning animation timer.
        if (nurse.turnTimer && nurse.turnTimer > 0) {
            nurse.turnTimer--;
            if (nurse.turnTimer === 0) {
                nurse.rotation = Math.PI / 2; // Turn back to the right
            }
        }

        // 2. If she is idle in the Akutrum, set her rotation and stop.
        if (nurse.state === 'at_akutrum') {
            if (!nurse.turnTimer || nurse.turnTimer <= 0) {
                nurse.rotation = Math.PI / 2; // Ensure she is facing right
            }
            return;
        }

        let currentTarget = nurse.path[0];
        if (!currentTarget) {
            if (nurse.state === 'moving_to_patient') {
                nurse.state = 'at_patient';
                nurse.rotation = Math.PI / 2; // NEW: Set rotation to face right when arriving at patient
                setTimeout(() => this.triggerNurseAction(nurse.lastPatient), 2000);
            } else if (nurse.state === 'returning') {
                nurse.state = 'idle';
                nurse.rotation = Math.PI / 2;
            }
            return;
        }

        const dx = currentTarget.x - nurse.x;
        const dy = currentTarget.y - nurse.y;
        const distance = Math.hypot(dx, dy);
        const speed = 10.0;

        // --- Movement Logic ---
        if (distance < speed) {
            nurse.x = currentTarget.x;
            nurse.y = currentTarget.y;
            nurse.path.shift();
            // If that was the last step, update her state.
            if (nurse.state === 'moving_to_akutrum' && nurse.path.length === 0) {
                nurse.state = 'at_akutrum';
                nurse.rotation = Math.PI / 2; // Set her final rotation immediately upon arrival
            }
            return;
        }

        if (distance < 15 && nurse.path.length > 1) {
            nurse.path.shift();
            currentTarget = nurse.path[0];
        }

        nurse.x += (dx / distance) * speed;
        nurse.y += (dy / distance) * speed;
        nurse.rotation = Math.atan2(dy, dx) + Math.PI / 2;
    }

    triggerNurseAkutrumAction() {
        const nurse = this.game.nurse;
        // Only trigger the turn if she is currently in the Akutrum
        if (nurse && nurse.state === 'at_akutrum') {
            nurse.rotation = -Math.PI / 2; // Turn to the left
            nurse.turnTimer = 50; // The turn will last for 50 animation frames (about 1 second)
        }
    }

    triggerNurseAction(patient) {
        const nurse = this.game.nurse;
        // --- FIX: Allow her to be called from the Akutrum ---
        if (!['idle', 'at_patient', 'at_akutrum'].includes(nurse.state)) return;

        // If she is idle anywhere (home or Akutrum), send her to the patient.
        if (nurse.state === 'idle' || nurse.state === 'at_akutrum') {
            nurse.state = 'moving_to_patient';
            nurse.lastPatient = patient;
            nurse.path = this.calculateNursePath(patient, false);
        } else if (nurse.state === 'at_patient') {
            nurse.state = 'returning';
            nurse.path = this.calculateNursePath(patient, true);
        }
    }

    moveNurseToAkutrum() {
        const nurse = this.game.nurse;
        if (nurse.state === 'moving_to_akutrum' || nurse.state === 'at_akutrum') return;

        nurse.state = 'moving_to_akutrum';
        nurse.path = this.calculateNursePath(null, false, true); // New flag for Akutrum path
    }

    returnNurseToHome() {
        const nurse = this.game.nurse;
        // --- FIX: Allow her to return home from the Akutrum ---
        if (nurse.state === 'idle' || nurse.state === 'returning') {
            return;
        }

        nurse.state = 'returning';
        nurse.path = this.calculateNursePath(null, true, true); // New flag for Akutrum path
    }

    drawNurse() {
        const nurse = this.game.nurse;
        if (!nurse || !nurse.img) return;
        const size = 14 * 4.0;
        ctx.save();
        ctx.translate(nurse.x, nurse.y);
        ctx.rotate(nurse.rotation || 0);
        ctx.drawImage(nurse.img, -size / 2, -size / 2, size, size);
        ctx.restore();
    }

    calculateNursePath(patient, isReturning, isAkutrum = false) {
        const corridorWaypointX = 145;
        const corridorWaypointY = 345;
        const homeCorridorWaypoint = { x: corridorWaypointX, y: corridorWaypointY };

        if (isAkutrum) {
            const akutrum = this.game.rooms.find(r => r.name === 'Room 4');
            const roomDoorX = akutrum.x + akutrum.w / 2;
            const roomDoorY = akutrum.y - 10; // Door is at the top

            if (isReturning) {
                return [
                    { x: roomDoorX, y: roomDoorY },
                    { x: roomDoorX, y: corridorWaypointY },
                    homeCorridorWaypoint,
                    this.game.nurse.homePosition,
                ];
            } else {
                return [homeCorridorWaypoint, { x: roomDoorX, y: corridorWaypointY }, { x: roomDoorX, y: roomDoorY }, this.game.nurse.akutrumPosition];
            }
        }

        // --- Existing logic for regular patient rooms ---
        const patientRoom = patient.assignedRoom;
        const roomDoorX = patientRoom.x + patientRoom.w / 2;
        const roomDoorY = patientRoom.y < 300 ? patientRoom.y + patientRoom.h + 10 : patientRoom.y - 10;
        if (isReturning) {
            return [{ x: roomDoorX, y: roomDoorY }, { x: roomDoorX, y: corridorWaypointY }, homeCorridorWaypoint, this.game.nurse.homePosition];
        }

        // --- FIX: Target the center of the room for regular rooms ---
        // This ensures the nurse stops in the middle of the room.
        const finalTarget = { x: patientRoom.x + patientRoom.w / 2, y: patientRoom.y + patientRoom.h / 2 };

        return [homeCorridorWaypoint, { x: roomDoorX, y: corridorWaypointY }, { x: roomDoorX, y: roomDoorY }, finalTarget];
    }

    moveParentToArmchair(parent, room) {
        if (!parent || !room) return;

        parent.state = 'moving_to_armchair';
        parent.path = this.calculateParentPath(parent, room);
    }

    calculateParentPath(parent, room) {
        // Define armchair positions based on room location
        const isTopRowRoom = room.y < 300;

        // --- NEW: Special logic for the Akutrum ---
        if (room.name === 'Room 4') {
            const roomDoorX = room.x + room.w / 2;
            const finalPosition = { x: roomDoorX, y: room.y - 25 }; // Position just outside the door
            parent.finalRotation = Math.PI; // Face down

            return [
                { x: parent.x, y: 345 }, // Move into the corridor
                { x: roomDoorX, y: 345 }, // Move along corridor
                finalPosition // Final destination outside the door
            ];
        }
        // --- End of Akutrum logic ---

        let armchairPosition;
        let finalRotation;

        if (isTopRowRoom) {
            // Top-left corner for top row rooms
            armchairPosition = { x: room.x + 50, y: room.y + 50 }; // Moved 5px to the right
            finalRotation = (3 * Math.PI) / 4; // Corrected to face down-right (135 degrees)
        } else {
            // Bottom-left corner for bottom row rooms
            armchairPosition = { x: room.x + 45, y: room.y + room.h - 55 }; // Keep position
            finalRotation = Math.PI / 4; // FIX: Face up-right
        }

        parent.finalRotation = finalRotation; // Store the final rotation

        return [armchairPosition];
    }

    updateParents() {
        const followDistance = 65; // The ideal distance to maintain from the child.
        const stoppingDistance = 5;  // How close to the target point the parent must be to stop.

        for (const parent of this.game.parents) {
            const child = this.game.patients.find(p => p.id === parent.childId);

            if (parent.state === 'moving_to_armchair') {
                const target = parent.path[0];
                if (!target) {
                    parent.state = 'at_armchair';
                    parent.rotation = parent.finalRotation; // Set final rotation
                    continue;
                }

                const dx = target.x - parent.x;
                const dy = target.y - parent.y;
                const distance = Math.hypot(dx, dy);
                const speed = 5.0;

                if (distance < speed) {
                    parent.x = target.x;
                    parent.y = target.y;
                    parent.path.shift();
                } else {
                    parent.x += (dx / distance) * speed;
                    parent.y += (dy / distance) * speed;
                    parent.rotation = Math.atan2(dy, dx) + Math.PI / 2;
                }
            } else if (child && parent.state !== 'at_armchair') {
                const dxToChild = child.x - parent.x;
                const dyToChild = child.y - parent.y;
                const distanceToChild = Math.hypot(dxToChild, dyToChild);

                // --- RE-APPLYING OPTION 2: Move towards a target point for smooth following ---

                // 1. Define the target point: a spot `followDistance` away from the child.
                // This is where the parent *wants* to be.
                const targetX = child.x - (dxToChild / distanceToChild) * followDistance;
                const targetY = child.y - (dyToChild / distanceToChild) * followDistance;

                // 2. Calculate the vector from the parent to this target point.
                const dxToTarget = targetX - parent.x;
                const dyToTarget = targetY - parent.y;
                const distanceToTarget = Math.hypot(dxToTarget, dyToTarget);

                // 3. Only move if the parent is not at the stopping distance.
                // This creates a "dead zone" to prevent vibrating.
                if (distanceToTarget > stoppingDistance) {
                    // 4. Speed is proportional to the distance from the target.
                    // The parent slows down as it gets closer, creating a smooth "arrive" effect.
                    const speed = Math.min(4.0, distanceToTarget * 0.05); // Capped at a max speed of 4.0
                    parent.x += (dxToTarget / distanceToTarget) * speed;
                    parent.y += (dyToTarget / distanceToTarget) * speed;
                    parent.rotation = Math.atan2(dyToChild, dxToChild) + Math.PI / 2;
                }
            }
        }
    }

    findNearestChair(patient) {
        console.log(`[ChairFinder] Starting search for patient ${patient.name}.`);
        const waitingRoom = this.game.rooms.find(r => r.name === 'Väntrum');
        if (!waitingRoom || !waitingRoom.furniture) {
            console.log('[ChairFinder] -> ERROR: Waiting room or its furniture not found.');
            return null;
        }
        console.log('[ChairFinder] Waiting room furniture list:', waitingRoom.furniture);

        // --- FIX: Pre-calculate target coordinates for all chairs first. ---
        const chairs = waitingRoom.furniture
            .filter(f => f.image && f.image.includes('chair'))
            .map(chair => ({
                ...chair,
                targetX: waitingRoom.x + chair.x + chair.w / 2,
                targetY: waitingRoom.y + chair.y + chair.h / 2,
                // --- NEW: Determine the correct final rotation based on the chair's image ---
                finalRotation: (() => {
                    if (chair.image.includes('chair_to_left')) { // --- FIX: Swapped rotation values ---
                        return Math.PI / 2; // Face right
                    } else if (chair.image.includes('chair_to_right')) {
                        return 3 * Math.PI / 2; // Face left
                    }
                    return 0; // Default rotation if needed
                })()
            }));

        console.log(`[ChairFinder] Found ${chairs.length} potential chair objects.`);

        let nearestChair = null;
        let minDistance = Infinity;

        const isChairOccupied = (chair) => {
            const isOccupied = this.game.patients.some(p => p.wanderingState === 'sitting' && p.wanderTarget && p.wanderTarget.x === chair.targetX && p.wanderTarget.y === chair.targetY);
            console.log(`[ChairFinder] -> Checking chair at (${chair.targetX.toFixed(0)}, ${chair.targetY.toFixed(0)}). Is occupied? ${isOccupied}`);
            return isOccupied;
        };

        chairs.forEach(chair => {
            if (!isChairOccupied(chair)) {
                const distance = Math.hypot(patient.x - chair.targetX, patient.y - chair.targetY);
                console.log(`[ChairFinder] -> -> Available chair found. Distance: ${distance.toFixed(0)}`);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestChair = chair;
                    console.log(`[ChairFinder] -> -> -> This is the new nearest chair.`);
                }
            }
        });

        console.log('[ChairFinder] Search complete. Nearest available chair:', nearestChair);
        return nearestChair;
    }

    updateWanderingPatients() {
        const speed = 1.5; // A slow, strolling speed

        for (const patient of this.game.patients) {
            if (patient.assignedRoom !== null || this.game.draggingPatient === patient) {
                continue;
            }

            // --- NEW: Symptomatic Behavior ---
            const vitals = patient.currentVitals;
            const isUnwell = (vitals.RLS >= 2 || vitals.BT_systolic < 100);

            // --- REVISED: Handle state transitions first, then movement ---

            // 1. Determine the patient's next state if they are currently idle or need to change behavior.
            if (patient.wanderingState === 'idle') {
                patient.wanderIdleTimer--;
                if (patient.wanderIdleTimer <= 0) {
                    if (isUnwell) {
                        console.log(`[DEBUG] Patient ${patient.name} is unwell and idle timer is up. Attempting to find a chair.`);
                        const chair = this.findNearestChair(patient);
                        if (chair) {
                            console.log(`[DEBUG] -> Success! Found chair. Setting state to 'moving_to_chair'.`);
                            patient.wanderingState = 'moving_to_chair';
                            patient.wanderTarget = { x: chair.targetX, y: chair.targetY };
                            patient.wanderPath = [patient.wanderTarget];
                            patient.finalRotation = chair.finalRotation; // Use the new property
                        } else {
                            // --- NEW: Log if no chair is found ---
                            console.log(`[DEBUG] -> Failed. No available chair found for ${patient.name}. They will remain idle.`);
                            patient.wanderIdleTimer = 120; // Wait a couple of seconds before trying again.
                        }
                    } else {
                        // Healthy patient starts wandering
                        patient.wanderingState = 'wandering';
                        const area = this.walkableAreas[Math.floor(Math.random() * this.walkableAreas.length)];
                        const newTarget = { x: area.x + Math.random() * area.w, y: area.y + Math.random() * area.h };
                        const waypoint = { x: 1050, y: 345 };
                        const isPatientInCorridor = patient.x < 1060;
                        const isTargetInCorridor = newTarget.x < 1060;
                        patient.wanderPath = (isPatientInCorridor !== isTargetInCorridor) ? [waypoint, newTarget] : [newTarget];
                        patient.wanderTarget = patient.wanderPath.shift();
                    }
                }
            }

            // 2. Handle movement for any patient that is in a moving state.
            if ((patient.wanderingState === 'wandering' || patient.wanderingState === 'moving_to_chair') && patient.wanderTarget) {
                const dx = patient.wanderTarget.x - patient.x;
                const dy = patient.wanderTarget.y - patient.y;
                const distance = Math.hypot(dx, dy);

                if (distance < speed) {
                    if (patient.wanderPath && patient.wanderPath.length > 0) {
                        patient.wanderTarget = patient.wanderPath.shift();
                    } else if (patient.wanderingState === 'moving_to_chair') {
                        patient.wanderingState = 'sitting';
                        patient.rotation = patient.finalRotation;
                    } else {
                        patient.wanderingState = 'idle';
                        patient.wanderIdleTimer = Math.random() * 600 + 180; // Wait 3-10 seconds
                    }
                } else {
                    patient.x += (dx / distance) * speed;
                    patient.y += (dy / distance) * speed;
                    patient.rotation = Math.atan2(dy, dx) + Math.PI / 2;
                }
            }
        }
    }

    drawParents() {
        for (const parent of this.game.parents) {
            if (parent.img) {
                const size = 14 * 4.0;
                ctx.save();
                ctx.translate(parent.x, parent.y);
                if (parent.name) {
                    ctx.fillStyle = "#fff";
                    ctx.font = "13px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText(`${parent.name} (Parent)`, 0, -size / 2 - 5);
                }
                ctx.rotate(parent.rotation || 0);
                ctx.drawImage(parent.img, -size / 2, -size / 2, size, size);
                ctx.restore();
            }
        }
    }

    async spawnPatient() {
        // --- NEW: Limit the number of patients in the waiting room ---
        const waitingRoomPatients = this.game.patients.filter(p => p.assignedRoom === null).length;
        const MAX_WAITING_PATIENTS = 5;

        if (waitingRoomPatients >= MAX_WAITING_PATIENTS) {
            console.log(`[SPAWN] Waiting room is full (${waitingRoomPatients} patients). Postponing new patient spawn.`);
            return; // Exit the function, do not spawn a new patient
        }
        // ---

        try {
            const res = await api.getNewPatient();
            if (res.status === 404) {
                if (this.game.spawnTimer) clearInterval(this.game.spawnTimer);
                return;
            }
            if (!res.ok) throw new Error(`Server responded with an error: ${res.statusText}`);

            const patientData = await res.json();

            // --- NEW: Check for Akutrum Case ---
            if (patientData.isAkutrumCase) {
                const akutrum = this.game.rooms.find(r => r.name === "Room 4");
                const isAkutrumOccupied = this.game.isRoomOccupied(akutrum);

                if (!isAkutrumOccupied) {
                    // If the Akutrum is free, start the pre-arrival sequence.
                    this.game.pendingAkutrumPatient = patientData;
                    this.game.ui.showSubtleNotification("Ambulance incoming. Click to read report.");
                    return; // Stop normal spawning.
                } else {
                    // --- NEW: If the Akutrum is occupied, show a notification ---
                    console.log("[SPAWN] Akutrum case detected, but Akutrum is occupied. Diverting to waiting room.");
                    this.game.ui.showSubtleNotification("Akutrum occupied. Ambulance patient sent to waiting room.");
                    // Hide the notification after 5 seconds
                    setTimeout(() => this.game.ui.hideSubtleNotification(), 5000);
                    // The function will now continue and spawn the patient normally below.
                }
            }

            // If bladder_volume is not specified, assign a random "normal" value.
            if (patientData.bladder_volume === undefined || patientData.bladder_volume === null || patientData.bladder_volume === '') {
                patientData.bladder_volume = Math.floor(Math.random() * 101) + 100; // Random value between 100 and 200
            }

            if (patientData && typeof patientData.Läkemedelslista === 'string') {
                try {
                    patientData.Läkemedelslista = JSON.parse(patientData.Läkemedelslista);
                } catch (e) {
                    patientData.Läkemedelslista = [];
                }
            }

            const spawnRoom = this.game.rooms.find(r => r.name === "Väntrum");
            if (!spawnRoom) return;

            const pad = 20;
            const x = spawnRoom.x + pad + Math.random() * (spawnRoom.w - pad * 2);
            const y = spawnRoom.y + pad + Math.random() * (spawnRoom.h - pad * 2);
            const { radius, Radius, ...restOfPatientData } = patientData;
            const isChild = patientData.age < 18;

            const newPatient = {
                x, y,
                radius: isChild ? 12 : 14,
                color: "red",
                actionsTaken: [],
                assignedRoom: null,
                rotation: 0, ...restOfPatientData,
                currentVitals: { AF: patientData.AF, Saturation: patientData.Saturation, Puls: patientData.Puls, BT_systolic: patientData.BT_systolic, BT_diastolic: patientData.BT_diastolic, Temp: patientData.Temp, RLS: patientData.RLS },
                vitalColors: { AF: utils.getVitalColor('AF', patientData.AF, patientData.age), Saturation: utils.getVitalColor('Saturation', patientData.Saturation, patientData.age), Puls: utils.getVitalColor('Puls', patientData.Puls, patientData.age), BT: utils.getVitalColor('BT_systolic', patientData.BT_systolic, patientData.age), Temp: utils.getVitalColor('Temp', patientData.Temp, patientData.age), RLS: utils.getVitalColor('RLS', patientData.RLS, patientData.age) },
                // --- NEW: Add wandering state for waiting room movement ---
                wanderingState: 'idle',
                wanderTarget: null,
                wanderIdleTimer: Math.random() * 120 + 60 // Wait 1-2 seconds before first move
            };
            if (newPatient.patient_avatar) newPatient.img = await utils.loadImage(`/images/${newPatient.patient_avatar}`);
            this.game.patients.push(newPatient);

            if (patientData.age < 18 && patientData.parent_avatar) {
                // --- FIX: Use parentId from patientData (now sent from backend) ---
                const parentImg = await utils.loadImage(`/images/${patientData.parent_avatar}`);
                this.game.parents.push({ id: patientData.parentId, x: newPatient.x - 20, y: newPatient.y, img: parentImg, childId: newPatient.id, rotation: 0, name: patientData.ParentName });
            }
        } catch (err) {
            console.error("Error in spawnPatient function:", err);
        }
    }

    async spawnAkutrumPatient() {
        const patientData = this.game.pendingAkutrumPatient;
        if (!patientData) return 'no_patient_pending';

        const akutrum = this.game.rooms.find(r => r.name === "Room 4");
        if (!akutrum) {
            console.error("Akutrum (Room 4) not found!");
            return 'error';
        }

        // --- FIX: Re-check if the Akutrum is occupied just before spawning ---
        if (this.game.isRoomOccupied(akutrum)) {
            console.log("[SPAWN] Akutrum became occupied during arrival sequence. Diverting patient to waiting room.");
            this.game.pendingAkutrumPatient = null; // Clear the pending patient
            this.spawnPatientAsNormal(patientData); // Use a new helper to spawn them normally
            return 'diverted_to_waiting_room';
        }

        // Position the patient in the center of the Akutrum
        const x = akutrum.x + akutrum.w / 2;
        const y = akutrum.y + akutrum.h / 2;

        const { radius, Radius, ...restOfPatientData } = patientData;
        const isChild = patientData.age < 18;

        const newPatient = {
            x, y,
            radius: isChild ? 12 : 14,
            color: "red",
            actionsTaken: [],
            assignedRoom: akutrum,
            rotation: 0, ...restOfPatientData,
            currentVitals: { AF: patientData.AF, Saturation: patientData.Saturation, Puls: patientData.Puls, BT_systolic: patientData.BT_systolic, BT_diastolic: patientData.BT_diastolic, Temp: patientData.Temp, RLS: patientData.RLS },
            vitalColors: { AF: utils.getVitalColor('AF', patientData.AF, patientData.age), Saturation: utils.getVitalColor('Saturation', patientData.Saturation, patientData.age), Puls: utils.getVitalColor('Puls', patientData.Puls, patientData.age), BT: utils.getVitalColor('BT_systolic', patientData.BT_systolic, patientData.age), Temp: utils.getVitalColor('Temp', patientData.Temp, patientData.age), RLS: utils.getVitalColor('RLS', patientData.RLS, patientData.age) },
            // --- NEW: Add wandering state, though it won't be used for Akutrum patients ---
            wanderingState: 'idle',
            wanderTarget: null,
            wanderIdleTimer: 0
        };
        if (newPatient.patient_avatar) newPatient.img = await utils.loadImage(`/images/${newPatient.patient_avatar}`);
        this.game.patients.push(newPatient);

        // --- REMOVED: Do not automatically enter the room view ---
        // this.game.enterRoomView(akutrum, newPatient);

        // Clear the pending patient
        this.game.pendingAkutrumPatient = null;
        return 'spawned_in_akutrum';
    }

    async spawnPatientAsNormal(patientData) {
        const spawnRoom = this.game.rooms.find(r => r.name === "Väntrum");
        if (!spawnRoom) return;

        const pad = 20;
        const x = spawnRoom.x + pad + Math.random() * (spawnRoom.w - pad * 2);
        const y = spawnRoom.y + pad + Math.random() * (spawnRoom.h - pad * 2);
        const { radius, Radius, ...restOfPatientData } = patientData;
        const isChild = patientData.age < 18;

        const newPatient = {
            x, y,
            radius: isChild ? 12 : 14,
            color: "red",
            actionsTaken: [], // --- FIX: Initialize actionsTaken array ---
            assignedRoom: null,
            rotation: 0, ...restOfPatientData,
            currentVitals: { AF: patientData.AF, Saturation: patientData.Saturation, Puls: patientData.Puls, BT_systolic: patientData.BT_systolic, BT_diastolic: patientData.BT_diastolic, Temp: patientData.Temp, RLS: patientData.RLS },
            vitalColors: { AF: utils.getVitalColor('AF', patientData.AF, patientData.age), Saturation: utils.getVitalColor('Saturation', patientData.Saturation, patientData.age), Puls: utils.getVitalColor('Puls', patientData.Puls, patientData.age), BT: utils.getVitalColor('BT_systolic', patientData.BT_systolic, patientData.age), Temp: utils.getVitalColor('Temp', patientData.Temp, patientData.age), RLS: utils.getVitalColor('RLS', patientData.RLS, patientData.age) },
            // --- NEW: Add wandering state for waiting room movement ---
            wanderingState: 'idle',
            wanderTarget: null,
            wanderIdleTimer: Math.random() * 120 + 60 // Wait 1-2 seconds before first move
        };
        if (newPatient.patient_avatar) newPatient.img = await utils.loadImage(`/images/${newPatient.patient_avatar}`);
        this.game.patients.push(newPatient);

        if (patientData.age < 18 && patientData.parent_avatar) {
            // --- FIX: Use parentId from patientData (now sent from backend) ---
            const parentImg = await utils.loadImage(`/images/${patientData.parent_avatar}`);
            this.game.parents.push({ id: patientData.parentId, x: newPatient.x - 20, y: newPatient.y, img: parentImg, childId: newPatient.id, rotation: 0, name: patientData.ParentName });
        }
    }
}