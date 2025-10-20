import { renderSelectedActionTags, renderHomeMedList, renderAnamnesisChecklist, populateAdmissionPlanUI, renderAdmissionPlanMeds } from '../common/ui.js';
import { initActionSelector, openActionSelector } from './actionSelector.js';
import { initAdmissionPlanManager } from './admissionPlanManager.js';
import { initAnamnesisManager } from './anamnesisManager.js';
import { initHomeMedManager } from './homeMedManager.js';
import { initPrescriptionManager } from './prescriptionManager.js';



const API_URL = 'http://localhost:3000/api/admin';

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
    } catch (error) {
        console.error("Failed to fetch all actions:", error);
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
        patientIdField.value = '';
        return;
    }

    // Clear action containers before populating
    document.querySelectorAll('.selected-actions-container, .item-list-container, #anamnesisChecklistContainer').forEach(c => c.innerHTML = '');
    document.querySelectorAll('.findings-container').forEach(c => c.innerHTML = '');
    document.querySelectorAll('.admin-plan-monitoring-grid .btn-toggle').forEach(btn => btn.classList.remove('active'));
    clearAvatarPreview(); // Clear existing preview

    // Explicitly populate the Anamnesis prompt field from the 'Prompt' key.
    document.getElementById('Anamnesis').value = patient.Prompt || '';

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
            }

            // For all elements that are not checkboxes, attempt to set their value.
            if (element.type !== 'checkbox' && patient[key] != null) {
                element.value = patient[key];
            }
        } else {
            // If there's no direct form element, it might be an abnormal finding
            if (key === 'EKG_finding_text' || key === 'EKG_image_filename') {
                if (document.getElementById('abnormalFindingsBedside Test') && !document.getElementById('abnormalFindingsBedside Test').querySelector('.ekg-item')) {
                     const ekgAction = allActions.find(a => a.id === 'ekg');
                     if (ekgAction) {
                         addFindingItem('Bedside Test', ekgAction, {
                             finding: patient.EKG_finding_text,
                             image: patient.EKG_image_filename
                         });
                     }
                }
            } else {
                const action = allActions.find(a => a.id.toLowerCase() === key.toLowerCase());
                if (action) {
                    addFindingItem(action.category, action, patient[key]);
                }
            }
        }
    });

    patientIdField.value = patient._id;
    btnDeleteCase.classList.remove('hidden');
}

async function savePatient(e) {
    e.preventDefault();

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
            // This is an abnormal finding input. It is handled by the dedicated
            // logic below, so we skip it here to prevent it from being saved twice.
            return;
        } else if (element.id === 'AdmissionPlanSolution') {
            // This field is handled separately later, so we explicitly skip it here
            // to avoid appending it twice.
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

    // --- 3. Gather abnormal findings ---
    document.querySelectorAll('.finding-input-item').forEach(item => {
        if (item.classList.contains('ekg-item')) {
            const findingInput = item.querySelector('#EKG_finding_text_dynamic');
            const imageInput = item.querySelector('#EKG_image_filename_dynamic');
            if (findingInput && findingInput.value.trim()) formData.append('EKG_finding_text', findingInput.value);
            if (imageInput && imageInput.value.trim()) formData.append('EKG_image_filename', imageInput.value);
        } else {
            const input = item.querySelector('.finding-input');
            if (input && input.value.trim()) {
                // ✅ FIX: Normalize the action ID from the dataset to prevent character encoding issues.
                // This was the missing piece.
                const normalizedActionId = (input.dataset.actionId || '').normalize('NFC');
                formData.append(normalizedActionId, input.value.trim());
            }
        }
    });

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
        itemDiv.remove();
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

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        fetchAndRenderPatients(),
        fetchAllActions()
    ]);

    fetchAndRenderActivePatients();
    setInterval(fetchAndRenderActivePatients, 3000); // Refresh active patients every 3 seconds

    form.addEventListener('submit', savePatient);
    btnNewCase.addEventListener('click', () => populateForm(null));
    btnDeleteCase.addEventListener('click', deletePatient);

    patientList.addEventListener('click', (e) => {
        if (e.target.classList.contains('patient-list-item')) {
            const patient = allPatients.find(p => p._id === e.target.dataset.id);
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
            openActionSelector(e.target.dataset.target);
        });
    });

    // Admission Plan "Add Medication" button
    document.getElementById('btnAddAdmissionPlanMed').addEventListener('click', () => {
        document.getElementById('admissionPlanMedModal').classList.add('visible');
    });

    document.querySelectorAll('.finding-search-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const category = e.target.dataset.category;
            const resultsContainer = e.target.nextElementSibling;
            resultsContainer.innerHTML = '';

            if (searchTerm.length < 1) return;

            const actionsForCategory = allActions.filter(a => a.category === category && a.name.toLowerCase().includes(searchTerm));

            actionsForCategory.slice(0, 5).forEach(action => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.textContent = action.name;
                resultItem.addEventListener('click', () => {
                    addFindingItem(category, action);
                    input.value = '';
                    resultsContainer.innerHTML = '';
                });
                resultsContainer.appendChild(resultItem);
            });
        });
    });

    // --- Login Modal Logic ---
    document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        const errorEl = document.getElementById('adminLoginError');

        try {
            const response = await fetch('/api/auth/login', {
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
