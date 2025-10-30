import * as utils from './utils.js';
import { canvas } from './canvas.js';
import * as gameUi from './common/ui.js';

export default class GameInputHandler {
    constructor(game) {
        this.game = game; // Reference to the main game "manager"
        this.ui = gameUi;     // Reference to the specific UI module (gameUi or adminUi)
    }

    init() {
        // This init method is now called from GameMainController.init(), ensuring all elements exist.
        canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
        canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
        canvas.addEventListener("mouseup", (e) => this.handleMouseUp(e));
        canvas.addEventListener("dblclick", (e) => this.handleDblClick(e));

        // KEYS
        document.addEventListener("keydown", (e) => this.handleKeyDown(e));
        const chatInput = document.getElementById('chatInput');
        chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            // Trigger a click on the Send button
            document.getElementById('sendBtn').click();
        }
        });
        const doseInput = document.getElementById('doseInput');
        doseInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            // Trigger a click on the Confirm Dose button
            document.getElementById('btnConfirmDose').click();
        }
        });

        // MainMenu
        document.getElementById("playBtn").addEventListener("click", () => this.game.startGame());
        document.getElementById('btnReturnToMenu').addEventListener('click', () => this.game.returnToMenu());
        document.getElementById('caseHistoryBtn').addEventListener('click', () => this.game.showCaseHistory());
        document.getElementById('leaderboardBtn').addEventListener('click', () => this.game.showLeaderboard());
        document.getElementById('settingsBtn').addEventListener('click', () => this.game.showSettingsModal());
        document.getElementById('patchNotesBtn').addEventListener('click', () => this.game.showPatchNotes());
        document.getElementById('backToMenuBtn').addEventListener('click', () => this.game.showMenuView('main'));
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('backToMenuFromLoginBtn').addEventListener('click', () => this.game.showMenuView('main'));
        document.getElementById('topRightLogoutBtn').addEventListener('click', () => this.game.logoutUser());
        document.getElementById('showRegisterBtn').addEventListener('click', (e) => { e.preventDefault();this.game.showRegisterMenu();});
        document.getElementById('backToLoginBtn').addEventListener('click', (e) => { e.preventDefault();this.game.showLoginMenu();});
        document.getElementById('topRightLoginBtn').addEventListener('click', () => { this.game.showMenuView('login');
        });

        // Anamnesis
        document.getElementById('generalSearchInput').addEventListener('input', (e) => this.game.searchAllActions(e.target.value));
        document.getElementById("btnHomeMeds").addEventListener("click", () => this.game.showHomeMedicationModal());
        document.getElementById("btnAnamnesisAkutrum").addEventListener("click", () => this.game.showAnamnesis());
        document.getElementById("btnAnamnesis").addEventListener("click", () => this.game.showAnamnesis());
        document.getElementById('sendBtn').addEventListener('click', () => this.game.sendChatMessage());
        document.getElementById('btnSomaetas').addEventListener('click', () => this.game.getSomaetasSummary());

        //Physical exam
        document.getElementById('btnPhysical').addEventListener('click', () => this.game.showPhysicalExamMenu());
        document.getElementById("physicalExamList").addEventListener("click", (e) => this.handlePhysicalExamSelection(e));

        //Bedside
        document.getElementById('btnBedside').addEventListener('click', () => this.game.showBedsideMenu());
        document.getElementById("bedsideTestList").addEventListener("click", (e) => this.handleBedsideTestSelection(e));
        document.getElementById('showEkgInterpretationBtn').addEventListener('click', () => this.game.showEkgInterpretation());
        document.getElementById('closeEkgModal').addEventListener('click', () => this.ui.hideEkgModal());

        //Lab
        document.getElementById("btnLab").addEventListener("click", () => this.game.showLabMenu());
        const labSearchInput = document.getElementById('labSearchInput');
        labSearchInput.addEventListener('input', (e) => this.game.filterLabTests(e.target.value));
        document.getElementById("labTestList").addEventListener("click", (e) => this.handleLabSelection(e));

        //Radiology
        document.getElementById('btnRadiology').addEventListener('click', () => this.game.showRadiologyMenu());
        document.getElementById("radiologyMenu").addEventListener("click", (e) => this.handleRadiologySelection(e));

        // Medication
        document.getElementById('btnMeds').addEventListener('click', () => this.game.showMedsMenu());
        document.getElementById('btnMedsAkutrum').addEventListener('click', () => this.game.showMedsMenu());
        document.getElementById("medsList").addEventListener("click", (e) => this.handleMedListClick(e));
        const medsSearchInput = document.getElementById('medsSearchInput');

        // --- NEW: Consultation Listeners ---
        document.getElementById('btnConsult').addEventListener('click', () => this.game.showConsultMenu());
        document.getElementById('btnConsultAkutrum').addEventListener('click', () => this.game.showConsultMenu());
        console.log('[DEBUG] Attaching consult menu listener to #consultMenu');
        document.getElementById('consultMenu').addEventListener('click', (e) => {
            console.log('[DEBUG] Click detected inside #consultMenu');
            const button = e.target.closest('button');
            console.log('[DEBUG] Found button:', button);
            if (button && button.dataset.specialityId) {
                console.log(`[DEBUG] Button has specialityId: ${button.dataset.specialityId}. Calling handleConsultation.`);
                this.game.handleConsultation(button.dataset.specialityId, button);
            } else {
                console.log('[DEBUG] Clicked element was not a valid consultation button.');
            }
        });

        // --- NEW: Consultation Bubble Close Button ---
        document.getElementById('closeConsultationBubble').addEventListener('click', () => {
            document.getElementById('consultationBubble').classList.remove('visible');
        });

        medsSearchInput.addEventListener('input', (e) => this.game.filterMedications(e.target.value));
            // Dosing
        document.getElementById('dosingModal').addEventListener('click', (e) => {
            if (e.target.id === 'dosingModal') { this.game.cancelDosing(); }
        });
        document.getElementById('doseChoices').addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const dose = parseFloat(button.dataset.dose);
            // Directly tell the manager to administer the med with this specific dose
            this.game.confirmDose(dose);
        });
        document.getElementById('btnConfirmDose').addEventListener('click', () => {
            const dose = parseFloat(document.getElementById('doseInput').value);
            this.game.confirmDose(dose);
        });        
        document.getElementById('btnCancelDose').addEventListener('click', () => this.game.cancelDosing());
            //Oxygen
        document.getElementById('oxygenSlider').addEventListener('input', (e) => this.ui.updateOxygenFlowRateLabel(e.target.value));
        document.getElementById('btnConfirmOxygen').addEventListener('click', () => this.game.confirmOxygen());
        document.getElementById('btnCancelOxygen').addEventListener('click', () => this.ui.hideOxygenModal());

        // General Search Results
        document.getElementById('generalSearchMenu').addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const category = button.dataset.actionCategory;
            if (!category) return;

            // Map the category to the main action button's ID
            const categoryToButtonId = {
                exam: 'btnPhysical', lab: 'btnLab', bedside: 'btnBedside',
                radiology: 'btnRadiology', med: 'btnMeds', consult: 'btnConsult' // NEW
            };

            document.getElementById(categoryToButtonId[category])?.click();
        });

        //Discharge patient
        document.getElementById('btnDischarge').addEventListener('click', () => this.game.showDiagnosisModal());
        document.getElementById('btnDischargeAkutrum').addEventListener('click', () => this.game.showDiagnosisModal());
        document.getElementById('btnContinueFromAkutrum').addEventListener('click', () => this.game.continueFromAkutrum());
        document.getElementById('diagnosisSearchInput').addEventListener('input', (e) => this.game.filterDiagnoses(e.target.value));
        document.getElementById('btnSkipDiagnosis').addEventListener('click', () => this.game.selectDiagnosis('No diagnosis given'));
        document.getElementById('btnCancelDiagnosis').addEventListener('click', () => this.ui.hideDiagnosisModal());
        document.getElementById('diagnosisSelectionList').addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.diagnosis) {
                this.game.selectDiagnosis(button.dataset.diagnosis);
            }
        });

        // Prescription Modal
        document.getElementById('prescriptionSearchInput').addEventListener('input', (e) => this.game.filterPrescriptions(e.target.value));
        document.getElementById('btnConfirmPrescription').addEventListener('click', () => this.game.confirmPrescriptions());
        document.getElementById('btnCancelPrescription').addEventListener('click', () => this.ui.hidePrescriptionModal());
        document.getElementById('prescriptionSelectionList').addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const medId = e.target.dataset.id;
                if (e.target.checked) {
                    this.game.selectedPrescriptions.add(medId);
                } else {
                    this.game.selectedPrescriptions.delete(medId);
                }
                this.game.updateSelectedPrescriptionsUI();
            }
        });

        // Admission plan
        document.getElementById('btnAddPlanMed').addEventListener('click', () => this.game.showAddPlanMedModal());
        document.getElementById('btnCancelAddPlanMed').addEventListener('click', () => {
            document.getElementById('addPlanMedModal').classList.remove('visible');
            this.game.medicationContext = null;
        });
        document.getElementById('planMedSearchInput').addEventListener('input', (e) => this.game.filterPlanMeds(e.target.value));
        document.getElementById("planMedSelectionList").addEventListener("click", (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const medId = button.dataset.medId;
            if (medId) {
                this.game.handleMedicationSelection(medId);
            }
        });
        document.getElementById('btnConfirmAdmissionPlan').addEventListener('click', () => this.game.confirmAdmissionPlan());
        document.getElementById('btnCancelAdmissionPlan').addEventListener('click', () => this.ui.hideAdmissionPlanModal());
        document.getElementById('btnFooterCancelAdmissionPlan').addEventListener('click', () => {
            document.getElementById('admissionPlanModal').classList.remove('visible');
        });
        // ✅ CONSOLIDATED event listener for the admission plan's medication list.
        document.getElementById('planMedicationOrdersList').addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.btn-remove-order');
            const pauseBtn = e.target.closest('.btn-toggle-pause');
            const frequencySelect = e.target.closest('.frequency-select');
            const orderItem = e.target.closest('.order-item');

            if (removeBtn) {
                removeBtn.closest('.order-item').remove();
            } else if (pauseBtn) {
                const orderItem = pauseBtn.closest('.order-item');
                orderItem.classList.toggle('paused');
                // Update the button text
                pauseBtn.textContent = orderItem.classList.contains('paused') ? 'Resume' : 'Pause';
            } else if (frequencySelect) {
                // Do nothing, let the dropdown work.
                return;
            } else if (orderItem) {
                // If nothing more specific was clicked, it's a click to edit the dose.
                this.game.editPlanMedDose(orderItem);
            }
        });

        // --- NEW: Akutrum Intro Modal Listeners ---
        document.getElementById('confirmAkutrumIntro').addEventListener('click', () => {
            const checkbox = document.getElementById('dontShowAkutrumIntroAgain');
            if (checkbox.checked) {
                // Save the setting if the user checked the box
                this.game.playerManager.saveSettings({ showAkutrumIntro: false });
            }
            document.getElementById('akutrumIntroModal').classList.remove('visible'); // FIX: Remove visible class
            document.getElementById('akutrumIntroModal').classList.add('hidden'); // Add hidden class back
        });


        document.getElementById('planVitalsFreq').addEventListener('click', (e) => {
            // Make sure we clicked a button
            const clickedButton = e.target.closest('.btn-toggle');
            if (!clickedButton) return;

            // Find all buttons in the group and remove the 'active' class
            const buttons = document.querySelectorAll('#planVitalsFreq .btn-toggle');
            buttons.forEach(button => button.classList.remove('active'));

            // Add the 'active' class to the one that was just clicked
            clickedButton.classList.add('active');
        });
        document.querySelector('.button-toggle-group').addEventListener('click', (e) => {
            const clickedButton = e.target.closest('.btn-toggle');
            if (!clickedButton) return;

            // Just toggle the 'active' class on the clicked button
            clickedButton.classList.toggle('active');
        });

        // Case History Modal
        document.getElementById('closeHistoryBtn').addEventListener('click', () => {
            document.getElementById('caseHistoryModal').classList.remove('visible');
        });
        document.getElementById('backToMenuFromHistoryBtn').addEventListener('click', () => {
            document.getElementById('caseHistoryModal').classList.remove('visible');
            this.game.showMenuView('main');
        });
        document.getElementById('caseHistoryModal').addEventListener('click', (e) => {
            const mainRow = e.target.closest('.history-main-row');
            if (!mainRow) return;

            const rowId = mainRow.dataset.rowId;
            const detailsRow = document.querySelector(`.history-details-row[data-details-for='${rowId}']`);
            if (detailsRow) {
                detailsRow.classList.toggle('hidden');
            }
        });

        // Leaderboard Modal
        document.getElementById('closeLeaderboardBtn').addEventListener('click', () => {
            document.getElementById('leaderboardModal').classList.remove('visible');
        });
        document.getElementById('backToMenuFromLeaderboardBtn').addEventListener('click', () => {
            document.getElementById('leaderboardModal').classList.remove('visible');
            this.game.showMenuView('main');
        });

        // --- REVISED: Akutrum Arrival Flow ---
        // 1. Click the subtle notification to open the report
        document.getElementById('subtleNotification').addEventListener('click', () => {
            const patientData = this.game.pendingAkutrumPatient;
            if (patientData) {
                this.ui.hideSubtleNotification();
                document.getElementById('ambulanceReportContent').textContent = patientData.AmbulanceReport || "No report available.";
                document.getElementById('ambulanceReportModal').classList.add('visible');
            }
        });

        // 2. Acknowledge the report, which starts the arrival timer
        document.getElementById('btnAcknowledgeArrival').addEventListener('click', () => {
            document.getElementById('ambulanceReportModal').classList.remove('visible');
            
            // 3. After a delay, spawn the patient and THEN show the notification
            setTimeout(async () => {
                const spawnResult = await this.game.characterManager.spawnAkutrumPatient(); // Spawn the patient first

                // --- FIX: Show the correct notification based on the result ---
                if (spawnResult === 'spawned_in_akutrum') {
                    this.ui.showSubtleNotification("The patient has arrived in the Akutrum.");
                } else if (spawnResult === 'diverted_to_waiting_room') {
                    this.ui.showSubtleNotification("Akutrum occupied. Ambulance patient sent to waiting room.");
                }

                // 4. After another short delay, hide the notification
                setTimeout(() => {
                    this.ui.hideSubtleNotification();
                }, 4000); // Let the notification stay on screen for 4 seconds
            }, 5000); // "Arrived" message appears 5 seconds after acknowledging the report
        });

        // Settings Modal
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('visible');
        });
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.game.saveSettings();
        });

        // Patch Notes Modal
        document.getElementById('closePatchNotesBtn').addEventListener('click', () => {
            document.getElementById('patchNotesModal').classList.remove('visible');
        });
        document.getElementById('backToMenuFromPatchNotesBtn').addEventListener('click', () => {
            document.getElementById('patchNotesModal').classList.remove('visible');
            this.game.showMenuView('main');
        });



        // Home Medication Modal
        document.getElementById('closeHomeMedsModal').addEventListener('click', () => {
            document.getElementById('homeMedicationModal').classList.remove('visible');
        });
        // Home Medication Accordion in Vitals Popup
        document.getElementById('homeMedicationContent').addEventListener('click', (e) => {
            const pauseButton = e.target.closest('button[data-action="toggle-pause-homemed"]');
            const removeButton = e.target.closest('button[data-action="remove-homemed"]');
            const undoButton = e.target.closest('button[data-action="undo-remove-homemed"]');

            if (removeButton) {
                this.game.initiateHomeMedicationRemoval(removeButton.dataset.medId);
            } else if (pauseButton) {
                const medId = pauseButton.dataset.medId;
                this.game.toggleHomeMedicationPause(medId);
            } else if (undoButton) {
                this.game.undoHomeMedicationRemoval(undoButton.dataset.medId);
            }
        });
        document.getElementById('homeMedicationContent').addEventListener('change', (e) => {
            if (e.target.matches('.home-med-dose-input, .home-med-freq-input')) {
                const medId = e.target.dataset.medId;
                const field = e.target.dataset.field;
                this.game.updateHomeMedicationValue(medId, field, parseFloat(e.target.value));
            }
        });


        //Feedback
        document.getElementById('closeFeedback').addEventListener('click', () => this.game.closeFeedbackReport());
        document.getElementById('btnFinishFeedback').addEventListener('click', () => {
            this.game.showRatingModal(); // Always show the rating modal
        });

        // --- Rating Modal Logic ---
        const starContainer = document.getElementById('starRatingStars');

        starContainer.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('star')) {
                starContainer.querySelectorAll('.star').forEach(star => {
                    star.textContent = star.dataset.value <= e.target.dataset.value ? '★' : '☆';
                });
            }
        });
        starContainer.addEventListener('mouseout', () => {
            starContainer.querySelectorAll('.star').forEach(star => {
                star.textContent = '☆'; // Always reset to empty stars on mouseout
            });
        });
        starContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                const rating = parseInt(e.target.dataset.value, 10);
                this.game.submitCaseRating(rating); // Submit rating immediately
            }
        });

        // --- Text Feedback Modal Logic ---
        const feedbackTextarea = document.getElementById('ratingFeedbackText');
        const submitFeedbackBtn = document.getElementById('btnSubmitTextFeedback');

        // Disable the button whenever the textarea is empty
        feedbackTextarea.addEventListener('input', () => {
            submitFeedbackBtn.disabled = feedbackTextarea.value.trim().length === 0;
        });

        submitFeedbackBtn.addEventListener('click', () => {
            const feedbackText = feedbackTextarea.value;
            this.game.submitFeedbackText(feedbackText);
        });
        document.getElementById('btnSkipTextFeedback').addEventListener('click', () => this.game.finishRatingProcess()); // This button is for skipping
        document.querySelector('.feedback-tabs').addEventListener('click', (e) => {
            if (e.target.matches('.tab-link')) {
                const tabId = e.target.dataset.tab;

                // Remove 'active' from all tabs and content
                document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

                // Add 'active' to the clicked tab and its corresponding content
                e.target.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            }
        });
        // FULL CODE FOR SOME REASON
            // open/close logic for ALL accordion menus
        document.addEventListener("click", (e) => {
            const header = e.target.closest('.accordion-header');
            if (!header) return;

            const content = header.nextElementSibling;
            header.classList.toggle("active");

            if (header.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + "px";
            } else {
                content.style.maxHeight = null;
            }
        });

        // Add any other button listeners here in the same way.
    }

    // --- Event Handler Methods ---
    // These methods are the "receptionists". They gather info and delegate.

    //Mouse
    handleMouseDown(e) {
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        
        const worldCoords = utils.screenToWorld(cssX, cssY, this.game.camera);
        this.game.handleMouseDown(worldCoords, e);
    }

    handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;

        const worldCoords = utils.screenToWorld(cssX, cssY, this.game.camera);
        this.game.handleMouseMove(worldCoords);
    }

    handleMouseUp(e) {
        this.game.handleMouseUp(e); // Tell the manager
    }

    handleDblClick(e) {
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;

        const worldCoords = utils.screenToWorld(cssX, cssY, this.game.camera);
        this.game.handleDblClick(worldCoords, e);
    }


    //Keys
    handleKeyDown(e) {
        if (e.key === "Escape") {
            this.game.handleEscapeKey(); // Tell the manager
        }
    }

    //Menu
    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsernameInput').value;
        const password = document.getElementById('loginPasswordInput').value;
        await this.game.loginUser(username, password); // Tell the manager
    }

    handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsernameInput').value;
        const password = document.getElementById('registerPasswordInput').value;
        this.game.registerUser(username, password); // Tell the manager
    }

    //Physical examn
    handlePhysicalExamSelection(e) {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;

    const examType = button.dataset.exam;
    if (examType) {
        // Use the new generic handler
        this.game.handleAction('physicalExam', examType, button);
    }
    }

    //Bedside test
    handleBedsideTestSelection(e) {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;

    const testId = button.dataset.testId;
    if (testId) {
        // Use the new generic handler
        this.game.handleAction('bedsideTest', testId, button);
    }
    }

    //Lab
    handleLabSelection(e) {
        const button = e.target.closest('button');
        if (!button || button.disabled) return;

        const testId = button.dataset.testId;
        const kitId = button.dataset.kitId; // Check for a kit ID

        if (kitId) {
            // A kit was clicked
            this.game.orderLabKit(kitId, button); // Call a new method in GameController
        } else if (testId) {
            // A single test was clicked
            this.game.orderLabTest(testId, button);
        }
    }

    //Radiologi
    handleRadiologySelection(e) {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;

    const testId = button.dataset.testId;
    if (testId) {
        // Use the new generic handler
        this.game.handleAction('radiology', testId, button);
    }
    }

    //Medicinering
    handleMedListClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const medId = button.dataset.medId;
    if (medId) {
        // This now clearly calls the controller's function
        this.game.handleMedicationSelection(medId);
    }
    }
}