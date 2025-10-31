import * as api from '../api.js';
import { API_URL } from '../api.js';
import * as utils from '../utils.js';
import { canvas, ctx } from '../canvas.js';

export default class CharacterManager {
    constructor(game) {
        this.game = game;
        // --- NEW: Define walkable areas for wandering patients ---
        this.walkableAreas = [
            // Waiting Room
            { x: 1060, y: 10, w: 200, h: 630 },
            // Corridor
            { x: 20, y: 260, w: 1040, h: 170 }
        ];
    }

    drawCharacterShadows() {
        const shadowOffsetX = 4;
        const shadowOffsetY = 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

        for (const patient of this.game.patients) {
            ctx.beginPath();
            const shadowRadius = patient.radius * 1.7;
            ctx.arc(patient.x + shadowOffsetX, patient.y + shadowOffsetY, shadowRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const parent of this.game.parents) {
            ctx.beginPath();
            const shadowRadius = 14 * 1.7;
            ctx.arc(parent.x + shadowOffsetX, parent.y + shadowOffsetY, shadowRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- NEW: Draw a shadow for the nurse ---
        const nurse = this.game.nurse;
        if (nurse) {
            ctx.beginPath();
            const shadowRadius = 14 * 1.7; // Same size as the patient's shadow
            ctx.arc(nurse.x + shadowOffsetX, nurse.y + shadowOffsetY, shadowRadius, 0, Math.PI * 2);
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
        const followDistance = 55;
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
                // This is the original "following" logic
                const oldX = parent.x;
                const oldY = parent.y;
                const offset = followDistance * 0.707;
                const targetX = child.x - offset;
                const targetY = child.y - offset;
                parent.x += (targetX - parent.x) * 0.1;
                parent.y += (targetY - parent.y) * 0.1;
                const dx = parent.x - oldX;
                const dy = parent.y - oldY;
                if (Math.hypot(dx, dy) > 0.1) {
                    parent.rotation = Math.atan2(dy, dx) + Math.PI / 2;
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