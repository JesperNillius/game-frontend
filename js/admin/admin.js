import { renderSelectedActionTags, renderHomeMedList, renderAnamnesisChecklist, populateAdmissionPlanUI, renderAdmissionPlanMeds } from '../common/ui.js';
import { initActionSelector, openLegacyActionSelector, openConsultationActionSelector } from './actionSelector.js';
import { initAdmissionPlanManager } from './admissionPlanManager.js';
import { API_URL as BASE_API_URL } from '../api.js'; // Import the dynamic base URL
import { initAnamnesisManager } from './anamnesisManager.js';
import { initHomeMedManager } from './homeMedManager.js';
import { initPrescriptionManager } from './prescriptionManager.js';

const API_URL = `${BASE_API_URL}/api/admin`; // Build the correct admin URL

const patientList = document.getElementById('patientList');
const form = document.getElementById('patientForm');
const activePatientList = document.getElementById('activePatientList');
const patientIdField = document.getElementById('patientId');
const btnNewCase = document.getElementById('btnNewCase');
const btnDeleteCase = document.getElementById('btnDeleteCase');
const patientAvatarDropZone = document.getElementById('patientAvatarDropZone');
const patientAvatarFileInput = document.getElementById('patientAvatarFileInput');
const patientAvatarPreview = document.getElementById('patientAvatarPreview');

let allPatients = [];
let allActions = [];
let allConsultations = []; // NEW: To store specialities

async function fetchAndRenderPatients() {
    try {
        const response = await fetch(`${API_URL}/patients`, { credentials: 'include' });
        
        // If not authorized, show the login modal
        if (response.status === 401 || response.status === 403) {
            document.getElementById('adminLoginModal').classList.remove('hidden');
            return;
        }

        allPatients = await response.json();
        
        patientList.innerHTML = '';
        allPatients.forEach(patient => {
            // Hide the login modal if we successfully get data
            document.getElementById('adminLoginModal').classList.add('hidden');

            const div = document.createElement('div');
            div.className = 'patient-list-item';
            div.textContent = patient.name;
            div.dataset.id = patient._id;
            patientList.appendChild(div);
        });
    } catch (error) {
        console.error("Failed to fetch patients:", error);
        patientList.innerHTML = '<p class="error-message">Could not load patients.</p>';
    }
}

