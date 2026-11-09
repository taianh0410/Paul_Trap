window.GAME_STATE = Object.freeze({ WAITING: "waiting", COUNTDOWN: "countdown", PLAYING: "playing", GAME_OVER: "game_over", VICTORY: "victory", REWARD: "reward" });

let currentState = window.GAME_STATE.WAITING;
window.gameState = { get current() { return currentState; }, set: changeGameState };

function changeGameState(next) {
    const screens = { waiting: "waitingScreen", countdown: "countdownScreen", playing: "playingScreen", game_over: "gameOverScreen", victory: "victoryScreen", reward: "rewardScreen" };
    if (!screens[next]) return;
    currentState = next;
    Object.entries(screens).forEach(([state, id]) => document.getElementById(id)?.classList.toggle("hidden", state !== next));
    window.dispatchEvent(new CustomEvent("game_state", { detail: next }));
}
