import { getVitalColor } from '../utils.js';
import { API_URL } from '../api.js';

const vitalsPopup = document.getElementById('vitalsPopup');
const vitalsTitle = document.getElementById('vitalsTitle');
const vitalsContent = document.getElementById('vitalsContent');
const physExamContent = document.getElementById('physExamContent');
const labContent = document.getElementById('labResultsContent');
const medsContent = document.getElementById('administeredMedsContent');
const bedsideContent = document.getElementById('bedsideTestContent');
const radiologyContent = document.getElementById('radiologyResultsContent');
const criticalWarningOverlay = document.getElementById('critical-warning-overlay');

// --- NEW: Store the last fetched history data for on-demand rendering ---
let lastRenderedHistory = [];

// Exported UI functions

// MainMenu

export function updateCriticalWarning(isCritical) {
    const warningOverlay = document.getElementById('critical-warning-overlay');
    if (isCritical) {
        warningOverlay.classList.remove('hidden');
    } else {
        warningOverlay.classList.add('hidden');
    }
}

export function hideAllSideMenus() {
    document.getElementById("roomMenu").style.display = "none";
    document.getElementById("physicalExamMenu").style.display = "none";
    document.getElementById("labMenu").style.display = "none";
    document.getElementById("vitalsPopup").style.display = "none";
    document.getElementById("chatWindow").style.display = "none";
    document.getElementById("medsMenu").style.display = "none";
    document.getElementById("bedsideMenu").style.display = "none";
    document.getElementById("radiologyMenu").style.display = "none";
    document.getElementById("consultMenu").style.display = "none"; // NEW
    document.getElementById("generalSearchMenu").style.display = "none";
    document.getElementById("akutrumMenu").style.display = "none";
    const feedbackModal = document.getElementById('feedbackModal');
    if (feedbackModal) feedbackModal.classList.remove('visible');
}

export function showSubtleNotification(message) {
    const notification = document.getElementById('subtleNotification');
    const notificationText = document.getElementById('subtleNotificationText');
    notificationText.textContent = message;
    notification.classList.remove('hidden');
    notification.classList.add('visible');
}

export function hideSubtleNotification() {
    const notification = document.getElementById('subtleNotification');
    notification.classList.remove('visible');
}

export function showVitalsPopup(patient, vitalKeys, standardFindings, allRadiologyTests, allMedications, allBedsideTests, isZoomedOut = false) {
    const vitalsPopup = document.getElementById('vitalsPopup');
    if (isZoomedOut) {
        vitalsPopup.classList.add('zoomed-out-position');
    } else {
        vitalsPopup.classList.remove('zoomed-out-position');
    }
    const isFirstOpen = vitalsPopup.style.display === 'none' || vitalsPopup.style.display === '';

    // Clear all content
    const oldComplaint = document.querySelector('.chief-complaint');
    if (oldComplaint) oldComplaint.remove();

    // Populate header
    let titleText = patient.name || "Unknown Patient";
    if (patient.age !== undefined && patient.age !== null) {
        if (patient.age < 1) {
            const months = Math.round(patient.age * 12);
            titleText += `, ${months} mån`;
        } else {
            titleText += `, ${patient.age} år`;
        }
    }
    vitalsTitle.textContent = titleText;

    if (patient.Kontaktorsak) {
        const complaintEl = document.createElement('p');
        complaintEl.className = 'chief-complaint';
        complaintEl.textContent = patient.Kontaktorsak;
        document.getElementById('vitalsHeader').appendChild(complaintEl);
    }
    
    // Populate vitals
    const vitalsSource = patient.currentVitals || {};
    const colorsSource = patient.vitalColors || {}; // Get colors from the server

    // Clear the vitals content
    vitalsContent.innerHTML = '';

    // --- NEW: Akutrum Logic ---
    // Check if the patient is in the Akutrum (Room 4)
    const isInAkutrum = patient.assignedRoom && patient.assignedRoom.name === 'Room 4';

    vitalKeys.forEach(key => {
        // If in Akutrum, only show vitals that have been measured.
        if (isInAkutrum && !(patient.measuredVitals && patient.measuredVitals.has(key))) {
            return; // Skip this vital if it hasn't been measured
        }

        if (vitalsSource[key] === undefined && key !== 'BT' && key !== 'Temp') return;
        
        const dataRow = document.createElement('div');
        let color; // This will hold the color sent from the server

        if (key === "BT") {
            const systolic = Math.round(vitalsSource.BT_systolic);
            const diastolic = Math.round(vitalsSource.BT_diastolic);
            dataRow.textContent = `BT: ${systolic}/${diastolic}`;
            color = colorsSource.BT; // Use the pre-calculated color for 'BT'
        } else if (key === "Temp") {
            const tempValue = parseFloat(vitalsSource.Temp);
            dataRow.textContent = `Temp: ${tempValue.toFixed(1)}`;
            color = colorsSource.Temp; // Use pre-calculated color for Temp
        } else {
            const roundedValue = Math.round(vitalsSource[key]);
            dataRow.textContent = `${key}: ${roundedValue}`;
            color = colorsSource[key]; // Use pre-calculated color for the specific vital
        }

        if (color) {
            dataRow.style.color = color;
            dataRow.style.fontWeight = 'bold';
        }
        vitalsContent.appendChild(dataRow);
    });
    
    // Only render other sections if it's the first time the popup is opening
    if (isFirstOpen) {
        renderAccordionItems(patient, 'administeredMedsContent', patient.administeredMeds, renderAdministeredMed);
        renderBedsideResults(document.getElementById('bedsideTestContent'), patient.performedBedsideTests, { allBedsideTests });
        renderLabResults(document.getElementById('labResultsContent'), patient.orderedLabs);
        renderAccordionItems(patient, 'radiologyResultsContent', patient.orderedRadiology, (testName, resultText) => renderSimpleResult(testName, resultText, allRadiologyTests.find(t => t.name === testName)?.normalFinding));
        renderAccordionItems(patient, 'physExamContent', patient.performedExams, (examType, resultText) => renderSimpleResult(examType, resultText, standardFindings[examType]));
        updateHomeMedicationListUI(patient, allMedications);
    }
    
    vitalsPopup.style.display = 'flex';

    // Accordion logic
    setTimeout(() => {
        if (isFirstOpen) {
            vitalsPopup.querySelectorAll('.accordion-header').forEach(h => {
                h.classList.remove('active');
                h.nextElementSibling.style.maxHeight = null;
            });
            const vitalsHeader = vitalsContent.previousElementSibling;
            if (vitalsHeader) {
                vitalsHeader.classList.add('active');
                vitalsHeader.nextElementSibling.style.maxHeight = vitalsHeader.nextElementSibling.scrollHeight + "px";
            }

        } else {
            vitalsPopup.querySelectorAll('.accordion-header.active').forEach(h => {
                const content = h.nextElementSibling;
                content.style.maxHeight = content.scrollHeight + "px";
            });
        }
    }, 0);
}

