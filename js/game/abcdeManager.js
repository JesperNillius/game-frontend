import * as api from '../api.js';

export default class AbcdeManager {
    constructor(game) {
        this.game = game;
        this.ui = game.ui;
    }

    init() {
        const akutrumMenu = document.getElementById('akutrumMenu');

        akutrumMenu.addEventListener('click', (e) => {
            const header = e.target.closest('.abcde-header');
            if (header) {
                this.toggleSection(header.dataset.letter);
            }

            const actionButton = e.target.closest('.abcde-search-results button');
            if (actionButton) {
                this.handleActionClick(actionButton);
            }
        });

        akutrumMenu.addEventListener('input', (e) => {
            if (e.target.matches('.abcde-search-input')) {
                this.handleSearch(e.target.dataset.letter, e.target.value);
            }
        });
    }

    toggleSection(letter) {
        const content = document.querySelector(`.abcde-content[data-content-for="${letter}"]`);
        const allContents = document.querySelectorAll('.abcde-content');

        // Close all other sections
        allContents.forEach(c => {
            if (c !== content) c.style.display = 'none';
        });

        // Toggle the clicked section
        if (content.style.display === 'block') {
            content.style.display = 'none';
        } else {
            content.style.display = 'block';
            // Auto-focus the search input when a section is opened
            content.querySelector('.abcde-search-input').focus();
        }
    }

    handleSearch(letter, searchTerm) {
        const allActionsForLetter = this.game.abcdeActions[letter] || [];
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        let filteredActions = [];
        if (searchTerm.length > 0) {
            filteredActions = allActionsForLetter.filter(action => {
                // Show if the search term is long enough OR if it's an exact match for the ID
                const isLongEnoughMatch = searchTerm.length >= 3 && (action.name.toLowerCase().includes(lowerCaseSearchTerm) || (action.synonyms && action.synonyms.some(synonym => synonym.includes(lowerCaseSearchTerm))));
                const isExactIdMatch = action.id.toLowerCase() === lowerCaseSearchTerm;
                return isLongEnoughMatch || isExactIdMatch;
            });
        }
        
        this.renderSearchResults(letter, filteredActions);
    }

    showMenu() {
        // Hide the regular room menu and show the Akutrum menu
        document.getElementById('roomMenu').style.display = 'none';
        document.getElementById('akutrumMenu').style.display = 'block'; // Use 'block' to match the old style
    }

