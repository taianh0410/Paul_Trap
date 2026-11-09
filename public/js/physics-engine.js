(() => {
    const electron = window.electron;
    let sensor = { beta: 0, gamma: 0 }, velocity = { x: 0, y: 0 }, previous = 0;
    const status = document.getElementById("electronState");
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    window.addEventListener("sync_data", event => { const d = event.detail || {}; sensor = { beta: Number(d.beta) || 0, gamma: Number(d.gamma) || 0 }; });
    window.addEventListener("sensor_data", event => { sensor = { beta: Number(event.detail?.beta) || 0, gamma: Number(event.detail?.gamma) || 0 }; });
    window.addEventListener("decade_changed", () => { velocity.x = 0; velocity.y = 0; });
    function tick(now) {
        if (window.gameState?.current === window.GAME_STATE.PLAYING) {
            const dt = Math.min((now - (previous || now)) / 1000, 0.05); previous = now;
            const field = window.DECADE_CONFIG[window.currentDecadeIndex].field;
            velocity.x = clamp((velocity.x + clamp(sensor.gamma / 90, -1, 1) * 220 * field * dt) * 0.985, -300, 300);
            velocity.y = clamp((velocity.y + clamp(sensor.beta / 90, -1, 1) * 220 * field * dt) * 0.985, -300, 300);
            electron.x += velocity.x * dt; electron.y += velocity.y * dt;
            const bounds = document.getElementById("particleCanvas").getBoundingClientRect();
            electron.x = clamp(electron.x, 28, bounds.width - 28); electron.y = clamp(electron.y, 28, bounds.height - 28);
            electron.hasPhysics = true; electron.status = "IN MOTION"; status.textContent = electron.status;
            document.getElementById("positionLabel").textContent = `${Math.round(electron.x)}, ${Math.round(electron.y)}`;
            if (Math.abs(sensor.beta) > 78 || Math.abs(sensor.gamma) > 78) window.dispatchEvent(new CustomEvent("physics_failure"));
        } else previous = 0;
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
})();