export function updateAndOpenAccordion(patient, type, data = {}) {
    const contentMap = {
        exam: { el: document.getElementById('physExamContent'), data: patient.performedExams, renderer: renderExamResults },
        lab: { el: document.getElementById('labResultsContent'), data: patient.orderedLabs, renderer: renderLabResults },
        bedside: { el: document.getElementById('bedsideTestContent'), data: patient.performedBedsideTests, renderer: renderBedsideResults },
        radiology: { el: document.getElementById('radiologyResultsContent'), data: patient.orderedRadiology, renderer: renderRadiologyResults },
        meds: { el: document.getElementById('administeredMedsContent'), data: patient.administeredMeds, renderer: renderAdministeredMeds },
        interventions: { el: document.getElementById('interventionsContent'), data: patient.interventions, renderer: (container, data) => renderAccordionItems(patient, 'interventionsContent', data, (key, value) => renderSimpleResult(key, value)) }
    };

    const info = contentMap[type];
    if (!info || !info.el) return;

    info.renderer(info.el, info.data, data);

    const header = info.el.previousElementSibling;
    if (info.el.innerHTML.trim() !== '') {
        if (header && !header.classList.contains('active')) {
            // ✅ FIX: Add the 'active' class to sync the UI state (e.g., arrow rotation).
            header.classList.add('active');
        }
        requestAnimationFrame(() => {
            info.el.style.maxHeight = info.el.scrollHeight + "px";
            // After the accordion has animated open, scroll to the new content.
            // We use a small timeout to wait for the CSS transition to finish.
            setTimeout(() => {
                const lastItem = info.el.lastElementChild;
                if (lastItem) {
                    autoScrollView(lastItem);
                }
            }, 250); // 250ms should be slightly longer than the CSS transition (0.2s)
        });
    }
}

function renderExamResults(container, data, { standardFindings }) {
    container.innerHTML = '';
    if (data) {
        Object.entries(data).forEach(([examType, resultText]) => {
            const isAbnormal = standardFindings && !Object.values(standardFindings).includes(resultText);
            const resultRow = document.createElement('div');
            resultRow.innerHTML = `<strong>${examType}:</strong> ${resultText}`;
            resultRow.style.color = isAbnormal ? '#ff6b6b' : '';
            container.appendChild(resultRow);
        });
    }
}

function renderLabResults(container, data) {
    container.innerHTML = '';
    if (data) {
        Object.entries(data).forEach(([testId, resultData]) => {
            const resultRow = document.createElement('div');
            resultRow.className = 'lab-result-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'lab-result-name';
            nameSpan.textContent = resultData.name;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'lab-result-value';

            // ✅ FIX: Check for the isPanel flag inside the 'result' object where the data shows it exists.
            if (resultData.result && resultData.result.isPanel === true) {
                resultRow.classList.add('is-panel');
                const grid = document.createElement('div');
                grid.className = 'abg-grid';
                if (resultData.result && resultData.result.components) {
                    resultData.result.components.forEach(component => { // The label now includes the colon
                        const labelSpan = document.createElement('span');
                        labelSpan.textContent = component.label;
                        const valueSpan = document.createElement('span');
                        valueSpan.className = component.isAbnormal ? 'abnormal' : '';
                        valueSpan.textContent = `${component.value.number} ${component.value.unit}`.trim();
                        grid.appendChild(labelSpan);
                        grid.appendChild(valueSpan);
                    });
                }
                valueSpan.appendChild(grid);
            } else if (typeof resultData.result === 'string' && (resultData.result.includes('Pending') || resultData.result.startsWith('('))) {
                valueSpan.innerHTML = resultData.result; // Use innerHTML to render the spinner
                valueSpan.style.fontStyle = 'italic';
            } else {
                valueSpan.textContent = resultData.result;
                if (resultData.isAbnormal) {
                    valueSpan.classList.add('abnormal');
                }
            }
            resultRow.appendChild(nameSpan);
            resultRow.appendChild(valueSpan);
            container.appendChild(resultRow);
        });
    }
}


