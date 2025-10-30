import { renderSelectedActionTags } from '../common/ui.js';

const actionSelectorModal = document.getElementById('actionSelectorModal');
const actionListContainer = document.getElementById('actionListContainer');
const btnToggleGroupMode = document.getElementById('btnToggleGroupMode');

const actionSearchInput = document.getElementById('actionSearchInput'); // Get reference here
const confirmActionSelectionBtn = document.getElementById('confirmActionSelection'); // Get reference here

let allActions = [];
let currentActionTarget = null;
let currentSelectionCallback = null; // Stores the callback function for consultation actions
let currentMode = 'legacy'; // 'legacy' or 'consultation'
let _currentOtherCategoryIds = {}; // Stores otherCategoryIds for the currently open modal
let isGroupingOr = false;

// Helper to get currently selected IDs from the modal UI
function getCurrentlySelectedIdsFromModal() {
    const selectedIds = [];
    document.querySelectorAll('#actionListContainer input[type="checkbox"]:checked').forEach(cb => {
        if (cb.dataset.group) { // Handle OR groups
            selectedIds.push(JSON.parse(cb.dataset.group));
        } else { // Handle single actions
            selectedIds.push(cb.dataset.id);
        }
    });
    return selectedIds;
}

function renderActionCheckboxes(actions, currentRawSelection, otherCategoryIds) {
    actionListContainer.innerHTML = '';
    const currentSelectedIdsSet = new Set(currentRawSelection.flat());

    const categorizedActions = actions.reduce((acc, action) => {
        if (!acc[action.category]) acc[action.category] = [];
        acc[action.category].push(action);
        return acc;
    }, {});

    const categoryOrder = ['Physical Exam', 'Bedside Test', 'Lab Test', 'Radiology', 'Medication', 'Consultation'];
    const sortedCategories = Object.keys(categorizedActions).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    sortedCategories.forEach(category => {
        const categoryGroup = document.createElement('div');
        categoryGroup.className = 'action-category-group';
        categoryGroup.innerHTML = `<h4>${category}</h4>`;
        const checkboxGrid = document.createElement('div');
        checkboxGrid.className = 'action-checkbox-grid';

        categorizedActions[category].forEach(action => {
            const isPartOfOrGroup = currentRawSelection.some(item => Array.isArray(item) && item.includes(action.id));
            if (isPartOfOrGroup) return; // Skip if already part of an OR group

            const checkboxId = `action-checkbox-${action.id}`;
            const label = document.createElement('label');
            label.className = 'checkbox-label';

            let otherCategory = null;
            if (otherCategoryIds.Critical?.has(action.id)) otherCategory = 'Critical';
            else if (otherCategoryIds.Recommended?.has(action.id)) otherCategory = 'Recommended';
            else if (otherCategoryIds.Contraindicated?.has(action.id)) otherCategory = 'Contraindicated';

            if (otherCategory) {
                label.classList.add('is-in-other-category');
                label.dataset.otherCategory = otherCategory;
            }

            const isFrozen = isGroupingOr && currentSelectedIdsSet.has(action.id);
            if (isFrozen) {
                label.classList.add('is-frozen');
            }

            label.setAttribute('for', checkboxId);
            label.innerHTML = `
                <input type="checkbox" id="${checkboxId}" data-id="${action.id}" 
                    ${currentSelectedIdsSet.has(action.id) ? 'checked' : ''} 
                    ${otherCategory || isFrozen ? 'disabled' : ''}>
                <span>${action.name}</span>
            `;
            checkboxGrid.appendChild(label);
        });
        categoryGroup.appendChild(checkboxGrid);
        actionListContainer.appendChild(categoryGroup);
    });

    currentRawSelection.forEach(item => {
        if (Array.isArray(item)) { // Render existing OR groups at the top
            const groupId = `or-group-${item.join('-')}`;
            const label = document.createElement('label');
            label.className = 'checkbox-label is-or-group';
            label.setAttribute('for', groupId);
            const groupNames = item.map(id => allActions.find(a => a.id === id)?.name || id).join(' or ');
            label.innerHTML = `
                <input type="checkbox" id="${groupId}" data-group='${JSON.stringify(item)}' checked>
                <span>${groupNames}</span>
            `;
            actionListContainer.insertBefore(label, actionListContainer.firstChild);
        }
    });
}