async function fetchAllActions() {
    try {
        const response = await fetch(`${API_URL}/all-actions`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch actions');
        allActions = await response.json();
        // --- DEBUG: Log received actions and check a sample ---
        console.log(`[FRONTEND-DEBUG] Received ${allActions.length} actions from the server.`);
        const sampleAction = allActions.find(a => a.id === 'blodtryck');
        console.log("[FRONTEND-DEBUG] Sample 'blodtryck' action as received by the client:", sampleAction);
        // --- NEW DEBUG ---
        const fastAction = allActions.find(a => a.id === 'ultraljud-fast');
        console.log("[FRONTEND-DEBUG] Sample 'ultraljud-fast' action as received by the client:", fastAction);

        // ---
    } catch (error) {
        console.error("Failed to fetch all actions:", error);
    }
}

async function fetchAllConsultations() {
    try {
        const response = await fetch(`${BASE_API_URL}/api/game-data`); // Use the base URL
        const gameData = await response.json();
        allConsultations = gameData.allConsultations || [];
    } catch (error) {
        console.error("Failed to fetch consultation data:", error);
    }
}

async function fetchAndRenderActivePatients() {
    try {
        const response = await fetch(`${API_URL}/active-patients`, { credentials: 'include' });
        const activePatients = await response.json();

        activePatientList.innerHTML = '';
        if (activePatients.length === 0) {
            activePatientList.innerHTML = '<p class="no-items-message">No patients in simulation.</p>';
        } else {
            activePatients.forEach(patient => {
                const div = document.createElement('div');
                div.className = 'active-patient-item';
                div.textContent = `${patient.name} (Triage: ${patient.triageLevel})`;
                activePatientList.appendChild(div);
            });
        }
    } catch (error) {
        // Don't log this error on every poll, as it can be noisy if the server is just down.
        // Instead, just show a message in the UI.
        activePatientList.innerHTML = '<p class="error-message">Could not connect to simulation.</p>';
    }
}

function populateForm(patient) {
    if (!patient) {
        form.reset();
        btnDeleteCase.classList.add('hidden');
        
        // Clear the action tag containers for a new case
        document.querySelectorAll('.selected-actions-container, .item-list-container, #anamnesisChecklistContainer').forEach(c => c.innerHTML = '');
        document.querySelectorAll('.findings-container').forEach(c => c.innerHTML = '');
        document.querySelectorAll('.admin-plan-monitoring-grid .btn-toggle').forEach(btn => btn.classList.remove('active'));
        clearAvatarPreview();

        // Explicitly clear all hidden input fields that store complex data.
        document.getElementById('ActionsCritical').value = '[]';
        document.getElementById('ActionsRecommended').value = '[]';
        document.getElementById('ActionsContraindicated').value = '[]';
        document.getElementById('AdmissionPlanSolution').value = '{}';
        document.getElementById('PrescriptionsSolution').value = '[]';
        document.getElementById('AnamnesisChecklist').value = '[]';
        document.getElementById('DispositionSolution').value = '';
        document.getElementById('Läkemedelslista').value = '[]';
        document.getElementById('ChildPrompt').value = '';
        document.getElementById('ParentPrompt').value = '';
        document.getElementById('Consultations').value = '{}'; // Clear consultations
        document.getElementById('consultationBuilder').innerHTML = ''; // Clear builder UI
        document.getElementById('consultantList').innerHTML = ''; // Clear list of active consultants

        patientIdField.value = '';
        return;
    }

    // --- FIX: Explicitly clear dynamically added fields before populating ---
    if (document.getElementById('AmbulanceReport')) {
        document.getElementById('AmbulanceReport').value = patient.AmbulanceReport || '';
    }

    // Clear action containers before populating
    document.querySelectorAll('.selected-actions-container, .item-list-container, #anamnesisChecklistContainer').forEach(c => c.innerHTML = '');
    document.querySelectorAll('.findings-container').forEach(c => c.innerHTML = '');
    document.querySelectorAll('.admin-plan-monitoring-grid .btn-toggle').forEach(btn => btn.classList.remove('active'));
    clearAvatarPreview(); // Clear existing preview

    // Explicitly populate the Anamnesis prompt field from the 'Prompt' key.
    document.getElementById('Anamnesis').value = patient.Prompt || '';

    // --- FIX: Explicitly set Fallbeskrivning as it's also dynamic ---
    if (document.getElementById('Fallbeskrivning')) {
        document.getElementById('Fallbeskrivning').value = patient.Fallbeskrivning || '';
    }

    Object.keys(patient).forEach(key => {
        // We've already handled the 'Prompt' -> 'Anamnesis' mapping manually.
        // Skip both keys here to prevent the loop from overwriting the value.
        if (key === 'Prompt' || key === 'Anamnesis') {
            return;
        }

        // ✅ FIX: Handle patient_avatar separately, outside the `if (element)` check.
        if (key === 'patient_avatar') {
            displayImagePreview(patient[key]);
            return; // Skip the rest of the loop for this key
        }

        // --- FIX: Manually handle dynamically added Akutrum fields ---
        // These fields are not in the original HTML, so a simple getElementById doesn't work
        // until after they are added by the DOMContentLoaded event.
        if (key === 'isAkutrumCase') {
            document.getElementById('isAkutrumCase').checked = patient[key];
        }
        if (key === 'AmbulanceReport') {
            document.getElementById('AmbulanceReport').value = patient[key] || '';
        }

        const element = document.getElementById(key);

        if (element) {
            if (element.type === 'checkbox') {
                element.checked = patient[key];
            }
            
            // Handle special UI rendering for specific fields
            if (key === 'ActionsCritical' || key === 'ActionsRecommended' || key === 'ActionsContraindicated') {
                renderSelectedActionTags(key, patient[key], allActions);
            } else if (key === 'AdmissionPlanSolution') {
                populateAdmissionPlanUI(patient[key]);
                renderAdmissionPlanMeds(JSON.parse(patient[key] || '{}').medications, allActions);
            } else if (key === 'AnamnesisChecklist') {
                const checklist = JSON.parse(patient[key] || '[]');
                renderAnamnesisChecklist(checklist);
            } else if (key === 'Läkemedelslista') {
                renderHomeMedList(patient[key], allActions);
            } else if (key === 'Consultations') {
                element.value = patient[key] || '{}'; // Populate the hidden input
                renderConsultantList(); // Render the list of consultants with rules
            }

            // For all elements that are not checkboxes, attempt to set their value.
            if (element.type !== 'checkbox' && patient[key] != null) {
                element.value = patient[key];
            }
        } else if (!['ekg_finding_text', 'ekg_image_filename', '_id', '__v'].includes(key.toLowerCase())) {
            // --- FIX: This block now correctly handles all non-EKG abnormal findings ---
            // The previous logic was flawed and skipped most of these.
            console.log(`[DEBUG] No element for key "${key}". Treating as a potential abnormal finding.`);

            const lowerCaseKey = key.toLowerCase();
            let action = allActions.find(a => a.id.toLowerCase() === lowerCaseKey);

            // If no direct match, check if it's a legacy physical exam by name
            if (!action) {
                action = allActions.find(a => a.category === 'Physical Exam' && a.name.toLowerCase() === lowerCaseKey);
            }

            if (action) {
                console.log(`%c[DEBUG] Found matching action for key "${key}":`, 'color: lightgreen', action);
                // Determine which container to add the finding to.
                // Prioritize the ABCDE category if it's a specific ABCDE action.
                if (action.isAbcdeSpecific && action.abcdeCategory && action.abcdeCategory.length > 0) {
                    console.log(`[DEBUG] -> Placing in ABCDE section (isAbcdeSpecific is true).`);
                    // --- FIX: If an action is in multiple categories (e.g., A and D), just use the first one to place the item. ---
                    addFindingItem(action.abcdeCategory[0], action, patient[key]);
                } else {
                    console.log(`[DEBUG] -> Placing in standard Abnormal Findings section (Category: ${action.category}).`);
                    addFindingItem(action.category, action, patient[key]);
                }
            } else {
                console.log(`%c[DEBUG] No matching action found for key "${key}". This finding will not be displayed.`, 'color: orange');
            }
        }
    });

    // --- FIX: Handle EKG as a special case after the main loop ---
    if (patient.EKG_finding_text || patient.ekg_finding_text || patient.EKG_image_filename || patient.ekg_image_filename) {
        const ekgAction = allActions.find(a => a.id === 'ekg');
        if (ekgAction && !document.querySelector('#abnormalFindingsBedside\\ Test .ekg-item')) {
            addFindingItem('Bedside Test', ekgAction, {
                finding: patient.EKG_finding_text || patient.ekg_finding_text,
                image: patient.EKG_image_filename || patient.ekg_image_filename
            });
        }
    }

    patientIdField.value = patient._id;
    btnDeleteCase.classList.remove('hidden');
}

function renderConsultantList() {
    const consultantListContainer = document.getElementById('consultantList');
    consultantListContainer.innerHTML = '';
    const consultationData = JSON.parse(document.getElementById('Consultations').value || '{}');

    Object.keys(consultationData).forEach(specialityId => {
        const speciality = allConsultations.find(c => c.id === specialityId);
        if (speciality) {
            const item = document.createElement('div');
            item.className = 'consultant-list-item';
            item.textContent = speciality.name;
            item.dataset.id = specialityId;
            consultantListContainer.appendChild(item);
        }
    });
}

function buildConsultationUI(specialityId) {
    const builder = document.getElementById('consultationBuilder');
    const consultationData = JSON.parse(document.getElementById('Consultations').value || '{}');
    const rules = consultationData[specialityId] || [];
    const defaultRule = rules.find(r => r.default);

    builder.innerHTML = `
        <div class="consultation-rule">
            <h5>Default Response</h5>
            <textarea class="consultation-default-response" placeholder="This response is used if no other conditions are met...">${defaultRule ? defaultRule.default : ''}</textarea>
        </div>
        <div id="consultationRulesContainer"></div>
        <button type="button" id="btnAddConsultationRule" class="btn btn-secondary">Add Conditional Response</button>
    `;

    const rulesContainer = document.getElementById('consultationRulesContainer');
    rules.filter(r => r.condition).forEach(rule => {
        addRuleUI(rulesContainer, rule);
    });

    document.getElementById('btnAddConsultationRule').addEventListener('click', () => addRuleUI(rulesContainer));
}

function addRuleUI(container, rule = null) {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'consultation-rule';

    const requiresActions = rule?.condition?.requires || [];
    const missingActions = rule?.condition?.missing || [];

    ruleDiv.innerHTML = `
        <h5>
            Conditional Response
            <button type="button" class="btn-remove" title="Remove this rule">×</button>
        </h5>
        <div class="form-group">
            <label>IF these actions have been performed:</label>
            <div class="selected-actions-container requires-actions">
                ${requiresActions.map(id => `<div class="action-tag">${allActions.find(a => a.id === id)?.name || id}</div>`).join('')}
            </div>
            <button type="button" class="btn btn-secondary btn-select-actions" data-target="requires">Select Required Actions</button>
        </div>
        <div class="form-group">
            <label>AND these actions have NOT been performed:</label>
            <div class="selected-actions-container missing-actions">
                ${missingActions.map(id => `<div class="action-tag">${allActions.find(a => a.id === id)?.name || id}</div>`).join('')}
            </div>
            <button type="button" class="btn btn-secondary btn-select-actions" data-target="missing">Select Missing Actions</button>
        </div>
        <div class="form-group">
            <label>THEN give this response:</label>
            <textarea class="consultation-conditional-response" placeholder="The consultant will say this if the conditions are met...">${rule?.response || ''}</textarea>
        </div>
    `;
    container.appendChild(ruleDiv);

    ruleDiv.querySelector('.btn-remove').addEventListener('click', () => ruleDiv.remove());

    ruleDiv.querySelectorAll('.btn-select-actions').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetType = e.target.dataset.target; // 'requires' or 'missing'
            const actionContainer = ruleDiv.querySelector(`.${targetType}-actions`);
            openConsultationActionSelector((selectedIds) => { // FIX: Call the correct function for consultation builder
                actionContainer.innerHTML = selectedIds.map(id => `<div class="action-tag">${allActions.find(a => a.id === id)?.name || id}</div>`).join('');
                actionContainer.dataset.actions = JSON.stringify(selectedIds);
            });
        });
    });

    const requiresContainer = ruleDiv.querySelector('.requires-actions');
    const missingContainer = ruleDiv.querySelector('.missing-actions');
    requiresContainer.dataset.actions = JSON.stringify(requiresActions);
    missingContainer.dataset.actions = JSON.stringify(missingActions);
}

