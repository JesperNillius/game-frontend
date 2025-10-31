import * as api from '../api.js';

export default class DispositionManager {
    constructor(game) {
        this.game = game;
        this.ui = game.ui;
        this.finalDispositionChoice = 'Ward'; // Default choice
    }

    init() {
        // ✅ Add event listeners for all disposition buttons.
        document.getElementById('btnSendHome').addEventListener('click', () => this.chooseDisposition('Home'));
        document.getElementById('btnAdmitWard').addEventListener('click', () => this.chooseDisposition('Ward'));
        document.getElementById('btnTransferPCI').addEventListener('click', () => this.chooseDisposition('PCI'));
        document.getElementById('btnTransferTrombolys').addEventListener('click', () => this.chooseDisposition('Trombolys'));
        document.getElementById('btnPrepareSurgery').addEventListener('click', () => this.chooseDisposition('Surgery'));
        document.getElementById('btnCancelDisposition').addEventListener('click', () => this.ui.hideDispositionModal());
    }


    async showDiagnosisModal() {
        this.ui.renderDiagnosisButtons([], 'diagnosisSelectionList');
        document.getElementById('diagnosisSearchInput').value = '';
        document.getElementById('diagnosisModal').classList.add('visible');
    }

    filterDiagnoses(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        const MIN_CHARS_TO_SEARCH = 3;
        let filteredDiagnoses = [];
        if (lowerCaseSearchTerm.length >= MIN_CHARS_TO_SEARCH) {
            filteredDiagnoses = this.game.allDiagnoses.filter(d => d.toLowerCase().includes(lowerCaseSearchTerm));
        }
        this.ui.renderDiagnosisButtons(filteredDiagnoses, 'diagnosisSelectionList');
    }