export function openLegacyActionSelector(target) {
    console.log("[DEBUG] openLegacyActionSelector() called for target:", target);
    actionSearchInput.value = ''; // Clear search input
    currentMode = 'legacy'; // Set the mode
    currentActionTarget = target;
    const title = document.querySelector(`.btn-select-actions[data-target="${target}"]`).textContent;
    document.getElementById('actionSelectorTitle').textContent = title;

    // --- FIX: Ensure the group mode button is visible for legacy action selectors ---
    isGroupingOr = false; // Reset grouping state
    btnToggleGroupMode.classList.remove('active');
    btnToggleGroupMode.textContent = 'Start Creating a Group';
    btnToggleGroupMode.style.display = 'inline-block'; // Make sure it's visible

    const criticalJson = document.getElementById('ActionsCritical').value;
    const recommendedJson = document.getElementById('ActionsRecommended').value;
    const contraindicatedJson = document.getElementById('ActionsContraindicated').value;
    
    const criticalIds = new Set(JSON.parse(criticalJson || '[]').flat());
    const recommendedIds = new Set(JSON.parse(recommendedJson || '[]').flat());
    const contraindicatedIds = new Set(JSON.parse(contraindicatedJson || '[]').flat());
    currentSelectionCallback = null; // Ensure callback is null for legacy mode
    
    let currentRaw = [];
    const otherCategoryIds = {};
    
    if (currentActionTarget === 'ActionsCritical') {
        currentRaw = JSON.parse(criticalJson || '[]');
        otherCategoryIds.Recommended = recommendedIds;
        otherCategoryIds.Contraindicated = contraindicatedIds;
    } else if (currentActionTarget === 'ActionsRecommended') {
        currentRaw = JSON.parse(recommendedJson || '[]');
        otherCategoryIds.Critical = criticalIds;
        otherCategoryIds.Contraindicated = contraindicatedIds;
    } else if (currentActionTarget === 'ActionsContraindicated') {
        currentRaw = JSON.parse(contraindicatedJson || '[]');
        otherCategoryIds.Critical = criticalIds;
        otherCategoryIds.Recommended = recommendedIds;
    }
    _currentOtherCategoryIds = otherCategoryIds; // Store globally for search/group mode

    renderActionCheckboxes(allActions, currentRaw, otherCategoryIds);
    actionSelectorModal.classList.add('visible');
}

export function openConsultationActionSelector(callback) {
    console.log("[DEBUG] openConsultationActionSelector() called.");
    actionSearchInput.value = ''; // Clear search input
    currentMode = 'consultation'; // Set the mode
    document.getElementById('actionSelectorTitle').textContent = "Select Actions";
    currentActionTarget = null; // Ensure target is null for consultation mode
    currentSelectionCallback = callback; // Set the callback for consultation actions
    _currentOtherCategoryIds = {}; // No other categories for consultation
    renderActionCheckboxes(allActions, [], {}); // Render with no pre-selection or disabled items
    actionSelectorModal.classList.add('visible');

    // Hide group mode for consultation selector
    isGroupingOr = false; // Reset
    btnToggleGroupMode.classList.remove('active');
    btnToggleGroupMode.textContent = 'Start Creating a Group';
    btnToggleGroupMode.style.display = 'none'; // Hide for consultation
}

export function initActionSelector(actions) {
    allActions = actions;

    actionSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredActions = allActions.filter(a => a.name.toLowerCase().includes(searchTerm) || a.category.toLowerCase().includes(searchTerm));
        
        // --- FIX: Use the correct source of truth for the current selection ---
        let currentRawSelection = [];
        if (currentMode === 'legacy') {
            // Legacy mode (Critical/Recommended): The hidden input is the source of truth.
            currentRawSelection = JSON.parse(document.getElementById(currentActionTarget).value || '[]');
        } else {
            // Consultation mode: The checkboxes currently in the modal are the source of truth.
            currentRawSelection = getCurrentlySelectedIdsFromModal();
        }
        renderActionCheckboxes(filteredActions, currentRawSelection, _currentOtherCategoryIds);
    });

    confirmActionSelectionBtn.addEventListener('click', () => {
        const finalSelection = getCurrentlySelectedIdsFromModal();

        if (currentSelectionCallback) {
            // Consultation mode: use the callback
            currentSelectionCallback(finalSelection);
        } else if (currentActionTarget) {
            // Legacy mode: update the hidden input and render tags
            const jsonString = JSON.stringify(finalSelection);
            document.getElementById(currentActionTarget).value = jsonString;
            renderSelectedActionTags(currentActionTarget, jsonString, allActions);
        }
        actionSelectorModal.classList.remove('visible');
    });

    document.getElementById('closeActionSelector').addEventListener('click', () => {
        actionSelectorModal.classList.remove('visible');
    });

    btnToggleGroupMode.addEventListener('click', () => {
        if (currentSelectionCallback) { // Group mode is not supported for consultation selector
            alert('Group mode is not available for this selection.');
            return;
        }

        isGroupingOr = !isGroupingOr;
        btnToggleGroupMode.classList.toggle('active', isGroupingOr);

        if (isGroupingOr) {
            btnToggleGroupMode.textContent = 'Finish Group';
            // Get current selection from modal, not from hidden input
            const currentSelectedInModal = getCurrentlySelectedIdsFromModal();
            renderActionCheckboxes(allActions, currentSelectedInModal, _currentOtherCategoryIds);
        } else {
            btnToggleGroupMode.textContent = 'Start Creating a Group';
            const newGroupIds = Array.from(document.querySelectorAll('#actionListContainer input:checked'))
                .filter(cb => !cb.closest('.is-frozen'))
                .map(cb => cb.dataset.id);

            if (newGroupIds.length < 2) {
                alert('You must select at least two new actions to create a group.');
                // Re-render with current selection if group creation failed
                renderActionCheckboxes(allActions, getCurrentlySelectedIdsFromModal(), _currentOtherCategoryIds);
                return;
            }

            let currentRaw = JSON.parse(document.getElementById(currentActionTarget).value || '[]');
            currentRaw.push(newGroupIds);
            renderActionCheckboxes(allActions, currentRaw, _currentOtherCategoryIds);
        }
    });

     actionListContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            actionSearchInput.focus();
        }
    });
}
