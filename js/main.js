import GameMainController from './GameMainController.js';

// When the HTML page is ready, create a new game instance and start it.
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameMainController();
    game.init();
});
