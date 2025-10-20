import { renderSelectedActionTags } from '../common/ui.js';

const modal = document.getElementById('prescriptionSelectorModal');
const listContainer = document.getElementById('prescriptionListContainer');
const searchInput = document.getElementById('prescriptionSearchInput');

let allPrescribableMeds = [];

function renderPrescriptionCheckboxes(searchTerm = '') {
    listContainer.innerHTML = '';
    const currentSelection = JSON.parse(document.getElementById('PrescriptionsSolution').value || '[]');
    const currentSelectionSet = new Set(currentSelection);

    const filteredMeds = allPrescribableMeds.filter(med =>
        med.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const checkboxGrid = document.createElement('div');
    checkboxGrid.className = 'action-checkbox-grid';

    filteredMeds.forEach(med => {
        const checkboxId = `prescription-checkbox-${med.id}`;
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.setAttribute('for', checkboxId);
        label.innerHTML = `
            <input type="checkbox" id="${checkboxId}" data-id="${med.id}" 
                ${currentSelectionSet.has(med.id) ? 'checked' : ''}>
            <span>${med.name}</span>
        `;
        checkboxGrid.appendChild(label);
    });

    listContainer.appendChild(checkboxGrid);
}

export function initPrescriptionManager(allActions) {
    console.log("[DEBUG] Initializing Prescription Manager...");
    // Get a unique list of all medications and prescriptions
    const medMap = new Map();
    allActions.filter(a => a.category === 'Medication').forEach(med => {
        if (!medMap.has(med.id)) {
            medMap.set(med.id, med);
        }
    });
    allPrescribableMeds = Array.from(medMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // --- Event Listeners ---

    document.getElementById('btnSelectPrescriptions').addEventListener('click', () => {
        console.log("[DEBUG] 'Select Prescriptions' button clicked.");
        renderPrescriptionCheckboxes();
        modal.classList.add('visible');
    });

    document.getElementById('closePrescriptionSelector').addEventListener('click', () => {
        console.log("[DEBUG] Closing prescription modal.");
        modal.classList.remove('visible');
    });

    searchInput.addEventListener('input', () => {
        console.log(`[DEBUG] Searching for prescription: ${searchInput.value}`);
        renderPrescriptionCheckboxes(searchInput.value);
    });

    document.getElementById('confirmPrescriptionSelection').addEventListener('click', () => {
        console.log("[DEBUG] 'Confirm Selection' clicked.");
        const finalSelection = [];
        document.querySelectorAll('#prescriptionListContainer input:checked').forEach(cb => {
            finalSelection.push(cb.dataset.id);
        });

        const jsonString = JSON.stringify(finalSelection);
        document.getElementById('PrescriptionsSolution').value = jsonString;

        console.log("[DEBUG] Final selection:", finalSelection);
        // We need to create a temporary array of action-like objects for the tag renderer
        const selectedActionsForTags = finalSelection.map(id => {
            const med = allPrescribableMeds.find(m => m.id === id);
            return { id: med.id, name: med.name, category: 'Medication' };
        });

        // Re-use the existing tag renderer to display the selected prescriptions
        renderSelectedActionTags('PrescriptionsSolution', jsonString, selectedActionsForTags);

        modal.classList.remove('visible');
    });
}