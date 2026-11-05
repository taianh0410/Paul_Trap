const GAME_STATE = {
    WAITING: "waiting",
    COUNTDOWN: "countdown",
    PLAYING: "playing",
    GAME_OVER: "game_over",
    VICTORY: "victory"
};

let currentState = GAME_STATE.WAITING;

function changeGameState(newState) {

    currentState = newState;

    const screens = {
        waiting: "waitingScreen",
        countdown: "countdownScreen",
        playing: "playingScreen",
        game_over: "gameOverScreen",
        victory: "victoryScreen"
    };

    // Ẩn tất cả màn hình
    Object.values(screens).forEach(id => {
        document.getElementById(id).classList.add("hidden");
    });

    // Hiện màn hình tương ứng
    const screenId = screens[newState];

    if (screenId) {
        document.getElementById(screenId).classList.remove("hidden");
    }
}