    renderSearchResults(letter, actions) {
        const resultsContainer = document.querySelector(`.abcde-content[data-content-for="${letter}"] .abcde-search-results`);
        resultsContainer.innerHTML = '';

        actions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action.name;
            button.dataset.actionId = action.id;
            button.dataset.actionClass = action.class; // Store the 'class' property
            resultsContainer.appendChild(button);
        });
    }

    handleActionClick(button) {
        const actionId = button.dataset.actionId; // e.g., 'blodtryck'
        const actionClass = button.dataset.actionClass; // e.g., 'Vital Sign'
        const letter = button.closest('.abcde-content').dataset.contentFor;
        const action = this.game.abcdeActions[letter]?.find(a => a.id === actionId);

        if (!action) return;

        // The existing action handlers in actionManager are perfect for this.
        // We just need to figure out which one to call based on the category.
        if (actionClass === 'Physical Exam') this.game.actionManager.handleAction('physicalExam', action.id, button);
        else if (actionClass === 'Bedside Test') this.game.actionManager.handleAction('bedsideTest', action.id, button);
        else if (actionClass === 'Radiology') this.game.actionManager.handleAction('radiology', action.id, button);
        else if (actionClass === 'Medication') this.game.actionManager.handleMedicationSelection(action.id);
        else if (actionClass === 'Lab Test') this.orderLabFromAkutrum(action, button); // Use our new, specific handler
        else if (actionClass === 'Vital Sign') {
            this.measureVitalSign(action, button);
        }
        else if (actionClass === 'Åtgärd') this.handleIntervention(action, button);

        // --- NEW: Trigger the nurse's turning animation for specific actions ---
        const actionClassesToTriggerTurn = ['Medication', 'Lab Test', 'Bedside Test', 'Åtgärd'];
        if (actionClassesToTriggerTurn.includes(actionClass)) {
            this.game.characterManager.triggerNurseAkutrumAction();
        }
    }

    async handleIntervention(action, button) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient) return;

        // Use the generic 'perform-bedside' endpoint as it returns a simple text finding
        const result = await api.performBedsideTest(currentPatient.id, action.id);

        // Add the result to a new 'interventions' object on the patient
        if (!currentPatient.interventions) currentPatient.interventions = {};
        currentPatient.interventions[action.name] = result.result;

        // Make the accordion visible and update its content
        const accordion = document.getElementById('interventionsAccordion');
        accordion.style.display = 'block';
        this.game.ui.updateAndOpenAccordion(currentPatient, 'interventions');

        // --- NEW: Add intervention to actionsTaken for consultation logic ---
        if (!currentPatient.actionsTaken.includes(action.id)) {
            currentPatient.actionsTaken.push(action.id);
        }
        button.disabled = true;
    }

    async orderLabFromAkutrum(action, button) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient) return;

        button.disabled = true;
        button.textContent = 'Ordering...';

        try {
            document.getElementById('vitalsPopup').style.display = 'flex';
            
            // --- FIX: Use the existing api.orderLab function instead of a manual fetch call ---
            const updatedLabsFromServer = await api.orderLab(currentPatient.id, action.id);
            currentPatient.orderedLabs = updatedLabsFromServer;

            // --- FIX: Add the action ID to actionsTaken for consultation logic ---
            if (!currentPatient.actionsTaken.includes(action.id)) {
                currentPatient.actionsTaken.push(action.id);
                console.log(`%c[ACTION-TRACKING] Added '${action.id}' to actionsTaken.`, 'color: #87CEEB; font-weight: bold;');
            }
            this.game.ui.updateAndOpenAccordion(currentPatient, 'lab');
        } catch (err) {
            console.error('Failed to order lab test from Akutrum:', err);
        } finally {
            // --- FIX: Reset the button text after the action is complete ---
            // This block runs whether the order succeeds or fails.
            button.disabled = false; // Re-enable the button
            button.textContent = action.name; // Set text back to the action name
        }
    }

    async measureVitalSign(action, button) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient) return;

        const actionId = action.id;
        const patientRls = currentPatient.currentVitals.RLS;
        let shouldRevealRls = false;

        // --- NEW: Conditional RLS reveal logic ---
        if (actionId === 'Prata med patienten' && patientRls <= 2) {
            shouldRevealRls = true;
        } else if (actionId === 'ruska om patienten' && patientRls >= 2 && patientRls <= 3) {
            shouldRevealRls = true;
        } else if (actionId === 'smärtstimulera' && patientRls >= 3) {
            shouldRevealRls = true;
        } else if (['Prata med patienten', 'ruska om patienten', 'smärtstimulera'].includes(actionId)) {
            // The action was for RLS, but the condition was not met.
            // We can add a chat message to give feedback to the player.
            this.ui.addChatMessage('System', `Patienten reagerar inte på ${action.name.toLowerCase()}.`);
        } else {
            // --- Existing logic for other vital signs ---
            const vitalMap = {
                'blodtryck': 'BT',
                'puls': 'Puls',
                'saturation': 'Saturation',
                'andningsfrekvens': 'AF',
                'temperatur': 'Temp'
            };
            const vitalKey = vitalMap[actionId.toLowerCase()]; // Use lowercase for lookup
            if (vitalKey) {
                if (!currentPatient.measuredVitals) currentPatient.measuredVitals = new Set();
                currentPatient.measuredVitals.add(vitalKey);
            }
        }

        if (shouldRevealRls) {
            if (!currentPatient.measuredVitals) currentPatient.measuredVitals = new Set();
            currentPatient.measuredVitals.add('RLS');
        }

        // Refresh the vitals popup to show the newly revealed vital
        this.game.ui.showVitalsPopup(currentPatient, this.game.vitalKeys, this.game.standardFindings, this.game.allRadiologyTests, this.game.allMedications, this.game.allBedsideTests);

        // Disable the button after it's been used
        button.disabled = true;
    }
}