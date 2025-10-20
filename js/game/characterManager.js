import * as api from '../api.js';
import { API_URL } from '../api.js';
import * as utils from '../utils.js';
import { canvas, ctx } from '../canvas.js';

export default class CharacterManager {
    constructor(game) {
        this.game = game;
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
            const shadowRadius = 14 * 1.1;
            ctx.arc(parent.x + shadowOffsetX, parent.y + shadowOffsetY, shadowRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    updateNurse() {
        const nurse = this.game.nurse;
        if (!nurse || nurse.state === 'idle') return;

        let currentTarget = nurse.path[0];
        if (!currentTarget) {
            if (nurse.state === 'moving_to_patient') {
                nurse.state = 'at_patient';
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

        if (distance < speed) {
            nurse.x = currentTarget.x;
            nurse.y = currentTarget.y;
            nurse.path.shift();
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

    triggerNurseAction(patient) {
        const nurse = this.game.nurse;
        if (nurse.state !== 'idle' && nurse.state !== 'at_patient') return;

        if (nurse.state === 'idle') {
            nurse.state = 'moving_to_patient';
            nurse.lastPatient = patient;
            nurse.path = this.calculateNursePath(patient, false);
        } else if (nurse.state === 'at_patient') {
            nurse.state = 'returning';
            nurse.path = this.calculateNursePath(patient, true);
        }
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

    calculateNursePath(patient, isReturning) {
        const corridorWaypointX = 145;
        const corridorWaypointY = 345;
        const homeCorridorWaypoint = { x: corridorWaypointX, y: corridorWaypointY };

        if (isReturning) {
            const lastPatientRoom = patient.assignedRoom;
            const roomDoorX = lastPatientRoom.x + lastPatientRoom.w / 2;
            const roomDoorY = lastPatientRoom.y < 300 ? lastPatientRoom.y + lastPatientRoom.h + 10 : lastPatientRoom.y - 10;
            return [
                { x: roomDoorX, y: roomDoorY },
                { x: roomDoorX, y: corridorWaypointY },
                homeCorridorWaypoint,
                this.game.nurse.homePosition,
            ];
        }

        const patientRoom = patient.assignedRoom;
        const roomDoorX = patientRoom.x + patientRoom.w / 2;
        const roomDoorY = patientRoom.y < 300 ? patientRoom.y + patientRoom.h + 10 : patientRoom.y - 10;
        let finalTarget = patientRoom.y > 300 ? { x: patient.x, y: patient.y - 60 } : { x: patient.x, y: patient.y + 60 };

        return [homeCorridorWaypoint, { x: roomDoorX, y: corridorWaypointY }, { x: roomDoorX, y: roomDoorY }, finalTarget];
    }

    updateParents() {
        const followDistance = 55;
        for (const parent of this.game.parents) {
            const child = this.game.patients.find(p => p.id === parent.childId);
            if (child) {
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
        try {
            const res = await api.getNewPatient();
            if (res.status === 404) {
                if (this.game.spawnTimer) clearInterval(this.game.spawnTimer);
                return;
            }
            if (!res.ok) throw new Error(`Server responded with an error: ${res.statusText}`);

            const patientData = await res.json();

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

            const newPatient = { x, y, radius: isChild ? 12 : 14, color: "red", actionsTaken: [], assignedRoom: null, rotation: 0, ...restOfPatientData, currentVitals: { AF: patientData.AF, Saturation: patientData.Saturation, Puls: patientData.Puls, BT_systolic: patientData.BT_systolic, BT_diastolic: patientData.BT_diastolic, Temp: patientData.Temp, RLS: patientData.RLS }, vitalColors: { AF: utils.getVitalColor('AF', patientData.AF, patientData.age), Saturation: utils.getVitalColor('Saturation', patientData.Saturation, patientData.age), Puls: utils.getVitalColor('Puls', patientData.Puls, patientData.age), BT: utils.getVitalColor('BT_systolic', patientData.BT_systolic, patientData.age), Temp: utils.getVitalColor('Temp', patientData.Temp, patientData.age), RLS: utils.getVitalColor('RLS', patientData.RLS, patientData.age) } };
            if (newPatient.patient_avatar) newPatient.img = await utils.loadImage(`${API_URL}/images/${newPatient.patient_avatar}`);
            this.game.patients.push(newPatient);

            if (patientData.age < 18 && patientData.parent_avatar) {
                const parentImg = await utils.loadImage(`${API_URL}/images/${patientData.parent_avatar}`);
                this.game.parents.push({ x: newPatient.x - 20, y: newPatient.y, img: parentImg, childId: newPatient.id, rotation: 0, name: patientData.ParentName });
            }
        } catch (err) {
            console.error("Error in spawnPatient function:", err);
        }
    }
}