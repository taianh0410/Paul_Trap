window.DECADE_CONFIG = Object.freeze([
    { year: 1950, color: "#00ff9d", energy: "5.0 eV", field: 0.72, reward: "Quantum Core" },
    { year: 1960, color: "#00eaff", energy: "6.5 eV", field: 0.78, reward: "Ion Shield" },
    { year: 1970, color: "#00bfff", energy: "8.0 eV", field: 0.84, reward: "Pulse Drive" },
    { year: 1980, color: "#8b5cf6", energy: "9.5 eV", field: 0.9, reward: "Photon Lens" },
    { year: 1990, color: "#d879ff", energy: "10.0 eV", field: 0.96, reward: "Flux Capacitor" },
    { year: 2000, color: "#ff4fd8", energy: "11.0 eV", field: 1.02, reward: "Neon Reactor" },
    { year: 2010, color: "#00ffff", energy: "12.0 eV", field: 1.08, reward: "Time Crystal" }
]);
window.setDecade = function(index) {
    const decade = window.DECADE_CONFIG[index]; if (!decade) return;
    window.currentDecadeIndex = index;
    document.querySelectorAll(".decade-list button").forEach((button, i) => button.classList.toggle("active", i === index));
    document.getElementById("energy").textContent = decade.energy;
    document.getElementById("periodLabel").textContent = `${decade.year}s`;
    document.documentElement.style.setProperty("--electron-color", decade.color);
    const panel = document.querySelector(".simulation-panel"); panel.classList.remove("transition-effect"); void panel.offsetWidth; panel.classList.add("transition-effect");
    window.dispatchEvent(new CustomEvent("decade_changed", { detail: decade }));
};
window.currentDecadeIndex = 0; window.setDecade(0);
const adminMode = new URLSearchParams(location.search).get("admin") === "1";
document.querySelectorAll(".decade-list button").forEach((button, index) => {
    button.disabled = !adminMode;
    button.addEventListener("click", () => { if (adminMode && window.gameState?.current !== window.GAME_STATE.PLAYING) window.setDecade(index); });
});
