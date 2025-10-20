import * as api from '../api.js';
import { API_URL } from '../api.js';

export default class ActionManager {
    constructor(game) {
        this.game = game;
        this.ui = game.ui;
    }

    // ANAMNESIS
    showAnamnesis() {
        const chatMessages = document.getElementById("chatMessages");
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);

        if (currentPatient && currentPatient.chatHistory) {
            chatMessages.innerHTML = currentPatient.chatHistory;
        } else {
            chatMessages.innerHTML = '';
            this.ui.addChatMessage("System", `Anamnesis started.`);
        }

        this.ui.showSubmenu('chatWindow');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async sendChatMessage() {
        const input = document.getElementById("chatInput");
        const userMessage = input.value.trim();
        if (!userMessage || this.game.currentPatientId === null || this.game.currentPatientId === undefined) return;

        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);

        this.ui.addChatMessage("You", userMessage);
        input.value = "";

        try {
            const data = await api.postChatMessage(this.game.currentPatientId, userMessage);

            // NEW: Handle multi-bubble SOMAÄTAS response
            if (data.isSomaetas && Array.isArray(data.reply)) {
                const speaker = data.speaker || "Patient";
                for (let i = 0; i < data.reply.length; i++) {
                    // Use a delay to make it look like the patient is thinking
                    setTimeout(() => {
                        this.ui.addChatMessage(speaker, data.reply[i]);
                    }, i * 400); // 400ms delay between each bubble
                }
            } else {
                // Original logic for single messages
                this.ui.addChatMessage(data.speaker || "Patient", data.reply);
            }

            if (currentPatient) {
                currentPatient.chatHistory = document.getElementById("chatMessages").innerHTML;
            }
        } catch (err) {
            console.error("Failed to send chat message:", err);
            this.ui.addChatMessage("System", "Error: Could not contact patient.");
        }
    }

    // PHYSICAL EXAM
    showPhysicalExamMenu() {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        this.ui.renderPhysicalExamButtons(this.game.allPhysicalExams, 'physicalExamList', currentPatient);
        this.ui.showSubmenu('physicalExamMenu');
    }

    // BEDSIDE
    showBedsideMenu() {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        this.ui.renderBedsideTestButtons(this.game.allBedsideTests, 'bedsideTestList', currentPatient);
        this.ui.showSubmenu('bedsideMenu');
    }

    showEkgInterpretation() {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient) return;

        document.getElementById('ekgInterpretation').style.display = 'block';
        document.getElementById('showEkgInterpretationBtn').style.display = 'none';

        const ekgLabel = 'EKG';
        const findingText = currentPatient.EKG_finding_text || "EKG performed.";

        if (!currentPatient.performedBedsideTests) {
            currentPatient.performedBedsideTests = {};
        }
        currentPatient.performedBedsideTests[ekgLabel] = findingText;
        this.ui.updateAndOpenAccordion(currentPatient, 'bedside', { allBedsideTests: this.game.allBedsideTests });
    }

    // LABS
    showLabMenu() {
        this.ui.renderLabTestButtons(this.game.allLabKits, this.game.allLabTests, 'labTestList');
        const vitalsContent = document.getElementById('vitalsContent');
        const vitalsHeader = vitalsContent.previousElementSibling;
        if (vitalsHeader && !vitalsHeader.classList.contains('active')) {
            vitalsHeader.classList.add('active');
            vitalsContent.style.maxHeight = vitalsContent.scrollHeight + "px";
        }
        this.ui.showSubmenu('labMenu');
    }

    filterLabTests(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filteredTests = this.game.allLabTests.filter(test => test.name.toLowerCase().includes(lowerCaseSearchTerm));
        this.ui.renderLabTestButtons(this.game.allLabKits, filteredTests, 'labTestList');
    }

    async orderLabTest(testId, button) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient) return;

        button.disabled = true;
        button.textContent = 'Ordering...';

        try {
            document.getElementById('vitalsPopup').style.display = 'flex';
            const updatedLabsFromServer = await api.orderLab(currentPatient.id, testId);
            currentPatient.orderedLabs = updatedLabsFromServer;

            if (!currentPatient.actionsTaken.includes(testId)) {
                currentPatient.actionsTaken.push(testId);
            }
            this.ui.updateAndOpenAccordion(currentPatient, 'lab');
        } catch (err) {
            console.error('Failed to order lab test:', err);
        } finally {
            const testInfo = this.game.allLabTests.find(t => t.id === testId);
            button.disabled = false;
            if (testInfo) button.textContent = testInfo.name;
        }
    }

    async orderLabKit(kitId, button) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        const kitInfo = this.game.allLabKits.find(k => k.id === kitId);
        if (!currentPatient || !kitInfo) return;

        button.disabled = true;
        button.textContent = 'Ordering...';

        try {
            document.getElementById('vitalsPopup').style.display = 'flex';
            const updatedLabsFromServer = await api.orderLabKit(currentPatient.id, kitId);
            currentPatient.orderedLabs = updatedLabsFromServer;

            const testIdsInKit = kitInfo.tests.split(',').map(id => id.trim());
            testIdsInKit.forEach(testId => {
                if (!currentPatient.actionsTaken.includes(testId)) {
                    currentPatient.actionsTaken.push(testId);
                }
            });
            this.ui.updateAndOpenAccordion(currentPatient, 'lab');
        } catch (err) {
            console.error('Failed to order lab kit:', err);
        } finally {
            button.disabled = false;
            button.textContent = kitInfo.name;
        }
    }

    // RADIOLOGY
    showRadiologyMenu() {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        this.ui.renderRadiologyButtons(this.game.allRadiologyTests, 'radiologyTestList', currentPatient);
        this.ui.showSubmenu('radiologyMenu');
    }

    // MEDICATION
    showMedsMenu() {
        this.ui.renderMedicationButtons(this.game.allMedications, 'medsList');
        this.ui.showSubmenu('medsMenu');
    }

    async handleAction(actionType, id, button) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient) return;

        let testInfo, apiCall, stateProperty, resultKey, isRepeatable;

        switch (actionType) {
            case 'physicalExam':
                testInfo = { name: id };
                apiCall = () => api.performExam(currentPatient.id, id);
                stateProperty = 'performedExams';
                resultKey = 'examName';
                isRepeatable = false;
                break;
            case 'bedsideTest':
                testInfo = this.game.allBedsideTests.find(t => t.id === id);
                apiCall = () => api.performBedsideTest(currentPatient.id, id);
                stateProperty = 'performedBedsideTests';
                resultKey = 'testLabel';
                isRepeatable = ['ekg', 'bladderscan'].includes(id);
                break;
            case 'radiology':
                testInfo = this.game.allRadiologyTests.find(t => t.id === id);
                apiCall = () => api.orderRadiology(currentPatient.id, id);
                stateProperty = 'orderedRadiology';
                resultKey = 'testName';
                isRepeatable = false;
                break;
            default: return;
        }

        if (!testInfo) return;

        button.disabled = true;
        button.textContent = '...';

        if (!currentPatient[stateProperty]) currentPatient[stateProperty] = {};
        currentPatient[stateProperty][testInfo.resultLabel || testInfo.name] = `<span>[Pending]</span><div class="spinner-inline"></div>`;
        this.ui.updateAndOpenAccordion(currentPatient, actionType, { standardFindings: this.game.standardFindings, allRadiologyTests: this.game.allRadiologyTests, allBedsideTests: this.game.allBedsideTests });

        try {
            const resultData = await apiCall();
            if (actionType === 'bedsideTest' && resultData.imageFilename) {
                delete currentPatient[stateProperty][testInfo.resultLabel || testInfo.name];
                this.ui.updateAndOpenAccordion(currentPatient, 'bedside', { allBedsideTests: this.game.allBedsideTests });
                document.getElementById('ekgImage').src = `${API_URL}/images/${resultData.imageFilename}`;
                document.getElementById('ekgInterpretationText').textContent = currentPatient.EKG_finding_text || "No interpretation available.";
                document.getElementById('ekgModal').classList.add('visible');
            } else {
                currentPatient[stateProperty][resultData[resultKey] || testInfo.name] = resultData.result || resultData.finding;
                this.ui.updateAndOpenAccordion(currentPatient, actionType === 'physicalExam' ? 'exam' : (actionType === 'bedsideTest' ? 'bedside' : actionType), { standardFindings: this.game.standardFindings, allRadiologyTests: this.game.allRadiologyTests, allBedsideTests: this.game.allBedsideTests });
            }
            if (!currentPatient.actionsTaken.includes(id)) {
                currentPatient.actionsTaken.push(id);
            }
        } catch (err) {
            console.error(`Failed to perform ${actionType}:`, err);
        } finally {
            button.textContent = testInfo.name;
            if (isRepeatable) button.disabled = false;
        }
    }

    async confirmDose(dose) {
        if (!this.game.medicationContext) return;
        const { action, medInfo, element } = this.game.medicationContext;

        if (action === 'er_administer') {
            await this.administerMedication(medInfo.id, dose);
        } else if (action === 'plan_edit') {
            element.dataset.dose = dose;
            element.querySelector('.med-dose').textContent = `${dose} ${medInfo.doseUnit}`;
        } else if (action === 'plan_add') {
            const listContainer = document.getElementById('planMedicationOrdersList');
            const noMedsMessage = listContainer.querySelector('.no-meds-message');
            if (noMedsMessage) noMedsMessage.remove();
            const item = document.createElement('div');
            item.className = 'order-item';
            item.dataset.medId = medInfo.id;
            item.dataset.dose = dose;
            item.dataset.unit = medInfo.doseUnit;
            item.innerHTML = `<span class="med-name">${medInfo.name}</span><span class="med-dose">${dose} ${medInfo.doseUnit}</span><select class="frequency-select"><option value="1">x1 /24h</option><option value="2">x2 /24h</option><option value="3">x3 /24h</option><option value="4">x4 /24h</option><option value="vb">v.b.</option></select><button class="btn-remove-order">Remove</button>`;
            listContainer.appendChild(item);
        }
        this.cancelDosing();
    }

    cancelDosing() {
        document.getElementById('dosingModal').classList.remove('visible');
        this.game.medicationContext = null;
    }

    async administerMedication(medId, dose) {
        if (!medId || this.game.currentPatientId === null || isNaN(dose) || dose <= 0) {
            alert("Please enter a valid dose.");
            return;
        }
        const medInfo = this.game.allMedications.find(m => m.id === medId);
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!medInfo || !currentPatient) return;

        try {
            // The API call now returns data
            const resultData = await api.administerMedication(currentPatient.id, medId, dose);

            // If the server sent back a specific message (like for KAD), use it.
            if (resultData && resultData.message) {
                this.ui.addChatMessage("System", resultData.message);
            }

            if (!currentPatient.administeredMeds) currentPatient.administeredMeds = {};
            const chosenOption = medInfo.doseOptions?.find(opt => opt.value === dose);
            if (currentPatient.administeredMeds[medId]) {
                currentPatient.administeredMeds[medId].totalDose += dose;
                currentPatient.administeredMeds[medId].administrationCount += 1;
            } else {
                currentPatient.administeredMeds[medId] = { name: medInfo.name, totalDose: dose, unit: medInfo.doseUnit, administrationCount: 1, displayText: chosenOption?.displayText || null };
            }
            if (!currentPatient.actionsTaken.includes(medInfo.id)) {
                currentPatient.actionsTaken.push(medInfo.id);
            }
            this.game.characterManager.triggerNurseAction(currentPatient);
            this.ui.updateAndOpenAccordion(currentPatient, 'meds');
            this.game.pollForVitals(this.game.currentPatientId);
        } catch (error) {
            console.error('Failed to administer medication:', error);
        }
        this.cancelDosing();
    }

    async toggleHomeMedicationPause(medId) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient) return;
        try {
            const updatedPatientData = await api.toggleHomeMed(currentPatient.id, medId);
            currentPatient.homeMedicationState = updatedPatientData.homeMedicationState;
            this.ui.updateHomeMedicationListUI(currentPatient, this.game.allMedications);
        } catch (error) {
            console.error("Failed to toggle home medication:", error);
        }
    }

    updateHomeMedicationValue(medId, field, value) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient || !currentPatient.Läkemedelslista) return;
        const homeMed = currentPatient.Läkemedelslista.find(m => m.medId === medId);
        if (homeMed) {
            homeMed[field] = value;
        }
    }

    initiateHomeMedicationRemoval(medId) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient || !currentPatient.Läkemedelslista) return;
        const homeMed = currentPatient.Läkemedelslista.find(m => m.medId === medId);
        if (!homeMed) return;
        homeMed.pendingRemoval = true;
        homeMed.removalTimeoutId = setTimeout(() => {
            currentPatient.Läkemedelslista = currentPatient.Läkemedelslista.filter(m => m.medId !== medId);
            this.ui.updateHomeMedicationListUI(currentPatient, this.game.allMedications);
        }, 3000);
        this.ui.updateHomeMedicationListUI(currentPatient, this.game.allMedications);
    }

    undoHomeMedicationRemoval(medId) {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient || !currentPatient.Läkemedelslista) return;
        const homeMed = currentPatient.Läkemedelslista.find(m => m.medId === medId);
        if (homeMed && homeMed.pendingRemoval) {
            clearTimeout(homeMed.removalTimeoutId);
            delete homeMed.pendingRemoval;
            delete homeMed.removalTimeoutId;
            this.ui.updateHomeMedicationListUI(currentPatient, this.game.allMedications);
        }
    }

    showHomeMedicationModal() {
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient) return;
        this.ui.updateHomeMedicationListUI(currentPatient, this.game.allMedications);
        document.getElementById('homeMedicationModal').classList.add('visible');
    }

    handleMedicationSelection(medId) {
        const medInfo = this.game.allMedications.find(m => m.id === medId);
        if (!medInfo) return;
        if (medId === 'oxygen') {
            if (this.game.medicationContext !== 'plan_add') {
                this.game.medicationContext = { action: 'er_administer', medInfo: medInfo };
            }
            const oxygenModal = document.getElementById('oxygenModal');
            const oxygenSlider = document.getElementById('oxygenSlider');
            const oxygenFlowRateLabel = document.getElementById('oxygenFlowRateLabel');
            const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
            oxygenSlider.value = currentPatient?.activeTherapies?.oxygen?.flowRate || 0;
            oxygenFlowRateLabel.textContent = `${oxygenSlider.value} L/min`;
            if (this.game.medicationContext === 'plan_add') {
                document.getElementById('addPlanMedModal').classList.remove('visible');
            }
            oxygenModal.classList.add('visible');
            return;
        }
        if (this.game.medicationContext === 'plan_add') {
            document.getElementById('addPlanMedModal').classList.remove('visible');
            this.game.medicationContext = { action: 'plan_add', medInfo: medInfo };
            this.ui.openDosingModal(medInfo, medInfo.standardDose);
        } else {
            this.game.medicationContext = { action: 'er_administer', medInfo: medInfo };
            this.ui.openDosingModal(medInfo, medInfo.standardDose);
        }
    }

    filterMedications(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filteredMeds = this.game.allMedications.filter(med => med.name.toLowerCase().includes(lowerCaseSearchTerm));
        this.ui.renderMedicationButtons(filteredMeds, 'medsList');
    }

    async confirmOxygen() {
        const flowRate = parseInt(document.getElementById('oxygenSlider').value);
        const currentPatient = this.game.patients.find(p => p.id === this.game.currentPatientId);
        if (!currentPatient) return;

        if (this.game.medicationContext?.action === 'er_administer') {
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
            this.ui.updateAndOpenAccordion(currentPatient, 'meds');
        } else if (this.game.medicationContext === 'plan_add') {
            const listContainer = document.getElementById('planMedicationOrdersList');
            const noMedsMessage = listContainer.querySelector('.no-meds-message');
            if (noMedsMessage) noMedsMessage.remove();
            const item = document.createElement('div');
            item.className = 'order-item';
            item.dataset.medId = 'oxygen';
            item.dataset.dose = flowRate;
            item.dataset.unit = 'L/min';
            item.innerHTML = `<div class="med-details"><span class="med-name">Oxygen</span><span class="med-dose">${flowRate} L/min</span></div><span class="frequency-select">Continuous</span><button class="btn-remove-order">Remove</button>`;
            listContainer.appendChild(item);
        }

        document.getElementById('oxygenModal').classList.remove('visible');
        this.game.medicationContext = null;
    }
}