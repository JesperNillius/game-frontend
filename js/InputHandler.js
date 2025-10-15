import * as utils from './utils.js';
import { canvas } from './canvas.js';
import * as ui from './ui.js';

export default class InputHandler {
    constructor(game) {
        this.game = game; // Reference to the main game "manager"

        // The constructor's only job is to attach the listeners.
        // Each listener calls a clean handler method below.
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
        document.getElementById("btnAnamnesis").addEventListener("click", () => this.game.showAnamnesis());
        document.getElementById('sendBtn').addEventListener('click', () => this.game.sendChatMessage());

        //Physical exam
        document.getElementById('btnPhysical').addEventListener('click', () => this.game.showPhysicalExamMenu());
        document.getElementById("physicalExamMenu").addEventListener("click", (e) => this.handlePhysicalExamSelection(e));

        //Bedside
        document.getElementById('btnBedside').addEventListener('click', () => this.game.showBedsideMenu());
        document.getElementById("bedsideMenu").addEventListener("click", (e) => this.handleBedsideTestSelection(e));
        document.getElementById('showEkgInterpretationBtn').addEventListener('click', () => this.game.showEkgInterpretation());
        document.getElementById('closeEkgModal').addEventListener('click', () => ui.hideEkgModal());

        //Lab
        document.getElementById("btnLab").addEventListener("click", () => this.game.showLabMenu());
        const labSearchInput = document.getElementById('labSearchInput');
        labSearchInput.addEventListener('input', (e) => this.game.filterLabTests(e.target.value));
        document.getElementById("labMenu").addEventListener("click", (e) => this.handleLabSelection(e));

        //Radiology
        document.getElementById('btnRadiology').addEventListener('click', () => this.game.showRadiologyMenu());
        document.getElementById("radiologyMenu").addEventListener("click", (e) => this.handleRadiologySelection(e));

        // Medication
        document.getElementById('btnMeds').addEventListener('click', () => this.game.showMedsMenu());
        document.getElementById("medsMenu").addEventListener("click", (e) => this.handleMedListClick(e));
        const medsSearchInput = document.getElementById('medsSearchInput');
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
        document.getElementById('oxygenSlider').addEventListener('input', (e) => ui.updateOxygenFlowRateLabel(e.target.value));
        document.getElementById('btnConfirmOxygen').addEventListener('click', () => this.game.confirmOxygen());
        document.getElementById('btnCancelOxygen').addEventListener('click', () => ui.hideOxygenModal());

        // General Search Results
        document.getElementById('generalSearchMenu').addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const category = button.dataset.actionCategory;
            if (!category) return;

            // Map the category to the main action button's ID
            const categoryToButtonId = {
                exam: 'btnPhysical', lab: 'btnLab', bedside: 'btnBedside',
                radiology: 'btnRadiology', med: 'btnMeds'
            };

            document.getElementById(categoryToButtonId[category])?.click();
        });

        //Discharge patient
        document.getElementById('btnDischarge').addEventListener('click', () => this.game.showDiagnosisModal());
        document.getElementById('diagnosisSearchInput').addEventListener('input', (e) => this.game.filterDiagnoses(e.target.value));
        document.getElementById('btnSkipDiagnosis').addEventListener('click', () => this.game.selectDiagnosis('No diagnosis given'));
        document.getElementById('btnCancelDiagnosis').addEventListener('click', () => ui.hideDiagnosisModal());
        document.getElementById('btnSendHome').addEventListener('click', () => this.game.chooseDisposition('Home'));
        document.getElementById('btnAdmitWard').addEventListener('click', () => this.game.chooseDisposition('Ward'));
        document.getElementById('btnTransferPCI').addEventListener('click', () => this.game.chooseDisposition('PCI'));       
        document.getElementById('diagnosisSelectionList').addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.diagnosis) {
                this.game.selectDiagnosis(button.dataset.diagnosis);
            }
        });
        document.getElementById('btnCancelDisposition').addEventListener('click', () => ui.hideDispositionModal());

        // Prescription Modal
        document.getElementById('prescriptionSearchInput').addEventListener('input', (e) => this.game.filterPrescriptions(e.target.value));
        document.getElementById('btnConfirmPrescription').addEventListener('click', () => this.game.confirmPrescriptions());
        document.getElementById('btnCancelPrescription').addEventListener('click', () => ui.hidePrescriptionModal());
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
        document.getElementById('btnCancelAdmissionPlan').addEventListener('click', () => ui.hideAdmissionPlanModal());
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

        // Settings Modal
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('visible');
        });
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.game.saveSettings();
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
        document.getElementById('btnCancelDisposition').addEventListener('click', () => ui.hideDispositionModal());
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
        this.game.handleMouseDown(worldCoords, e.button);
    }

    handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;

        const worldCoords = utils.screenToWorld(cssX, cssY, this.game.camera);
        this.game.handleMouseMove(worldCoords);
    }

    handleMouseUp(e) {
        this.game.handleMouseUp(); // Tell the manager
    }

    handleDblClick(e) {
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;

        const worldCoords = utils.screenToWorld(cssX, cssY, this.game.camera);
        this.game.handleDblClick(worldCoords);
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