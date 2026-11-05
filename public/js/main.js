const startButton = document.getElementById("startButton");

const countdownNumber = document.getElementById(
    "countdownNumber"
);

let countdownTimer = null;

// Bắt đầu game
function startGame() {

    changeGameState(GAME_STATE.COUNTDOWN);

    let count = 3;

    countdownNumber.textContent = count;

    countdownTimer = setInterval(() => {

        count--;

        if (count > 0) {

            countdownNumber.textContent = count;

        } else {

            clearInterval(countdownTimer);
            countdownTimer = null;

            changeGameState(GAME_STATE.PLAYING);
        }

    }, 1000);
}

// Game Over
function gameOver() {

    changeGameState(GAME_STATE.GAME_OVER);
}

// Chiến thắng
function victory() {

    changeGameState(GAME_STATE.VICTORY);
}

// Chơi lại
function restartGame() {

    if (countdownTimer !== null) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    changeGameState(GAME_STATE.WAITING);
}

// Các sự kiện
startButton.addEventListener("click", startGame);

document.getElementById("winButton").addEventListener(
    "click",
    victory
);

document.getElementById("loseButton").addEventListener(
    "click",
    gameOver
);

document.querySelectorAll(".restartButton").forEach(button => {
    button.addEventListener("click", restartGame);
});

// Trạng thái ban đầu
changeGameState(GAME_STATE.WAITING);