import * as api from '../api.js';
import { API_URL } from '../api.js'; // Import the missing constant

export default class PlayerManager {
    constructor(game) {
        this.game = game;
        this.ui = game.ui;
    }

    async checkInitialAuth() {
        try {
            const status = await api.checkAuthStatus();
            // --- NEW: Store user settings on the game controller ---
            // --- AUTH DEBUG: Log initial authentication status ---
            console.log('[AUTH TRACE] Initial auth status check on page load:', status);
            // ---
            this.game.userSettings = status.user?.settings || { showAkutrumIntro: true };
            if (status.user) {
                this.updateUserUI(status.user);
            }
        } catch (error) {
            this.updateUserUI(null);
        }
    }

    async registerUser(username, password) {
        try {
            const response = await api.registerUser(username, password);
            const registerError = document.getElementById('registerError');
            const registerSuccess = document.getElementById('registerSuccess');
            if (response.ok) {
                registerError.classList.add('hidden');
                registerSuccess.classList.remove('hidden');
                setTimeout(() => {
                    this.showLoginMenu();
                    registerSuccess.classList.add('hidden');
                }, 2000);
            } else {
                const data = await response.json();
                registerSuccess.classList.add('hidden');
                registerError.textContent = data.message || 'Registration failed.';
                registerError.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Could not connect to the server for registration.', err);
        }
    }

    showMenuView(view) {
        const mainMenu = document.getElementById('mainMenuControls');
        const loginMenu = document.getElementById('loginControls');
        const menuContainer = document.getElementById('menu');
        menuContainer.classList.remove('hidden');
        if (view === 'login') {
            mainMenu.style.display = 'none';
            loginMenu.classList.remove('hidden');
        } else {
            mainMenu.style.display = 'flex';
            if (this.game.spawnTimer) clearInterval(this.game.spawnTimer);
            this.game.stopVitalsPolling();
            loginMenu.classList.add('hidden');
        }
    }

    async loginUser(username, password) {
        try {
            const response = await api.loginUser(username, password);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Invalid username or password.');
            }
            this.updateUserUI(data.user);
            this.returnToMenu();
            document.getElementById('loginError').classList.add('hidden');
        } catch (err) {
            const loginError = document.getElementById('loginError');
            loginError.textContent = err.message;
            loginError.classList.remove('hidden');
        }
    }

    async logoutUser() {
        await api.logoutUser();
        this.updateUserUI(null);
        window.location.reload();
    }

    showRegisterMenu() {
        document.getElementById('loginFormContainer').classList.add('hidden');
        document.getElementById('registerFormContainer').classList.remove('hidden');
    }

    showLoginMenu() {
        document.getElementById('registerFormContainer').classList.add('hidden');
        document.getElementById('loginFormContainer').classList.remove('hidden');
    }

    returnToMenu() {
        if (this.game.spawnTimer) clearInterval(this.game.spawnTimer);
        this.game.stopVitalsPolling();
        document.getElementById('failureModal').classList.remove('visible');
        this.showMenuView('main');
    }

    updateUserUI(user = null) {
        const loginBtn = document.getElementById('topRightLoginBtn');
        const userInfoDiv = document.getElementById('userInfo');
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (user) {
            loginBtn.classList.add('hidden');
            userInfoDiv.classList.remove('hidden');
            usernameDisplay.textContent = user.username;
        } else {
            loginBtn.classList.remove('hidden');
            userInfoDiv.classList.add('hidden');
            usernameDisplay.textContent = '';
        }
    }

    async showCaseHistory() {
        try {
            const history = await api.getCaseHistory();

            // --- FIX: Construct absolute avatar URLs before rendering ---
            // This is the correct place to fix the paths, as this data comes
            // directly from the database and doesn't know about the frontend's file structure.
            history.forEach(item => {
                // --- FIX: Add a null check to prevent crashes if a history item is missing patient data ---
                if (!item) return; // If the item is null, skip to the next one.

                if (item.patientAvatar) {
                    // Create a new property with the full, correct URL.
                    // --- IMAGE DEBUG: Log the components of the URL ---
                    // --- FINAL FIX: Use a root-relative path. The frontend static site will serve its own images. ---
                    console.log(`[IMAGE DEBUG] Building URL for avatar: '${item.patientAvatar}'`);
                    item.patient_avatar_url = `/images/${item.patientAvatar}`;
                    console.log(`[IMAGE DEBUG] -> Final URL: ${item.patient_avatar_url}`);
                }
            });
            // --- END FIX ---

            this.ui.renderCaseHistory(history);
            document.getElementById('menu').classList.add('hidden');
            document.getElementById('caseHistoryModal').classList.add('visible');
        } catch (error) {
            // --- AUTH DEBUG: Log the specific error when fetching case history fails ---
            console.error('[AUTH TRACE] Error fetching case history. This is likely an auth failure. Error:', error);
            // ---
            this.showMenuView('login');
        }
    }

    async showPatchNotes() {
        try {
            const patchNotesHtml = await api.getPatchNotes();
            document.getElementById('patchNotesContent').innerHTML = patchNotesHtml;
            document.getElementById('menu').classList.add('hidden');
            document.getElementById('patchNotesModal').classList.add('visible');
        } catch (error) {
            console.error("Could not load patch notes:", error);
            alert("Could not load patch notes. Please try again later.");
        }
    }

    async showLeaderboard() {
        try {
            const leaderboardData = await api.getLeaderboard();
            this.ui.renderLeaderboard(leaderboardData);
            document.getElementById('menu').classList.add('hidden');
            document.getElementById('leaderboardModal').classList.add('visible');
        } catch (error) {
            alert("Could not load the leaderboard. Please try again later.");
        }
    }

    async showSettingsModal() {
        try {
            // --- FIX: Use the already fetched settings ---
            const settings = this.game.userSettings || await api.getUserSettings();
            document.getElementById('showOnLeaderboardCheckbox').checked = settings.showOnLeaderboard;
            // --- FIX: Also update the Akutrum intro checkbox in the settings modal ---
            document.getElementById('showAkutrumIntroCheckbox').checked = settings.showAkutrumIntro !== false;
            document.getElementById('menu').classList.add('hidden');
            document.getElementById('settingsModal').classList.add('visible');
        } catch (error) {
            this.showMenuView('login');
        }
    }

    async saveSettings() {
        const settingsToSave = {
            showOnLeaderboard: document.getElementById('showOnLeaderboardCheckbox').checked,
            showAkutrumIntro: document.getElementById('showAkutrumIntroCheckbox').checked // --- FIX: Read from the correct checkbox ---
        };
        try {
            const savedSettings = await api.saveUserSettings(settingsToSave);
            // Update the local settings object
            this.game.userSettings = savedSettings.settings;
            document.getElementById('settingsModal').classList.remove('visible');
            this.showMenuView('main');
        } catch (error) {
            alert("Could not save settings. Please try again.");
        }
    }
}