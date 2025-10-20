import { renderAdmissionPlanMeds } from '../common/ui.js';

const admissionPlanMedModal = document.getElementById('admissionPlanMedModal');
let allActions = [];

export function initAdmissionPlanManager(actions) {
    allActions = actions;

    document.querySelector('.admin-plan-monitoring-grid').addEventListener('click', (e) => {
        const button = e.target.closest('.btn-toggle');
        if (!button) return;

        const parentGroup = button.parentElement;
        if (parentGroup.classList.contains('radio-group')) {
            parentGroup.querySelectorAll('.btn-toggle').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        } else if (parentGroup.classList.contains('multi-select')) {
            button.classList.toggle('active');
        }
    });

    document.getElementById('btnAddAdmissionPlanMed').addEventListener('click', () => {
        admissionPlanMedModal.classList.add('visible');
        document.getElementById('admissionPlanMedSearch').value = '';
        document.getElementById('admissionPlanMedSearchResults').innerHTML = '';
    });

    document.getElementById('closeAdmissionPlanMedModal').addEventListener('click', () => {
        admissionPlanMedModal.classList.remove('visible');
    });

    const admissionPlanMedSearchInput = document.getElementById('admissionPlanMedSearch');
    const admissionPlanMedSearchResults = document.getElementById('admissionPlanMedSearchResults');

    admissionPlanMedSearchInput.addEventListener('input', () => {
        const searchTerm = admissionPlanMedSearchInput.value.toLowerCase();
        admissionPlanMedSearchResults.innerHTML = '';
        if (searchTerm.length < 2) return;

        const medActions = allActions.filter(a => a.category === 'Medication');
        const results = medActions.filter(med => med.name.toLowerCase().includes(searchTerm));

        results.slice(0, 5).forEach(med => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.textContent = med.name;
            item.dataset.id = med.id;
            item.dataset.unit = med.doseUnit || 'st'; // Add unit to dataset
            item.dataset.minDose = med.reasonable_dose_min;
            item.dataset.maxDose = med.reasonable_dose_max;
            admissionPlanMedSearchResults.appendChild(item);
        });
    });

    admissionPlanMedSearchResults.addEventListener('click', (e) => {
        if (e.target.classList.contains('search-result-item')) {
            const medId = e.target.dataset.id;
            const minDose = e.target.dataset.minDose;
            const maxDose = e.target.dataset.maxDose;
            const unit = e.target.dataset.unit;

            admissionPlanMedSearchInput.value = e.target.textContent;
            admissionPlanMedModal.dataset.selectedMedId = medId;
            admissionPlanMedSearchResults.innerHTML = '';

            document.getElementById('admissionPlanDoseContainer').classList.remove('hidden');
            document.getElementById('btnConfirmAddAdmissionPlanMed').classList.remove('hidden');
            document.getElementById('btnConfirmAddAdmissionPlanMedOr').classList.remove('hidden');

            if (minDose !== 'undefined' && maxDose !== 'undefined') {
                document.getElementById('predefinedDoseInfo').classList.remove('hidden');
                document.getElementById('manualDoseInputs').classList.add('hidden');
                document.getElementById('predefinedDoseRange').textContent = `${minDose} - ${maxDose}`;
            } else {
                document.getElementById('predefinedDoseInfo').classList.add('hidden');
                document.getElementById('manualDoseInputs').classList.remove('hidden');
                document.getElementById('admissionPlanMinDose').value = '';
                document.getElementById('admissionPlanMaxDose').value = '';
                document.getElementById('admissionPlanMinDoseUnit').textContent = unit;
                document.getElementById('admissionPlanMaxDoseUnit').textContent = unit;
            }
        }
    });

    document.getElementById('btnConfirmAddAdmissionPlanMed').addEventListener('click', () => {
        const medId = admissionPlanMedModal.dataset.selectedMedId;
        if (!medId) return;

        const currentPlan = JSON.parse(document.getElementById('AdmissionPlanSolution').value || '{}');
        if (!currentPlan.medications) currentPlan.medications = [];
        const isVidBehov = document.getElementById('admissionPlanVidBehov').checked;
        const newMed = { id: medId };

        if (isVidBehov) {
            newMed.vidBehov = true;
        } else if (!document.getElementById('manualDoseInputs').classList.contains('hidden')) {
            const min = parseFloat(document.getElementById('admissionPlanMinDose').value);
            const max = parseFloat(document.getElementById('admissionPlanMaxDose').value);
            if (isNaN(min) || isNaN(max)) {
                alert('Please enter valid numbers for dose range.');
                return;
            }
            newMed.reasonable_dose_min = min;
            newMed.reasonable_dose_max = max;
        }

        currentPlan.medications.push(newMed);

        document.getElementById('AdmissionPlanSolution').value = JSON.stringify(currentPlan);
        renderAdmissionPlanMeds(currentPlan.medications, allActions);
        admissionPlanMedModal.classList.remove('visible');
        admissionPlanMedModal.dataset.selectedMedId = '';
    });

    document.getElementById('btnConfirmAddAdmissionPlanMedOr').addEventListener('click', () => {
        const medId = admissionPlanMedModal.dataset.selectedMedId;
        if (!medId) return;

        const currentPlan = JSON.parse(document.getElementById('AdmissionPlanSolution').value || '{}');
        if (!currentPlan.medications) currentPlan.medications = [];
        const isVidBehov = document.getElementById('admissionPlanVidBehov').checked;
        const newMed = { id: medId };

        if (isVidBehov) {
            newMed.vidBehov = true;
        } else if (!document.getElementById('manualDoseInputs').classList.contains('hidden')) {
            const min = parseFloat(document.getElementById('admissionPlanMinDose').value);
            const max = parseFloat(document.getElementById('admissionPlanMaxDose').value);
            if (isNaN(min) || isNaN(max)) {
                alert('Please enter valid numbers for dose range.');
                return;
            }
            newMed.reasonable_dose_min = min;
            newMed.reasonable_dose_max = max;
        }

        const lastItem = currentPlan.medications[currentPlan.medications.length - 1];
        if (lastItem && !Array.isArray(lastItem)) {
            currentPlan.medications[currentPlan.medications.length - 1] = [lastItem, newMed];
        } else if (lastItem && Array.isArray(lastItem)) {
            lastItem.push(newMed);
        } else {
            currentPlan.medications.push(newMed); // Add as a single item if there's no previous item
        }
        document.getElementById('AdmissionPlanSolution').value = JSON.stringify(currentPlan);
        renderAdmissionPlanMeds(currentPlan.medications, allActions);
        admissionPlanMedModal.classList.remove('visible');
    });

    // ✅ FIX: Add a null check to prevent a crash if the element doesn't exist.
    // This error suggests the ID might be missing or misspelled in the admin page's HTML.
    const medListContainer = document.getElementById('admissionPlanMedListContainer');
    if (medListContainer) {
        medListContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-admission-plan-med')) {
                const indexToRemove = parseInt(e.target.dataset.index, 10);
                const currentPlan = JSON.parse(document.getElementById('AdmissionPlanSolution').value || '{}');
                currentPlan.medications?.splice(indexToRemove, 1);
                document.getElementById('AdmissionPlanSolution').value = JSON.stringify(currentPlan);
                renderAdmissionPlanMeds(currentPlan.medications, allActions);
            }
        });
    }
}