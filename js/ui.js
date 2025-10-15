// Element selectors
const vitalsPopup = document.getElementById('vitalsPopup');
const vitalsTitle = document.getElementById('vitalsTitle');
const vitalsContent = document.getElementById('vitalsContent');
const physExamContent = document.getElementById('physExamContent');
const labContent = document.getElementById('labResultsContent');
const medsContent = document.getElementById('administeredMedsContent');
const bedsideContent = document.getElementById('bedsideTestContent');
const radiologyContent = document.getElementById('radiologyResultsContent');
const criticalWarningOverlay = document.getElementById('critical-warning-overlay');

// Exported UI functions

// MainMenu
export function showMainMenuControls() {
    document.getElementById('loginControls').classList.add('hidden');
    document.getElementById('mainMenuControls').style.display = 'block';
    document.getElementById('loginError').classList.add('hidden');
}
export function showLoginControls() {
    document.getElementById('mainMenuControls').style.display = 'none';
    document.getElementById('loginControls').classList.remove('hidden');
}

//Others
export function getVitalColor(key, value, age) {
    const pediatricVitalsByAge = [
        { ageMax: 1/12, AF: { min: 30, max: 60 }, Puls: { min: 100, max: 180 }, BT_systolic: { min: 60 } },
        { ageMax: 1,    AF: { min: 25, max: 50 }, Puls: { min: 100, max: 160 }, BT_systolic: { min: 70 } },
        { ageMax: 3,    AF: { min: 20, max: 30 }, Puls: { min: 80,  max: 130 }, BT_systolic: { min: 80 } },
        { ageMax: 5,    AF: { min: 20, max: 25 }, Puls: { min: 80,  max: 120 }, BT_systolic: { min: 80 } },
        { ageMax: 12,   AF: { min: 15, max: 20 }, Puls: { min: 70,  max: 110 }, BT_systolic: { min: 90 } },
        { ageMax: 18,   AF: { min: 12, max: 16 }, Puls: { min: 60,  max: 100 }, BT_systolic: { min: 90 } }
    ];

    const adultVitals = {
        AF: { min: 12, max: 20 }, Puls: { min: 60, max: 100 }, BT_systolic: { min: 90 },
        Saturation: { min: 95 }, Temp: { yellow: 38.0, orange: 39.0, red: 40.0 }
    };

    const getVitalsForAge = (age) => {
        if (age === undefined || age === null || age >= 18) return adultVitals;
        const ranges = pediatricVitalsByAge.find(range => age <= range.ageMax);
        return ranges ? { ...adultVitals, ...ranges } : adultVitals;
    };

    const refs = getVitalsForAge(age);
    const red = '#FF5252', orange = '#FFC107', yellow = '#FFEE58';

    switch (key) {
        case 'AF':
            if (!refs.AF) return null;
            if (value > refs.AF.max + 10 || value < refs.AF.min - 8) return red;
            if (value > refs.AF.max + 5 || value < refs.AF.min - 4) return orange;
            if (value > refs.AF.max || value < refs.AF.min) return yellow;
            break;
        case 'Saturation':
            if (value < 90) return red;
            if (value < 92) return orange;
            if (value < 95) return yellow;
            break;
        case 'BT': // The key passed for Blood Pressure
            if (!refs.BT_systolic) return null;
            if (value < refs.BT_systolic.min - 20) return red;
            if (value < refs.BT_systolic.min - 10) return orange;
            if (value < refs.BT_systolic.min) return yellow;
            break;
        case 'Puls':
            if (!refs.Puls) return null;
            if (value > refs.Puls.max + 40 || value < refs.Puls.min - 30) return red;
            if (value > refs.Puls.max + 20 || value < refs.Puls.min - 15) return orange;
            if (value > refs.Puls.max || value < refs.Puls.min) return yellow;
            break;
        case 'RLS':
            if (value > 1) return red;
            break;
        case 'Temp':
            const tempRefs = refs.Temp || adultVitals.Temp;
            if (value >= tempRefs.red) return red;
            if (value >= tempRefs.orange) return orange;
            if (value >= tempRefs.yellow) return yellow;
            break;
    }
    return null;
}