function renderBedsideResults(container, data, { allBedsideTests }) {
    container.innerHTML = '';
    if (data) {
        Object.entries(data).forEach(([testLabel, resultText]) => {
            // ✅ FIX: Re-use the robust renderSimpleResult function to ensure consistent styling.
            const testInfo = allBedsideTests.find(t => t.name === testLabel);
            const resultRow = renderSimpleResult(testLabel, resultText, testInfo?.normalFinding);
            if (resultRow) container.appendChild(resultRow);
        });
    }
}

function renderRadiologyResults(container, data, { allRadiologyTests }) {
    container.innerHTML = '';
    if (data) {
        Object.entries(data).forEach(([testName, finding]) => {
            // ✅ FIX: Re-use the robust renderSimpleResult function to ensure consistent styling.
            const testInfo = allRadiologyTests.find(t => t.name === testName);
            const resultRow = renderSimpleResult(testName, finding, testInfo?.normalFinding);
            if (resultRow) container.appendChild(resultRow);
        });
    }
}

function renderAdministeredMeds(container, data) {
    container.innerHTML = '';
    if (data) {
        Object.entries(data).forEach(([medId, medData]) => {
            const medRow = document.createElement('div');
            let displayText = medData.name;
            if (medData.displayText) {
                displayText = medData.displayText;
            } else if (medData.totalDose) {
                displayText += ` (${medData.totalDose} ${medData.unit || ''} total)`;
            }
            medRow.textContent = `✓ ${displayText}`;
            container.appendChild(medRow);
        });
    }
}

export function addChatMessage(sender, text) {
    const box = document.getElementById("chatMessages");
    const wrapper = document.createElement('div');
    const label = document.createElement('div');
    label.className = 'chat-bubble-label';
    label.textContent = sender;

    const div = document.createElement("div");
    div.classList.add("chat-bubble");

    if (sender === 'You') {
        wrapper.className = 'user-message-wrapper';
        div.classList.add('user-bubble');
    } else {
        wrapper.className = 'patient-message-wrapper';
        div.classList.add('patient-bubble');
    }

    div.textContent = text;
    wrapper.appendChild(label);
    wrapper.appendChild(div);
    box.appendChild(wrapper);
    box.scrollTop = box.scrollHeight;
}

export function renderGeneralSearchResults(actions, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (actions.length === 0) {
        container.innerHTML = '<p class="no-items-message">No actions found.</p>';
        return;
    }

    actions.forEach(action => {
        const button = `<button class="btn" data-action-id="${action.id}" data-action-category="${action.category}">${action.name}</button>`;
        container.innerHTML += button;
    });
}

export function renderPhysicalExamButtons(exams, containerId, patient) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    exams.forEach(exam => {
        const button = document.createElement('button');
        button.textContent = exam.name;
        button.dataset.exam = exam.id;
        if (patient && patient.performedExams && patient.performedExams[exam.name]) {
            button.disabled = true;
        }
        container.appendChild(button);
    });
}

export function renderBedsideTestButtons(tests, containerId, patient) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    tests.forEach(test => {
        const button = document.createElement('button');
        button.textContent = test.name;
        button.dataset.testId = test.id;
        // ✅ FIX: Add 'bladderscan' back to the list of repeatable tests.
        if (patient && patient.performedBedsideTests && patient.performedBedsideTests[test.name] && !['ekg', 'bladderscan'].includes(test.id)) {
            button.disabled = true;
        }
        container.appendChild(button);
    });
}

export function renderFinalExam(container, resultData, standardFindings) {
    const tempPendingId = `pending-${resultData.examName.replace(/\s+/g, '-')}`;
    document.getElementById(tempPendingId)?.remove();

    const resultRow = document.createElement('div');
    const isAbnormal = !Object.values(standardFindings).includes(resultData.finding);
    if (isAbnormal) {
        resultRow.style.color = '#ff6b6b';
    }
    resultRow.innerHTML = `<strong>${resultData.examName}:</strong> ${resultData.finding}`;
    container.appendChild(resultRow);
}

export function renderLabTestButtons(kits, tests, containerId) {
    const listContainer = document.getElementById(containerId);
    listContainer.innerHTML = '';

    if (kits && kits.length > 0) {
        kits.forEach(kit => {
            const button = document.createElement('button');
            button.textContent = kit.name;
            button.dataset.kitId = kit.id;
            listContainer.appendChild(button);
        });
    }

    // ✅ FIX: Add a separator line if both kits and individual tests are being displayed.
    if (kits && kits.length > 0 && tests && tests.length > 0) {
        listContainer.appendChild(document.createElement('hr'));
    }

    if (tests && tests.length > 0) {
        tests.forEach(test => {
            const button = document.createElement('button');
            button.textContent = test.name;
            button.dataset.testId = test.id;
            listContainer.appendChild(button);
        });
    }
}

