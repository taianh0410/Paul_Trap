const decadeButtons = document.querySelectorAll(
    ".decade-list button"
);

const simulationPanel = document.querySelector(
    ".simulation-panel"
);

const decades = {
    1950: {
        color: "#00ff9d",
        speed: 0.015,
        energy: "5.0 eV"
    },

    1960: {
        color: "#00eaff",
        speed: 0.020,
        energy: "6.5 eV"
    },

    1970: {
        color: "#00bfff",
        speed: 0.025,
        energy: "8.0 eV"
    },

    1980: {
        color: "#8b5cf6",
        speed: 0.030,
        energy: "9.5 eV"
    },

    1990: {
        color: "#d879ff",
        speed: 0.035,
        energy: "10.0 eV"
    },

    2000: {
        color: "#ff4fd8",
        speed: 0.040,
        energy: "11.0 eV"
    },

    2010: {
        color: "#00ffff",
        speed: 0.045,
        energy: "12.0 eV"
    },

    2020: {
        color: "#00eaff",
        speed: 0.050,
        energy: "12.5 eV"
    }
};

decadeButtons.forEach(button => {

    button.addEventListener("click", () => {

        const decade = button.dataset.decade;

        const data = decades[decade];

        if (!data) return;

        decadeButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        // Thêm hiệu ứng chuyển cảnh
        simulationPanel.classList.remove("transition-effect");

        void simulationPanel.offsetWidth;

        simulationPanel.classList.add("transition-effect");

        // Thay đổi thông số hiển thị
        document.getElementById("energy").textContent =
            data.energy;

        // Thay đổi tốc độ electron
        if (window.electron) {
            window.electron.speed = data.speed;
        }

        // Thay đổi màu hiệu ứng
        document.documentElement.style.setProperty(
            "--electron-color",
            data.color
        );
    });

});