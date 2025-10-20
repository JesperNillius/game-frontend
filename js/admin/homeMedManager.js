import { renderHomeMedList } from '../common/ui.js';

let allActions = [];

export function initHomeMedManager(actions) {
    allActions = actions;

    const homeMedSearchInput = document.getElementById('homeMedSearchInput');
    const homeMedSearchResults = document.getElementById('homeMedSearchResults');
    const addHomeMedModal = document.getElementById('addHomeMedModal');
    const homeMedModalTitle = document.getElementById('homeMedModalTitle');
    const homeMedModalId = document.getElementById('homeMedModalId');
    const homeMedModalUnit = document.getElementById('homeMedModalUnit');
    const homeMedModalDose = document.getElementById('homeMedModalDose');
    const homeMedModalDoseUnit = document.getElementById('homeMedModalDoseUnit');
    const homeMedModalFrequency = document.getElementById('homeMedModalFrequency');
    const homeMedModalPauseRec = document.getElementById('homeMedModalPauseRec');
    const btnConfirmAddHomeMed = document.getElementById('btnConfirmAddHomeMed');
    const closeHomeMedModal = document.getElementById('closeHomeMedModal');

    homeMedSearchInput.addEventListener('input', () => {
        const searchTerm = homeMedSearchInput.value.toLowerCase();
        homeMedSearchResults.innerHTML = '';
        if (searchTerm.length < 2) return;

        const medActions = allActions.filter(a => a.category === 'Medication');
        const results = medActions.filter(med => med.name.toLowerCase().includes(searchTerm));

        results.slice(0, 5).forEach(med => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.textContent = med.name;
            item.dataset.id = med.id;
            item.dataset.unit = med.doseUnit || 'st';
            homeMedSearchResults.appendChild(item);
        });
    });

    homeMedSearchResults.addEventListener('click', (e) => {
        if (e.target.classList.contains('search-result-item')) {
            // Instead of prompt, we now open the modal
            homeMedModalTitle.textContent = `Add ${e.target.textContent}`;
            homeMedModalId.value = e.target.dataset.id;
            homeMedModalUnit.value = e.target.dataset.unit;
            homeMedModalDose.value = '';
            homeMedModalFrequency.selectedIndex = 0; // Reset to the first option
            homeMedModalDoseUnit.textContent = e.target.dataset.unit;
            homeMedModalPauseRec.value = 'dm'; // Reset to default

            addHomeMedModal.classList.add('visible');
            homeMedModalDose.focus();

            homeMedSearchInput.value = '';
            homeMedSearchResults.innerHTML = '';
        }
    });

    btnConfirmAddHomeMed.addEventListener('click', () => {
        const medId = homeMedModalId.value;
        const unit = homeMedModalUnit.value;
        const dose = parseFloat(homeMedModalDose.value);
        const frequency = homeMedModalFrequency.value.trim();
        const pauseRecommendation = homeMedModalPauseRec.value;

        // Basic validation
        if (!medId || isNaN(dose) || frequency === '') {
            alert('Please enter a valid dose and frequency.');
            return;
        }
        const newItem = { medId, dose, unit, frequency, pauseRecommendation };
        let currentList = JSON.parse(document.getElementById('Läkemedelslista').value || '[]');
        currentList.push(newItem);
        
        // Let renderHomeMedList handle updating the UI and the hidden input
        renderHomeMedList(JSON.stringify(currentList), allActions);

        addHomeMedModal.classList.remove('visible');
    });

    closeHomeMedModal.addEventListener('click', () => {
        addHomeMedModal.classList.remove('visible');
    });

    document.getElementById('homeMedListContainer').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-home-med')) {
            const indexToRemove = parseInt(e.target.dataset.index, 10); // Ensure index is a number
            let currentList = JSON.parse(document.getElementById('Läkemedelslista').value || '[]');
            currentList.splice(indexToRemove, 1);
            renderHomeMedList(JSON.stringify(currentList), allActions);
        }
    });
}