export function renderRadiologyButtons(tests, containerId, patient) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    tests.forEach(test => {
        const button = document.createElement('button');
        button.textContent = test.name;
        button.dataset.testId = test.id;
        if (patient && patient.orderedRadiology && patient.orderedRadiology[test.name]) {
            button.disabled = true;
        }
        container.appendChild(button);
    });
}

export function renderFinalBedside(container, resultData) {
  const resultRow = document.createElement('div');
  resultRow.dataset.testid = resultData.testId; // Add a data attribute for lookups
  resultRow.innerHTML = `<strong>${resultData.testLabel}:</strong> ${resultData.result}`;
  container.appendChild(resultRow);
  return resultRow; // Return the created element
}

export function renderFinalRadiology(container, resultData, testInfo) {
  const tempPendingId = `pending-${resultData.testId}`;
  document.getElementById(tempPendingId)?.remove();

  // ✅ FIX: Re-use the robust renderSimpleResult function to ensure consistent styling.
  // This function already contains the correct logic for checking abnormality.
  const resultRow = renderSimpleResult(resultData.testName, resultData.result, testInfo?.normalFinding);

  if (resultRow) container.appendChild(resultRow);
}

export function renderMedicationButtons(meds, containerId) {
    const listContainer = document.getElementById(containerId);
    listContainer.innerHTML = '';
    meds.forEach(med => {
        const button = document.createElement('button');
        button.textContent = med.name;
        button.dataset.medId = med.id;
        listContainer.appendChild(button);
    });
}

// --- NEW: Render Consultation Buttons ---
export function renderConsultationButtons(consultations, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (!consultations) return;

    consultations.forEach(consult => {
        const button = document.createElement('button');
        button.textContent = consult.name;
        button.dataset.specialityId = consult.id;
        container.appendChild(button);
    });
}

let bubbleTimeout = null; // To manage the auto-hide timer

/**
 * Shows a speech bubble with the consultant's response.
 * The bubble automatically hides after a delay.
 * @param {string} specialityName - The name of the speciality (e.g., "Cardiology").
 * @param {string} responseText - The text response from the consultant.
 */
export function showConsultationBubble(specialityName, responseText) {
    const bubble = document.getElementById('consultationBubble');
    const title = document.getElementById('consultationBubbleTitle');
    const content = document.getElementById('consultationBubbleContent');

    if (bubble && title && content) {
        title.textContent = `From: ${specialityName}`;
        content.textContent = responseText;
        bubble.classList.remove('hidden');
        bubble.classList.add('visible');

        // Clear any existing timer and set a new one to hide the bubble
        if (bubbleTimeout) clearTimeout(bubbleTimeout);
        bubbleTimeout = setTimeout(() => bubble.classList.remove('visible'), 5000); // Hide after 5 seconds
    } else {
        console.error("Consultation bubble elements not found!");
    }
}

export function hideEkgModal() {
    document.getElementById('ekgModal').classList.remove('visible');
}

export function hideDiagnosisModal() {
    document.getElementById('diagnosisModal').classList.remove('visible');
}

export function hideDispositionModal() {
    document.getElementById('dispositionModal').classList.remove('visible');
}

export function hidePrescriptionModal() {
    document.getElementById('prescriptionModal').classList.remove('visible');
}

export function hideAdmissionPlanModal() {
    document.getElementById('admissionPlanModal').classList.remove('visible');
}

export function updateOxygenFlowRateLabel(value) {
    document.getElementById('oxygenFlowRateLabel').textContent = `${value} L/min`;
}

export function hideOxygenModal() {
    document.getElementById('oxygenModal').classList.remove('visible');
}

export function openDosingModal(medInfo, currentDose) {
    document.getElementById('dosingMedName').textContent = `Set Dose for ${medInfo.name}`;
    const doseChoicesContainer = document.getElementById('doseChoices');
    const manualDoseContainer = document.getElementById('manualDoseContainer');
    const doseConfirmControls = document.getElementById('doseConfirmControls');
    const doseInput = document.getElementById('doseInput');
    const doseUnitSpan = document.getElementById('doseUnitSpan');

    doseChoicesContainer.innerHTML = '';

    if (medInfo.doseOptions && medInfo.doseOptions.length > 0) {
        manualDoseContainer.style.display = 'none';
        doseConfirmControls.style.display = 'none';
        medInfo.doseOptions.forEach(option => {
            const button = document.createElement('button');
            button.className = 'btn';
            // Handle both old string format and new object format
            if (typeof option === 'object' && option.label) {
                button.textContent = option.label;
                button.dataset.dose = option.value;
            } else {
                button.textContent = `${option} ${medInfo.doseUnit || ''}`;
                button.dataset.dose = option;
            }
            doseChoicesContainer.appendChild(button);
        });
    } else {
        manualDoseContainer.style.display = 'flex';
        doseConfirmControls.style.display = 'flex';
        doseUnitSpan.textContent = medInfo.doseUnit || '';
        doseInput.value = currentDose || medInfo.standardDose || '';
    }

    document.getElementById('dosingModal').classList.add('visible');
    if (manualDoseContainer.style.display === 'flex') {
        doseInput.focus();
        doseInput.select();
    }
}

export function renderSelectedItemsList(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<p class="no-items-message">No items selected.</p>';
        return;
    }
    items.forEach(item => {
        const tag = document.createElement('div');
        tag.className = 'selected-item-tag';
        tag.textContent = item.name;
        container.appendChild(tag);
    });
}

