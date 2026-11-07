const socket = io("/ion-trap");

window.socket = socket;

socket.on("connect", () => {
    console.log("Socket.IO connected:", socket.id);
});

socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
});

socket.on("sensor_data", (data) => {
    console.log("Sensor data:", data);

    window.dispatchEvent(
        new CustomEvent("sensor_data", { detail: data })
    );
});

socket.on("sync_data", (data) => {
    console.log("Sync data:", data);

    window.dispatchEvent(
        new CustomEvent("sync_data", { detail: data })
    );
});

function joinRoom(payload) {
    socket.emit("join_room", payload);
}

window.socketClient = {
    socket: socket,
    joinRoom: joinRoom
};