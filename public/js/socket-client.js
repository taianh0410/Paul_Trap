(() => {
    const socket = io("/ion-trap", { reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000 });
    const roomInput = document.getElementById("roomId");
    const roomId = (new URLSearchParams(location.search).get("roomId") || localStorage.getItem("ionTrapRoom") || "PAUL-001").trim().toUpperCase();
    roomInput.value = roomId;
    let joined = false, phoneReady = false;
    const update = () => {
        const ready = socket.connected && joined && phoneReady;
        document.getElementById("connectionText").textContent = !socket.connected ? "SERVER DISCONNECTED" : !joined ? "JOINING ROOM…" : phoneReady ? "PHONE READY" : "WAITING FOR PHONE";
        document.querySelector(".connection").dataset.status = !socket.connected ? "offline" : ready ? "online" : "pending";
        document.getElementById("phoneStatus").textContent = !joined ? "Joining room…" : phoneReady ? "Phone connected and ready" : "Connect phone to room ${roomId}".replace("${roomId}", roomId);
        document.getElementById("startButton").disabled = !ready;
        window.dispatchEvent(new CustomEvent("readiness_changed", { detail: { ready, joined, phoneReady, roomId } }));
    };
    function joinRoom(value) {
        const id = String(typeof value === "object" ? value.roomId || "" : value || "").trim().toUpperCase();
        if (!id) return false;
        localStorage.setItem("ionTrapRoom", id); roomInput.value = id;
        joined = false; phoneReady = false;
        socket.emit("join_room", { roomId: id, role: "display" }); update(); return true;
    }
    socket.on("connect", () => { joined = false; update(); joinRoom(roomInput.value); });
    socket.on("disconnect", update); socket.on("connect_error", update);
    socket.on("room_joined", data => { joined = true; phoneReady = !!data.phoneReady; update(); });
    socket.on("phone_status", data => { if (data.roomId === roomInput.value) { phoneReady = !!data.ready; update(); } });
    ["sensor_data", "sync_data", "physics_data"].forEach(name => socket.on(name, data => window.dispatchEvent(new CustomEvent(name, { detail: data }))));
    document.getElementById("roomForm").addEventListener("submit", event => { event.preventDefault(); joinRoom(roomInput.value); });
    window.socketClient = { socket, joinRoom, get ready() { return socket.connected && joined && phoneReady; }, get roomId() { return roomInput.value; } };
    window.addEventListener("readiness_changed", event => { if (event.detail.ready) document.getElementById("phoneStatus").textContent = `Phone connected and ready · ${event.detail.roomId}`; });
    update();
})();