export function updateHomeMedicationListUI(patient, allMedications) {
    const container = document.getElementById('homeMedicationContent');
    container.innerHTML = '';

    let homeMedList = [];
    // ✅ FIX: The data can arrive as a JSON string, so we must parse it.
    if (typeof patient.Läkemedelslista === 'string') {
        try {
            homeMedList = JSON.parse(patient.Läkemedelslista);
        } catch (e) {
            console.error("Failed to parse Läkemedelslista JSON:", e);
        }
    } else if (Array.isArray(patient.Läkemedelslista)) {
        homeMedList = patient.Läkemedelslista;
    }

    if (homeMedList.length === 0) {
        container.innerHTML = '<p class="no-items-message">Patient has no registered home medications.</p>';
        return;
    }

    homeMedList.forEach(homeMed => {
        const medInfo = allMedications.find(m => m.id === homeMed.medId);
        if (!medInfo) return;

        const isPaused = patient.homeMedicationState && patient.homeMedicationState[homeMed.medId]?.paused;
        const isPendingRemoval = homeMed.pendingRemoval;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'home-med-item';
        if (isPaused) itemDiv.classList.add('paused');
        if (isPendingRemoval) itemDiv.classList.add('pending-removal');

        if (isPendingRemoval) {
            itemDiv.innerHTML = `
                <span class="undo-text">Removing ${medInfo.name}...</span>
                <button class="btn-small btn-undo" data-action="undo-remove-homemed" data-med-id="${homeMed.medId}">Undo</button>
            `;
        } else {
            itemDiv.innerHTML = `
                <div class="home-med-info">
                    <span class="home-med-name" title="${medInfo.name}">${medInfo.name}</span>
                    <div class="home-med-inputs">
                        <input type="number" class="home-med-dose-input" value="${homeMed.dose}" data-med-id="${homeMed.medId}" data-field="dose">
                        <span class="home-med-unit">${homeMed.unit || ''}</span>
                    </div>
                </div>
                <div class="home-med-actions">
                    <button class="btn-small" data-action="toggle-pause-homemed" data-med-id="${homeMed.medId}">${isPaused ? 'Resume' : 'Pause'}</button>
                    <button class="btn-small btn-remove" data-action="remove-homemed" data-med-id="${homeMed.medId}">Remove</button>
                </div>
            `;
        }
        container.appendChild(itemDiv);
    });
}

export function showFeedbackReport(result) {
    document.getElementById('finalScore').textContent = `${result.finalScore}%`;
    document.getElementById('scoreCircle').style.setProperty('--score-percent', `${result.finalScore}%`);
    document.getElementById('utredning').innerHTML = result.utredningHTML || '';
    document.getElementById('åtgärder').innerHTML = result.åtgärderHTML || '';

    // --- REVISED FIX: Robustly handle all newline variations for paragraphs ---
    const description = result.fallbeskrivning || 'No case summary available.';
    // Replace one or more newlines with paragraph tags. This handles both single and double Enters.
    const formattedDescription = description.split(/\n+/).map(p => {
        let processedParagraph = p.trim();
        // --- NEW: Convert markdown-style bold text to <strong> tags ---
        processedParagraph = processedParagraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return `<p>${processedParagraph}</p>`;
    }).join('');
    document.getElementById('fallbeskrivning').innerHTML = formattedDescription;

    const diagnosisDisplay = document.getElementById('correctDiagnosisDisplay');
    diagnosisDisplay.querySelector('span').textContent = result.correctDiagnosis;
    diagnosisDisplay.className = result.isDiagnosisCorrect ? 'diagnosis-display diagnosis-correct' : 'diagnosis-display diagnosis-incorrect';

    document.getElementById('feedbackModal').classList.add('visible');
}

export function showFailureModal(patient) {
  hideAllSideMenus(); // It can call another UI function directly
  document.getElementById('failureMessage').textContent = `The case for ${patient.name} has been lost due to the patient's condition deteriorating beyond recovery.`;
  document.getElementById('failureModal').classList.add('visible');
}

