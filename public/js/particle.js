(() => {
    const canvas = document.getElementById("particleCanvas");
    const ctx = canvas.getContext("2d");
    const electron = { x: 0, y: 0, status: "TRAPPED", energy: null };
    const trail = [];
    let width = 0, height = 0, lastFrame = 0;
    window.electron = electron;

    function resize() {
        const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, rect.width * dpr); canvas.height = Math.max(1, rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); width = rect.width; height = rect.height;
        if (!electron.initialized) { electron.x = width / 2; electron.y = height / 2; electron.initialized = true; }
    }
    function color() { return getComputedStyle(document.documentElement).getPropertyValue("--electron-color").trim() || "#00eaff"; }
    function draw(now) {
        const dt = Math.min((now - (lastFrame || now)) / 1000, 0.05); lastFrame = now;
        ctx.clearRect(0, 0, width, height);
        const playing = window.gameState?.current === window.GAME_STATE.PLAYING;
        if (playing) {
            trail.push({ x: electron.x, y: electron.y, alpha: 0.9, size: 2 + Math.random() * 2 });
            if (trail.length > 32) trail.shift();
        } else if (!electron.hasPhysics) {
            // Ambient display is decorative and deliberately stationary outside gameplay.
            electron.x = width / 2; electron.y = height / 2;
        }
        trail.forEach(p => { p.alpha -= dt * 0.8; p.x -= dt * 9; p.y += dt * 2; ctx.globalAlpha = Math.max(p.alpha, 0); ctx.fillStyle = color(); ctx.shadowBlur = 12; ctx.shadowColor = color(); ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        while (trail[0]?.alpha <= 0) trail.shift();
        ctx.globalAlpha = 1;
        const c = color(), g = ctx.createRadialGradient(electron.x, electron.y, 1, electron.x, electron.y, 28);
        g.addColorStop(0, "#fff"); g.addColorStop(.28, c); g.addColorStop(1, "transparent");
        ctx.shadowBlur = 28; ctx.shadowColor = c; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(electron.x, electron.y, 28, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        requestAnimationFrame(draw);
    }
    window.addEventListener("resize", resize); resize(); requestAnimationFrame(draw);
})();