async function savePatient(e) {
    e.preventDefault();

    // --- NEW: Serialize consultation builder UI to JSON ---
    const activeConsultantId = document.getElementById('consultantSelect').value;
    if (activeConsultantId) {
        saveCurrentConsultationToState(activeConsultantId);
    }
    // ---

    const formData = new FormData();
    const id = patientIdField.value;

    // --- 1. Gather all standard input, textarea, and select values ---
    const formElements = Array.from(form.elements);
    formElements.forEach(element => {
        if (!element.id || element.type === 'button' || element.id === 'patientAvatarFileInput') return;

        // Normalize the field name (the key) to prevent character encoding issues.
        const normalizedId = element.id.normalize('NFC');

        // Special handling for hidden inputs that store JSON strings
        const jsonFields = ['ActionsCritical', 'ActionsRecommended', 'ActionsContraindicated', 'AnamnesisChecklist', 'Läkemedelslista', 'PrescriptionsSolution'];
        if (jsonFields.includes(element.id)) {
            formData.append(normalizedId, element.value || '[]');
            return;
        }
        
        if (element.type === 'checkbox') {
            formData.append(normalizedId, element.checked);
        } else if (element.classList.contains('finding-input')) {
            // This is an abnormal finding. Handle based on type.
            const actionId = (element.dataset.actionId || '').normalize('NFC');
            if (element.type === 'checkbox') {
                // For binary tests, save the boolean checked state
                formData.append(actionId, element.checked);
            } else {
                // For all other findings, save the text value
                formData.append(actionId, element.value.trim());
            }
        } else if (element.id === 'AdmissionPlanSolution') {
            // Skip this; it's handled in the special section below.
            return;
        } else if (element.value !== undefined) {
            formData.append(normalizedId, element.value);
        }
    });

    // Special mapping for saving: get value from 'Anamnesis' UI element and save it as 'Prompt'.
    const anamnesisPrompt = document.getElementById('Anamnesis').value;
    formData.set('Prompt', anamnesisPrompt); // Use .set to ensure it overwrites if 'Anamnesis' was added
    formData.delete('Anamnesis'); // Remove the incorrect 'Anamnesis' key

    // --- 2. Special handling for Admission Plan ---
    const monitoring = {};
    if (document.querySelector('[data-monitoring-key="vitals_frequency_dm"] [data-value="set"]').classList.contains('active')) {
        const activeFreqs = Array.from(document.querySelectorAll('#adminVitalsFreq .btn-toggle.active')).map(btn => btn.dataset.value);
        if (activeFreqs.length > 0) {
            monitoring.vitals_frequency = activeFreqs.length === 1 ? activeFreqs[0] : activeFreqs;
        }
    }
    document.querySelectorAll('.monitoring-item[data-monitoring-key]').forEach(item => {
        const key = item.dataset.monitoringKey;
        const activeButton = item.querySelector('.button-group .btn-toggle.active');
        if (activeButton && activeButton.dataset.value !== 'dm') {
            monitoring[key] = activeButton.dataset.value === 'true';
        }
    });
    const currentPlanJson = document.getElementById('AdmissionPlanSolution').value;
    let currentPlan = {};
    try {
        currentPlan = JSON.parse(currentPlanJson || '{}');
    } catch {}
    const medications = currentPlan.medications || [];
    formData.append('AdmissionPlanSolution', JSON.stringify({ monitoring, medications }));

    // --- 4. Handle Avatar File ---
    if (selectedAvatarFile) {
        formData.append('patient_avatar_file', selectedAvatarFile);
    } else if (patientAvatarPreview.dataset.filename === '') {
        // This indicates the "Clear" button was pressed and there's no new file.
        formData.append('patient_avatar_clear', 'true');
    }

    // --- CONSOLE LOG: Inspect FormData before sending ---
    console.log("--- [FRONTEND] FormData content before sending ---");
    for (let [key, value] of formData.entries()) {
        // This will show us the exact keys being sent, allowing us to check for encoding issues.
        console.log(`Key: "${key}", Value: "${String(value).substring(0, 100)}"`);
    }
    console.log("-------------------------------------------------");

    try {
        let response;
        const url = id ? `${API_URL}/patients/${id}` : `${API_URL}/patients`;
        const method = id ? 'PUT' : 'POST';

        response = await fetch(url, {
            method: method,
            body: formData, // FormData handles the content-type header automatically
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to ${id ? 'update' : 'create'} patient.`);
        }

        alert(`Patient case ${id ? 'updated' : 'created'} successfully!`);
        
        // --- Refresh UI ---
        await fetchAndRenderPatients(); // Use await to ensure list is fresh before clearing form
        populateForm(null); // Clear the form for the next entry

    } catch (error) {
        console.error("Save patient error:", error);
        alert(`Error: ${error.message}`);
    }
}

async function deletePatient() {
    const id = patientIdField.value;
    if (!id || !confirm('Are you sure you want to delete this case permanently?')) return;

    try {
        const response = await fetch(`${API_URL}/patients/${id}`, { method: 'DELETE', credentials: 'include' });
        if (!response.ok) throw new Error('Failed to delete patient.');

        alert('Patient case deleted.');
        fetchAndRenderPatients();
        form.reset();
        populateForm(null); // Use populateForm to fully clear the UI
    } catch (error) {
        console.error("Delete error:", error);
        alert('Error deleting patient case.');
    }
}

function addFindingItem(category, action, value = '') {
    const containerId = `abnormalFindings${category}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Prevent adding the same item twice
    if (container.querySelector(`.finding-input[data-action-id="${action.id}"]`)) {
        return;
    }

    // Remove "no items" message if it exists
    const noItemsMsg = container.querySelector('.no-items-message');
    if (noItemsMsg) noItemsMsg.remove();

    const itemDiv = document.createElement('div');
    itemDiv.className = 'finding-input-item';

    // Special template for EKG
    if (action.id === 'ekg') {
        itemDiv.classList.add('ekg-item');
        const findingText = typeof value === 'object' ? value.finding || '' : '';
        const imageName = typeof value === 'object' ? value.image || '' : '';
        itemDiv.innerHTML = `
            <label>${action.name}</label>
            <div class="form-grid">
                <div class="form-group">
                    <label for="EKG_finding_text_dynamic">Interpretation</label>
                    <input type="text" id="EKG_finding_text_dynamic" class="finding-input" data-action-id="ekg_finding_text" value="${findingText}" placeholder="e.g., Sinus rhythm, no ST changes">
                </div>
                <div class="form-group">
                    <label for="EKG_image_filename_dynamic">Image Filename</label>
                    <input type="text" id="EKG_image_filename_dynamic" class="finding-input" data-action-id="ekg_image_filename" value="${imageName}" placeholder="e.g., ekg_af.png">
                </div>
            </div>
            <button type="button" class="btn-remove" style="position: absolute; top: 5px; right: 5px;">×</button>
        `;
    } else {
        let placeholderText = 'Describe finding...';
        if (category === 'Lab Test' && action.normalRange_min !== undefined) {
            const unit = action.normalRange_unit || '';
            placeholderText = `Ref: ${action.normalRange_min}-${action.normalRange_max} ${unit}`;
        }
        itemDiv.innerHTML = `
            <label for="finding-${action.id}">${action.name}</label>
            <input type="text" id="finding-${action.id}" class="finding-input" data-action-id="${action.id}" value="${value}" placeholder="${placeholderText}">
            <button type="button" class="btn-remove">×</button>
        `;
    }

    container.appendChild(itemDiv);

    // Add listener to the new remove button
    itemDiv.querySelector('.btn-remove').addEventListener('click', () => {
        // Instead of removing the element, hide it and clear its value.
        // This ensures the empty value is sent to the server on save.
        const input = itemDiv.querySelector('.finding-input');
        if (input) input.value = '';
        itemDiv.classList.add('hidden');
    });
}

let selectedAvatarFile = null; // To hold the file object for upload

function displayImagePreview(source) {
    if (source instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
            patientAvatarPreview.src = e.target.result;
            patientAvatarPreview.classList.remove('hidden');
            document.getElementById('clearPatientAvatar').classList.remove('hidden');
            patientAvatarPreview.dataset.filename = source.name; // Store filename for later reference
        };
        reader.readAsDataURL(source);
        selectedAvatarFile = source;
    } else if (typeof source === 'string' && source) { // Existing filename from DB
        patientAvatarPreview.src = `/images/${source}`;
        patientAvatarPreview.classList.remove('hidden');
        document.getElementById('clearPatientAvatar').classList.remove('hidden');
        patientAvatarPreview.dataset.filename = source; // Store filename for later reference
        selectedAvatarFile = null; // No new file selected
    } else {
        clearAvatarPreview();
    }
}

function clearAvatarPreview() {
    patientAvatarPreview.src = '';
    patientAvatarPreview.classList.add('hidden');
    document.getElementById('clearPatientAvatar').classList.add('hidden');
    patientAvatarFileInput.value = ''; // Clear the file input
    patientAvatarPreview.dataset.filename = ''; // Indicate no file is set
    selectedAvatarFile = null;
}

function saveCurrentConsultationToState(specialityId) {
    const builder = document.getElementById('consultationBuilder');
    if (!builder.innerHTML) return;

    const consultationData = JSON.parse(document.getElementById('Consultations').value || '{}');
    const rules = [];

    // Save default response
    const defaultResponse = builder.querySelector('.consultation-default-response').value.trim();
    if (defaultResponse) {
        rules.push({ default: defaultResponse });
    }

    // Save conditional rules
    builder.querySelectorAll('#consultationRulesContainer .consultation-rule').forEach(ruleDiv => {
        const requires = JSON.parse(ruleDiv.querySelector('.requires-actions').dataset.actions || '[]');
        const missing = JSON.parse(ruleDiv.querySelector('.missing-actions').dataset.actions || '[]');
        const response = ruleDiv.querySelector('.consultation-conditional-response').value.trim();

        if (response && (requires.length > 0 || missing.length > 0)) {
            rules.push({ condition: { requires, missing }, response });
        }
    });

    consultationData[specialityId] = rules;
    document.getElementById('Consultations').value = JSON.stringify(consultationData, null, 2);
}

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        fetchAndRenderPatients(),
        fetchAllActions(),
        fetchAllConsultations() // NEW

    ]);

    // --- NEW: Consultation Builder Logic ---
    const consultantSelect = document.getElementById('consultantSelect');
    allConsultations.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        consultantSelect.appendChild(option);
    });

    consultantSelect.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        buildConsultationUI(selectedId);
    });

    document.getElementById('consultantList').addEventListener('click', (e) => {
        if (e.target.classList.contains('consultant-list-item')) {
            const specialityId = e.target.dataset.id;
            consultantSelect.value = specialityId;
            buildConsultationUI(specialityId);
        }
    });

    // --- REVISED: Sidebar Collapse/Expand Logic ---
    const sidebars = document.querySelectorAll('.admin-sidebar');
    sidebars.forEach(sidebar => {
        const sidebarContent = document.createElement('div');
        sidebarContent.className = 'admin-sidebar-content';

        // Move all existing children of the sidebar into the new content wrapper
        while (sidebar.firstChild) {
            sidebarContent.appendChild(sidebar.firstChild);
        }
        sidebar.appendChild(sidebarContent);

        // Create and add the toggle button to the sidebar
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn-sidebar-toggle';
        toggleBtn.innerHTML = '&#9664;'; // Left arrow
        toggleBtn.title = 'Collapse Sidebar';
        sidebar.appendChild(toggleBtn);

        toggleBtn.addEventListener('click', () => {
            const isCollapsed = sidebar.classList.toggle('collapsed');
            toggleBtn.innerHTML = isCollapsed ? '&#9654;' : '&#9664;'; // Right/Left arrow
        });
    });

    // --- NEW: Dynamically add the missing Fallbeskrivning field ---
    const patientInfoSection = document.querySelector('.form-section .form-grid');
    if (patientInfoSection && !document.getElementById('Fallbeskrivning')) {
        const fallbeskrivningGroup = document.createElement('div');
        fallbeskrivningGroup.className = 'form-group';
        fallbeskrivningGroup.style.gridColumn = '1 / -1'; // Make it span the full width

        fallbeskrivningGroup.innerHTML = `
            <label for="Fallbeskrivning">Fallbeskrivning (Case Description)</label>
            <textarea id="Fallbeskrivning" rows="4" placeholder="A short summary of the case for the feedback report..."></textarea>
        `;

        // Insert it after the 'Diagnosis' field for logical grouping
        const diagnosisField = document.getElementById('Diagnosis')?.parentElement;
        patientInfoSection.insertBefore(fallbeskrivningGroup, diagnosisField ? diagnosisField.nextSibling : null);
    }

    // --- NEW: Dynamically add Akutrum-specific fields ---
    if (patientInfoSection && !document.getElementById('isAkutrumCase')) {
        const akutrumGroup = document.createElement('div');
        akutrumGroup.className = 'form-group';
        akutrumGroup.innerHTML = `
            <label for="isAkutrumCase" style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" id="isAkutrumCase" style="width: auto;">
                Is this an Akutrum (pre-arrival) case?
            </label>
        `;
        const ambulanceReportGroup = document.createElement('div');
        ambulanceReportGroup.className = 'form-group';
        ambulanceReportGroup.style.gridColumn = '1 / -1';
        ambulanceReportGroup.innerHTML = `
            <label for="AmbulanceReport">Ambulance Pre-arrival Report</label>
            <textarea id="AmbulanceReport" rows="4" placeholder="Enter the pre-arrival report from the ambulance..."></textarea>
        `;
        patientInfoSection.appendChild(akutrumGroup);
        patientInfoSection.appendChild(ambulanceReportGroup);
    }

    fetchAndRenderActivePatients();
    setInterval(fetchAndRenderActivePatients, 3000); // Refresh active patients every 3 seconds

    form.addEventListener('submit', savePatient);
    btnNewCase.addEventListener('click', () => populateForm(null));
    btnDeleteCase.addEventListener('click', deletePatient);

    patientList.addEventListener('click', (e) => {
        if (e.target.classList.contains('patient-list-item')) {
            const patient = allPatients.find(p => p._id === e.target.dataset.id);
            populateForm(null); // --- FIX: Clear the form completely before populating it ---
            populateForm(patient);
        }
    });

    // --- Patient Avatar Drag & Drop ---
    patientAvatarDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        patientAvatarDropZone.classList.add('drag-over');
    });

    patientAvatarDropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        patientAvatarDropZone.classList.remove('drag-over');
    });

    patientAvatarDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        patientAvatarDropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            patientAvatarFileInput.files = files; // Assign dropped file to input
            displayImagePreview(files[0]);
        }
    });

    patientAvatarDropZone.addEventListener('click', () => {
        patientAvatarFileInput.click(); // Trigger file input click
    });

    patientAvatarFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) displayImagePreview(e.target.files[0]);
    });

    document.getElementById('clearPatientAvatar').addEventListener('click', clearAvatarPreview);

    // Initialize all the feature modules
    initActionSelector(allActions);
    initAdmissionPlanManager(allActions);
    initAnamnesisManager();
    initHomeMedManager(allActions);
    initPrescriptionManager(allActions);
    // --- Event Listeners for Modal Triggers ---

    // Anamnesis "Add Question" button
    document.getElementById('btnAddAnamnesisQuestion').addEventListener('click', () => {
        document.getElementById('anamnesisQuestionIndex').value = '';
        document.getElementById('anamnesisQuestionText').value = '';
        document.getElementById('anamnesisKeywordsContainer').innerHTML = '';
        document.getElementById('anamnesisQuestionModal').classList.add('visible');
    });

    // All "Select... Actions" buttons
    console.log("[DEBUG] Attaching event listeners to 'Select Actions' buttons...");
    document.querySelectorAll('.btn-select-actions').forEach(button => {
        button.addEventListener('click', (e) => {
            console.log(`[DEBUG] '${e.target.textContent}' button clicked. Calling openActionSelector with target:`, e.target.dataset.target);
            // --- MODIFIED: Pass a callback for the simplified selector ---
            const targetId = e.target.dataset.target;
            if (targetId === 'requires' || targetId === 'missing') {
                // This is a simplified call for the consultation builder, handled in admin.js
            } else {
                openLegacyActionSelector(targetId); // Original behavior for Critical/Recommended
            }
        });
    });

    // Admission Plan "Add Medication" button
    document.getElementById('btnAddAdmissionPlanMed').addEventListener('click', () => {
        document.getElementById('admissionPlanMedModal').classList.add('visible');
    });

    document.querySelectorAll('.finding-search-input').forEach(input => {
        const handleSearch = (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const category = e.target.dataset.category;
            const resultsContainer = e.target.nextElementSibling;

            let actionsForCategory;
            // If the category is A, B, C, D, or E, filter by the new `abcdeCategory` property.
            if (['A', 'B', 'C', 'D', 'E'].includes(category)) {
                // --- DEBUG: Log what's being filtered ---
                console.log(`[FRONTEND-DEBUG] Searching ABCDE category '${category}' for term '${searchTerm}'`);

                // --- FIX: Filter based on the `isAbcdeSpecific` flag from the server ---
                // This correctly shows only actions that have their findings defined in ABCDE.xlsx.
                actionsForCategory = allActions.filter(a => 
                    a.isAbcdeSpecific &&                                // Must be an ABCDE-specific action
                    a.abcdeCategory.includes(category) &&               // Must belong to the correct letter (A, B, C...)
                    a.name.toLowerCase().includes(searchTerm)           // Must match the search term
                );
                console.log(`[FRONTEND-DEBUG] Found ${actionsForCategory.length} matching actions.`);
                // ---
            } else {
                // Otherwise, use the original category filtering.
                // --- NEW DEBUGGING ---
                console.log(`[DEBUG] Searching standard category '${category}' for term '${searchTerm}'`);
                const sampleAction = allActions.find(a => a.name === 'Hjärta');
                console.log(`[DEBUG] Sample 'Hjärta' action has category:`, sampleAction?.category);

                actionsForCategory = allActions.filter(a => a.category === category && a.name.toLowerCase().includes(searchTerm));
                console.log(`[DEBUG] Found ${actionsForCategory.length} matching actions for this category.`);
                // ---
            }

            // --- NEW: Show all results if search is empty, otherwise slice ---
            const resultsToShow = searchTerm.length > 0 ? actionsForCategory.slice(0, 5) : actionsForCategory;
            resultsContainer.innerHTML = ''; // Clear previous results

            resultsToShow.forEach(action => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.textContent = action.name;
                resultItem.addEventListener('click', () => {
                    addFindingItem(category, action);
                    input.value = '';
                    resultsContainer.style.display = 'none'; // Hide after selection
                });
                resultsContainer.appendChild(resultItem);
            });

            // Show the results container if there are items to show
            resultsContainer.style.display = resultsToShow.length > 0 ? 'block' : 'none';
        };

        input.addEventListener('input', handleSearch);
        input.addEventListener('focus', handleSearch);
        // Hide results when user clicks away, with a delay to allow item clicks
        input.addEventListener('blur', (e) => setTimeout(() => { e.target.nextElementSibling.style.display = 'none'; }, 150));
    });

    // --- Login Modal Logic ---
    document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        const errorEl = document.getElementById('adminLoginError');

        try {
            const response = await fetch(`${BASE_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok || !data.user.isAdmin) {
                throw new Error(data.message || 'Login failed or not an admin.');
            }
            // On successful admin login, reload the page to re-trigger the auth checks
            window.location.reload();
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        }
    });

});
