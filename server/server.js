require('dotenv').config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);
const { ExpressPeerServer } = require('peer');
const mongoose = require('mongoose');
const authRoute = require('./routes/auth')
const userRoute= require("./routes/user");

// Peer Server -------------------------------------------------------------------

// const peerServer = ExpressPeerServer(server, {
//     path: '/'
// });

// app.use('/peerjs', peerServer);


// Connect DB ------------------------------------------------------------------

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log("DB Connection Successful!"))
    .catch(err => console.log(err))

// Socket -------------------------------------------------------------------------
// const users = {};

// const socketToRoom = {};

// io.on('connection', socket => {
//     socket.on("join room", roomID => {
//         if (users[roomID]) {
//             const length = users[roomID].length;
//             // if (length === 4) {
//             //     socket.emit("room full");
//             //     return;
//             // }
//             users[roomID].push(socket.id);
//         } else {
//             users[roomID] = [socket.id];
//         }
//         socketToRoom[socket.id] = roomID;
//         const usersInThisRoom = users[roomID].filter(id => id !== socket.id);

//         socket.emit("all users", usersInThisRoom);
//     });

//     socket.on("sending signal", payload => {
//         io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
//     });

//     socket.on("returning signal", payload => {
//         io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
//     });

//     socket.on('disconnect', () => {
//         const roomID = socketToRoom[socket.id];
//         let room = users[roomID];
//         if (room) {
//             room = room.filter(id => id !== socket.id);
//             users[roomID] = room;
//         }
//         socket.broadcast.emit('user_disconnect', socket.id)        
//     });

// });

// Routes -------------------------------------------------------------------------
app.use(express.json())

// Authentication
app.use("/api/auth", authRoute);

// User management
app.use("/api/user", userRoute);

// Running Server
server.listen(process.env.PORT || 8000, () => console.log('server is running on port 8000'));


