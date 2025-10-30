import { renderAnamnesisChecklist, renderAnamnesisKeywords, addKeywordToModal } from '../common/ui.js';

export function initAnamnesisManager() {

    const anamnesisModal = document.getElementById('anamnesisQuestionModal');
    const closeBtn = document.getElementById('closeAnamnesisModal');
    const checklistContainer = document.getElementById('anamnesisChecklistContainer');
    const keywordInput = document.getElementById('anamnesisKeywordInput');
    const keywordsContainer = document.getElementById('anamnesisKeywordsContainer');
    const confirmBtn = document.getElementById('btnConfirmAnamnesisQuestion');

    // Defensive check: Only add listener if the modal and close button exist.
    if (anamnesisModal && closeBtn) {
        closeBtn.addEventListener('click', () => {
            anamnesisModal.classList.remove('visible');
        });
    }

    if (checklistContainer) {
        checklistContainer.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit-anamnesis');
            const removeBtn = e.target.closest('.btn-remove-anamnesis');

            if (editBtn) {
                const index = parseInt(editBtn.dataset.index, 10);
                const checklist = JSON.parse(document.getElementById('AnamnesisChecklist').value || '[]');
                const item = checklist[index];

                if (item) {
                    document.getElementById('anamnesisQuestionIndex').value = index;
                    document.getElementById('anamnesisQuestionText').value = item.question;
                    renderAnamnesisKeywords(item.keywords);
                    if (anamnesisModal) anamnesisModal.classList.add('visible');
                }
            }

            if (removeBtn) {
                const index = parseInt(removeBtn.dataset.index, 10);
                let checklist = JSON.parse(document.getElementById('AnamnesisChecklist').value || '[]');
                checklist.splice(index, 1);
                renderAnamnesisChecklist(checklist);
            }
        });
    }

    if (keywordInput) {
        keywordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const keyword = keywordInput.value.trim();
                if (keyword) {
                    addKeywordToModal(keyword);
                    keywordInput.value = '';
                }
            }
        });
    }

    if (keywordsContainer) {
        keywordsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-keyword')) {
                e.target.parentElement.remove();
            }
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const question = document.getElementById('anamnesisQuestionText').value.trim();
            if (!question) {
                alert('Please enter a question.');
                return;
            }

            const keywords = Array.from(document.querySelectorAll('#anamnesisKeywordsContainer .keyword-tag'))
                .map(tag => tag.textContent.slice(0, -1)); // Remove the '×'

            if (keywords.length === 0) {
                alert('Please add at least one keyword.');
                return;
            }

            const newItem = { question, keywords };
            let checklist = JSON.parse(document.getElementById('AnamnesisChecklist').value || '[]');
            const index = document.getElementById('anamnesisQuestionIndex').value;

            if (index !== '') {
                checklist[parseInt(index, 10)] = newItem;
            } else {
                checklist.push(newItem);
            }

            renderAnamnesisChecklist(checklist);
            if (anamnesisModal) anamnesisModal.classList.remove('visible');
        });
    }
}