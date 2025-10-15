import * as api from './api.js';
import { API_URL } from './api.js';
import * as ui from './ui.js';
import * as canvas from './canvas.js';
import * as utils from './utils.js';
import InputHandler from './InputHandler.js';

// This is a standalone helper function because it doesn't need to be part of the class
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export default class Game {
    constructor() {
        // --- Game State Variables ---
        this.patients = [];
        this.currentPatientId = null;
        this.draggingPatient = null;
        this.selectedPatient = null;
        this.isDraggingFlag = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.lastDragX = 0;
        this.lastDragY = 0;
        this.statusPollTimer = null;
        this.spawnTimer = null;
        
        // --- Game Config & Data ---
        this.camera = { x: canvas.worldWidth / 2, y: canvas.worldHeight / 2, zoom: 1.0 };
        this.images = {};
        this.allLabTests = [];
        this.allLabKits = [];
        this.allMedications = [];
        this.allBedsideTests = [];
        this.allPhysicalExams = [];
        this.allRadiologyTests = [];
        this.standardFindings = {};
        this.vitalKeys = ["AF", "Saturation", "Puls", "BT", "Temp", "RLS"];
        this.allPrescriptions = [];
        this.medicationContext = null; 
        this.allDiagnoses = [];
        this.selectedPrescriptions = new Set();
        
        // --- Hospital Layout Data ---
        this.rooms = [
        // Waiting Room (tall, on the right) - RESIZED
        { x: 1060, y: 10, w: 200, h: 630, name: "Väntrum", furniture: [
            { x: 10, y: 25, w: 60, image: 'chair_to_left',},
            { x: 10, y: 100, w: 60, image: 'chair_to_left',},
            { x: 10, y: 480, w: 60, image: 'chair_to_left',},
            { x: 10, y: 555, w: 60, image: 'chair_to_left',},
            { x: 135, y: 25, w: 60, image: 'chair_to_right' },
            { x: 135, y: 100, w: 60, image: 'chair_to_right',},
            { x: 135, y: 175, w: 60, image: 'chair_to_right',},
            { x: 135, y: 405, w: 60, image: 'chair_to_right',},
            { x: 135, y: 480, w: 60, image: 'chair_to_right',},
            { x: 135, y: 555, w: 60, image: 'chair_to_right',},
            { x: 10, y: 205, w: 50, image: 'kruka',},
            { x: 0, y: 380, w: 80, image: 'kruka2',},
        ]},

        // Corridor (long, in the middle) - RESIZED
        { x: 20, y: 260, w: 1040, h: 170, name: "Korridor", furniture: [
            { x: 0, y: -10, w: 100, image: 'kruka2',},
        ] },

        // --- TOP ROW ---

        // Doctor's Expedition (not moved) - RESIZED
        { x: 20, y: 10, w: 260, h: 250, name: "Läkarexpedition", furniture: [
            { x: 188, y: 40, w: 70, image: 'skrivbord' },
            { x: 125, y: 80, w: 60, image: 'chair_to_left'},
            { x: 10, y: 15, w: 50, image: 'kruka',}
            //{ x: 55, y: 75, w: 60, image: 'waitingChair', rotation: 5 * Math.PI /2 }
        ]},

        // Top row of patient rooms - MOVED DOWN from y: 30 to y: 50
        { x: 300, y: 50, w: 240, h: 210, name: "Room 1", furniture: [
            { x: 168, y: 30, w: 70, h: 85, image: 'patientBed' }
        ]},
        { x: 560, y: 50, w: 240, h: 210, name: "Room 2", furniture: [
            { x: 168, y: 30, w: 70, h: 85, image: 'patientBed' }
        ]},
        { x: 820, y: 50, w: 220, h: 210, name: "Room 3", furniture: [
            { x: 148, y: 30, w: 70, h: 85, image: 'patientBed' }
        ]},

        // --- BOTTOM ROW ---

        // Bottom row of patient rooms - MOVED DOWN from y: 420 to y: 440
        { x: 20, y: 430, w: 240, h: 210, name: "Room 4", furniture: [
            { x: 168, y: 40, w: 70, h: 85, image: 'patientBed' }
        ]},
        { x: 280, y: 430, w: 240, h: 210, name: "Room 5", furniture: [
            { x: 168, y: 40, w: 70, h: 85, image: 'patientBed' }
        ]},
        { x: 540, y: 430, w: 240, h: 210, name: "Room 6", furniture: [
            { x: 168, y: 40, w: 70, h: 85, image: 'patientBed' }
        ]},
        { x: 800, y: 430, w: 240, h: 210, name: "Room 7", furniture: [
        { x: 168, y: 40, w: 70, h: 85, image: 'patientBed' }
        ]},
        ];
        this.walls = [

        // MOST LEFT VERTICAL WALL
        { x: 0, y: 0, w: 20, h: 650 },

        // MOST RIGHT VERTICAL WALL
        { x: 1260, y: 0, w: 20, h: 650 },

        // Vertical wall between läkarexpedition and Room 1 - MOVED DOWN
        { x: 280, y: 19, w: 20, h: 240 },

        // Vertical wall between Room 1 & 2 - MOVED DOWN
        { x: 540, y: 49, w: 20, h: 202 },

        // Vertical wall between Room 2 & 3 - MOVED DOWN
        { x: 800, y: 49, w: 20, h: 202 },

        // Vertical wall between Room 3 & väntrum - MOVED DOWN
        { x: 1040, y: 20, w: 20, h: 230 },

        // Vertical wall between Room 4 & 5 - MOVED DOWN
        { x: 260, y: 439, w: 20, h: 202 },

        // Vertical wall between Room 5 & 6 - MOVED DOWN
        { x: 520, y: 439, w: 20, h: 202 },

        // Vertical wall between Room 6 & 7 - MOVED DOWN
        { x: 780, y: 439, w: 20, h: 202 },

        // Vertical wall between Room 7 & väntrum - MOVED DOWN
        { x: 1040, y: 440, w: 20, h: 202 },

        // Wall over läkarexpedition
        { x: 20, y: 0, w: 280, h: 20 },

        // Wall over väntrum
        { x: 1040, y: 0, w: 220, h: 20 },

        // Long wall on top
        { x: 299, y: 30, w: 750, h: 20 },

        // BOTTOM HORIZONTAL WALL
        { x: 0, y: 640, w: 1280, h: 20 }, // Adjusted slightly for new height

        // A horizontal wall below the Läkarexpedition (y:230)
        { x: 20, y: 230, w: 101, h: 20 },

        { x: 190, y: 230, w: 101, h: 20 },

        // A horizontal wall below the top row of rooms - MOVED DOWN
        { x: 280, y: 250, w: 100, h: 20 },

        // A horizontal wall below the top row of rooms - MOVED DOWN
        { x: 460, y: 250, w: 180, h: 20 },

        // A horizontal wall below the top row of rooms - MOVED DOWN
        { x: 720, y: 250, w: 180, h: 20 },

        // A horizontal wall below the top row of rooms - MOVED DOWN
        { x: 960, y: 250, w: 100, h: 20 },




        // Walls at the bottom of the corridor

        // A horizontal wall below the corridor - MOVED DOWN
        { x: 20, y: 420, w: 90, h: 20 },

        // A horizontal wall below the corridor - MOVED DOWN
        { x: 190, y: 420, w: 160, h: 20 },

        // A horizontal wall below the corridor - MOVED DOWN
        { x: 450, y: 420, w: 160, h: 20 },

        // A horizontal wall below the corridor - MOVED DOWN
        { x: 710, y: 420, w: 160, h: 20 },

        // A horizontal wall below the corridor - MOVED DOWN
        { x: 970, y: 420, w: 90, h: 20 },
        ];

        // --- Initialize Modules ---
        this.inputHandler = new InputHandler(this);

        // --- Scenery Layout Data ---
        this.scenery = [
            // Add an object for your tree. Change x, y, and w as you like.
            { x: 900, y:-130, w: 160, image: 'tree1' },
            { x: 270, y:-110, w: 140, image: 'tree1' },
            { x: -330, y:-167, w: 1950, image: 'treesnroads' }  

        ];
    }

    // LADDA SPELET
    async init() {
        // 1. Initial page setup
        canvas.resizeCanvas();
        window.addEventListener('resize', canvas.resizeCanvas);
        
        document.getElementById("playBtn").disabled = true;
        document.getElementById("playBtn").textContent = "Loading...";

        try {
            const status = await api.checkAuthStatus();
            if (status.user) {
                this.updateUserUI(status.user);
            }
        } catch (error) {
            // No user is logged in, do nothing.
            this.updateUserUI(null);
        }

        // 2. Load initial image assets
        try {
            await this.loadInitialAssets();
            document.getElementById("playBtn").disabled = false;
            document.getElementById("playBtn").textContent = "Play";
        } catch (error) {
            console.error("Failed to load initial assets:", error);
            document.getElementById("playBtn").textContent = "Error";
        }
        
        // 3. Start the main render loop
        canvas.renderLoop(this.camera, [
            () => this.drawGameWorld(),
            () => canvas.drawPatients(this.patients)
        ]);
    }
        
    drawGameWorld() {
    // --- This is the "what to draw" logic from your old loop ---

    // 1. Logic to figure out which rooms should glow
    const glowingRooms = this.selectedPatient 
      ? this.rooms.filter(r => r.name.startsWith("Room") && !this.isRoomOccupied(r)) 
      : [];

    // 2. Call the drawing functions from canvas.js
    canvas.drawHospitalLayout(this.rooms, this.walls, glowingRooms, this.images, this.scenery);
    canvas.drawPatients(this.patients);

    // 3. Update the critical patient warning UI
    const anyPatientCritical = this.patients.some(p => p.isCritical && !p.isFailed);
    ui.updateCriticalWarning(anyPatientCritical); // Call the function from ui.js
    }

    async loadInitialAssets() {
        try {
            const [kruka2, kruka, chair_to_right, chair_to_left, patientBed, skrivbord, tree1, treesnroads] = await Promise.all([
                // ✅ Use the imported API_URL
                utils.loadImage(`${API_URL}/images/kruka2.png`),
                utils.loadImage(`${API_URL}/images/kruka.png`),
                utils.loadImage(`${API_URL}/images/chair_to_left.png`),
                utils.loadImage(`${API_URL}/images/chair_to_right.png`),
                utils.loadImage(`${API_URL}/images/patient_bed.png`),
                utils.loadImage(`${API_URL}/images/skrivbord.png`),
                utils.loadImage(`${API_URL}/images/tree1.png`),
                utils.loadImage(`${API_URL}/images/treesnroads.png`),
            ]);
            this.images = { kruka2, kruka, chair_to_right, chair_to_left, patientBed, skrivbord, tree1, treesnroads };
        } catch (error) {
            // This catch block is important for debugging
            console.error("Failed to load one or more initial image assets:", error);
            document.getElementById("playBtn").textContent = "Asset Load Error";
            throw error; // Re-throw the error so the init method can see it
        }
    }

    async startGame() {
      // --- [DEBUG] CHECK AUTH ON GAME START ---
      console.log('--- [DEBUG] CHECKING AUTH STATUS ON startGame ---');
      try {
          const status = await api.checkAuthStatus();
          console.log('[DEBUG] startGame auth check SUCCESS:', status.user);
      } catch (e) {
          console.error('[DEBUG] startGame auth check FAILED:', e.message);
      }
      // --- END DEBUG ---
      try {
        // Use the 'api' module for fetch calls
        await api.resetGame();

        // All variables now use 'this.' to access the game's state
        if (this.spawnTimer) clearInterval(this.spawnTimer);
        this.spawnTimer = null;
        this.patients = [];

        // Helper functions are called from their modules
        utils.animateZoom(this.camera, canvas.worldWidth / 2, canvas.worldHeight / 2, 1.0);
        ui.hideAllSideMenus();
        this.stopVitalsPolling(); // This will also become a method of the Game class

        const data = await api.getGameData();

        this.allLabTests = data.labTests;
        this.allLabKits = data.labKits;
        console.log('--- Lab Kits received by Frontend: ---', this.allLabKits); // Add this line
        this.allBedsideTests = data.bedsideTests;
        this.allMedications = data.medications;
        this.allRadiologyTests = data.radiologyTests;
        this.standardFindings = data.standardFindings;
        this.allPhysicalExams = data.physicalExams;
        this.allPrescriptions = data.allPrescriptions;
        this.allDiagnoses = data.allDiagnoses;

        // Calls to other game logic functions also use 'this.'
        this.spawnTimer = setInterval(() => this.spawnPatient(), 15000);
        this.spawnPatient();

      } catch (err) {
        console.error("Failed to start the game:", err);
      }
      document.getElementById('menu').classList.add('hidden');
    }

    generateWalls(rooms) {
      const wallMap = new Map();
      const addWall = (x1, y1, x2, y2) => {
        const key = [x1, y1, x2, y2].sort().join(',');
        if (wallMap.has(key)) {
          wallMap.delete(key);
        } else {
          wallMap.set(key, { x1, y1, x2, y2 });
        }
      };
        rooms.forEach(room => {
            addWall(room.x, room.y, room.x + room.w, room.y);
            addWall(room.x, room.y + room.h, room.x + room.w, room.y + room.h);
            addWall(room.x, room.y, room.x, room.y + room.h);
            addWall(room.x + room.w, room.y, room.x + room.w, room.y + room.h);
        });
        return Array.from(wallMap.values());
    }

    async handleDispositionChoice(playerChoice, planData = null) {
    const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
    if (!currentPatient) return;

    try {
        const performanceData = {
            actionsTaken: currentPatient.actionsTaken || [],
            playerDiagnosis: currentPatient.playerDiagnosis || '',
            playerChoice: playerChoice,
            caseId: currentPatient.id, // This is the originalIndex
            playerPrescriptions: planData?.prescriptions, // Pass prescriptions if they exist
            playerAdmissionPlan: planData
        };

        const result = await api.evaluateCase(performanceData);
        
        ui.showFeedbackReport(result);

    } catch (err) {
        console.error("❌ ERROR communicating with evaluation endpoint:", err);
    }
}


    // ALLMÄNNA SPELFUNKTIONER
    findRoomAt(x, y) {
        return this.rooms.find(r => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) || null;
    }

    isRoomOccupied(room) {
        return this.patients.some(p => p.assignedRoom === room);
    }

    enterRoomView(room, patient = null) {
    // 1. Animate the camera zoom
    utils.animateZoom(this.camera, room.x + room.w / 2, room.y + room.h / 2, 2.5);
    
    // 2. Hide the top UI bar
    document.getElementById('top-ui-bar').classList.add('hidden');
    
    // 3. Stop any previous vitals polling
    this.stopVitalsPolling();

    // 4. If there's a patient, show their info and start new polling
    if (patient) {
        this.currentPatientId = patient.id;
        ui.showVitalsPopup(patient, this.vitalKeys, this.standardFindings, this.allRadiologyTests, this.allMedications, this.allBedsideTests);
        document.getElementById("roomMenu").style.display = "block";
        this.statusPollTimer = setInterval(() => this.pollForVitals(patient.id), 3000);
    } else {
        // If the room is empty, hide the patient-specific UI
        this.currentPatientId = null;
        document.getElementById("roomMenu").style.display = "none";
        // You may need a ui.hideVitalsPopup() function here if you have one
    }
    }

    // ALLMÄNNA PATIENTFUNKTIONER
    async pollForVitals(patientId) {
        try {
            // Use the api module
            const statusData = await api.getPatientStatus(patientId);
            // Access patients list via 'this'
            const localPatient = this.patients.find(p => p.id === patientId);
            if (!localPatient) return;
            
            localPatient.currentVitals = statusData.vitals;
            localPatient.vitalColors = statusData.vitalColors;
            localPatient.isFailed = statusData.isFailed;
            localPatient.isCritical = statusData.isCritical;
            localPatient.triageLevel = statusData.triageLevel;
            
            if (statusData.isFailed && !localPatient.hasBeenMarkedAsFailed) {
            localPatient.hasBeenMarkedAsFailed = true;
            this.stopVitalsPolling(); 

            // 👇 ADD THIS LOGIC TO SHOW THE MODAL
            // Hide the vitals popup to avoid overlap
            document.getElementById('vitalsPopup').style.display = 'none';
            // Show the failure modal
            document.getElementById('failureModal').classList.add('visible');
        }
            
            const popup = document.getElementById('vitalsPopup');
            if (popup.style.display !== 'none' && !localPatient.isFailed) {
                // ✅ Pass 'this.standardFindings' to the UI function
                ui.showVitalsPopup(localPatient, this.vitalKeys, this.standardFindings, this.allRadiologyTests, this.allMedications, this.allBedsideTests);

            }
        } catch (error) {
            console.error("Vitals polling error:", error);
        }
    }

    async spawnPatient() {
    try {
        const res = await api.getNewPatient();
        
        // Check for the "No more patients" signal
        if (res.status === 404) {
            console.log("Game over: No more patients available from the server.");
            // ✅ Use 'this.spawnTimer'
            if (this.spawnTimer) {
                clearInterval(this.spawnTimer);
            }
            return;
        }

        if (!res.ok) {
        // Handle other, unexpected server errors
        throw new Error(`Server responded with an error: ${res.statusText}`);
        }

        const patientData = await res.json();
        console.log("Patient data received by frontend:", patientData);

        // ✅ FIX: Parse the Läkemedelslista string into an array here.
        if (patientData && typeof patientData.Läkemedelslista === 'string') {
            try {
                patientData.Läkemedelslista = JSON.parse(patientData.Läkemedelslista);
            } catch (e) {
                console.error("Failed to parse Läkemedelslista for new patient", e);
                patientData.Läkemedelslista = []; // Default to an empty list on error
            }
        }

        const spawnRoom = this.rooms.find(r => r.name === "Väntrum");
        if (!spawnRoom) return;

        const pad = 20;
        const x = spawnRoom.x + pad + Math.random() * (spawnRoom.w - pad * 2);
        const y = spawnRoom.y + pad + Math.random() * (spawnRoom.h - pad * 2);

        const newPatient = {
            x, y, radius: 14, color: "red",
            actionsTaken: [],
            assignedRoom: null,
            rotation: 0,
            ...patientData,
            currentVitals: { // Initialize vitals
                AF: patientData.AF,
                Saturation: patientData.Saturation,
                Puls: patientData.Puls,
                BT_systolic: patientData.BT_systolic,
                BT_diastolic: patientData.BT_diastolic,
                Temp: patientData.Temp,
                RLS: patientData.RLS
            },
            vitalColors: { // Pre-calculate initial colors
                AF: ui.getVitalColor('AF', patientData.AF, patientData.age),
                Saturation: ui.getVitalColor('Saturation', patientData.Saturation, patientData.age),
                Puls: ui.getVitalColor('Puls', patientData.Puls, patientData.age),
                BT: ui.getVitalColor('BT', patientData.BT_systolic, patientData.age),
                Temp: ui.getVitalColor('Temp', patientData.Temp, patientData.age),
                RLS: ui.getVitalColor('RLS', patientData.RLS, patientData.age)
            }
        };

        if (newPatient.patient_avatar) {
        newPatient.img = new Image();
        newPatient.img.src = `${API_URL}/images/${newPatient.patient_avatar}`;
        }

        this.patients.push(newPatient);
        console.log("Spawned new patient:", newPatient);

    } catch (err) {
        console.error("Error in spawnPatient function:", err);
    }
    }

    stopVitalsPolling() {
        if (this.statusPollTimer) {
            clearInterval(this.statusPollTimer);
            this.statusPollTimer = null;
        }
    }
    
    // MAIN MENU
    async registerUser(username, password) {
    try {
        const response = await api.registerUser(username, password); // Use the api module

        const registerError = document.getElementById('registerError');
        const registerSuccess = document.getElementById('registerSuccess');

        if (response.ok) {
            registerError.classList.add('hidden');
            registerSuccess.classList.remove('hidden');
            
            setTimeout(() => {
                this.showLoginMenu(); // Call the other method
                registerSuccess.classList.add('hidden');
            }, 2000);
        } else {
            const data = await response.json();
            registerSuccess.classList.add('hidden');
            registerError.textContent = data.message || 'Registration failed.';
            registerError.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Could not connect to the server for registration.', err);
    }
    }

    showMenuView(view) {
        const mainMenu = document.getElementById('mainMenuControls');
        const loginMenu = document.getElementById('loginControls');
        const menuContainer = document.getElementById('menu');

        // ✅ Make the main menu container visible
        menuContainer.classList.remove('hidden');

        if (view === 'login') {
            mainMenu.style.display = 'none';
            loginMenu.classList.remove('hidden');
        } else { // Default to showing the main menu
            mainMenu.style.display = 'flex';
            // ✅ Stop game timers when returning to the main menu
            if (this.spawnTimer) clearInterval(this.spawnTimer);
            this.stopVitalsPolling();
            loginMenu.classList.add('hidden');
        }
    }

    async loginUser(username, password) {
        try {
            const response = await api.loginUser(username, password); // This returns the raw response
            const data = await response.json(); // We need to await the JSON parsing

            if (!response.ok) {
                // If the response is not OK, throw an error with the server's message
                throw new Error(data.message || 'Invalid username or password.');
            }
            
            // If successful, update the UI and switch views
            this.updateUserUI(data.user);
            this.returnToMenu(); // Use the single, correct function to return to the menu
            document.getElementById('loginError').classList.add('hidden');
        } catch (err) {
            const loginError = document.getElementById('loginError');
            loginError.textContent = err.message;
            loginError.classList.remove('hidden');
        }
    }

    async logoutUser() {
        await api.logoutUser();
        this.updateUserUI(null); // Update UI to logged-out state
        window.location.reload(); // Reload to reset game state
    }

    showRegisterMenu() {
        document.getElementById('loginFormContainer').classList.add('hidden');
        document.getElementById('registerFormContainer').classList.remove('hidden');
    }

    showLoginMenu() {
        document.getElementById('registerFormContainer').classList.add('hidden');
        document.getElementById('loginFormContainer').classList.remove('hidden');
    }

    returnToMenu() {
        // This is now the single source of truth for returning to the menu.
        // It stops all game activity and shows the main menu screen.
        if (this.spawnTimer) clearInterval(this.spawnTimer);
        this.stopVitalsPolling();
        document.getElementById('failureModal').classList.remove('visible');
        this.showMenuView('main');
    }

    updateUserUI(user = null) {
    const loginBtn = document.getElementById('topRightLoginBtn');
    const userInfoDiv = document.getElementById('userInfo');
    const usernameDisplay = document.getElementById('usernameDisplay');

    if (user) {
        // User is logged in
        loginBtn.classList.add('hidden');
        userInfoDiv.classList.remove('hidden');
        usernameDisplay.textContent = user.username;
    } else {
        // User is logged out
        loginBtn.classList.remove('hidden');
        userInfoDiv.classList.add('hidden');
        usernameDisplay.textContent = '';
    }
    }

    async showCaseHistory() {
        try {
            const history = await api.getCaseHistory();
            ui.renderCaseHistory(history, (id) => this.getActionNameById(id), (id) => this.getActionCategory(id));
            document.getElementById('menu').classList.add('hidden');
            document.getElementById('caseHistoryModal').classList.add('visible');
        } catch (error) {
            console.error("Failed to show case history:", error);
            // Optionally, show a login prompt if the error is due to not being authenticated
            this.showMenuView('login');
        }
    }

    async showLeaderboard() {
        try {
            const leaderboardData = await api.getLeaderboard();
            ui.renderLeaderboard(leaderboardData);
            document.getElementById('menu').classList.add('hidden');
            document.getElementById('leaderboardModal').classList.add('visible');
        } catch (error) {
            console.error("Failed to show leaderboard:", error);
            alert("Could not load the leaderboard. Please try again later.");
        }
    }

    async showSettingsModal() {
        try {
            const settings = await api.getUserSettings();
            document.getElementById('showOnLeaderboardCheckbox').checked = settings.showOnLeaderboard;
            document.getElementById('menu').classList.add('hidden');
            document.getElementById('settingsModal').classList.add('visible');
        } catch (error) {
            console.error("Failed to open settings:", error);
            this.showMenuView('login'); // Prompt login if settings can't be fetched
        }
    }

    async saveSettings() {
        const showOnLeaderboard = document.getElementById('showOnLeaderboardCheckbox').checked;
        try {
            await api.saveUserSettings({ showOnLeaderboard });
            document.getElementById('settingsModal').classList.remove('visible');
            this.showMenuView('main');
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert("Could not save settings. Please try again.");
        }
    }

    // MOUSE
    handleMouseDown(coords, button) {
        const mx = coords.x;
        const my = coords.y;
        this.patients.forEach(p => p.showTriageGlow = false);
        if (this.selectedPatient) {
            const clickedRoom = this.findRoomAt(mx, my);
            const glowingRooms = this.rooms.filter(r => r.name.startsWith("Room") && !this.isRoomOccupied(r));
            if (clickedRoom && glowingRooms.includes(clickedRoom)) {
                this.selectedPatient.x = clickedRoom.x + clickedRoom.w / 2;
                this.selectedPatient.y = clickedRoom.y + clickedRoom.h / 2;
                this.selectedPatient.assignedRoom = clickedRoom;
                this.currentPatientId = this.selectedPatient.id;
                this.enterRoomView(clickedRoom, this.selectedPatient);
            }
            this.selectedPatient = null;
            return;
        }
        for (let i = this.patients.length - 1; i >= 0; i--) {
            const p = this.patients[i];
            const dx = mx - p.x, dy = my - p.y;
            if (Math.hypot(dx, dy) <= p.radius * 2) {
                if (this.findRoomAt(p.x, p.y)?.name === "Väntrum") p.showTriageGlow = true;
                if (button === 0) {
                    this.draggingPatient = p;
                    this.lastDragX = mx;
                    this.lastDragY = my;
                    this.dragOffsetX = mx - p.x;
                    this.dragOffsetY = my - p.y;
                    this.isDraggingFlag = false;
                    this.dragStartX = mx;
                    this.dragStartY = my;
                    this.patients.splice(i, 1);
                    this.patients.push(p);
                }
                return;
            }
        }
        if (this.camera.zoom === 1) ui.hideAllSideMenus();
    }

    handleMouseMove(coords) {
    if (!this.draggingPatient) return;
    
    // Check if dragging has started
    if (!this.isDraggingFlag && Math.hypot(coords.x - this.dragStartX, coords.y - this.dragStartY) > 5) {
        this.isDraggingFlag = true;
        if (this.draggingPatient.assignedRoom) this.draggingPatient.assignedRoom = null;
    }

    if (this.isDraggingFlag) {
        // Update patient position
        this.draggingPatient.x = coords.x - this.dragOffsetX;
        this.draggingPatient.y = coords.y - this.dragOffsetY;
        
        // Update patient rotation
        const moveDx = coords.x - this.lastDragX;
        const moveDy = coords.y - this.lastDragY;
        if (Math.hypot(moveDx, moveDy) > 1) {
            this.draggingPatient.rotation = Math.atan2(moveDy, moveDx) + Math.PI / 2;
        }
        this.lastDragX = coords.x;
        this.lastDragY = coords.y;
    }
    }

    handleMouseUp() {
    if (this.draggingPatient) {
        if (this.isDraggingFlag) {
            // Logic for dropping a dragged patient
            const dropRoom = this.findRoomAt(this.draggingPatient.x, this.draggingPatient.y);
            if (dropRoom && dropRoom.name.startsWith("Room") && !this.isRoomOccupied(dropRoom)) {
                this.draggingPatient.x = dropRoom.x + dropRoom.w / 2;
                this.draggingPatient.y = dropRoom.y + dropRoom.h / 2;
                this.currentPatientId = this.draggingPatient.id;
                this.draggingPatient.assignedRoom = dropRoom;
                this.enterRoomView(dropRoom, this.draggingPatient);
            } else {
                this.draggingPatient.assignedRoom = null;
            }
        } else {
            // Logic for a simple click (not a drag)
            if (this.selectedPatient === this.draggingPatient) {
                this.selectedPatient = null;
            } else {
                this.selectedPatient = this.draggingPatient;
                
                // ✅ Check the camera's zoom level before showing the popup
                const isCurrentlyZoomedOut = (this.camera.zoom === 1.0);
                ui.showVitalsPopup(this.selectedPatient, this.vitalKeys, this.standardFindings, this.allRadiologyTests, this.allMedications, this.allBedsideTests, isCurrentlyZoomedOut);
            }
        }
    }
    // Reset all drag-related state
    this.draggingPatient = null;
    this.isDraggingFlag = false;
    }

    handleDblClick(coords) {
        const topBar = document.getElementById('top-ui-bar');
        const clickedRoom = this.findRoomAt(coords.x, coords.y);
        if (clickedRoom) {
            const patientInRoom = this.patients.find(p => p.assignedRoom === clickedRoom);
            this.enterRoomView(clickedRoom, patientInRoom);
        } else {
            utils.animateZoom(this.camera, canvas.worldWidth / 2, canvas.worldHeight / 2, 1.0);
            topBar.classList.remove('hidden');
            ui.hideAllSideMenus();
            this.stopVitalsPolling();
        }
    }

    // KEYS
    handleKeyDown(key) {
        if (key === "Escape") {
            const visibleModal = document.querySelector('.modal-backdrop.visible');
            if (visibleModal) {
                visibleModal.classList.remove('visible');
            } else {
                utils.animateZoom(this.camera, canvas.worldWidth / 2, canvas.worldHeight / 2, 1.0);
                ui.hideAllSideMenus();
                this.stopVitalsPolling();
            }
        }
    }

    handleEscapeKey() {
        // This is the "manager" doing the actual work.
        const topBar = document.getElementById('top-ui-bar');

        // Get references to all modals that can be open
        const ekgModal = document.getElementById('ekgModal');
        const diagnosisModal = document.getElementById('diagnosisModal');
        const dispositionModal = document.getElementById('dispositionModal');
        const feedbackModal = document.getElementById('feedbackModal');
        const dosingModal = document.getElementById('dosingModal');

        // Check modals in reverse order of appearance.
        if (admissionPlanModal && admissionPlanModal.classList.contains('visible')) {
        admissionPlanModal.classList.remove('visible');
        return; // Stop the function here
        }
        if (feedbackModal && feedbackModal.classList.contains('visible')) {
        document.getElementById('closeFeedback').click();
        return;
        }
        if (dispositionModal && dispositionModal.classList.contains('visible')) {
        dispositionModal.classList.remove('visible');
        return;
        }
        if (diagnosisModal && diagnosisModal.classList.contains('visible')) {
        diagnosisModal.classList.remove('visible');
        return;
        }
        if (dosingModal && dosingModal.classList.contains('visible')) {
        // You'll need to turn closeDosingModal into a method in ui.js
        this.cancelDosing(); 
        return;
        }
        if (ekgModal && ekgModal.classList.contains('visible')) {
        ekgModal.classList.remove('visible');
        return;
        }

        // If no modals were open, zoom out.
        utils.animateZoom(this.camera, canvas.worldWidth / 2, canvas.worldHeight / 2, 1.0);
        topBar.classList.remove('hidden');
        ui.hideAllSideMenus();
        this.stopVitalsPolling(); // Call the method using 'this'
    }

    // PATIENT ACTIONS 
        // ANAMNES
    showAnamnesis() {
    const chatMessages = document.getElementById("chatMessages");
    const currentPatient = this.patients.find(p => p.id === this.currentPatientId);

    if (currentPatient && currentPatient.chatHistory) {
        chatMessages.innerHTML = currentPatient.chatHistory;
    } else {
        chatMessages.innerHTML = '';
        // Use the ui module to add the first message
        ui.addChatMessage("System", `Anamnesis started.`);
    }
    
    // Use the ui module to show the correct menu
    ui.showSubmenu('chatWindow');
    chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async sendChatMessage() {
        const input = document.getElementById("chatInput");
        const userMessage = input.value.trim();
        if (!userMessage || this.currentPatientId === null || this.currentPatientId === undefined) return;

        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        
        // Update the UI with the user's message
        ui.addChatMessage("You", userMessage);
        input.value = "";

        try {
            // ✅ This is the corrected line.
            // Make sure you use "const data =" to capture the result.
            const data = await api.postChatMessage(this.currentPatientId, userMessage);
            
            // Use the new speaker and reply from the data object
            ui.addChatMessage(data.speaker || "Patient", data.reply);
            
            // Save the chat history locally
            if (currentPatient) {
                currentPatient.chatHistory = document.getElementById("chatMessages").innerHTML;
            }
        } catch (err) {
            console.error("Failed to send chat message:", err);
            ui.addChatMessage("System", "Error: Could not contact patient.");
        }
    }

        // STATUS
    showPhysicalExamMenu() {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        // ✅ Pass the currentPatient as an argument
        ui.renderPhysicalExamButtons(this.allPhysicalExams, 'physicalExamList', currentPatient);
        ui.showSubmenu('physicalExamMenu');
    }

        // BEDSIDE
    showBedsideMenu() {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        // 1. Prepare the content first
        ui.renderBedsideTestButtons(this.allBedsideTests, 'bedsideTestList', currentPatient);
        // 2. Then, show the menu
        ui.showSubmenu('bedsideMenu');
    }

    showEkgInterpretation() {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (!currentPatient) return;

        // --- UI Updates ---
        document.getElementById('ekgInterpretation').style.display = 'block';
        document.getElementById('showEkgInterpretationBtn').style.display = 'none';

        // --- NEW: State Update Logic ---
        const ekgLabel = 'EKG';
        const findingText = currentPatient.EKG_finding_text || "EKG performed.";

        // 1. Ensure the performedBedsideTests object exists.
        if (!currentPatient.performedBedsideTests) {
            currentPatient.performedBedsideTests = {};
        }
        // 2. Add the interpretation text to the patient's state.
        currentPatient.performedBedsideTests[ekgLabel] = findingText;
        // 3. Call the generic UI update function to refresh the accordion.
        ui.updateAndOpenAccordion(currentPatient, 'bedside', { allBedsideTests: this.allBedsideTests });
    }

        // LABUNDERSÖKNING
    showLabMenu() {
        // 1. Prepare the content first
        ui.renderLabTestButtons(this.allLabKits, this.allLabTests, 'labTestList');

        // 2. Then, show the menu
        ui.showSubmenu('labMenu');
    }

    filterLabTests(searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    // Filter the master list of tests using 'this.allLabTests'
    const filteredTests = this.allLabTests.filter(test => {
        return test.name.toLowerCase().includes(lowerCaseSearchTerm);
    });

    // Tell the ui module to re-render the buttons with the new, filtered list
    ui.renderLabTestButtons(this.allLabKits, filteredTests, 'labTestList');

    }

    async orderLabTest(testId, button) {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        const testInfo = this.allLabTests.find(t => t.id === testId);
        if (!currentPatient || !testInfo) return;

        button.disabled = true;
        button.textContent = 'Ordering...';

        const labContainer = document.getElementById('labResultsContent');
    
        try {
            document.getElementById('vitalsPopup').style.display = 'flex';
            const accordionHeader = labContainer.previousElementSibling;
            if (!accordionHeader.classList.contains('active')) {
                accordionHeader.classList.add('active');
            }

            // Use the api module to call the server
            const updatedLabsFromServer = await api.orderLab(currentPatient.id, testId);
        
            // Replace the local data with the complete list from the server.
            currentPatient.orderedLabs = updatedLabsFromServer;
        
            // Add the primary action to the actionsTaken list.
            if (!currentPatient.actionsTaken.includes(testId)) {
                currentPatient.actionsTaken.push(testId);
            }
        
            // Re-render the UI with the full, updated list using the ui module.
        ui.updateAndOpenAccordion(currentPatient, 'lab');


        } catch (err) {
            console.error('Failed to order lab test:', err);
            alert('An error occurred while ordering the test.');
        } finally {
            // Re-enable the button to allow re-ordering.
            button.disabled = false;
            button.textContent = testInfo.name;
        }
    }

    async orderLabKit(kitId, button) {
    const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
    const kitInfo = this.allLabKits.find(k => k.id === kitId);
    if (!currentPatient || !kitInfo) return;

    button.disabled = true;
    button.textContent = 'Ordering...';

    const labContainer = document.getElementById('labResultsContent');

    try {
        document.getElementById('vitalsPopup').style.display = 'flex';
        const accordionHeader = labContainer.previousElementSibling;
        if (!accordionHeader.classList.contains('active')) {
            accordionHeader.classList.add('active');
        }

        const updatedLabsFromServer = await api.orderLabKit(currentPatient.id, kitId);

        currentPatient.orderedLabs = updatedLabsFromServer;

        // Add all individual test IDs from the kit to the actionsTaken list for scoring
        const testIdsInKit = kitInfo.tests.split(',').map(id => id.trim());
        testIdsInKit.forEach(testId => {
             if (!currentPatient.actionsTaken.includes(testId)) {
                currentPatient.actionsTaken.push(testId);
            }
        });

        ui.updateAndOpenAccordion(currentPatient, 'lab');

    } catch (err) {
        console.error('Failed to order lab kit:', err);
    } finally {
        button.disabled = false;
        button.textContent = kitInfo.name;
    }
    }

    async confirmOxygen() {
    const flowRate = parseInt(document.getElementById('oxygenSlider').value);
    const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
    if (!currentPatient) return;

    // Check if we are administering in the ER
    if (this.medicationContext?.action === 'er_administer') {
        await api.setTherapy(currentPatient.id, 'oxygen', flowRate);
        
        if (!currentPatient.activeTherapies) currentPatient.activeTherapies = {};
        if (flowRate > 0) {
            currentPatient.activeTherapies.oxygen = { flowRate: flowRate };
        } else {
            delete currentPatient.activeTherapies.oxygen;
        }

        if (!currentPatient.administeredMeds) currentPatient.administeredMeds = {};
        if (flowRate > 0) {
            currentPatient.administeredMeds['oxygen'] = { name: `Oxygen (${flowRate} L/min)`, totalDose: '', unit: '', administrationCount: 1 };
             if (!currentPatient.actionsTaken.includes('oxygen')) {
                currentPatient.actionsTaken.push('oxygen');
            }
        } else {
            delete currentPatient.administeredMeds['oxygen'];
        }
        ui.updateAndOpenAccordion(currentPatient, 'meds');
    } 
    // Check if we are adding to the admission plan
    else if (this.medicationContext === 'plan_add') {
        const listContainer = document.getElementById('planMedicationOrdersList');
        const noMedsMessage = listContainer.querySelector('.no-meds-message');
        if (noMedsMessage) noMedsMessage.remove();

        const item = document.createElement('div');
        item.className = 'order-item';
        item.dataset.medId = 'oxygen';
        item.dataset.dose = flowRate;
        item.dataset.unit = 'L/min';

        // Create the HTML for the plan item
        item.innerHTML = `
            <div class="med-details">
                <span class="med-name">Oxygen</span>
                <span class="med-dose">${flowRate} L/min</span>
            </div>
            <span class="frequency-select">Continuous</span> 
            <button class="btn-remove-order">Remove</button>
        `;
        listContainer.appendChild(item);
    }

    // Hide the modal and reset context
    document.getElementById('oxygenModal').classList.remove('visible');
    this.medicationContext = null;
    }

        // RADIOLOGIUNDERSÖKNING
    showRadiologyMenu() {
    const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
    // ✅ Pass the currentPatient as an argument
    ui.renderRadiologyButtons(this.allRadiologyTests, 'radiologyTestList', currentPatient);
    ui.showSubmenu('radiologyMenu');
    }

        // MEDICINERING
    showMedsMenu() {
        // 1. Prepare the content first
        ui.renderMedicationButtons(this.allMedications, 'medsList');
        // 2. Then, show the menu
        ui.showSubmenu('medsMenu');
    }

    async handleAction(actionType, id, button) {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (!currentPatient) return;

        let testInfo, apiCall, containerId, stateProperty, resultKey, isRepeatable;

        switch (actionType) {
            case 'physicalExam':
                testInfo = { name: id }; // Physical exams are identified by name
                apiCall = () => api.performExam(currentPatient.id, id);
                containerId = 'physExamContent';
                stateProperty = 'performedExams';
                resultKey = 'examName';
                isRepeatable = false;
                break;
            case 'bedsideTest':
                testInfo = this.allBedsideTests.find(t => t.id === id);
                apiCall = () => api.performBedsideTest(currentPatient.id, id);
                actionType = 'bedside'; // ✅ FIX: Use the simplified type name the UI expects
                stateProperty = 'performedBedsideTests';
                resultKey = 'testLabel';
                isRepeatable = ['ekg', 'bladderscan'].includes(id);
                break;
            case 'radiology':
                testInfo = this.allRadiologyTests.find(t => t.id === id);
                apiCall = () => api.orderRadiology(currentPatient.id, id);
                containerId = 'radiologyResultsContent';
                stateProperty = 'orderedRadiology';
                resultKey = 'testName';
                isRepeatable = false;
                break;
            default:
                return;
        }

        if (!testInfo) return;

        button.disabled = true;
        button.textContent = '...';

        if (!currentPatient[stateProperty]) currentPatient[stateProperty] = {};
        currentPatient[stateProperty][testInfo.resultLabel || testInfo.name] = `<span>[Pending]</span><div class="spinner-inline"></div>`;
        ui.updateAndOpenAccordion(currentPatient, actionType, { standardFindings: this.standardFindings, allRadiologyTests: this.allRadiologyTests, allBedsideTests: this.allBedsideTests });

        try {
            const resultData = await apiCall();
            currentPatient[stateProperty][resultData[resultKey] || testInfo.name] = resultData.result || resultData.finding;

        
            // ✅ NEW: Special handling for EKG vs. other tests
            if (actionType === 'bedside' && resultData.imageFilename) {
                 // If it's an EKG with an image, just open the modal and do nothing to the accordion.
                delete currentPatient[stateProperty][testInfo.resultLabel || testInfo.name]; // Remove the pending state
                ui.updateAndOpenAccordion(currentPatient, actionType, { standardFindings: this.standardFindings, allRadiologyTests: this.allRadiologyTests, allBedsideTests: this.allBedsideTests });

                const hasBeenInterpreted = currentPatient.performedBedsideTests && currentPatient.performedBedsideTests['EKG'];

                const ekgModal = document.getElementById('ekgModal');
                const ekgImage = document.getElementById('ekgImage');
                const interpretationDiv = document.getElementById('ekgInterpretation');
                const showInterpretationBtn = document.getElementById('showEkgInterpretationBtn');

                ekgImage.src = `${api.API_URL}/images/${resultData.imageFilename}`;
                document.getElementById('ekgInterpretation').textContent = currentPatient.EKG_finding_text || "No interpretation available.";

                // Conditionally show the interpretation based on whether it was already revealed
                interpretationDiv.style.display = hasBeenInterpreted ? 'block' : 'none';
                showInterpretationBtn.style.display = hasBeenInterpreted ? 'none' : 'block';

                ekgModal.classList.add('visible');
            } else {
                // For all other tests, update the accordion with the final result.
                currentPatient[stateProperty][resultData[resultKey] || testInfo.name] = resultData.result || resultData.finding;
                ui.updateAndOpenAccordion(currentPatient, actionType, { standardFindings: this.standardFindings, allRadiologyTests: this.allRadiologyTests, allBedsideTests: this.allBedsideTests });
            }
            if (!currentPatient.actionsTaken.includes(id)) {
                currentPatient.actionsTaken.push(id);
            }                
            
        } catch (err) {
            console.error(`Failed to perform ${actionType}:`, err);
            currentPatient[stateProperty][testInfo.name] = '[Error]';
            ui.updateAndOpenAccordion(currentPatient, actionType, { standardFindings: this.standardFindings, allRadiologyTests: this.allRadiologyTests, allBedsideTests: this.allBedsideTests });
        } finally {
            button.textContent = testInfo.name;
            if (isRepeatable) button.disabled = false;
        }
    }

    async confirmDose(dose) {
        if (!this.medicationContext) return;

        const { action, medInfo, element } = this.medicationContext;

        if (action === 'er_administer') {
            await this.administerMedication(medInfo.id, dose); // Your original function for ER meds
        }
        else if (action === 'home_med_adjust') {
            this.confirmHomeMedDose(dose);
        } 
        else if (action === 'plan_edit') {
            // Update the existing element in the plan
            element.dataset.dose = dose;
            element.querySelector('.med-dose').textContent = `${dose} ${medInfo.doseUnit}`;
        } 
        else if (action === 'plan_add') {
            // Create a new element and add it to the plan
            const listContainer = document.getElementById('planMedicationOrdersList');
            const noMedsMessage = listContainer.querySelector('.no-meds-message');
            if (noMedsMessage) noMedsMessage.remove();

            const item = document.createElement('div');
            item.className = 'order-item';
            item.dataset.medId = medInfo.id;
            item.dataset.dose = dose;
            item.dataset.unit = medInfo.doseUnit;

            // Use the same structure as in Step 1
            item.innerHTML = `
                <span class="med-name">${medInfo.name}</span>
                <span class="med-dose">${dose} ${medInfo.doseUnit}</span>
                <select class="frequency-select">
                    <option value="1">x1 /24h</option>
                    <option value="2">x2 /24h</option>
                    <option value="3">x3 /24h</option>
                    <option value="4">x4 /24h</option>
                    <option value="vb">v.b.</option>
                </select>
                <button class="btn-remove-order">Remove</button>
            `;
            listContainer.appendChild(item);
        }

        this.cancelDosing(); // Close modal and reset context
    }
    cancelDosing() {
        document.getElementById('dosingModal').classList.remove('visible');
        this.medicationContext = null; // Reset context
    }

    async administerMedication(medId, dose) {
        // 1. Input validation
        if (!medId || this.currentPatientId === null || isNaN(dose) || dose <= 0) {
            alert("Please enter a valid dose.");
            return;
        }

        // 2. Find the relevant data from the game's state
        const medInfo = this.allMedications.find(m => m.id === medId);
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (!medInfo || !currentPatient) return;
    
        try {
        // 3. Call API (unchanged)
        await api.administerMedication(currentPatient.id, medId, dose);

        // 4. ✅ UPDATE LOCAL PATIENT STATE (This part is new)
        if (!currentPatient.administeredMeds) {
            currentPatient.administeredMeds = {};
        }

        // Find the specific dose option that was clicked to check for special properties
        const chosenOption = medInfo.doseOptions?.find(opt => opt.value === dose);

        if (currentPatient.administeredMeds[medId]) {
            // Logic for re-administering a standard drug
            currentPatient.administeredMeds[medId].totalDose += dose;
            currentPatient.administeredMeds[medId].administrationCount += 1;
        } else {
            // Logic for the first administration
            currentPatient.administeredMeds[medId] = {
                name: medInfo.name,
                totalDose: dose,
                unit: medInfo.doseUnit,
                administrationCount: 1,
                // Store the special text if it exists
                displayText: chosenOption?.displayText || null
            };
        }

        if (!currentPatient.actionsTaken.includes(medInfo.id)) {
            currentPatient.actionsTaken.push(medInfo.id);
        }
            
            // 5. Update the UI to reflect the changes
            ui.updateAndOpenAccordion(currentPatient, 'meds');
            
            // Poll for new vitals since the medication will have an effect
            this.pollForVitals(this.currentPatientId);

            // Open the "Administered Meds" accordion to show the new entry
            const medsContainer = document.getElementById('administeredMedsContent');
            const accordionHeader = medsContainer.previousElementSibling;
            if (!accordionHeader.classList.contains('active')) {
                accordionHeader.classList.add('active');
            }
            setTimeout(() => {
                medsContainer.style.maxHeight = medsContainer.scrollHeight + "px";
            }, 0);

            const scrollToNewMed = () => {
                ui.autoScrollView(medsContainer.lastElementChild);
                // Important: Remove the listener so it doesn't fire for other transitions
                medsContainer.removeEventListener('transitionend', scrollToNewMed);
            };
            medsContainer.addEventListener('transitionend', scrollToNewMed);


        } catch (error) {
            // 7. Handle any errors
            console.error('Failed to administer medication:', error);
        }

        // 6. Close the dosing modal by calling the method you already created
        this.cancelDosing();
    }

    async toggleHomeMedicationPause(medId) {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (!currentPatient) return;

        try {
            const updatedPatientData = await api.toggleHomeMed(currentPatient.id, medId);
            // Update the local patient object with the new state from the server
            currentPatient.homeMedicationState = updatedPatientData.homeMedicationState;
            // Re-render the UI to show the "Resume" text and paused style
            ui.updateHomeMedicationListUI(currentPatient, this.allMedications);
        } catch (error) {
            console.error("Failed to toggle home medication:", error);
        }
    }

    updateHomeMedicationValue(medId, field, value) {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (!currentPatient || !currentPatient.Läkemedelslista) return;

        const homeMed = currentPatient.Läkemedelslista.find(m => m.medId === medId);
        if (homeMed) {
            // Update the local data. The value is already a number from the input field.
            homeMed[field] = value;
            console.log(`Updated ${medId} ${field} to ${value}`);
        }
    }

    initiateHomeMedicationRemoval(medId) {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (!currentPatient || !currentPatient.Läkemedelslista) return;

        const homeMed = currentPatient.Läkemedelslista.find(m => m.medId === medId);
        if (!homeMed) return;

        // Set a flag and a timeout for permanent removal
        homeMed.pendingRemoval = true;
        homeMed.removalTimeoutId = setTimeout(() => {
            // This code runs after 3 seconds if "Undo" isn't clicked
            currentPatient.Läkemedelslista = currentPatient.Läkemedelslista.filter(m => m.medId !== medId);
            ui.updateHomeMedicationListUI(currentPatient, this.allMedications);
        }, 3000); // 3-second window to undo

        // Re-render the UI to show the updated list
        ui.updateHomeMedicationListUI(currentPatient, this.allMedications);
    }

    undoHomeMedicationRemoval(medId) {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (!currentPatient || !currentPatient.Läkemedelslista) return;

        const homeMed = currentPatient.Läkemedelslista.find(m => m.medId === medId);
        if (homeMed && homeMed.pendingRemoval) {
            clearTimeout(homeMed.removalTimeoutId); // Cancel the permanent removal
            delete homeMed.pendingRemoval;
            delete homeMed.removalTimeoutId;
            ui.updateHomeMedicationListUI(currentPatient, this.allMedications);
        }
    }

    showHomeMedicationModal() {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (!currentPatient) return;

        ui.updateHomeMedicationListUI(currentPatient, this.allMedications);
        document.getElementById('homeMedicationModal').classList.add('visible');
    }

    handleMedicationSelection(medId) {
    const medInfo = this.allMedications.find(m => m.id === medId);
    if (!medInfo) return;

    // 1. Universal Oxygen Check: If it's oxygen, always handle it here.
    if (medId === 'oxygen') {
        // If the context isn't already 'plan_add', set it to 'er_administer'
        if (this.medicationContext !== 'plan_add') {
            this.medicationContext = { action: 'er_administer', medInfo: medInfo };
        }
        // Open the special oxygen modal
        const oxygenModal = document.getElementById('oxygenModal');
        const oxygenSlider = document.getElementById('oxygenSlider');
        const oxygenFlowRateLabel = document.getElementById('oxygenFlowRateLabel');
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        
        oxygenSlider.value = currentPatient?.activeTherapies?.oxygen?.flowRate || 0;
        oxygenFlowRateLabel.textContent = `${oxygenSlider.value} L/min`;
        
        // Hide the selection modal if it's open
        if (this.medicationContext === 'plan_add') {
             document.getElementById('addPlanMedModal').classList.remove('visible');
        }
        oxygenModal.classList.add('visible');
        return; // Stop here
    }
    
    // 2. Standard Medication Logic (for everything else)
    if (this.medicationContext === 'plan_add') {
        document.getElementById('addPlanMedModal').classList.remove('visible');
        this.medicationContext = { action: 'plan_add', medInfo: medInfo };
        ui.openDosingModal(medInfo, medInfo.standardDose);
    } else { // ER administration for a standard drug
        this.medicationContext = { action: 'er_administer', medInfo: medInfo };
        ui.openDosingModal(medInfo, medInfo.standardDose);
    }
    }
    filterMedications(searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    
    // Filter the master list of medications
    const filteredMeds = this.allMedications.filter(med => {
        return med.name.toLowerCase().includes(lowerCaseSearchTerm);
    });

    // Tell the ui module to re-render the buttons
    ui.renderMedicationButtons(filteredMeds, 'medsList');
    }

        // DISCHARGE
    async showDiagnosisModal() {
        // --- [DEBUG] CHECK AUTH ON DISPOSITION ---
        console.log('--- [DEBUG] CHECKING AUTH STATUS ON DISPOSITION ---');
        try {
            const status = await api.checkAuthStatus();
            console.log('[DEBUG] Disposition auth check SUCCESS:', status.user);
        } catch (e) {
            console.error('[DEBUG] Disposition auth check FAILED:', e.message);
        }
        // --- END DEBUG ---

        // Instead of showing all diagnoses, pass an empty array to clear the list.
        ui.renderDiagnosisButtons([], 'diagnosisSelectionList'); 
        document.getElementById('diagnosisSearchInput').value = '';
        document.getElementById('diagnosisModal').classList.add('visible');
    }


    filterDiagnoses(searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    const MIN_CHARS_TO_SEARCH = 3; // You can change this number

    let filteredDiagnoses = []; // Default to an empty list

    // Only search if the user has typed enough characters
    if (lowerCaseSearchTerm.length >= MIN_CHARS_TO_SEARCH) {
        filteredDiagnoses = this.allDiagnoses.filter(d => 
            d.toLowerCase().includes(lowerCaseSearchTerm)
        );
    }

    // Render either the filtered list or an empty list
    ui.renderDiagnosisButtons(filteredDiagnoses, 'diagnosisSelectionList');
}

    selectDiagnosis(diagnosis) {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (!currentPatient) return;

        // Save the player's diagnosis to the patient object
        currentPatient.playerDiagnosis = diagnosis;

        // Hide the diagnosis modal and show the disposition modal
        document.getElementById('diagnosisModal').classList.remove('visible');
        document.getElementById('dispositionModal').classList.add('visible');
    }

    confirmAdmissionPlan() {
    const activeButton = document.querySelector('#planVitalsFreq .btn-toggle.active');
    const vitalsFreq = activeButton ? activeButton.dataset.value : 'none';
    const medicationOrders = [];
    document.querySelectorAll('#planMedicationOrdersList .order-item').forEach(item => {
        medicationOrders.push({
            id: item.dataset.medId,
            dose: item.dataset.dose,
            unit: item.dataset.unit,
            frequency: item.querySelector('.frequency-select').value,
            paused: item.classList.contains('paused') // Capture the paused state
        });
    });

    const playerAdmissionPlan = {
        medications: medicationOrders,
        monitoring: {
            vitals_frequency: vitalsFreq,
            fasta: document.getElementById('planFasta').classList.contains('active'),            
            urine_output: document.getElementById('planUrineOutput').classList.contains('active'),
            daily_weight: document.getElementById('planDailyWeight').classList.contains('active'),
            glucose_curve: document.getElementById('planGlucoseCurve').classList.contains('active'),
            surgery_notification: document.getElementById('planSurgeryNotification').classList.contains('active')
        }
    };

    document.getElementById('admissionPlanModal').classList.remove('visible');
    
    // Call the handleDispositionChoice method which is now part of this class
    this.handleDispositionChoice('Ward', playerAdmissionPlan);
    }

    chooseDisposition(choice) {
        if (choice === 'Home') {
            // Instead of finishing, show the prescription modal
            document.getElementById('dispositionModal').classList.remove('visible');
            this.showPrescriptionModal();

        } else if (choice === 'Ward') {
            // --- NEW LOGIC: Populate admission plan from the patient's home medication list ---
            const listContainer = document.getElementById('planMedicationOrdersList');
            const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
            
            listContainer.innerHTML = '';

            // Use a Set to track medications already added to the plan to avoid duplicates.
            const medsInPlan = new Set();

            // 1. Add home medications first
            if (currentPatient && currentPatient.Läkemedelslista && currentPatient.Läkemedelslista.length > 0) {
                currentPatient.Läkemedelslista.forEach(homeMed => {
                    const medInfo = this.allMedications.find(m => m.id === homeMed.medId);                    
                    // ✅ FIX: Correctly check if the medication is paused.
                    const isPaused = currentPatient.homeMedicationState && currentPatient.homeMedicationState[homeMed.medId]?.paused;

                    if (!medInfo) return; // Skip if med info isn't found

                    const item = document.createElement('div');
                    item.className = 'order-item';
                    // ✅ Apply the 'paused' class if the medication is paused.
                    if (isPaused) {
                        item.classList.add('paused');
                    }
                    item.dataset.medId = homeMed.medId;
                    item.dataset.dose = homeMed.dose;
                    item.dataset.unit = homeMed.unit;

                    item.innerHTML = `
                        <span class="med-name">${medInfo.name}</span>
                        <span class="med-dose">${homeMed.dose} ${homeMed.unit || ''}</span>
                        <select class="frequency-select">
                            <option value="1" ${homeMed.frequency == 1 ? 'selected' : ''}>x1 /dygn</option>
                            <option value="2" ${homeMed.frequency == 2 ? 'selected' : ''}>x2 /dygn</option>
                            <option value="3" ${homeMed.frequency == 3 ? 'selected' : ''}>x3 /dygn</option>
                            <option value="4" ${homeMed.frequency == 4 ? 'selected' : ''}>x4 /dygn</option>
                            <option value="vb" ${homeMed.frequency === 'vb' ? 'selected' : ''}>v.b.</option>
                        </select>
                        <button class="btn-toggle-pause">${isPaused ? 'Resume' : 'Pause'}</button>
                        <button class="btn-remove-order">Remove</button>
                    `;
                    listContainer.appendChild(item);
                    medsInPlan.add(homeMed.medId); // Mark this med as added
                });
            }

            // 2. Add medications administered in the ER that are not already in the plan
            if (currentPatient && currentPatient.administeredMeds) {
                Object.entries(currentPatient.administeredMeds).forEach(([medId, medData]) => {
                    // Skip if this medication is already in the plan from the home med list
                    if (medsInPlan.has(medId)) return;
                    // Also skip one-time therapies like oxygen for the ongoing plan
                    if (medId === 'oxygen') return;

                    const medInfo = this.allMedications.find(m => m.id === medId);
                    if (!medInfo) return;

                    const item = document.createElement('div');
                    item.className = 'order-item';
                    item.dataset.medId = medId;
                    item.dataset.dose = medData.totalDose;
                    item.dataset.unit = medData.unit;

                    item.innerHTML = `
                        <span class="med-name">${medInfo.name}</span>
                        <span class="med-dose">${medData.totalDose} ${medData.unit || ''}</span>
                        <select class="frequency-select">
                            <option value="1" selected>x1 /dygn</option>
                            <option value="2">x2 /dygn</option>
                            <option value="3">x3 /dygn</option>
                            <option value="4">x4 /dygn</option>
                            <option value="vb">v.b.</option>
                        </select>
                        <button class="btn-toggle-pause">Pause</button>
                        <button class="btn-remove-order">Remove</button>
                    `;
                    listContainer.appendChild(item);
                });
            }

            // 3. If after all that, the list is still empty, show a message.
            if (listContainer.children.length === 0) {
                listContainer.innerHTML = '<p class="no-meds-message">Patient has no registered home medications.</p>';
            }

            // 5. Hide the disposition modal and show the admission plan modal
            document.getElementById('dispositionModal').classList.remove('visible');
            document.getElementById('admissionPlanModal').classList.add('visible');
        } else if (choice === 'PCI') {
            // For direct transfers like PCI, we don't need a complex plan.
            // We can immediately evaluate the case.
            document.getElementById('dispositionModal').classList.remove('visible');
            this.handleDispositionChoice('PCI');
        }
    }   

    getPrescribableMedications() {
        // Combine both prescriptions and general medications into one list
        const combined = [...this.allPrescriptions, ...this.allMedications];
        const uniqueMeds = [];
        const seenIds = new Set();

        // Filter out any duplicates based on the 'id'
        for (const med of combined) {
            if (med && med.id && !seenIds.has(med.id)) {
                uniqueMeds.push(med);
                seenIds.add(med.id);
            }
        }
        return uniqueMeds;
    }

    showPrescriptionModal() {
        this.selectedPrescriptions.clear();
        ui.renderCheckboxButtons(this.getPrescribableMedications(), 'prescriptionSelectionList', this.selectedPrescriptions);
        this.updateSelectedPrescriptionsUI();
        document.getElementById('prescriptionSearchInput').value = '';
        document.getElementById('prescriptionModal').classList.add('visible');
    }

    filterPrescriptions(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = this.getPrescribableMedications().filter(p => p.name && p.name.toLowerCase().includes(lowerCaseSearchTerm));
        ui.renderCheckboxButtons(filtered, 'prescriptionSelectionList', this.selectedPrescriptions);
    }

    updateSelectedPrescriptionsUI() {
        const allMeds = this.getPrescribableMedications();
        const selectedItems = allMeds.filter(med => this.selectedPrescriptions.has(med.id));
        ui.renderSelectedItemsList('selectedPrescriptionsList', selectedItems);
    }

    confirmPrescriptions() {
        // The selected prescriptions are already tracked in this.selectedPrescriptions
        const prescriptionsToSubmit = Array.from(this.selectedPrescriptions);

        // Hide the modal
        document.getElementById('prescriptionModal').classList.remove('visible');

        // Now, evaluate the case with the selected prescriptions
        this.handleDispositionChoice('Home', {
            prescriptions: prescriptionsToSubmit
        });
    }

    showAddPlanMedModal() {
    console.log("Attempting to show 'Add Med' modal. Setting context to 'plan_add'.");
    this.medicationContext = 'plan_add'; // Set the context to a simple string
    ui.renderMedicationButtons(this.allMedications, 'planMedSelectionList');
    document.getElementById('addPlanMedModal').classList.add('visible');
    document.getElementById('planMedSearchInput').value = '';
    }
    
    filterPlanMeds(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filteredMeds = this.allMedications.filter(med => {
            return med.name.toLowerCase().includes(lowerCaseSearchTerm);
        });
        // Render the filtered list into our new modal's list container
        ui.renderMedicationButtons(filteredMeds, 'planMedSelectionList');
    }

    editPlanMedDose(orderItemElement) {
        const medId = orderItemElement.dataset.medId;
        const currentDose = orderItemElement.dataset.dose;
        const medInfo = this.allMedications.find(m => m.id === medId);
        if (!medInfo) return;

        // Set the context to 'editing an item in the plan'
        this.medicationContext = { 
            action: 'plan_edit', 
            element: orderItemElement, 
            medInfo: medInfo 
        };

        // This reuses the logic from your old handleMedicationSelection function
        ui.openDosingModal(medInfo, currentDose);
    }

    searchAllActions(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        
        if (lowerCaseSearchTerm.length === 0) {
            ui.hideSubmenu('generalSearchMenu');
            return;
        }

        // Create a unified list of all actions with their category
        const allActions = [
            ...this.allPhysicalExams.map(item => ({ ...item, category: 'exam' })),
            ...this.allLabTests.map(item => ({ ...item, category: 'lab' })),
            ...this.allLabKits.map(item => ({ ...item, category: 'lab' })),
            ...this.allBedsideTests.map(item => ({ ...item, category: 'bedside' })),
            ...this.allRadiologyTests.map(item => ({ ...item, category: 'radiology' })),
            ...this.allMedications.map(item => ({ ...item, category: 'med' }))
        ];

        const filteredActions = allActions.filter(action => 
            action.name && action.name.toLowerCase().includes(lowerCaseSearchTerm)
        );

        ui.renderGeneralSearchResults(filteredActions, 'generalSearchResultList');
        ui.showSubmenu('generalSearchMenu');
    }


    // FEEDBACK

    closeFeedbackReport() {
    // 1. Hide the modal
    document.getElementById('feedbackModal').classList.remove('visible');

    // 2. Update the game's state by removing the patient
    if (this.currentPatientId !== null) {
        this.patients = this.patients.filter(p => p.id !== this.currentPatientId);
        this.currentPatientId = null; // Clear the selected patient ID
    }

    // 3. Reset the game view
    utils.animateZoom(this.camera, canvas.worldWidth / 2, canvas.worldHeight / 2, 1.0);
    ui.hideAllSideMenus();
    this.stopVitalsPolling();
    }

    // HELPER FUNCTIONS
    getActionNameById(id) {
        const lowerCaseId = id.toLowerCase();

        // Access the master lists using 'this'
        const labTest = this.allLabTests.find(t => t.id.toLowerCase() === lowerCaseId);
        if (labTest) return labTest.name;

        const med = this.allMedications.find(m => m.id.toLowerCase() === lowerCaseId);
        if (med) return med.name;
        
        const bedsideTest = this.allBedsideTests.find(t => t.id.toLowerCase() === lowerCaseId);
        if (bedsideTest) return bedsideTest.name;
        
        const radiologyTest = this.allRadiologyTests.find(t => t.id.toLowerCase() === lowerCaseId);
        if (radiologyTest) return radiologyTest.name;

        if (this.standardFindings[id]) return id;

        return id; // Fallback
    }

    getActionCategory(id) {
        const lowerCaseId = (id || '').toLowerCase();
    
        // This logic now mirrors the robust backend categorization.
        // It checks the most unique categories first.
        if (this.allLabTests.some(item => item && item.id && item.id.toLowerCase() === lowerCaseId)) return 'lab';
        if (this.allBedsideTests.some(item => item && item.id && item.id.toLowerCase() === lowerCaseId)) return 'bedside';
        if (this.allRadiologyTests.some(item => item && item.id && item.id.toLowerCase() === lowerCaseId)) return 'radiology';
        if (this.allMedications.some(item => item && item.id && item.id.toLowerCase() === lowerCaseId)) return 'med';
        // Check for physical exams last, using the 'name' column.
        if (this.allPhysicalExams.some(item => item && item.name && item.name.toLowerCase() === lowerCaseId)) return 'exam';
    
        return 'unknown'; // Fallback
    }

    categorizeActions(actionIdArray) {
        const categories = { exams: [], labs: [], meds: [], bedside: [] };
        const actionSet = new Set(actionIdArray);

        actionSet.forEach(id => {
            // Access the master lists using 'this'
            if (this.allLabTests.some(test => test.id === id)) {
                categories.labs.push(id);
            } else if (this.allMedications.some(med => med.id === id)) {
                categories.meds.push(id);
            } else if (this.allBedsideTests.some(test => test.id === id)) {
                categories.bedside.push(id);
            } else if (this.standardFindings[id]) {
                categories.exams.push(id);
            }
        });
        return categories;
    }

    findRoomAt(x, y) {
        // It uses 'this.rooms' and calls the 'inRoom' function from the utils module
        return this.rooms.find(r => utils.inRoom(r, x, y)) || null;
    }

    isRoomOccupied(room) {
        // It uses 'this.patients'
        return this.patients.some(p => p.assignedRoom === room);
    }























}
