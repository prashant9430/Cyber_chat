const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const isCreate = urlParams.get("create");

let roomId = localStorage.getItem("roomId");
let username = localStorage.getItem("username");

if (isCreate) {
    socket.emit("createRoom", username, (id) => {
        roomId = id;
        localStorage.setItem("roomId", id);
        alert("Room ID: " + id);
    });
} else {
    socket.emit("joinRoom", { roomId, username }, (res) => {
        if (res.error) alert(res.error);
    });
}

function send() {
    const msg = document.getElementById("msg").value;
    socket.emit("sendMessage", { roomId, message: msg, username });
}

socket.on("receiveMessage", (data) => {
    const div = document.createElement("div");
    div.textContent = data.username + ": " + data.message;
    document.getElementById("chat").appendChild(div);
});

function toggleLock() {
    socket.emit("toggleLock", roomId);
}

socket.on("lockStatus", (locked) => {
    alert("Room Locked: " + locked);
});
