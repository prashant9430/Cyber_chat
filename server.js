const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let rooms = {};

io.on("connection", (socket) => {

    socket.on("createRoom", (username, callback) => {
        const roomId = uuidv4().slice(0, 6);
        rooms[roomId] = {
            owner: socket.id,
            locked: false,
            users: {}
        };

        socket.join(roomId);
        rooms[roomId].users[socket.id] = username;

        callback(roomId);
    });

    socket.on("joinRoom", ({ roomId, username }, callback) => {

        const room = rooms[roomId];

        if (!room) return callback({ error: "Room not found" });
        if (room.locked) return callback({ error: "Room is locked" });

        socket.join(roomId);
        room.users[socket.id] = username;

        socket.to(roomId).emit("systemMessage", `${username} joined`);

        io.to(roomId).emit("updateUsers", Object.values(room.users));

        callback({ success: true });
    });

    socket.on("sendMessage", ({ roomId, message, username }) => {
        io.to(roomId).emit("receiveMessage", { message, username });
    });

    socket.on("kickUser", ({ roomId, targetId }) => {
        const room = rooms[roomId];
        if (!room) return;
        if (room.owner !== socket.id) return;

        io.to(targetId).emit("kicked");
        io.sockets.sockets.get(targetId)?.leave(roomId);
        delete room.users[targetId];

        io.to(roomId).emit("updateUsers", Object.values(room.users));
    });

    socket.on("toggleLock", (roomId) => {
        const room = rooms[roomId];
        if (!room) return;
        if (room.owner !== socket.id) return;

        room.locked = !room.locked;
        io.to(roomId).emit("lockStatus", room.locked);
    });

    socket.on("disconnecting", () => {
        for (let roomId of socket.rooms) {
            if (rooms[roomId]) {
                delete rooms[roomId].users[socket.id];

                if (rooms[roomId].owner === socket.id) {
                    io.to(roomId).emit("systemMessage", "Owner left. Room closing.");
                    delete rooms[roomId];
                } else {
                    io.to(roomId).emit("updateUsers", Object.values(rooms[roomId].users));
                }
            }
        }
    });
});

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
