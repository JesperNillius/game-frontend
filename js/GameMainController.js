import * as api from './api.js';
import { API_URL } from './api.js';
import * as canvas from './canvas.js'; // Imports canvas, ctx (initially null)
import { initCanvas } from './canvas.js'; // Imports the new init function
import * as utils from './utils.js';
import * as gameUi from './common/ui.js';
import GameInputHandler from './GameInputHandler.js'; // This stays as it's a core part
import CharacterManager from './game/characterManager.js';
import PlayerManager from './game/playerManager.js';
import ActionManager from './game/actionManager.js';
import DispositionManager from './game/dispositionManager.js';
import AbcdeManager from './game/abcdeManager.js'; // Import the new manager

export default class GameMainController {
    constructor() {
        this.ui = gameUi;

        // --- Game State Variables ---
        this.patients = [];
        this.nurse = null; // To hold the nurse character object
        this.parents = []; // To store parent characters
        this.currentPatientId = null;
        this.draggingPatient = null;
        this.selectedPatient = null;
        this.isDraggingFlag = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.gameData = {};
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.lastDragX = 0;
        this.lastDragY = 0;
        this.statusPollTimer = null;
        this.spawnTimer = null;
        this.pendingAkutrumPatient = null; // For the new feature
        this.casesPlayedThisSession = 0; // --- NEW: Counter for game review ---
        this.gameActive = false; // NEW: Flag to track if a game is currently active

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
        this.allConsultations = []; // NEW
        this.abcdeActions = {};
        this.allPrescriptions = [];
        this.medicationContext = null; 
        this.allDiagnoses = [];
        this.selectedPrescriptions = new Set();
        this.userSettings = {}; // NEW: To store user preferences
        // --- Hospital Layout Data ---
        this.rooms = [
        // Waiting Room (tall, on the right) - RESIZED
        { x: 1060, y: 10, w: 200, h: 630, name: "Väntrum", furniture: [
            { x: 10, y: 25, w: 60, h: 60, image: 'chair_to_left',},
            { x: 10, y: 100, w: 60, h: 60, image: 'chair_to_left',},
            { x: 10, y: 480, w: 60, h: 60, image: 'chair_to_left',},
            { x: 10, y: 555, w: 60, h: 60, image: 'chair_to_left',},
            { x: 135, y: 25, w: 60, h: 60, image: 'chair_to_right' },
            { x: 135, y: 100, w: 60, h: 60, image: 'chair_to_right',},
            { x: 135, y: 175, w: 60, h: 60, image: 'chair_to_right',},
            { x: 135, y: 405, w: 60, h: 60, image: 'chair_to_right',},
            { x: 135, y: 480, w: 60, h: 60, image: 'chair_to_right',},
            { x: 135, y: 555, w: 60, h: 60, image: 'chair_to_right',},
            { x: 10, y: 205, w: 50, h: 50, image: 'kruka',},
            { x: 0, y: 380, w: 80, h: 80, image: 'kruka2',},
        ]},

        // Corridor (long, in the middle) - RESIZED
        { x: 20, y: 260, w: 1040, h: 170, name: "Korridor", furniture: [
            { x: 0, y: -10, w: 100, image: 'kruka2',},
            { x: 500, y: 15, w: 50, image: 'kruka',},
            { x: 200, y: 139, w: 40, h: 40, image: 'trashcan' }
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
            { x: 1, y: 6, w: 92, h: 210, image: 'interior2' },
            { x: 168, y: 30, w: 70, h: 85, image: 'patientBed' }
        ]},
        { x: 560, y: 50, w: 240, h: 210, name: "Room 2", furniture: [
            // --- NEW: Add the custom interior image for Room 2 ---
            { x: 1, y: 6, w: 97, h: 210, image: 'interior1' },
            { x: 168, y: 30, w: 70, h: 85, image: 'patientBed' }
        ]},
        { x: 820, y: 50, w: 220, h: 210, name: "Room 3", furniture: [
            { x: 148, y: 30, w: 70, h: 85, image: 'patientBed' },
            { x: 0, y: 3, w: 90, h: 85, image: 'armchair4' },
            { x: 1, y: 120, w: 25, h: 60, image: 'sink' },
            { x: 60, y: 187, w: 8, h: 30, image: 'handsprit' }
        ]},
        // --- BOTTOM ROW ---
        // Bottom row of patient rooms - MOVED DOWN from y: 420 to y: 440
        { x: 20, y: 430, w: 240, h: 210, name: "Room 4", furniture: [
            // --- NEW: Add the custom interior image for the Akutrum ---
            // It's placed first so other furniture (like the bed) is drawn on top.
            { x: 0, y: 11, w: 241, h: 210, image: 'akutrum' },
            { x: 88, y: 40, w: 70, h: 85, image: 'patientBed' },
        ]},
        { x: 280, y: 430, w: 240, h: 210, name: "Room 5", furniture: [
            { x: 168, y: 40, w: 70, h: 85, image: 'patientBed' },
            { x: 3, y: 110, w: 90, h: 85, image: 'armchair5' },
            { x: 1, y: 25, w: 25, h: 60, image: 'sink' },
            { x: 60, y: 11, w: 8, h: 30, image: 'handsprit', rotation: Math.PI }
        ]},
        { x: 540, y: 430, w: 240, h: 210, name: "Room 6", furniture: [
            // --- NEW: Add the custom interior image for Room 6 ---
            { x: 1, y: 11, w: 70, h: 210, image: 'interior3' },
            { x: 168, y: 40, w: 70, h: 85, image: 'patientBed' }
        ]},
        { x: 800, y: 430, w: 240, h: 210, name: "Room 7", furniture: [
        { x: 168, y: 40, w: 70, h: 85, image: 'patientBed' },
        { x: -10, y: 115, w: 100, h: 85, image: 'armchair6' },
        { x: 1, y: 25, w: 25, h: 60, image: 'sink' },
        { x: 60, y: 12, w: 8, h: 30, image: 'handsprit', rotation: Math.PI }
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
        this.inputHandler = new GameInputHandler(this);
        this.characterManager = new CharacterManager(this);
        this.playerManager = new PlayerManager(this);
        this.actionManager = new ActionManager(this);
        this.dispositionManager = new DispositionManager(this);
        this.abcdeManager = new AbcdeManager(this); // Initialize the new manager


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
        initCanvas(); // ✅ Initialize canvas and ctx now that the DOM is ready.

        // ✅ Initialize managers that need to set up event listeners.
        this.dispositionManager.init();
        this.abcdeManager.init();

        canvas.resizeCanvas();
        this.inputHandler.init(); // ✅ Initialize the input handler now that the DOM is ready.
        window.addEventListener('resize', canvas.resizeCanvas);

        document.getElementById("playBtn").disabled = true;
        document.getElementById("playBtn").textContent = "Loading...";

        // Check auth status; this method handles its own errors.
        await this.playerManager.checkInitialAuth();
        
        // 2. Load all game data (actions, meds, etc.)
        try {
            const data = await api.getGameData();
            this.allLabTests = data.labTests;
            this.allLabKits = data.labKits;
            this.allBedsideTests = data.bedsideTests;
            this.allMedications = data.medications;
            this.abcdeActions = data.abcdeActions; // Get the new data
            this.allRadiologyTests = data.radiologyTests;
            this.standardFindings = data.standardFindings;
            this.allPhysicalExams = data.physicalExams;
            this.allPrescriptions = data.allPrescriptions;
            this.allDiagnoses = data.allDiagnoses;
            this.allConsultations = data.allConsultations; // NEW

        } catch (error) {
            console.error("Failed to load critical game data:", error);
            document.getElementById("playBtn").textContent = "Data Error";
            return; // Stop initialization if data fails to load
        }

        // 3. Load initial image assets
        try {
            await this.loadInitialAssets();
            document.getElementById("playBtn").disabled = false;
            document.getElementById("playBtn").textContent = "Play";
        } catch (error) {
            console.error("Failed to load initial assets:", error);
            document.getElementById("playBtn").textContent = "Error";
        }
        
        // 4. Start the main render loop
        canvas.renderLoop(this.camera, [
            () => this.drawGameWorld(),
            () => this.characterManager.drawCharacterShadows(), // Draw all shadows first
            () => this.characterManager.updateNurse(),
            () => this.characterManager.drawNurse(),
            () => this.characterManager.updateWanderingPatients(), // --- NEW: Update patient movement ---
            () => this.characterManager.updateParents(),
            () => this.characterManager.drawParents(),
            () => canvas.drawPatients(this.patients),
            () => this.drawThinkingBubbles(), // Add new drawing function to the loop
        ]);
    }
        
    drawGameWorld() { // This function is called in the render loop to draw the static elements
    // --- This is the "what to draw" logic from your old loop ---

    // Update the occupied status of each room before drawing
    this.rooms.forEach(room => {
        room.isOccupied = this.isRoomOccupied(room);
    });

    // 1. Logic to figure out which rooms should glow
    const glowingRooms = this.selectedPatient 
      ? this.rooms.filter(r => r.name.startsWith("Room") && !this.isRoomOccupied(r)) 
      : [];

    // 2. Call the drawing functions from canvas.js
    canvas.drawHospitalLayout(this.rooms, this.walls, glowingRooms, this.images, this.scenery);

    // 3. Update the critical patient warning UI
    const anyPatientCritical = this.patients.some(p => p.isCritical && !p.isFailed);
    this.ui.updateCriticalWarning(anyPatientCritical); // Call the function from ui.js
    }

    drawThinkingBubbles() {
        // Combine patients and parents into a single list of characters who might be thinking
        const allCharacters = [...this.patients, ...this.parents];
        const thinkingCharacters = allCharacters.filter(c => c.isThinking);

        if (thinkingCharacters.length === 0) return;

        const now = performance.now();
        const cycleDuration = 1200; // Total cycle time in milliseconds
        const elapsedInCycle = now % cycleDuration;

        let dots = '.';
        if (elapsedInCycle > 800) {
            dots = '...';
        } else if (elapsedInCycle > 400) {
            dots = '..';
        }

        thinkingCharacters.forEach(character => {
            const radius = character.radius || 14; // Use character's radius or a default
            const bubbleX = character.x - radius - 40;
            const bubbleY = character.y - radius - 30;
            canvas.drawSpeechBubble(bubbleX, bubbleY, dots, character.x, character.y, radius);
        });
    }

    async loadInitialAssets() {
        try {
            const [kruka2, kruka, chair_to_right, chair_to_left, patientBed, skrivbord, tree1, treesnroads, nurseImg, akutrumImg, interior1Img, interior2Img, interior3Img, armchair4, armchair5, armchair6, sink, handsprit, trashcan] = await Promise.all([
                // --- FIX: Use relative paths for images ---
                utils.loadImage(`/images/kruka2.png`),
                utils.loadImage(`/images/kruka.png`),
                utils.loadImage(`/images/chair_to_left.png`),
                utils.loadImage(`/images/chair_to_right.png`),
                utils.loadImage(`/images/patient_bed.png`),
                utils.loadImage(`/images/skrivbord.png`),
                utils.loadImage(`/images/tree1.png`),
                utils.loadImage(`/images/treesnroads.png`),
                utils.loadImage(`/images/nurse.png`), // Load the nurse image
                utils.loadImage(`/images/akutrum.png`), // Load the new Akutrum image
                utils.loadImage(`/images/interior1.png`), // Load the interior1 image
                utils.loadImage(`/images/interior2.png`), // Load the interior2 image for Room 1
                utils.loadImage(`/images/interior3.png`), // Load the new interior3 image for Room 6
                utils.loadImage(`/images/armchair4.png`),
                utils.loadImage(`/images/armchair5.png`),
                utils.loadImage(`/images/armchair6.png`),
                utils.loadImage(`/images/sink.png`),
                utils.loadImage(`/images/handsprit.png`),
                utils.loadImage(`/images/trashcan.png`)
            ]);
            this.images = { kruka2, kruka, chair_to_right, chair_to_left, patientBed, skrivbord, tree1, treesnroads, nurse: nurseImg, akutrum: akutrumImg, interior1: interior1Img, interior2: interior2Img, interior3: interior3Img, armchair4, armchair5, armchair6, sink, handsprit, trashcan };

            // Initialize the nurse character
            this.nurse = {
                homePosition: { x: 180, y: 120 }, // Positioned more to the right
                x: 180, y: 120, 
                rotation: Math.PI / 2, // Start facing right
                img: this.images.nurse,
                akutrumPosition: { x: 75, y: 550 }, // <-- ADJUST THIS POSITION
                state: 'idle', // 'idle', 'moving_to_patient', 'at_patient', 'returning', 'moving_to_akutrum'
                path: [], // The path the nurse will follow
                lastPatient: null // To remember who she was visiting
            };
        } catch (error) {
            // This catch block is important for debugging
            console.error("Failed to load one or more initial image assets:", error);
            document.getElementById("playBtn").textContent = "Asset Load Error";
            throw error; // Re-throw the error so the init method can see it
        }
    }

    async startNewGame() { // Renamed from startGame()
      try {
        // Use the 'api' module for fetch calls
        await api.resetGame();

        // All variables now use 'this.' to access the game's state
        if (this.spawnTimer) clearInterval(this.spawnTimer);
        this.spawnTimer = null;
        this.patients = [];
        // Reset nurse to home position
        if (this.nurse) {
            this.nurse.x = this.nurse.homePosition.x;
            this.nurse.y = this.nurse.homePosition.y;
            this.nurse.state = 'idle';
            this.nurse.path = [];
        }
        this.parents = []; // Also clear parents when starting a new game

        // Helper functions are called from their modules
        utils.animateZoom(this.camera, canvas.worldWidth / 2, canvas.worldHeight / 2, 1.0);
        this.ui.hideAllSideMenus();
        this.stopVitalsPolling(); // This will also become a method of the Game class
        
        // Calls to other game logic functions also use 'this.'
        this.spawnTimer = setInterval(() => this.characterManager.spawnPatient(), 20000); // Increased interval slightly

        // Spawn initial patients
        await this.characterManager.spawnPatient();
        await this.characterManager.spawnPatient();
        await this.characterManager.spawnPatient();
        
        this.gameActive = true; // Set game as active
      } catch (err) {
        console.error("Failed to start the game:", err);
      }
      document.getElementById('menu').classList.add('hidden');
    }

    generateWalls(rooms) {
        // This function is not used in GameMainController.js, it's in canvas.js
        // and also in the old script.js. It's fine to leave it here if it's a helper
        // but it's not directly called by this class.
        // If it's meant to be a helper for the layout, it should probably be in utils.js
        // or a dedicated layout manager.
        // For now, I'll assume it's not causing issues.
        // The actual walls array is defined directly in the constructor.
        // This comment is for my own understanding, no code change needed here.

        // Original logic for generateWalls (if it were used)
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

    // NEW: This method handles the "Play" button click
    async handlePlayButtonClick() {
        if (this.gameActive) {
            // Game is already active, just hide the menu and continue
            document.getElementById('menu').classList.add('hidden');
        } else {
            // No active game, start a new one
            await this.startNewGame();
        }
    }
    handleDispositionChoice(playerChoice, planData = null) {
        this.dispositionManager.handleDispositionChoice(playerChoice, planData);
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

    console.log(`[DEBUG] Entering room view for: ${room.name}`);

    // --- FIX: Check for Akutrum entry regardless of whether a patient is present ---
    if (room.name === 'Room 4') { // Assuming "Room 4" is the Akutrum
        console.log('[DEBUG] Akutrum detected. Checking settings to show intro modal.');
        console.log('[DEBUG] Current userSettings:', this.userSettings);
        // Show intro modal if it's the user's first time or they haven't opted out
        if (this.userSettings && this.userSettings.showAkutrumIntro !== false) {
            console.log('[DEBUG] -> Condition met. Showing modal.');
            document.getElementById('akutrumIntroModal').classList.remove('hidden'); // FIX: Remove hidden class
            document.getElementById('akutrumIntroModal').classList.add('visible'); // Add visible class
        }
        this.abcdeManager.showMenu();
        this.characterManager.moveNurseToAkutrum(); // Tell the nurse to move
    } else {
        document.getElementById("akutrumMenu").style.display = "none";
        document.getElementById("roomMenu").style.display = "block";
    }

    // 4. If there's a patient, show their info and start new polling
    if (patient) {
        this.currentPatientId = patient.id;
        this.ui.showVitalsPopup(patient, this.vitalKeys, this.standardFindings, this.allRadiologyTests, this.allMedications, this.allBedsideTests);
        this.statusPollTimer = setInterval(() => this.pollForVitals(patient.id), 3000);
    } else {
        // If the room is empty, hide the patient-specific UI
        this.currentPatientId = null;
        document.getElementById("roomMenu").style.display = "none";
        document.getElementById("akutrumMenu").style.display = "none";
        // You may need a ui.hideVitalsPopup() function here if you have one
    }
    }

    continueFromAkutrum() {
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (!currentPatient) return;

        // 1. Zoom out the camera
        utils.animateZoom(this.camera, canvas.worldWidth / 2, canvas.worldHeight / 2, 1.0);

        // 2. Hide all side menus and stop polling
        this.ui.hideAllSideMenus();
        this.stopVitalsPolling();

        // 3. Set the current patient as the 'selectedPatient'
        // This will make them glow and ready to be placed in a new room.
        this.selectedPatient = currentPatient;

        // 4. Show the top UI bar again
        document.getElementById('top-ui-bar').classList.remove('hidden');
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

            // --- NEW: Check for updated lab results ---
            // The server now sends the full lab list with each status update.
            // We compare it to the local version to see if a delayed test was revealed.
            if (statusData.orderedLabs && JSON.stringify(localPatient.orderedLabs) !== JSON.stringify(statusData.orderedLabs)) {
                localPatient.orderedLabs = statusData.orderedLabs;
                this.ui.updateAndOpenAccordion(localPatient, 'lab'); // Refresh the lab accordion
            }

            // --- NEW: Check for the final chat reply ---
            if (statusData.lastChatReply) {
                // Clear all thinking states
                this.patients.forEach(p => p.isThinking = false);
                this.parents.forEach(p => p.isThinking = false);

                // Add the final message to the chat
                this.ui.addChatMessage(statusData.lastChatReply.speaker, statusData.lastChatReply.reply);
                if (localPatient) {
                    localPatient.chatHistory = document.getElementById("chatMessages").innerHTML;
                }

                // --- NEW: Reveal RLS when the patient speaks in the Akutrum ---
                const isInAkutrum = localPatient.assignedRoom && localPatient.assignedRoom.name === 'Room 4';
                const patientRls = localPatient.currentVitals.RLS;
                // Check if the speaker was the patient (not a parent) and if RLS is 1 or 2.
                if (isInAkutrum && statusData.lastChatReply.speaker === localPatient.name && (patientRls === 1 || patientRls === 2)) {
                    if (!localPatient.measuredVitals) localPatient.measuredVitals = new Set();
                    
                    // Only reveal and refresh if it hasn't been measured yet.
                    if (!localPatient.measuredVitals.has('RLS')) {
                        localPatient.measuredVitals.add('RLS');
                        // Refresh the vitals popup to show the newly revealed vital.
                        this.ui.showVitalsPopup(localPatient, this.vitalKeys, this.standardFindings, this.allRadiologyTests, this.allMedications, this.allBedsideTests);
                    }
                }
                // The backend will clear lastChatReply after sending it.
            }
            
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
                // Pass the full gameData object
                this.ui.showVitalsPopup(localPatient, this.vitalKeys, this.standardFindings, this.allRadiologyTests, this.allMedications, this.allBedsideTests);

            }
        } catch (error) {
            console.error("Vitals polling error:", error);
        }
    }

    stopVitalsPolling() {
        if (this.statusPollTimer) {
            clearInterval(this.statusPollTimer);
            this.statusPollTimer = null;
        }
    }
    
    // MAIN MENU
    // All these methods are now in playerManager.js
    registerUser = (username, password) => this.playerManager.registerUser(username, password);
    loginUser = (username, password) => this.playerManager.loginUser(username, password);
    logoutUser = () => this.playerManager.logoutUser();
    showRegisterMenu = () => this.playerManager.showRegisterMenu();
    showLoginMenu = () => this.playerManager.showLoginMenu();
    returnToMenu = () => this.playerManager.returnToMenu();
    showMenuView = (view) => this.playerManager.showMenuView(view);
    updateUserUI = (user) => this.playerManager.updateUserUI(user);
    showCaseHistory = () => this.playerManager.showCaseHistory();
    showLeaderboard = () => this.playerManager.showLeaderboard();
    showPatchNotes = () => this.playerManager.showPatchNotes();
    showSettingsModal = () => this.playerManager.showSettingsModal();
    saveSettings = () => this.playerManager.saveSettings();

    // MOUSE
    handleMouseDown(coords, button) {
        // The 'button' parameter from the original event is now passed as the second argument.
        // Let's ensure we are correctly interpreting it. If 'button' is the event object, extract the button property.
        const mouseButton = (typeof button === 'object' && button !== null) ? button.button : button;

        const mx = coords.x;
        const my = coords.y;
        this.patients.forEach(p => p.showTriageGlow = false);
        if (this.selectedPatient) {
            const clickedRoom = this.findRoomAt(mx, my);
            const glowingRooms = this.rooms.filter(r => r.name.startsWith("Room") && !this.isRoomOccupied(r));
            if (clickedRoom && glowingRooms.includes(clickedRoom)) {
                // --- FIX: Replicate the bed-placement logic from handleMouseUp ---
                const bed = clickedRoom.furniture.find(f => f.image === 'patientBed');
                if (bed && clickedRoom.name !== 'Room 4') {
                    // Position the patient in the middle of the bed furniture
                    this.selectedPatient.x = clickedRoom.x + bed.x + (bed.w / 2);
                    this.selectedPatient.y = clickedRoom.y + bed.y + (bed.h / 2) + 35;
                } else { 
                    // Fallback for Akutrum or rooms without a defined bed
                    this.selectedPatient.x = clickedRoom.x + clickedRoom.w / 2;
                    this.selectedPatient.y = clickedRoom.y + clickedRoom.h / 2;
                }

                this.selectedPatient.assignedRoom = clickedRoom;
                this.currentPatientId = this.selectedPatient.id;
                this.enterRoomView(clickedRoom, this.selectedPatient);
            }
            // --- NEW: Deselect patient and hide vitals if clicking elsewhere in the waiting room ---
            else if (clickedRoom && clickedRoom.name === 'Väntrum') {
                this.selectedPatient.showTriageGlow = false; // Turn off glow
                this.selectedPatient = null;
                this.ui.hideAllSideMenus(); // This will hide the vitals popup
                return;
            }
            // --- End of new logic ---

            this.selectedPatient = null;
            return;
        }
        for (let i = this.patients.length - 1; i >= 0; i--) {
            const p = this.patients[i];
            const dx = mx - p.x, dy = my - p.y;
            if (Math.hypot(dx, dy) <= p.radius * 2) {
                if (this.findRoomAt(p.x, p.y)?.name === "Väntrum") p.showTriageGlow = true;
                if (mouseButton === 0) { // Check for left-click
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
        // --- FIX: Only hide menus if the click was on the canvas itself ---
        // This prevents clicks on UI buttons from incorrectly closing menus.
        const eventTarget = (typeof button === 'object' && button !== null) ? button.target : null;
        if (eventTarget && eventTarget.id === 'gameCanvas') {
            if (this.camera.zoom === 1) {
                // When zoomed out, a background click hides everything.
                this.ui.hideAllSideMenus();
            } else {
                // When zoomed in, a background click only hides the action submenus.
                this.ui.showSubmenu(null);
            }
        }
    }

    handleMouseMove(coords) {
    if (!this.draggingPatient) return;
    
    // Check if dragging has started
    if (!this.isDraggingFlag && Math.hypot(coords.x - this.dragStartX, coords.y - this.dragStartY) > 5) {
        this.isDraggingFlag = true;
        if (this.draggingPatient.assignedRoom) this.draggingPatient.assignedRoom = null;

        // --- NEW: Make the parent follow the patient when dragging starts ---
        // Find the parent associated with the patient being dragged.
        const parent = this.parents.find(p => p.childId === this.draggingPatient.id);
        if (parent) {
            // Reset the parent's state. This will make them stop sitting in the
            // armchair and trigger the "following" logic in the update loop.
            parent.state = 'following'; // Set a clear state
            parent.path = []; // Clear any old path
        }
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

    handleMouseUp(e) {

    if (this.draggingPatient) {
        if (this.isDraggingFlag) {
            // Logic for dropping a dragged patient
            const dropRoom = this.findRoomAt(this.draggingPatient.x, this.draggingPatient.y);
            if (dropRoom && dropRoom.name.startsWith("Room") && !this.isRoomOccupied(dropRoom)) {
                // --- NEW: Place patient on the bed, not in the center of the room ---
                const bed = dropRoom.furniture.find(f => f.image === 'patientBed');
                if (bed && dropRoom.name !== 'Room 4') { // Don't apply to Akutrum, keep it centered
                    // Position the patient in the middle of the bed furniture
                    this.draggingPatient.x = dropRoom.x + bed.x + (bed.w / 2);
                    this.draggingPatient.y = dropRoom.y + bed.y + (bed.h / 2) + 35; // Added a 15px offset to move it lower
                } else { // Fallback for Akutrum or rooms without a defined bed
                    this.draggingPatient.x = dropRoom.x + dropRoom.w / 2;
                    this.draggingPatient.y = dropRoom.y + dropRoom.h / 2;
                }
                this.currentPatientId = this.draggingPatient.id;
                this.draggingPatient.assignedRoom = dropRoom;

                // --- NEW: Check for a parent and move them to the armchair ---
                const parent = this.parents.find(p => p.childId === this.draggingPatient.id);
                if (parent) {
                    this.characterManager.moveParentToArmchair(parent, dropRoom);
                }
                // ---

                // --- NEW: Notify the backend about the room change ---
                console.log(`[FRONTEND-DEBUG] Notifying backend: Patient ${this.draggingPatient.id} moved to room "${dropRoom.name}"`);
                api.assignPatientToRoom(this.draggingPatient.id, dropRoom.name)
                    .catch(err => console.error('[FRONTEND-ERROR] Failed to assign patient to room:', err));

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
                this.ui.showVitalsPopup(this.selectedPatient, this.vitalKeys, this.standardFindings, this.allRadiologyTests, this.allMedications, this.allBedsideTests, isCurrentlyZoomedOut);
            }
        }
    }
    // Reset all drag-related state
    this.draggingPatient = null;
    this.isDraggingFlag = false;
    }

    handleDblClick(coords, e) {
        // --- FIX: Only allow double-click zoom if clicking on the canvas ---
        const eventTarget = e.target || window.event.target;
        if (eventTarget.id !== 'gameCanvas') {
            return; // Do nothing if the double-click was on a UI element
        }

        const zoomOut = () => {
            const topBar = document.getElementById('top-ui-bar');
            utils.animateZoom(this.camera, canvas.worldWidth / 2, canvas.worldHeight / 2, 1.0);
            topBar.classList.remove('hidden');
            this.ui.hideAllSideMenus();
            this.stopVitalsPolling();
        };

        if (this.camera.zoom > 1.0) { // If zoomed in, zoom out
            zoomOut();
        } else {
            const clickedRoom = this.findRoomAt(coords.x, coords.y);
            if (clickedRoom) {
                // --- NEW: Prevent zooming into non-patient rooms ---
                const nonZoomableRooms = ['Väntrum', 'Korridor', 'Läkarexpedition'];
                if (nonZoomableRooms.includes(clickedRoom.name)) {
                    return; // Do not zoom
                }

                const patientInRoom = this.patients.find(p => p.assignedRoom === clickedRoom);
                this.enterRoomView(clickedRoom, patientInRoom);
            }
        }
    }

    // KEYS
    handleKeyDown(key) {
        if (key === "Escape") {
            const visibleModal = document.querySelector('.modal-backdrop.visible');
            if (visibleModal) {
                visibleModal.classList.remove('visible');
            } else {
            // --- NEW: Tell the nurse to return home when zooming out ---
            if (this.camera.zoom > 1.0) {
                this.characterManager.returnNurseToHome();
            }

                utils.animateZoom(this.camera, canvas.worldWidth / 2, canvas.worldHeight / 2, 1.0);
                this.ui.hideAllSideMenus();
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
        const admissionPlanModal = document.getElementById('admissionPlanModal');

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
        this.ui.hideAllSideMenus();
        this.stopVitalsPolling(); // Call the method using 'this'
    }

    // PATIENT ACTIONS 
        // ANAMNES
    showAnamnesis = () => this.actionManager.showAnamnesis();
    sendChatMessage = () => this.actionManager.sendChatMessage();

    getSomaetasSummary() {
        // Set the input value to "SOMAÄTAS"
        const chatInput = document.getElementById('chatInput');
        chatInput.value = 'SOMAÄTAS';
        // Trigger the existing send message function
        this.sendChatMessage();
    }

    // --- NEW: Consultation Logic ---
    showConsultMenu() {
        this.ui.renderConsultationButtons(this.allConsultations, 'consultList');
        this.ui.showSubmenu('consultMenu');
    }

    async handleConsultation(specialityId, button) {
        console.log(`[DEBUG] handleConsultation called with specialityId: ${specialityId}`);
        const currentPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (!currentPatient) {
            console.error('[DEBUG] handleConsultation failed: No currentPatient found.');
            return;
        }
        console.log(`[DEBUG] Found current patient: ${currentPatient.name}`);

        button.disabled = true;
        button.textContent = 'Consulting...';
        console.log('[DEBUG] Button disabled. Calling api.consultSpecialist...');

        try {
            const result = await api.consultSpecialist(currentPatient.id, specialityId, currentPatient.actionsTaken);
            console.log('[DEBUG] API call successful. Response:', result);
            // --- NEW: Show the consultation response in a speech bubble ---
            this.ui.showConsultationBubble(result.specialityName, result.response);

            // Add to actions taken so it can be evaluated in the final report
            if (!currentPatient.actionsTaken.includes(specialityId)) {
                currentPatient.actionsTaken.push(specialityId);
            }
        } catch (err) {
            // This console.error was already here, but it's very important.
            console.error('Failed to consult specialist:', err); 
            this.ui.addChatMessage('System', 'Error: Could not contact specialist.');
        } finally {
            button.disabled = false; // Always re-enable the button
            button.textContent = this.allConsultations.find(c => c.id === specialityId)?.name || 'Consult';
        }
    }

        // STATUS
    showPhysicalExamMenu = () => this.actionManager.showPhysicalExamMenu();

        // BEDSIDE
    showBedsideMenu = () => this.actionManager.showBedsideMenu();
    showEkgInterpretation = () => this.actionManager.showEkgInterpretation();

        // LABUNDERSÖKNING
    showLabMenu = () => this.actionManager.showLabMenu();
    filterLabTests = (searchTerm) => this.actionManager.filterLabTests(searchTerm);
    orderLabTest = (testId, button) => this.actionManager.orderLabTest(testId, button);
    orderLabKit = (kitId, button) => this.actionManager.orderLabKit(kitId, button);
    confirmOxygen = () => this.actionManager.confirmOxygen();

        // RADIOLOGIUNDERSÖKNING
    showRadiologyMenu = () => this.actionManager.showRadiologyMenu();

        // MEDICINERING
    showMedsMenu = () => this.actionManager.showMedsMenu();
    handleAction = (actionType, id, button) => this.actionManager.handleAction(actionType, id, button);
    confirmDose = (dose) => this.actionManager.confirmDose(dose);
    cancelDosing = () => this.actionManager.cancelDosing();
    administerMedication = (medId, dose) => this.actionManager.administerMedication(medId, dose);
    toggleHomeMedicationPause = (medId) => this.actionManager.toggleHomeMedicationPause(medId);
    updateHomeMedicationValue = (medId, field, value) => this.actionManager.updateHomeMedicationValue(medId, field, value);
    initiateHomeMedicationRemoval = (medId) => this.actionManager.initiateHomeMedicationRemoval(medId);
    undoHomeMedicationRemoval = (medId) => this.actionManager.undoHomeMedicationRemoval(medId);
    showHomeMedicationModal = () => this.actionManager.showHomeMedicationModal();
    handleMedicationSelection = (medId) => this.actionManager.handleMedicationSelection(medId);
    filterMedications = (searchTerm) => this.actionManager.filterMedications(searchTerm);

        // DISCHARGE
    showDiagnosisModal = () => this.dispositionManager.showDiagnosisModal();
    filterDiagnoses = (searchTerm) => this.dispositionManager.filterDiagnoses(searchTerm);
    selectDiagnosis = (diagnosis) => this.dispositionManager.selectDiagnosis(diagnosis);
    confirmAdmissionPlan = () => this.dispositionManager.confirmAdmissionPlan();
    chooseDisposition = (choice) => this.dispositionManager.chooseDisposition(choice);
    getPrescribableMedications = () => this.dispositionManager.getPrescribableMedications();
    showPrescriptionModal = () => this.dispositionManager.showPrescriptionModal();
    filterPrescriptions = (searchTerm) => this.dispositionManager.filterPrescriptions(searchTerm);
    updateSelectedPrescriptionsUI = () => this.dispositionManager.updateSelectedPrescriptionsUI();
    confirmPrescriptions = () => this.dispositionManager.confirmPrescriptions();
    showAddPlanMedModal = () => this.dispositionManager.showAddPlanMedModal();
    filterPlanMeds = (searchTerm) => this.dispositionManager.filterPlanMeds(searchTerm);
    editPlanMedDose = (orderItemElement) => this.dispositionManager.editPlanMedDose(orderItemElement);

    searchAllActions(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        
        if (lowerCaseSearchTerm.length === 0) {
            this.ui.hideSubmenu('generalSearchMenu');
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

        this.ui.renderGeneralSearchResults(filteredActions, 'generalSearchResultList');
        this.ui.showSubmenu('generalSearchMenu');
    }
    
    // FEEDBACK

    closeFeedbackReport() {
        console.log('[DEBUG] closeFeedbackReport called.');
        document.getElementById('feedbackModal').classList.remove('visible');

        // --- NEW: Game Review Logic ---
        console.log(`[DEBUG] Cases played this session (before increment): ${this.casesPlayedThisSession}`);
        this.casesPlayedThisSession++;
        console.log(`[DEBUG] Cases played this session (after increment): ${this.casesPlayedThisSession}`);

        // --- FIX: This logic should run for EVERY patient, not just the second one. ---
        // --- DEBUG for Live Server Avatars: Trace the creation of the absolute URL ---
        const finishedPatient = this.patients.find(p => p.id === this.currentPatientId);
        if (finishedPatient && finishedPatient.patient_avatar) {
            console.log('[AVATAR TRACE] A. Case finished for patient with avatar:', finishedPatient.patient_avatar);
            console.log('[AVATAR TRACE] B. API_URL is:', API_URL);

            // This ensures that when the case history is rendered later,
            // it uses the full URL to the backend server, which works on live but is harmless on local.
            finishedPatient.patient_avatar_url = `${API_URL}/images/${finishedPatient.patient_avatar}`;

            console.log('[AVATAR TRACE] C. Generated absolute avatar URL:', finishedPatient.patient_avatar_url);
            console.log('[AVATAR TRACE] D. Patient object before being removed from game:', finishedPatient);

            // The UI rendering the case history should now use `patient_avatar_url`.
        }

        this.parents = this.parents.filter(parent => parent.childId !== this.currentPatientId);
        this.patients = this.patients.filter(p => p.id !== this.currentPatientId);
        this.currentPatientId = null;

        // If no patients left, the game is no longer active
        if (this.patients.length === 0) {
            this.gameActive = false;
        }
        
        utils.animateZoom(this.camera, canvas.worldWidth / 2, canvas.worldHeight / 2, 1.0);
        this.ui.hideAllSideMenus();

        // ✅ FIX: Show the top UI bar again when returning to the main view.
        document.getElementById('top-ui-bar').classList.remove('hidden');

        // --- REVISED: Check for review modal AFTER zooming out ---
        if (this.casesPlayedThisSession >= 2) {
            console.log('[DEBUG] Condition met (>= 2 cases). Will show review modal after zoom.');
            this.casesPlayedThisSession = 0; // Reset the counter
            
            // Wait for the zoom animation (400ms) to finish before showing the modal.
            setTimeout(() => {
                this.showGameRatingModal();
            }, 500); // 500ms delay

            return; // Stop here to show the rating modal after the delay
        }
    }

    showGameRatingModal() {
        console.log('[DEBUG] showGameRatingModal called. Attempting to show #gameReviewModal.');
        // --- FIX: Remove the 'hidden' class and add the 'visible' class ---
        const reviewModal = document.getElementById('gameReviewModal');
        reviewModal.classList.remove('hidden');
        reviewModal.classList.add('visible');
        console.log('[DEBUG] #gameReviewModal should now be visible.');
    }

    async submitGameReview() {
        // --- NEW: Gather all data from the new modal and submit ---
        const reviewData = {
            semester: document.getElementById('semesterSelect').value,
            educationalValue: document.querySelector('input[name="educationalValue"]:checked')?.value,
            recommendLikelihood: document.querySelector('input[name="recommendLikelihood"]:checked')?.value,
            purchaseLikelihood: document.querySelector('input[name="purchaseLikelihood"]:checked')?.value,
            improvementSuggestions: document.getElementById('improvementSuggestions').value
        };

        try {
            await api.submitGameReview(reviewData);
            this.finishRatingProcess(); // Close modal on success
        } catch (error) {
            console.error("Failed to submit game review:", error);
            alert('Could not submit feedback. Please try again.');
        }
    }

    finishRatingProcess() {
        document.getElementById('gameReviewModal').classList.remove('visible');
        
        // --- NEW: The case cleanup is now separate from the rating process. ---
        // We just need to hide the modals and continue. The case cleanup
        // already happened in closeFeedbackReport.
        utils.animateZoom(this.camera, canvas.worldWidth / 2, canvas.worldHeight / 2, 1.0);
        this.ui.hideAllSideMenus();
        this.closeFeedbackReport();
    }

    // HELPER FUNCTIONS
    getActionNameById(id) {
        // ✅ FIX: Handle cases where the 'id' is an array (for OR conditions).
        if (Array.isArray(id)) {
            return id.map(subId => this.getActionNameById(subId)).join(' or ');
        }

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
        // --- FIX: Handle cases where the 'id' is an array (for OR conditions). ---
        // If it's an array, we determine the category based on its first element,
        // as all choices in the group should belong to the same category.
        if (Array.isArray(id)) {
            return id.length > 0 ? this.getActionCategory(id[0]) : 'unknown';
        }
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
}
