(() => {
    const state = window.GAME_STATE;
    const startButton = document.getElementById("startButton");
    let countdownTimer = null, stageTimer = null, stageIndex = 0, failureHandled = false;
    const stageDurationMs = 30000;
    function clearTimers() { clearInterval(countdownTimer); clearTimeout(stageTimer); countdownTimer = stageTimer = null; }
    function startGame() {
        if (!window.socketClient?.ready || window.gameState.current !== state.WAITING) return;
        clearTimers(); stageIndex = 0; failureHandled = false; window.setDecade(stageIndex);
        window.gameState.set(state.COUNTDOWN);
        let count = 3; document.getElementById("countdownNumber").textContent = count;
        countdownTimer = setInterval(() => {
            count -= 1;
            if (count > 0) document.getElementById("countdownNumber").textContent = count;
            else { clearInterval(countdownTimer); countdownTimer = null; enterStage(); }
        }, 1000);
    }
    function enterStage() {
        failureHandled = false; window.setDecade(stageIndex); window.gameState.set(state.PLAYING);
        document.getElementById("stageLabel").textContent = `${window.DECADE_CONFIG[stageIndex].year}s`;
        stageTimer = setTimeout(completeStage, stageDurationMs);
    }
    function completeStage() {
        stageTimer = null;
        const config = window.DECADE_CONFIG[stageIndex];
        document.getElementById("rewardName").textContent = config.reward;
        document.getElementById("rewardPeriod").textContent = `${config.year}s complete`;
        const finalStage = stageIndex >= window.DECADE_CONFIG.length - 1;
        document.getElementById("claimButton").textContent = finalStage ? "CLAIM REWARD & FINISH" : "CLAIM & CONTINUE";
        document.getElementById("continueButton").textContent = finalStage ? "FINISH WITHOUT REWARD" : "CONTINUE WITHOUT REWARD";
        window.gameState.set(state.REWARD);
    }
    function continueGame() { if (window.gameState.current !== state.REWARD) return; if (stageIndex >= window.DECADE_CONFIG.length - 1) { window.gameState.set(state.VICTORY); return; } stageIndex += 1; enterStage(); }
    function gameOver() { if (window.gameState.current !== state.PLAYING) return; clearTimers(); window.gameState.set(state.GAME_OVER); }
    function restartGame() { clearTimers(); stageIndex = 0; window.gameState.set(state.WAITING); }
    startButton.addEventListener("click", startGame);
    document.getElementById("continueButton").addEventListener("click", continueGame);
    document.getElementById("claimButton").addEventListener("click", continueGame);
    document.querySelectorAll(".restartButton").forEach(button => button.addEventListener("click", restartGame));
    window.addEventListener("physics_failure", () => { if (!failureHandled) { failureHandled = true; gameOver(); } });
    window.addEventListener("readiness_changed", event => {
        if (!event.detail.ready && window.gameState.current === state.COUNTDOWN) { clearTimers(); window.gameState.set(state.WAITING); }
    });
    window.gameState.set(state.WAITING);
})();