export function renderLeaderboard(data) {
    const container = document.getElementById('leaderboardContent');
    if (data.length === 0) {
        container.innerHTML = '<p class="no-items-message">The leaderboard is empty.</p>';
        return;
    }

    let tableHTML = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Avg. Score</th>
                    <th>Cases Played</th>
                </tr>
            </thead>
            <tbody>
    `;
    data.forEach((player, index) => {
        tableHTML += `
            <tr>
                <td class="rank-cell">${index + 1}</td>
                <td>${player.username}</td>
                <td>${player.avgScore}%</td>
                <td>${player.casesPlayed}</td>
            </tr>
        `;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

export function showSubmenu(menuIdToShow) {
    // An array of all possible submenu IDs
    const allSubmenuIds = [
        'generalSearchMenu',
        'physicalExamMenu',
        'labMenu',
        'chatWindow',
        'medsMenu',
        'bedsideMenu',
        'radiologyMenu',
        'consultMenu' // NEW
    ];

    // First, hide all submenus
    allSubmenuIds.forEach(id => {
        const menu = document.getElementById(id);
        if (menu) {
            menu.style.display = 'none';
        }
    });

    // Now, find the specific menu to show
    const menuToShow = document.getElementById(menuIdToShow);
    if (!menuToShow) return;

    // Show the requested menu, using flex for the chat window
    menuToShow.style.display = (menuIdToShow === 'chatWindow') ? 'flex' : 'block';
    console.log(`[DEBUG] 4. showSubmenu() is showing '${menuIdToShow}'.`);
}

export function renderCaseHistory(history) {
    lastRenderedHistory = history; // Store the history data

    const container = document.getElementById('caseHistoryContent');
    if (history.length === 0) {
        container.innerHTML = '<p class="no-items-message">You have no case history yet.</p>';
        return;
    }

    let tableHTML = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Patient</th>
                    <th>Diagnosis</th>
                    <th>Your Score</th>
                </tr>
            </thead>
            <tbody>
    `;

    history.forEach((item, index) => {
        // ✅ FIX: Add a check to ensure the item is not null before trying to render it.
        if (!item) return;

        const scorePercent = item.score || 0;
        const scoreColor = getScoreColor(scorePercent);
        tableHTML += `
            <tr class="history-main-row" data-row-id="${index}">
                <td class="history-patient-cell">
                    <img src="${item.patient_avatar_url || `/images/default_avatar.png`}" class="history-patient-icon" alt="Patient Avatar">
                    <div>
                        <strong>${item.patientName}</strong>
                        <small>${item.patientAge} years, ${item.contactReason}</small>
                    </div>
                </td>
                <td>${item.finalDiagnosis}</td>
                <td class="score-cell">
                    <div class="score-cell-content">
                        <span>${scorePercent}%</span>
                        <div class="score-circle-small" style="--score-percent: ${scorePercent}%; --good-score-color: ${scoreColor};">
                            <span>${scorePercent}</span>
                        </div>
                    </div>
                </td>
            </tr>
            <tr class="history-details-row hidden" data-details-for="${index}">
                <td colspan="3">
                    <!-- The content is now generated on-demand by GameInputHandler.js -->
                    <div class="history-details-content"></div>
                </td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

/**
 * Retrieves a specific item from the last rendered case history.
 * @param {string} rowId - The index of the item to retrieve.
 * @returns {object|null} The history item object or null if not found.
 */
export function getHistoryItemById(rowId) {
    if (!lastRenderedHistory || lastRenderedHistory.length === 0) return null;
    return lastRenderedHistory[parseInt(rowId, 10)];
}

export function renderCheckboxButtons(items, containerId, selectedIdsSet) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<p class="no-items-message">No items match your search.</p>';
        return;
    }

    items.forEach(item => {
        const checkboxId = `prescription-checkbox-${item.id}`;
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.setAttribute('for', checkboxId);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;
        checkbox.dataset.id = item.id;
        if (selectedIdsSet.has(item.id)) {
            checkbox.checked = true;
        }

        const span = document.createElement('span');
        span.textContent = item.name;

        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
}

export function renderDiagnosisButtons(diagnoses, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear previous results

    if (!diagnoses) return;

    diagnoses.forEach(diagnosis => {
        const button = document.createElement('button');
        button.className = 'btn'; // Or any other class you use for these buttons
        button.textContent = diagnosis;
        button.dataset.diagnosis = diagnosis;
        container.appendChild(button);
    });
}

function getScoreColor(score) {
    if (score < 30) return '#f44336'; // Red
    if (score < 60) return '#ff9800'; // Orange
    if (score < 80) return '#ffeb3b'; // Yellow
    return '#4caf50'; // Green
}

// --- NEW GENERIC ACCORDION RENDERING LOGIC ---

/**
 * A generic function to render items in an accordion panel.
 * @param {object} patient - The patient object.
 * @param {string} containerId - The ID of the container element.
 * @param {object} dataObject - The patient data to iterate over (e.g., patient.performedExams).
 * @param {function} itemRenderer - A function that takes a key and value and returns an HTML element.
 */
function renderAccordionItems(patient, containerId, dataObject, itemRenderer) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (dataObject && Object.keys(dataObject).length > 0) {
        Object.entries(dataObject).forEach(([key, value]) => {
            const itemElement = itemRenderer(key, value, patient);
            if (itemElement) {
                container.appendChild(itemElement);
            }
        });
    }
}

// --- Specific Item Renderers ---

function renderSimpleResult(key, value, normalFinding) {
    const resultRow = document.createElement('div');
    let isAbnormal = false;

    if (key === 'Bladderscan') {
        // ✅ FIX: Special logic for bladderscan. Only abnormal if volume > 200.
        const volumeMatch = String(value).match(/(\d+)/);
        const volume = volumeMatch ? parseInt(volumeMatch[1], 10) : 0;
        isAbnormal = volume > 200;

    } else if (key === 'Sätt KAD') {
        // ✅ FIX: Special logic for KAD. Abnormal if volume > 200 OR urine is not 'ljusgul'.
        const volumeMatch = String(value).match(/(\d+)/);
        const volume = volumeMatch ? parseInt(volumeMatch[1], 10) : 0;
        const isColorAbnormal = !String(value).includes('ljusgul');
        isAbnormal = volume > 200 || isColorAbnormal;

    } else {
        // Existing logic for all other simple results.
        isAbnormal = normalFinding && value && value !== normalFinding && !String(value).includes('Pending');
    }

    if (isAbnormal) {
        resultRow.innerHTML = `<strong>${key}:</strong> <span style="color: #ff6b6b; font-weight: bold;">${value}</span>`;
    } else {
        resultRow.innerHTML = `<strong>${key}:</strong> ${value}`;
    }
    return resultRow;
}

function renderAdministeredMed(medId, medData) {
    const medRow = document.createElement('div');
    let displayText;

    if (medData.displayText) {
        displayText = `✓ ${medData.name} (${medData.displayText})`;
    } else if (medId === 'oxygen') {
        displayText = `✓ ${medData.name}`;
    } else {
        displayText = `✓ ${medData.name} (${medData.totalDose}${medData.unit}`;
        displayText += medData.administrationCount > 1 ? ' total)' : ')';
    }
    medRow.textContent = displayText;
    return medRow;
}

/**
 * Scrolls the vitals popup to bring a specific element into view if it's not already visible.
 * @param {HTMLElement} element The element to scroll to.
 */
function autoScrollView(element) {
    if (!element) return;

    const scrollContainer = document.getElementById('vitalsPopup');
    if (!scrollContainer) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // Check if the element is already fully visible within the container
    const isVisible = (
        elementRect.top >= containerRect.top &&
        elementRect.bottom <= containerRect.bottom
    );

    // Only scroll if the element is not already visible
    if (!isVisible) {
        element.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

export function renderSelectedActionTags(targetId, jsonString, allActions) {
    const container = document.getElementById(`selected${targetId}`);
    if (!container) return;

    container.innerHTML = '';
    let selection = [];
    try {
        selection = JSON.parse(jsonString || '[]');
    } catch (e) {
        console.error("Error parsing action JSON:", e);
        return;
    }

    if (selection.length === 0) {
        container.innerHTML = '<p class="no-items-message">No actions selected.</p>';
        return;
    }

    selection.forEach(item => {
        const tag = document.createElement('div');
        tag.className = 'action-tag';

        if (Array.isArray(item)) { // It's an "OR" group
            tag.classList.add('tag-or-group');
            tag.innerHTML = item.map(id => `<span>${allActions.find(a => a.id === id)?.name || id}</span>`).join('<span class="or-separator">or</span>');
        } else { // It's a single action
            const action = allActions.find(a => a.id === item);
            if (action) {
                tag.textContent = action.name;
                // --- FIX: Add a fallback for actions without a category to prevent crashes ---
                const categoryClass = (action.category || 'unknown').toLowerCase().replace(/\s+/g, '-');
                tag.classList.add(`tag-${categoryClass}`);
            }
        }
        container.appendChild(tag);
    });
}

export function renderAdmissionPlanMeds(medications, allActions) {
    const container = document.getElementById('admissionPlanMedListContainer');
    if (!container) return;

    container.innerHTML = '';
    if (!medications || medications.length === 0) {
        container.innerHTML = '<p class="no-items-message">No medications in plan.</p>';
        return;
    }

    medications.forEach((med, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'home-med-list-item'; // Reusing existing style for consistency

        if (Array.isArray(med)) { // It's an "OR" group
            itemDiv.classList.add('tag-or-group');
            const groupHtml = med.map(subMed => {
                const action = allActions.find(a => a.id === subMed.id);
                if (!action) return '';
                let doseInfo = '';
                if (subMed.vidBehov) doseInfo = ' (v.b.)';
                else if (subMed.reasonable_dose_min !== undefined) doseInfo = ` (${subMed.reasonable_dose_min}-${subMed.reasonable_dose_max})`;
                return `<span>${action.name}${doseInfo}</span>`;
            }).join('<span class="or-separator">or</span>');

            itemDiv.innerHTML = `
                <div class="med-info">${groupHtml}</div>
                <button type="button" class="btn-remove btn-remove-admission-plan-med" data-index="${index}">×</button>
            `;
        } else { // It's a single medication
            const action = allActions.find(a => a.id === med.id);
            if (!action) return;

            let doseInfo = '';
            if (med.vidBehov) {
                doseInfo = ' (v.b.)';
            } else if (med.reasonable_dose_min !== undefined) {
                doseInfo = ` (${med.reasonable_dose_min}-${med.reasonable_dose_max})`;
            }
            itemDiv.innerHTML = `
                <div class="med-info"><span>${action.name}${doseInfo}</span></div>
                <button type="button" class="btn-remove btn-remove-admission-plan-med" data-index="${index}">×</button>
            `;
        }
        container.appendChild(itemDiv);
    });
}

export function renderAnamnesisKeywords(keywords) {
    const container = document.getElementById('anamnesisKeywordsContainer');
    if (!container) return;
    container.innerHTML = '';
    keywords.forEach(keyword => {
        addKeywordToModal(keyword);
    });
}

export function renderHomeMedList(jsonString, allActions) {
    const container = document.getElementById('homeMedListContainer');
    const hiddenInput = document.getElementById('Läkemedelslista');
    if (!container || !hiddenInput) return;

    hiddenInput.value = jsonString;
    container.innerHTML = '';

    let medList = [];
    try {
        medList = JSON.parse(jsonString || '[]');
    } catch (e) {
        console.error("Error parsing home med list JSON:", e);
        return;
    }

    if (medList.length === 0) {
        container.innerHTML = '<p class="no-items-message">No home medications defined.</p>';
        return;
    }

    medList.forEach((med, index) => {
        const medInfo = allActions.find(a => a.id === med.medId);
        let medName = medInfo ? medInfo.name : med.medId;

        // Add a visual badge for the pause recommendation
        if (med.pauseRecommendation === 'pause') {
            medName += ' <span class="pause-rec-badge pause">Pause</span>';
        } else if (med.pauseRecommendation === 'continue') {
            medName += ' <span class="pause-rec-badge continue">Continue</span>';
        }

        const itemDiv = document.createElement('div');
        itemDiv.className = 'home-med-list-item';
        itemDiv.innerHTML = `
            <div class="med-info">
                <span class="med-name">${medName}</span> <!-- Now includes the badge -->
                <span class="med-details">${med.dose} ${med.unit} | ${med.frequency}</span>
            </div>
            <button type="button" class="btn-remove-item btn-remove-home-med" data-index="${index}" title="Remove medication">×</button>
        `;
        container.appendChild(itemDiv);
    });
}

export function populateAdmissionPlanUI(planJson) {
    const container = document.getElementById('admissionPlanContainer');
    if (!container) return;

    let plan = {};
    try {
        plan = JSON.parse(planJson || '{}');
    } catch (e) {
        console.error("Error parsing admission plan JSON:", e);
        plan = {};
    }

    const monitoring = plan.monitoring || {};

    // ✅ FIX: The logic to handle the main NEWS frequency toggle was missing.
    // This block now correctly sets the 'Don't Mind' vs 'Set Frequency' state.
    const vitalsDmGroup = document.querySelector('[data-monitoring-key="vitals_frequency_dm"]');
    if (vitalsDmGroup) {
        const shouldBeSet = monitoring.vitals_frequency && monitoring.vitals_frequency !== 'none';
        vitalsDmGroup.querySelector('[data-value="set"]').classList.toggle('active', shouldBeSet);
        vitalsDmGroup.querySelector('[data-value="dm"]').classList.toggle('active', !shouldBeSet);
    }
    // This part correctly handles the individual frequency buttons (1h, 2h, etc.)
    const freqButtons = document.getElementById('adminVitalsFreq');
    freqButtons.querySelectorAll('.btn-toggle').forEach(btn => btn.classList.remove('active'));
    if (monitoring.vitals_frequency && monitoring.vitals_frequency !== 'none') {
        const freqs = Array.isArray(monitoring.vitals_frequency) ? monitoring.vitals_frequency : [monitoring.vitals_frequency];
        freqs.forEach(freq => {
            const btn = freqButtons.querySelector(`[data-value="${freq}"]`);
            if (btn) btn.classList.add('active');
        });
    }

    // Handle other monitoring toggles
    Object.keys(monitoring).forEach(key => {
        // ✅ FIX: Remove the check for vitals_frequency_dm as it's redundant and causes conflicts.
        if (key === 'vitals_frequency' || key === 'vitals_frequency_dm') return;
        const itemGroup = document.querySelector(`.monitoring-item[data-monitoring-key="${key}"]`);
        if (itemGroup) {
            // Deactivate all buttons in the group first
            itemGroup.querySelectorAll('.btn-toggle').forEach(btn => btn.classList.remove('active'));

            // Find the correct button to activate based on the plan's value
            const value = monitoring[key]; // This will be true, false, or undefined
            let targetButton;
            if (value === true) {
                targetButton = itemGroup.querySelector('[data-value="true"]');
            } else if (value === false) {
                targetButton = itemGroup.querySelector('[data-value="false"]');
            }
            // If targetButton is still undefined, the 'dm' button will be activated by default
            (targetButton || itemGroup.querySelector('[data-value="dm"]'))?.classList.add('active');
        }
    });
}

export function addKeywordToModal(keyword) {
    const container = document.getElementById('anamnesisKeywordsContainer');
    if (!container) return;

    const tag = document.createElement('div');
    tag.className = 'keyword-tag';

    const textSpan = document.createElement('span');
    textSpan.textContent = keyword;

    const removeSpan = document.createElement('span');
    removeSpan.className = 'remove-keyword';
    removeSpan.innerHTML = '&times;'; // The '×' character

    tag.appendChild(textSpan);
    tag.appendChild(removeSpan);
    container.appendChild(tag);
}

export function renderAnamnesisChecklist(checklist) {
    const container = document.getElementById('anamnesisChecklistContainer');
    const hiddenInput = document.getElementById('AnamnesisChecklist');
    if (!container || !hiddenInput) return;

    // The function now receives an object and is responsible for stringifying it.
    hiddenInput.value = JSON.stringify(checklist || []);
    container.innerHTML = '';

    if (!checklist || checklist.length === 0) {
        container.innerHTML = '<p class="no-items-message">No anamnesis questions defined.</p>';
        return;
    }

    checklist.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'anamnesis-item';
        itemDiv.innerHTML = `
            <div class="anamnesis-item-text">
                <span class="question">${item.question}</span>
                <span class="keywords">Keywords: ${item.keywords.join(', ')}</span>
            </div>
            <div class="anamnesis-item-actions">
                <button type="button" class="btn-secondary btn-edit-anamnesis" data-index="${index}">Edit</button>
                <button type="button" class="btn-remove btn-remove-anamnesis" data-index="${index}">×</button>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}