export function showPatientInfo(patient) {
  currentPatientId = patient.id;  // 🔹 set active patient
  infoName.textContent = patient.Namn || patient.name || "Okänd patient";
  infoDetails.innerHTML = "";
  for (const [key, val] of Object.entries(patient)) {
    if (["x","y","radius","color"].includes(key)) continue;
    const div = document.createElement("div");
    div.textContent = `${key}: ${val}`;
    infoDetails.appendChild(div);
  }
  panel.classList.add("open");
}

export function hidePatientInfo() {
  panel.classList.remove("open");
}

export function updateCriticalWarning(isCritical) {
    criticalWarningOverlay.classList.toggle('hidden', !isCritical);
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
    vitalsContent.innerHTML = '';
    physExamContent.innerHTML = '';
    labContent.innerHTML = '';
    medsContent.innerHTML = '';
    bedsideContent.innerHTML = '';
    radiologyContent.innerHTML = '';
    
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

    vitalKeys.forEach(key => {
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
    
    // Update other sections
    renderAccordionItems(patient, 'administeredMedsContent', patient.administeredMeds, renderAdministeredMed);
    renderAccordionItems(patient, 'bedsideTestContent', patient.performedBedsideTests, (testName, resultText) => renderSimpleResult(testName, resultText, allBedsideTests.find(t => t.name === testName || t.resultLabel === testName)?.normalFinding));
    renderAccordionItems(patient, 'labResultsContent', patient.orderedLabs, renderLabResult);
    renderAccordionItems(patient, 'radiologyResultsContent', patient.orderedRadiology, (testName, resultText) => renderSimpleResult(testName, resultText, allRadiologyTests.find(t => t.name === testName)?.normalFinding));
    renderAccordionItems(patient, 'physExamContent', patient.performedExams, (examType, resultText) => renderSimpleResult(examType, resultText, standardFindings[examType]));
    updateHomeMedicationListUI(patient, allMedications); // This now receives the correct list
    
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

export function showSubmenu(menuIdToShow) {
    const allSubmenuIds = ['physicalExamMenu', 'labMenu', 'chatWindow', 'medsMenu', 'bedsideMenu', 'radiologyMenu'];
    
    // First, hide all submenus
    allSubmenuIds.forEach(id => {
        const menu = document.getElementById(id);
        if (menu) menu.style.display = 'none';
    });

    // Now, just show the one you want
    const menuToShow = document.getElementById(menuIdToShow);
    if (menuToShow) {
        menuToShow.style.display = 'flex';
    }
}

export function hideSubmenu(menuId) {
    const menu = document.getElementById(menuId);
    if (menu) {
        menu.style.display = 'none';
    }
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

export function hideAllSideMenus() {
  document.getElementById("roomMenu").style.display = "none";
  if (vitalsPopup) {
    vitalsPopup.style.display = "none";
    delete vitalsPopup.dataset.isInitialized;
  }
  document.getElementById('homeMedicationModal').classList.remove('visible');
  const submenus = document.querySelectorAll('.submenu');
  submenus.forEach(menu => menu.style.display = 'none');
}

export function updateAndOpenAccordion(patient, type, data = {}) {
    let container;
    if (type === 'bedside' && data.allBedsideTests) {
        renderAccordionItems(patient, 'bedsideTestContent', patient.performedBedsideTests, (testName, resultText) => renderSimpleResult(testName, resultText, data.allBedsideTests.find(t => t.name === testName || t.resultLabel === testName)?.normalFinding));
        container = document.getElementById('bedsideTestContent');
    } else if (type === 'lab') {
        renderAccordionItems(patient, 'labResultsContent', patient.orderedLabs, renderLabResult);
        container = document.getElementById('labResultsContent');
    } else if (type === 'meds') {
        renderAccordionItems(patient, 'administeredMedsContent', patient.administeredMeds, renderAdministeredMed);
        container = document.getElementById('administeredMedsContent');
    } else if (type === 'physicalExam' && data.standardFindings) {
        renderAccordionItems(patient, 'physExamContent', patient.performedExams, (examType, resultText) => renderSimpleResult(examType, resultText, data.standardFindings[examType]));
        container = document.getElementById('physExamContent');
    } else if (type === 'radiology' && data.allRadiologyTests) {
        renderAccordionItems(patient, 'radiologyResultsContent', patient.orderedRadiology, (testName, resultText) => renderSimpleResult(testName, resultText, data.allRadiologyTests.find(t => t.name === testName)?.normalFinding));
        container = document.getElementById('radiologyResultsContent');
    }

    if (!container) return;
   const header = container.previousElementSibling;
    if (header && !header.classList.contains('active')) {
        header.classList.add('active');
    }
    // This ensures the height is calculated after the browser has rendered the new content
    requestAnimationFrame(() => {
        container.style.maxHeight = container.scrollHeight + "px";
        // After the 200ms transition is complete, find the last item in the
        // accordion and use the dedicated auto-scroll function to bring it into view.
        const lastItem = container.lastElementChild;
        if (lastItem) {
            setTimeout(() => autoScrollView(lastItem), 250);
        }
    });
}            

export function autoScrollView(element) {
    if (!element) return;

    // 1. Get the scrollable container (the popup itself)
    const scrollContainer = document.getElementById('vitalsPopup');
    if (!scrollContainer) return;

    // 2. Get the position and size of the container and the new element
    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // 3. Check if the new element is already fully visible within the container
    const isVisible = (
        elementRect.top >= containerRect.top &&
        elementRect.bottom <= containerRect.bottom
    );

    // 4. Only scroll if the element is NOT already visible
    if (!isVisible) {
        element.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

export function showFailureModal(patient) {
  hideAllSideMenus(); // It can call another UI function directly
  document.getElementById('failureMessage').textContent = `The case for ${patient.name} has been lost due to the patient's condition deteriorating beyond recovery.`;
  document.getElementById('failureModal').classList.add('visible');
}


//Anamnes
export function addChatMessage(sender, text) {
    const box = document.getElementById("chatMessages");
    
    // Create a wrapper for the bubble and its label
    const messageWrapper = document.createElement("div");
    const bubble = document.createElement("div");
    
    const isUser = sender === 'You';
    messageWrapper.className = isUser ? 'user-message-wrapper' : 'patient-message-wrapper';
    bubble.classList.add("chat-bubble", isUser ? 'user-bubble' : 'patient-bubble');
    bubble.textContent = text;

    if (!isUser) {
        // Add a label for non-user messages (e.g., "Parent", "Leo")
        const label = document.createElement('div');
        label.className = 'chat-bubble-label';
        label.textContent = sender;
        messageWrapper.appendChild(label);
    }
    
    messageWrapper.appendChild(bubble);
    box.appendChild(messageWrapper);
    box.scrollTop = box.scrollHeight;
}
// LAB
export function renderLabTestButtons(kitsToRender, testsToRender, containerId) {
    const listContainer = document.getElementById(containerId);
    listContainer.innerHTML = ''; // Clear old buttons

    // 1. Render Kit Buttons First
    if (kitsToRender && kitsToRender.length > 0) {
        kitsToRender.forEach(kit => {
            const button = document.createElement('button');
            button.textContent = kit.name;
            button.dataset.kitId = kit.id; // Use data-kit-id
            button.classList.add('btn-kit'); // Add a special class for styling
            listContainer.appendChild(button);
        });
        // Add a visual separator
        listContainer.appendChild(document.createElement('hr'));
    }

    // 2. Render Individual Test Buttons
    testsToRender.forEach(test => {
        const button = document.createElement('button');
        button.textContent = test.name;
        button.dataset.testId = test.id;
        listContainer.appendChild(button);
    });
}

// PHYSICAL EXAM
export function renderPhysicalExamButtons(examsToRender, containerId, currentPatient) {
  const listContainer = document.getElementById('physicalExamList');
  listContainer.innerHTML = '';

    console.log("--- Rendering Physical Exam Buttons ---");

  examsToRender.forEach(exam => {

    console.log(`Creating button for: '${exam.name}'`);
    const button = document.createElement('button');
    button.textContent = exam.name;
    button.dataset.exam = exam.name; // Use the 'name' for the data attribute
    // Disable button if exam has already been performed
    if (currentPatient && currentPatient.performedExams && currentPatient.performedExams[exam.name]) {
      button.disabled = true;
    }
    listContainer.appendChild(button);
  });
    console.log("--- Finished Rendering ---");
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

//BEDSIDE
export function renderBedsideTestButtons(testsToRender, containerId, currentPatient) {
  const listContainer = document.getElementById('bedsideTestList');
  listContainer.innerHTML = '';

  testsToRender.forEach(test => {
    const button = document.createElement('button');
    button.textContent = test.buttonLabel || test.name;
    button.dataset.testId = test.id;

    // ✅ MODIFIED LOGIC:
    // Disable the button if the test has been taken, UNLESS it's repeatable.
    const repeatableTests = ['ekg', 'bladderscan'];
    if (currentPatient && currentPatient.actionsTaken.includes(test.id) && !repeatableTests.includes(test.id)) {
      button.disabled = true;
    }

    listContainer.appendChild(button);
  });
}
export function renderFinalBedside(container, resultData) {
  const resultRow = document.createElement('div');
  resultRow.dataset.testid = resultData.testId; // Add a data attribute for lookups
  resultRow.innerHTML = `<strong>${resultData.testLabel}:</strong> ${resultData.result}`;
  container.appendChild(resultRow);
  return resultRow; // Return the created element
}
export function hideEkgModal() {
    document.getElementById('ekgModal').classList.remove('visible');
}

//RADIOLOGY
export function renderRadiologyButtons(testsToRender, containerId, currentPatient) {
  const listContainer = document.getElementById('radiologyTestList');
  listContainer.innerHTML = '';

  testsToRender.forEach(test => {
    const button = document.createElement('button');
    button.textContent = test.name;
    button.dataset.testId = test.id;
    if (currentPatient && currentPatient.actionsTaken.includes(test.id)) {
      button.disabled = true;
    }
    listContainer.appendChild(button);
  });
}
export function renderFinalRadiology(container, resultData, testInfo) {
  const tempPendingId = `pending-${resultData.testId}`;
  document.getElementById(tempPendingId)?.remove();

  const resultRow = document.createElement('div');
  resultRow.innerHTML = `<strong>${resultData.testName}:</strong> ${resultData.result}`;

  // ✅ Check if the result is different from the standard normal finding
  if (testInfo && resultData.result !== testInfo.normalFinding) {
    resultRow.style.color = '#ff6b6b'; // Apply reddish color for abnormal
  }

  container.appendChild(resultRow);
}

// MEDICATION
export function renderMedicationButtons(medsList, containerId) {
    // 1. Find the container element in the HTML
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`UI Error: Container with ID "${containerId}" not found.`);
        return;
    }

    // 2. Clear any old buttons from the list
    container.innerHTML = '';

    // 3. Loop through the provided medication list
    medsList.forEach(med => {
        // 4. Create a new button element for each medication
        const button = document.createElement('button');
        button.className = 'btn'; // Use your standard button class
        button.textContent = med.name;

        // 5. IMPORTANT: Add the data-med-id so our InputHandler knows which med was clicked
        button.dataset.medId = med.id;

        // 6. Add the new button to the container
        container.appendChild(button);
    });
}

export function hideOxygenModal() {
    document.getElementById('oxygenModal').classList.remove('visible');
}
export function updateOxygenFlowRateLabel(value) {
    document.getElementById('oxygenFlowRateLabel').textContent = `${value} L`;
}
export function openDosingModal(medInfo, currentDose) {
    const modal = document.getElementById('dosingModal');
    const doseChoicesContainer = document.getElementById('doseChoices');
    const manualDoseContainer = document.getElementById('manualDoseContainer');
    const doseConfirmControls = document.getElementById('doseConfirmControls');

    // Safety Check: Make sure the modal and its parts exist before continuing.
    if (!modal || !doseChoicesContainer || !manualDoseContainer || !doseConfirmControls) {
        console.error("Dosing Modal Error: One or more essential HTML elements are missing.");
        return;
    }

    document.getElementById('dosingMedName').textContent = `Set Dose for ${medInfo.name}`;
    const doseInput = document.getElementById('doseInput');
    const doseUnitSpan = document.getElementById('doseUnitSpan');

    doseChoicesContainer.innerHTML = ''; // Clear old buttons

    if (medInfo.doseInputType === 'manual') {
    doseChoicesContainer.style.display = 'none';
    manualDoseContainer.style.display = 'flex';
    doseConfirmControls.style.display = 'flex';

    doseInput.value = currentDose || medInfo.standardDose || 1;
    doseUnitSpan.textContent = medInfo.doseUnit || '';

    const focusOnInput = () => {
            doseInput.focus();
            doseInput.select();
            // Important: remove the listener so it doesn't fire again
            modal.removeEventListener('transitionend', focusOnInput);
        };
        // Listen for the end of the fade-in animation
        modal.addEventListener('transitionend', focusOnInput);


    } else { // Default to 'options' or 'text_options'
        doseChoicesContainer.style.display = 'flex';
        manualDoseContainer.style.display = 'none';
        doseConfirmControls.style.display = 'none';

        (medInfo.doseOptions || []).forEach(option => {
            const doseButton = document.createElement('button');
            doseButton.className = 'btn';
            
            // Handles both numeric and text-based options
            if (typeof option === 'object' && option.label) {
                doseButton.textContent = option.label;
                doseButton.dataset.dose = option.value;
            } else {
                const buttonText = medInfo.doseUnit ? `${option} ${medInfo.doseUnit}` : option;
                doseButton.textContent = buttonText;
                doseButton.dataset.dose = option;
            }
            doseChoicesContainer.appendChild(doseButton);
        });
    }

    modal.classList.add('visible');
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
        const label = document.createElement('label');
        label.className = 'checkbox-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
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

export function renderSelectedItemsList(containerId, selectedItems) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (selectedItems.length === 0) {
        container.innerHTML = '<p class="no-items-message">No prescriptions selected.</p>';
        return;
    }

    selectedItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'selected-item-tag';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name;
        
        itemDiv.appendChild(nameSpan);
        container.appendChild(itemDiv);
    });
}


// DISCHARGE

export function hideDiagnosisModal() {
    document.getElementById('diagnosisModal').classList.remove('visible');
}
export function hideAdmissionPlanModal() {
    document.getElementById('admissionPlanModal').classList.remove('visible');
}
export function hidePrescriptionModal() {
    document.getElementById('prescriptionModal').classList.remove('visible');
}
export function hideDispositionModal() {
    document.getElementById('dispositionModal').classList.remove('visible');
}
export function renderDiagnosisButtons(diagnoses, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    diagnoses.forEach(diagnosis => {
        const button = document.createElement('button');
        button.className = 'btn';
        button.textContent = diagnosis;
        button.dataset.diagnosis = diagnosis; // Store the diagnosis in a data attribute
        container.appendChild(button);
    });
}
export function showFeedbackReport(result) {
    const scoreCircle = document.getElementById('scoreCircle');
    const finalScoreElement = document.getElementById('finalScore');

    if (finalScoreElement) {
        finalScoreElement.textContent = `${result.finalScore}%`;
    }
    if (scoreCircle) {
        scoreCircle.style.setProperty('--score-percent', `${result.finalScore}%`);
        
        let badScoreColor;
        if (result.finalScore < 30) badScoreColor = '#f44336';
        else if (result.finalScore < 60) badScoreColor = '#ff9800';
        else badScoreColor = '#ffeb3b';
        scoreCircle.style.setProperty('--bad-score-color', badScoreColor);
    }

    const diagnosisDisplay = document.getElementById('correctDiagnosisDisplay');
    if (diagnosisDisplay) {
        const diagnosisSpan = diagnosisDisplay.querySelector('span');
        if (diagnosisSpan) {
            diagnosisSpan.textContent = result.correctDiagnosis || 'N/A';
        }
        
        if (result.isDiagnosisCorrect) {
            diagnosisDisplay.classList.add('diagnosis-correct');
            diagnosisDisplay.classList.remove('diagnosis-incorrect');
        } else {
            diagnosisDisplay.classList.add('diagnosis-incorrect');
            diagnosisDisplay.classList.remove('diagnosis-correct');
        }
    }

    const utredningContainer = document.getElementById('utredning');
    const åtgärderContainer = document.getElementById('åtgärder');
    const fallbeskrivningContainer = document.getElementById('fallbeskrivning');

    if (utredningContainer) {
        utredningContainer.innerHTML = result.utredningHTML;
    }
    if (åtgärderContainer) {
        åtgärderContainer.innerHTML = result.åtgärderHTML;
    }
    if (fallbeskrivningContainer) {
    fallbeskrivningContainer.innerHTML = `<p>${result.fallbeskrivning || 'No description available.'}</p>`;
    }
    
    // 3. Reset to default tab view and show the modal (this part is correct)
    document.querySelector('.tab-link.active')?.classList.remove('active');
    document.querySelector('.tab-content.active')?.classList.remove('active');
    document.querySelector('.tab-link[data-tab="utredning"]')?.classList.add('active');
    document.getElementById('utredning')?.classList.add('active');

    document.getElementById('dispositionModal')?.classList.remove('visible');
    document.getElementById('admissionPlanModal')?.classList.remove('visible');
    document.getElementById('feedbackModal')?.classList.add('visible');
}

export function updateHomeMedicationListUI(patient, allMedications) {
    const container = document.getElementById('homeMedicationContent');
    if (!container) return;
    container.innerHTML = '';

    let homeMeds = [];
    try {
        // The list might be a string from the initial load, or an object after interaction.
        homeMeds = typeof patient.Läkemedelslista === 'string' 
            ? JSON.parse(patient.Läkemedelslista) 
            : patient.Läkemedelslista;
    } catch (e) {
        // If parsing fails, do nothing.
    }

    if (!homeMeds || homeMeds.length === 0) {
        container.innerHTML = '<div class="no-items-message" style="padding: 8px 0;">Patient has no registered home medications.</div>';
        return;
    }

    homeMeds.forEach(med => {
        const medInfo = allMedications.find(m => m.id === med.medId);
        const medName = medInfo ? medInfo.name : med.medId;
        const isPaused = patient.homeMedicationState && patient.homeMedicationState[med.medId]?.paused;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'home-med-item';
        if (isPaused) {
            itemDiv.classList.add('paused');
        }

        // Check if the medication is pending removal
        if (med.pendingRemoval) {
            itemDiv.classList.add('pending-removal');
            itemDiv.innerHTML = `
                <span class="undo-text">Removed ${medName}.</span>
                <button class="btn-small btn-undo" data-action="undo-remove-homemed" data-med-id="${med.medId}">Undo</button>
            `;
        } else {
            // Create the normal interactive layout
            itemDiv.innerHTML = `
                <div class="home-med-info">
                    <span class="home-med-name">${medName}</span>
                    <div class="home-med-inputs">
                        <input type="number" class="home-med-dose-input" value="${med.dose}" data-med-id="${med.medId}" data-field="dose">
                        <span class="home-med-unit">${med.unit || ''}</span>
                        <span>x</span>
                        <input type="number" class="home-med-freq-input" value="${med.frequency || 1}" min="1" max="4" data-med-id="${med.medId}" data-field="frequency">
                        <span>/dygn</span>
                    </div>
                </div>
                <div class="home-med-actions">
                    <button class="btn-small" data-action="toggle-pause-homemed" data-med-id="${med.medId}">${isPaused ? 'Resume' : 'Pause'}</button>
                    <button class="btn-small btn-remove" data-action="remove-homemed" data-med-id="${med.medId}">Remove</button>
                </div>
            `;
        }
        container.appendChild(itemDiv);
    });
}

export function renderCaseHistory(history, getActionName, getActionCategory) {
    const container = document.getElementById('caseHistoryContent');
    if (!container) return;
    container.innerHTML = '';
    
    if (!history || history.length === 0) {
        container.innerHTML = '<p class="no-items-message">You have no saved case history. Play a game to see your results!</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'history-table';
    
    table.innerHTML = `
        <thead>
            <tr>
                <th>Patient</th>
                <th>Contact Reason</th>
                <th>Final Diagnosis</th>
                <th style="text-align: right;">Score</th>
            </tr>
        </thead>
    `;
    
    const tbody = document.createElement('tbody');
    history.forEach((item, index) => {
        // Main row that is always visible
        const mainRow = document.createElement('tr');
        mainRow.className = 'history-main-row';
        mainRow.dataset.rowId = index;
        mainRow.innerHTML = `
            <td>
                <div class="history-patient-cell">
                    <img src="/images/${item.patientAvatar || 'patient.png'}" class="history-patient-icon" alt="Patient Icon">
                    <span>${item.patientName}, ${item.patientAge}</span>
                </div>
            </td>
            <td>${item.contactReason}</td>
            <td>${item.finalDiagnosis}</td>
            <td class="score-cell">
                <div class="score-circle-small" style="--score-percent: ${item.score}%; --bad-score-color: ${getScoreColor(item.score)};">
                    <span>${item.score}</span>
                </div>
                <span>${item.score}%</span>
            </td>
        `;
        tbody.appendChild(mainRow);
        
        // Details row that is initially hidden
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'history-details-row hidden';
        detailsRow.dataset.detailsFor = index;
        
        const detailsCell = document.createElement('td');
        detailsCell.colSpan = 4;

        // --- NEW LOGIC TO BUILD DETAILED FEEDBACK ---
        const playerActionsSet = new Set(item.actionsTaken.map(id => id.toLowerCase()));
        const solution = item.solutionActions;
        const allSolutionActions = [...solution.critical, ...solution.recommended];

        const categorizedSolution = { exam: [], lab: [], bedside: [], radiology: [], med: [] };

        allSolutionActions.flat().forEach(id => {
            const category = getActionCategory(id);
            if (categorizedSolution[category]) {
                categorizedSolution[category].push(id);
            }
        });

        let detailsHTML = '<div class="history-details-content">';
        const categoryTitles = {
            exam: 'Physical Exams',
            lab: 'Lab Tests',
            bedside: 'Bedside Tests',
            radiology: 'Radiology',
            med: 'Medications & Interventions'
        };

        let hasActions = false;
        for (const category in categoryTitles) {
            if (categorizedSolution[category].length > 0) {
                hasActions = true;
                detailsHTML += `<h6>${categoryTitles[category]}</h6>`;
                detailsHTML += '<div class="feedback-items-grid">';

                // Use a Set to avoid duplicating actions that might be in both critical and recommended
                const uniqueActionsInCategory = [...new Set(categorizedSolution[category])];

                uniqueActionsInCategory.forEach(id => {
                    const actionName = getActionName(id);
                    const wasPerformed = playerActionsSet.has(id.toLowerCase());
                    
                    if (wasPerformed) {
                        // Render as green (correct)
                        detailsHTML += `<div class="feedback-task correct"><span class="task-icon">✓</span><span class="task-name">${actionName}</span></div>`;
                    } else {
                        // Render as red (missed)
                        detailsHTML += `<div class="feedback-task missed"><span class="task-icon">✗</span><span class="task-name">${actionName}</span></div>`;
                    }
                });
                detailsHTML += '</div>';
            }
        }

        if (!hasActions) {
            detailsHTML += '<p class="no-items-message">No specific interventions were required for this case.</p>';
        }
        detailsHTML += '</div>';
        detailsCell.innerHTML = detailsHTML;
        
        detailsRow.appendChild(detailsCell);
        tbody.appendChild(detailsRow);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

export function renderLeaderboard(leaderboardData) {
    const container = document.getElementById('leaderboardContent');
    if (!container) return;
    container.innerHTML = '';

    if (!leaderboardData || leaderboardData.length === 0) {
        container.innerHTML = '<p class="no-items-message">The leaderboard is empty. Play some cases to get on the board!</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'history-table'; // Reuse the same nice table style

    table.innerHTML = `
        <thead>
            <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Cases Played</th>
                <th style="text-align: right;">Average Score</th>
            </tr>
        </thead>
    `;

    const tbody = document.createElement('tbody');
    leaderboardData.forEach((player, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="rank-cell">${index + 1}</td>
            <td>${player.username}</td>
            <td>${player.casesPlayed}</td>
            <td class="score-cell">${player.avgScore}%</td>
        `;
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
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
    const isAbnormal = normalFinding && value !== normalFinding && !String(value).includes('Pending');

    // Check if the finding is abnormal (and not a pending status)
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

function renderLabResult(testId, lab) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'lab-result-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'lab-result-name';
    nameSpan.textContent = lab.name;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'lab-result-value';

    if (typeof lab.result === 'object' && lab.result.isPanel) {
        itemDiv.classList.add('is-panel');
        const grid = document.createElement('div');
        grid.className = 'abg-grid';
        lab.result.components.forEach(comp => {
            const labelSpan = document.createElement('span');
            labelSpan.textContent = comp.label;
            const valueContentSpan = document.createElement('span');
            valueContentSpan.textContent = comp.value;
            if (comp.isAbnormal) {
                valueContentSpan.classList.add('abnormal');
            }
            grid.appendChild(labelSpan);
            grid.appendChild(valueContentSpan);
        });
        valueSpan.appendChild(grid);
    } else if (typeof lab.result === 'string' && (lab.result.includes('Pending') || lab.result.startsWith('('))) {
        valueSpan.innerHTML = lab.result; // Use innerHTML to render the spinner
        valueSpan.style.fontStyle = 'italic';
    } else {
        valueSpan.textContent = lab.result;
        if (lab.isAbnormal) {
            valueSpan.classList.add('abnormal');
        }
    }

    itemDiv.appendChild(nameSpan);
    itemDiv.appendChild(valueSpan);
    return itemDiv;
}