    selectDiagnosis(diagnosis) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient) return;
        currentPatient.playerDiagnosis = diagnosis;
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
                paused: item.classList.contains('paused')
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
        this.game.handleDispositionChoice(this.finalDispositionChoice, playerAdmissionPlan);
    }

    chooseDisposition(choice) {
        if (choice === 'Home') {
            document.getElementById('dispositionModal').classList.remove('visible');
            this.showPrescriptionModal();
        } else { // This now handles 'Ward', 'PCI', and 'Trombolys'
            this.finalDispositionChoice = choice;

            // Display the chosen disposition in the admission plan modal
            const dispositionDisplay = document.getElementById('admissionPlanDisposition');
            if (choice === 'Ward') {
                dispositionDisplay.innerHTML = ''; // Clear it for standard admission
                dispositionDisplay.style.display = 'none';
            } else {
                dispositionDisplay.innerHTML = `<strong>Intervention:</strong> ${choice}`;
                dispositionDisplay.style.display = 'block';
            }

            const listContainer = document.getElementById('planMedicationOrdersList');
            const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
            listContainer.innerHTML = '';
            const medsInPlan = new Set();

            // --- FIX: Ensure Läkemedelslista is an array before using .forEach ---
            // It can sometimes be a JSON string, which needs to be parsed first.
            let homeMedList = [];
            if (currentPatient && currentPatient.Läkemedelslista) {
                if (typeof currentPatient.Läkemedelslista === 'string') {
                    try { homeMedList = JSON.parse(currentPatient.Läkemedelslista); } catch (e) { console.error("Failed to parse Läkemedelslista", e); }
                } else if (Array.isArray(currentPatient.Läkemedelslista)) {
                    homeMedList = currentPatient.Läkemedelslista;
                }
            }

            if (homeMedList.length > 0) {
                homeMedList.forEach(homeMed => { 
                    const medInfo = this.game.allMedications.find(m => m.id === homeMed.medId);
                    const isPaused = currentPatient.homeMedicationState && currentPatient.homeMedicationState[homeMed.medId]?.paused;
                    if (!medInfo) return;

                    const item = document.createElement('div');
                    item.className = 'order-item';
                    if (isPaused) item.classList.add('paused');
                    item.dataset.medId = homeMed.medId;
                    item.dataset.dose = homeMed.dose;
                    item.dataset.unit = homeMed.unit;
                    const isVb = homeMed.frequency === 'vb';
                    item.innerHTML = `<span class="med-name">${medInfo.name}</span><span class="med-dose">${homeMed.dose} ${homeMed.unit || ''}</span><select class="frequency-select"><option value="1" ${homeMed.frequency == 1 && !isVb ? 'selected' : ''}>x1 /dygn</option><option value="2" ${homeMed.frequency == 2 && !isVb ? 'selected' : ''}>x2 /dygn</option><option value="3" ${homeMed.frequency == 3 && !isVb ? 'selected' : ''}>x3 /dygn</option><option value="4" ${homeMed.frequency == 4 && !isVb ? 'selected' : ''}>x4 /dygn</option><option value="vb" ${isVb ? 'selected' : ''}>v.b.</option></select><button class="btn-toggle-pause">${isPaused ? 'Resume' : 'Pause'}</button><button class="btn-remove-order">Remove</button>`;
                    listContainer.appendChild(item);
                    medsInPlan.add(homeMed.medId);
                });
            }

            if (currentPatient && currentPatient.administeredMeds) {
                Object.entries(currentPatient.administeredMeds).forEach(([medId, medData]) => {
                    if (medsInPlan.has(medId) || medId === 'oxygen') return;
                    const medInfo = this.game.allMedications.find(m => m.id === medId);
                    if (!medInfo) return;
                    const item = document.createElement('div');
                    item.className = 'order-item';
                    item.dataset.medId = medId;
                    item.dataset.dose = medData.totalDose;
                    item.dataset.unit = medData.unit;
                    item.innerHTML = `<span class="med-name">${medInfo.name}</span><span class="med-dose">${medData.totalDose} ${medData.unit || ''}</span><select class="frequency-select"><option value="1" selected>x1 /dygn</option><option value="2">x2 /dygn</option><option value="3">x3 /dygn</option><option value="4">x4 /dygn</option><option value="vb">v.b.</option></select><button class="btn-toggle-pause">Pause</button><button class="btn-remove-order">Remove</button>`;
                    listContainer.appendChild(item);
                });
            }

            if (listContainer.children.length === 0) {
                listContainer.innerHTML = '<p class="no-meds-message">Patient has no registered home medications.</p>';
            }

            document.getElementById('dispositionModal').classList.remove('visible');
            document.getElementById('admissionPlanModal').classList.add('visible');
        }
    }

    getPrescribableMedications() {
        const combined = [...this.game.allPrescriptions, ...this.game.allMedications];
        const uniqueMeds = [];
        const seenIds = new Set();
        for (const med of combined) {
            if (med && med.id && !seenIds.has(med.id)) {
                uniqueMeds.push(med);
                seenIds.add(med.id);
            }
        }
        return uniqueMeds;
    }

    showPrescriptionModal() {
        this.game.selectedPrescriptions.clear();
        this.ui.renderCheckboxButtons(this.getPrescribableMedications(), 'prescriptionSelectionList', this.game.selectedPrescriptions);
        this.updateSelectedPrescriptionsUI();
        document.getElementById('prescriptionSearchInput').value = '';
        document.getElementById('prescriptionModal').classList.add('visible');
    }

    filterPrescriptions(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = this.getPrescribableMedications().filter(p => p.name && p.name.toLowerCase().includes(lowerCaseSearchTerm));
        this.ui.renderCheckboxButtons(filtered, 'prescriptionSelectionList', this.game.selectedPrescriptions);
    }

    updateSelectedPrescriptionsUI() {
        const allMeds = this.getPrescribableMedications();
        const selectedItems = allMeds.filter(med => this.game.selectedPrescriptions.has(med.id));
        this.ui.renderSelectedItemsList('selectedPrescriptionsList', selectedItems);
    }

    confirmPrescriptions() {
        const prescriptionsToSubmit = Array.from(this.game.selectedPrescriptions);
        document.getElementById('prescriptionModal').classList.remove('visible');
        this.game.handleDispositionChoice('Home', { prescriptions: prescriptionsToSubmit });
    }

    showAddPlanMedModal() {
        this.game.medicationContext = 'plan_add';
        this.ui.renderMedicationButtons(this.game.allMedications, 'planMedSelectionList');
        document.getElementById('addPlanMedModal').classList.add('visible');
        document.getElementById('planMedSearchInput').value = '';
    }

    filterPlanMeds(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filteredMeds = this.game.allMedications.filter(med => med.name.toLowerCase().includes(lowerCaseSearchTerm));
        this.ui.renderMedicationButtons(filteredMeds, 'planMedSelectionList');
    }

    editPlanMedDose(orderItemElement) {
        const medId = orderItemElement.dataset.medId;
        const currentDose = orderItemElement.dataset.dose;
        const medInfo = this.game.allMedications.find(m => m.id === medId);
        if (!medInfo) return;
        this.game.medicationContext = { action: 'plan_edit', element: orderItemElement, medInfo: medInfo };
        this.ui.openDosingModal(medInfo, currentDose);
    }

    async handleDispositionChoice(playerChoice, planData = null) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient) return;

        try {
            const performanceData = {
                actionsTaken: currentPatient.actionsTaken || [],
                playerDiagnosis: currentPatient.playerDiagnosis || '',
                playerChoice: playerChoice,
                caseId: currentPatient.id,
                playerPrescriptions: planData?.prescriptions,
                playerAdmissionPlan: planData
            };

            const result = await api.evaluateCase(performanceData);
            this.ui.showFeedbackReport(result);
        } catch (err) {
            console.error("❌ ERROR communicating with evaluation endpoint:", err);
        }
    }

    closeFeedbackReport() {
        document.getElementById('feedbackModal').classList.remove('visible');
        if (this.game.currentPatientId !== null) {
            this.game.patients = this.game.patients.filter(p => p.id !== this.game.currentPatientId);
            this.game.currentPatientId = null;
        }
        this.game.playerManager.returnToMenu();
    }

    async submitCaseRating(rating, feedbackText) {
        // This logic is now handled by GameMainController.js for general game reviews.
        // This function can be removed or left empty.
        console.warn('submitCaseRating in dispositionManager is deprecated.');
        this.closeFeedbackReport();
    }
}