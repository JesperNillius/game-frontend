import { renderSelectedActionTags } from '../common/ui.js';

const actionSelectorModal = document.getElementById('actionSelectorModal');
const actionListContainer = document.getElementById('actionListContainer');
const btnToggleGroupMode = document.getElementById('btnToggleGroupMode');

let allActions = [];
let currentActionTarget = null;
let isGroupingOr = false;

function renderActionCheckboxes(actions, currentRawSelection, otherCategoryIds) {
    actionListContainer.innerHTML = '';
    const currentSelectedIdsSet = new Set(currentRawSelection.flat());

    const categorizedActions = actions.reduce((acc, action) => {
        if (!acc[action.category]) acc[action.category] = [];
        acc[action.category].push(action);
        return acc;
    }, {});

    const categoryOrder = ['Physical Exam', 'Bedside Test', 'Lab Test', 'Radiology', 'Medication'];
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
            const parentGroup = currentRawSelection.find(item => Array.isArray(item) && item.includes(action.id));
            if (parentGroup) return;

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
        if (Array.isArray(item)) {
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

export function openActionSelector(target) {
    console.log("[DEBUG] openActionSelector() function has been called.");
    currentActionTarget = target;
    const title = document.querySelector(`.btn-select-actions[data-target="${target}"]`).textContent;
    document.getElementById('actionSelectorTitle').textContent = title;

    isGroupingOr = false;
    btnToggleGroupMode.classList.remove('active');
    btnToggleGroupMode.textContent = 'Start Creating a Group';

    const criticalJson = document.getElementById('ActionsCritical').value;
    const recommendedJson = document.getElementById('ActionsRecommended').value;
    const contraindicatedJson = document.getElementById('ActionsContraindicated').value;

    const criticalIds = new Set(JSON.parse(criticalJson || '[]').flat());
    const recommendedIds = new Set(JSON.parse(recommendedJson || '[]').flat());
    const contraindicatedIds = new Set(JSON.parse(contraindicatedJson || '[]').flat());

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
    } else {
        currentRaw = JSON.parse(contraindicatedJson || '[]');
        otherCategoryIds.Critical = criticalIds;
        otherCategoryIds.Recommended = recommendedIds;
    }

    renderActionCheckboxes(allActions, currentRaw, otherCategoryIds);
    actionSelectorModal.classList.add('visible');
}

export function initActionSelector(actions) {
    allActions = actions;

    document.getElementById('actionSearchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredActions = allActions.filter(a => a.name.toLowerCase().includes(searchTerm) || a.category.toLowerCase().includes(searchTerm));
        const currentRaw = JSON.parse(document.getElementById(currentActionTarget).value || '[]');
        renderActionCheckboxes(filteredActions, currentRaw, {});
    });

    document.getElementById('confirmActionSelection').addEventListener('click', () => {
        const finalSelection = [];
        document.querySelectorAll('#actionListContainer input:checked').forEach(cb => {
            if (cb.dataset.group) {
                finalSelection.push(JSON.parse(cb.dataset.group));
            } else {
                finalSelection.push(cb.dataset.id);
            }
        });
        const jsonString = JSON.stringify(finalSelection);
        document.getElementById(currentActionTarget).value = jsonString;
        renderSelectedActionTags(currentActionTarget, jsonString, allActions);
        actionSelectorModal.classList.remove('visible');
    });

    document.getElementById('closeActionSelector').addEventListener('click', () => {
        actionSelectorModal.classList.remove('visible');
    });

    btnToggleGroupMode.addEventListener('click', () => {
        isGroupingOr = !isGroupingOr;
        btnToggleGroupMode.classList.toggle('active', isGroupingOr);

        if (isGroupingOr) {
            btnToggleGroupMode.textContent = 'Finish Group';
            const currentRaw = JSON.parse(document.getElementById(currentActionTarget).value || '[]');
            renderActionCheckboxes(allActions, currentRaw, {});
        } else {
            btnToggleGroupMode.textContent = 'Start Creating a Group';
            const newGroupIds = Array.from(document.querySelectorAll('#actionListContainer input:checked'))
                .filter(cb => !cb.closest('.is-frozen'))
                .map(cb => cb.dataset.id);

            if (newGroupIds.length < 2) {
                alert('You must select at least two new actions to create a group.');
                renderActionCheckboxes(allActions, JSON.parse(document.getElementById(currentActionTarget).value || '[]'), {});
                return;
            }

            let currentRaw = JSON.parse(document.getElementById(currentActionTarget).value || '[]');
            currentRaw.push(newGroupIds);
            renderActionCheckboxes(allActions, currentRaw, {});
        }
    });

    actionListContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            document.getElementById('actionSearchInput').focus();
        }
    });
}